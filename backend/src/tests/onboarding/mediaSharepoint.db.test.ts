import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import { execSync } from 'child_process';
import { PostgresInstance } from 'pg-embedded';
import fs from 'fs';

const uploadDocumentMock = vi.fn(async (_villaId: string, _documentType: string, fileName: string, fileContent: Buffer) => ({
  fileId: `sp-doc-${fileName}`,
  fileName,
  filePath: `/SharePoint/Documents/${fileName}`,
  fileUrl: `https://sharepoint.local/documents/${fileName}`,
  size: fileContent.length,
  mimeType: 'application/pdf',
}));

const uploadFileMock = vi.fn(async (_buffer: Buffer, fileName: string, folder: string) => ({
  fileId: `sp-photo-${fileName}`,
  fileName,
  filePath: `/SharePoint/${folder}/${fileName}`,
  fileUrl: `https://sharepoint.local/${folder}/${fileName}`,
  size: 1024,
  mimeType: 'image/jpeg',
}));

const serverModuleMock = vi.hoisted(() => ({ prisma: undefined as any }));

vi.mock('../../server', () => serverModuleMock);

vi.mock('../../services/integrations/sharePointService', () => ({
  __esModule: true,
  default: {
    getStatus: vi.fn(() => ({ enabled: true, initialized: true })),
    initialize: vi.fn(),
    cleanup: vi.fn(),
    uploadDocument: (...args: any[]) => uploadDocumentMock(...args),
    uploadFile: (...args: any[]) => uploadFileMock(...args),
  },
}));

const storePhotoMock = vi.fn(async () => {
  throw new Error('Database photo storage disabled');
});

vi.mock('../../services/storage/databaseFileStorageService', () => ({
  __esModule: true,
  default: {
    storePhoto: storePhotoMock,
    storeDocument: vi.fn(),
    deletePhoto: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));

vi.mock('../../middleware/auth', () => {
  const middleware = (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user' };
    next();
  };
  return {
    authMiddleware: middleware,
    authenticate: middleware,
  };
});

const passThrough = (_req: any, _res: any, next: any) => next();

vi.mock('../../middleware/rateLimiting', () => ({
  fileUploadRateLimit: passThrough,
  onboardingReadRateLimit: passThrough,
  onboardingRateLimit: passThrough,
  autoSaveRateLimit: passThrough,
  onboardingCompleteRateLimit: passThrough,
  backupRateLimit: passThrough,
}));

let pg: PostgresInstance;
let prisma: any;
let app: express.Express;

const TEST_DB = 'sharepoint_media_test_db';
let previousDatabaseUrl: string | undefined;
let previousSharePoint: string | undefined;
let previousGraph: string | undefined;

const createApp = async () => {
  const { default: documentsRouter } = await import('../../routes/media/documents');
  const { default: photosRouter } = await import('../../routes/media/photos');
  prisma = serverModuleMock.prisma;

  const server = express();
  server.use(express.json());
  server.use('/api/documents', documentsRouter);
  server.use('/api/photos', photosRouter);
  return server;
};

const ensureUploadsDir = () => {
  const dirs = [
    path.join(process.cwd(), 'uploads', 'documents'),
    path.join(process.cwd(), 'uploads', 'photos'),
    path.join(process.cwd(), 'temp'),
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

describe('Media routes with SharePoint enabled', () => {
  beforeAll(async () => {
    ensureUploadsDir();

    pg = new PostgresInstance({
      port: 0,
      username: 'postgres',
      password: 'postgres',
      persistent: false,
    });

    await pg.start();
    await pg.createDatabase(TEST_DB);

    const connection = pg.connectionInfo;
    const connectionString = `${connection.connectionString}/${TEST_DB}`;

    previousDatabaseUrl = process.env.DATABASE_URL;
    previousSharePoint = process.env.ENABLE_SHAREPOINT;
    previousGraph = process.env.ENABLE_MICROSOFT_GRAPH;

    process.env.DATABASE_URL = connectionString;
    process.env.ENABLE_SHAREPOINT = 'true';
    process.env.ENABLE_MICROSOFT_GRAPH = 'false';

    const projectRoot = path.resolve(__dirname, '../../..');
    const { PrismaClient } = await import('@prisma/client');
    serverModuleMock.prisma = new PrismaClient();

    execSync('npx prisma db push --schema prisma/schema.prisma --skip-generate', {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_URL: connectionString,
      },
      stdio: 'inherit',
    });

    prisma = serverModuleMock.prisma;

    vi.resetModules();
    app = await createApp();
  }, 120_000);

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (pg) {
      await pg.stop();
    }
    process.env.DATABASE_URL = previousDatabaseUrl;
    process.env.ENABLE_SHAREPOINT = previousSharePoint;
    process.env.ENABLE_MICROSOFT_GRAPH = previousGraph;
  });

  it('uploads documents and records SharePoint metadata', async () => {
    const villa = await prisma.villa.create({
      data: {
        villaName: 'Document Villa',
        villaCode: 'DOC001',
        address: 'Doc Address',
        city: 'Doc City',
        country: 'Doc Country',
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        propertyType: 'VILLA',
        status: 'DRAFT',
        onboarding: {
          create: {
            currentStep: 1,
            totalSteps: 10,
            status: 'IN_PROGRESS',
          },
        },
      },
    });

    const res = await request(app)
      .post('/api/documents/upload')
      .field('villaId', villa.id)
      .field('documentType', 'OTHER')
      .attach('documents', Buffer.from('PDF Content'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(res.body.message).toContain('documents uploaded successfully');
    expect(uploadDocumentMock).toHaveBeenCalled();

    const docs = await prisma.document.findMany({ where: { villaId: villa.id } });
    expect(docs.length).toBe(1);
    expect(docs[0].sharePointFileId).toContain('sp-doc-');

    const progress = await prisma.onboardingProgress.findUnique({ where: { villaId: villa.id } });
    expect(progress?.documentsUploaded).toBe(true);
  });

  it('uploads facility photos with SharePoint fallback and updates facility record', async () => {
    const villa = await prisma.villa.create({
      data: {
        villaName: 'Facility Villa',
        villaCode: 'FAC001',
        address: 'Facility Address',
        city: 'Facility City',
        country: 'Facility Country',
        bedrooms: 3,
        bathrooms: 3,
        maxGuests: 6,
        propertyType: 'VILLA',
        status: 'DRAFT',
      },
    });

    const facility = await prisma.facilityChecklist.create({
        data: {
          villaId: villa.id,
          category: 'outdoor_facilities',
          subcategory: 'POOL_AREA',
          itemName: 'Pool Chairs',
          isAvailable: true,
        },
    });

    const res = await request(app)
      .post('/api/photos/upload-facility')
      .field('villaId', villa.id)
      .field('facilityCategory', 'outdoor_facilities')
      .field('facilityItemName', 'Pool Chairs')
      .field('facilityItemId', facility.id)
      .attach('photos', Buffer.from('image-bytes'), {
        filename: 'facility.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(uploadFileMock).toHaveBeenCalled();
    const photos = await prisma.photo.findMany({ where: { villaId: villa.id } });
    expect(photos.length).toBeGreaterThan(0);
    expect(photos[0].sharePointFileId).toContain('sp-photo-');

    const updatedFacility = await prisma.facilityChecklist.findUnique({ where: { id: facility.id } });
    expect(updatedFacility?.photoUrl).toBeTruthy();
  });

  it('uploads regular photos and stores them in database', async () => {
    const villa = await prisma.villa.create({
      data: {
        villaName: 'Photo Villa',
        villaCode: 'PHO001',
        address: 'Photo Address',
        city: 'Photo City',
        country: 'Photo Country',
        bedrooms: 3,
        bathrooms: 2,
        maxGuests: 5,
        propertyType: 'VILLA',
        status: 'DRAFT',
      },
    });

    const res = await request(app)
      .post('/api/photos/upload')
      .field('villaId', villa.id)
      .field('category', 'EXTERIOR_VIEWS')
      .attach('photos', Buffer.from('image-bytes'), {
        filename: 'regular.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(res.body.photos.length).toBe(1);
    const stored = await prisma.photo.findMany({ where: { villaId: villa.id } });
    expect(stored.length).toBe(1);
    expect(stored[0].category).toBe('EXTERIOR_VIEWS');
  });
});
