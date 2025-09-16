import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import { execSync } from 'child_process';
import { PostgresInstance } from 'pg-embedded';

let pg: PostgresInstance;
let app: express.Express;
let prisma: any;

const TEST_DB = 'onboarding_test_db';
let previousDatabaseUrl: string | undefined;
let previousSharePointFlag: string | undefined;
let previousGraphFlag: string | undefined;

const createApp = async () => {
  vi.mock('../../middleware/auth', () => ({
    authenticate: (req: any, _res: any, next: any) => {
      req.user = { id: 'test-user' };
      next();
    },
  }));
  vi.mock('../../middleware/rateLimiting', () => ({
    onboardingRateLimit: (_req: any, _res: any, next: any) => next(),
    onboardingReadRateLimit: (_req: any, _res: any, next: any) => next(),
    onboardingCompleteRateLimit: (_req: any, _res: any, next: any) => next(),
    autoSaveRateLimit: (_req: any, _res: any, next: any) => next(),
  }));
  vi.mock('../../middleware/cache', () => ({
    cacheMiddleware: () => (_req: any, _res: any, next: any) => next(),
    invalidateCache: () => (_req: any, _res: any, next: any) => next(),
    CacheDuration: { SHORT: 0 },
  }));

  const { default: router } = await import('../../routes/onboarding/onboarding');
  const { prismaClient } = await import('../../services/core/onboardingService');

  prisma = prismaClient;

  const server = express();
  server.use(express.json());
  server.use('/api/onboarding', router);
  return server;
};

describe('Onboarding routes with real database', () => {
  beforeAll(async () => {
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
    previousSharePointFlag = process.env.ENABLE_SHAREPOINT;
    previousGraphFlag = process.env.ENABLE_MICROSOFT_GRAPH;
    process.env.DATABASE_URL = connectionString;
    process.env.ENABLE_SHAREPOINT = 'false';
    process.env.ENABLE_MICROSOFT_GRAPH = 'false';

    const projectRoot = path.resolve(__dirname, '../../..');
    execSync('npx prisma db push --schema prisma/schema.prisma --skip-generate', {
      cwd: projectRoot,
      env: {
        ...process.env,
        DATABASE_URL: connectionString,
      },
      stdio: 'inherit',
    });

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
    process.env.ENABLE_SHAREPOINT = previousSharePointFlag;
    process.env.ENABLE_MICROSOFT_GRAPH = previousGraphFlag;
  });

  it('creates villa via onboarding start and persists data', async () => {
    const response = await request(app)
      .post('/api/onboarding/start')
      .send({ villaName: 'DB Test Villa' })
      .expect(200);

    expect(response.body.success).toBe(true);
    const villaId = response.body.data?.villaId;
    expect(villaId).toBeDefined();

    const dbVilla = await prisma.villa.findUnique({
      where: { id: villaId },
      include: { onboarding: true },
    });

    expect(dbVilla).toBeTruthy();
    expect(dbVilla?.onboarding).toBeTruthy();
  });

  it('updates step data and writes to database', async () => {
    const startRes = await request(app)
      .post('/api/onboarding/start')
      .send({ villaName: 'Villa for Step Update' })
      .expect(200);

    const villaId = startRes.body.data.villaId;

    const updateRes = await request(app)
      .put(`/api/onboarding/${villaId}/step`)
      .send({
        step: 1,
        data: {
          villaName: 'Updated Name',
          address: '123 Ocean Drive',
          city: 'Sunny City',
          country: 'Wonderland',
          bedrooms: 4,
          bathrooms: 3,
          maxGuests: 8,
          propertyType: 'VILLA',
        },
        completed: true,
      })
      .expect(200);

    expect(updateRes.body.success).toBe(true);

    const persistedVilla = await prisma.villa.findUnique({ where: { id: villaId } });
    expect(persistedVilla?.villaName).toBe('Updated Name');
    expect(persistedVilla?.city).toBe('Sunny City');
  });

  it('increments version through PATCH auto-save operations', async () => {
    const startRes = await request(app)
      .post('/api/onboarding/start')
      .send({ villaName: 'Versioned Villa' })
      .expect(200);

    const villaId = startRes.body.data.villaId;

    const stepStatusBefore = await prisma.onboardingStepProgress.findUnique({
      where: {
        villaId_stepNumber: {
          villaId,
          stepNumber: 1,
        },
      },
    });

    expect(stepStatusBefore?.version ?? 0).toBe(0);

    const patchRes = await request(app)
      .patch(`/api/onboarding/${villaId}/step/1`)
      .send({
        version: stepStatusBefore?.version ?? 0,
        data: {
          villaName: 'Auto Save Villa',
          address: 'Auto Address',
          city: 'Auto City',
          country: 'Wonderland',
          bedrooms: 2,
          bathrooms: 2,
          maxGuests: 4,
          propertyType: 'VILLA',
        },
      })
      .expect(200);

    expect(patchRes.body.success).toBe(true);
    expect(typeof patchRes.body.version).toBe('number');
    expect(patchRes.body.version).toBeGreaterThan(0);

    const stepStatusAfter = await prisma.onboardingStepProgress.findUnique({
      where: {
        villaId_stepNumber: {
          villaId,
          stepNumber: 1,
        },
      },
    });

    expect(stepStatusAfter?.version).toBeGreaterThan(stepStatusBefore?.version ?? 0);
  });
});
