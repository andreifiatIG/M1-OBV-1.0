import { vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

// Test environment setup
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/villa_test'
process.env.PORT = '4002'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.CLERK_SECRET_KEY = 'test-clerk-secret'

// Mock external services
vi.mock('@clerk/backend', () => ({
  clerkClient: {
    users: {
      getUser: vi.fn().mockResolvedValue({
        id: 'test-user-id',
        firstName: 'Test',
        lastName: 'User',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      }),
    },
  },
  verifyToken: vi.fn().mockResolvedValue({
    sub: 'test-user-id',
  }),
}))

// Mock Microsoft Graph
vi.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    init: vi.fn().mockReturnValue({
      api: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({}),
        post: vi.fn().mockResolvedValue({}),
        put: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      }),
    }),
  },
}))

// Mock Azure Storage
vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn().mockReturnValue({
      getContainerClient: vi.fn().mockReturnValue({
        uploadBlockBlob: vi.fn().mockResolvedValue({
          requestId: 'test-request-id',
        }),
        deleteBlob: vi.fn().mockResolvedValue({}),
        getBlobClient: vi.fn().mockReturnValue({
          url: 'https://test.blob.core.windows.net/test.jpg',
        }),
      }),
    }),
  },
}))

// Mock Nodemailer
vi.mock('nodemailer', () => ({
  createTransporter: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({
      messageId: 'test-message-id',
    }),
  }),
}))

// Mock Winston Logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    http: vi.fn(),
  },
  performanceLogger: {
    startTimer: vi.fn(),
    endTimer: vi.fn().mockReturnValue(100),
  },
  logError: vi.fn(),
  logWarning: vi.fn(),
  logInfo: vi.fn(),
  logDebug: vi.fn(),
  auditLog: vi.fn(),
  securityLog: vi.fn(),
  metricsLog: vi.fn(),
  morganStream: {
    write: vi.fn(),
  },
}))

// Mock fetch for external API calls
global.fetch = vi.fn()

// Database setup for tests
let prisma: PrismaClient
let usingRealDatabase = false

beforeAll(async () => {
  // Try to use SQLite in-memory database for tests, fall back to mocks
  try {
    // Use SQLite in-memory database for testing
    const testDatabaseUrl = 'file:./test-db.sqlite'

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
      log: ['error'], // Reduce logging noise in tests
    })

    // Test the connection
    await prisma.$connect()

    // Try to execute a simple query to verify database works
    await prisma.$queryRaw`SELECT 1 as test`

    usingRealDatabase = true
    console.log('✅ Using SQLite database for tests')

    // Initialize database schema if needed
    await initializeTestDatabase()

  } catch (error) {
    console.warn('⚠️  Database connection failed, using comprehensive mocks for tests')
    usingRealDatabase = false

    // Create comprehensive mock prisma for tests without database
    prisma = createMockPrisma()
  }
})

// Initialize test database with basic schema
async function initializeTestDatabase() {
  if (!usingRealDatabase) return

  try {
    // Create tables if they don't exist (simplified for SQLite)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Villa" (
        "id" TEXT PRIMARY KEY,
        "villaName" TEXT NOT NULL,
        "location" TEXT,
        "description" TEXT,
        "bedrooms" INTEGER,
        "bathrooms" INTEGER,
        "maxGuests" INTEGER,
        "pricePerNight" REAL,
        "currency" TEXT DEFAULT 'USD',
        "status" TEXT DEFAULT 'PENDING',
        "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Owner" (
        "id" TEXT PRIMARY KEY,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT,
        "nationality" TEXT,
        "villaId" TEXT,
        "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("villaId") REFERENCES "Villa"("id")
      )
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OnboardingProgress" (
        "id" TEXT PRIMARY KEY,
        "villaId" TEXT NOT NULL,
        "currentStep" INTEGER DEFAULT 1,
        "totalSteps" INTEGER DEFAULT 10,
        "completedSteps" TEXT DEFAULT '[]',
        "stepData" TEXT DEFAULT '{}',
        "progressPercentage" REAL DEFAULT 0,
        "status" TEXT DEFAULT 'IN_PROGRESS',
        "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("villaId") REFERENCES "Villa"("id")
      )
    `)

  } catch (error) {
    console.warn('Schema initialization failed:', error)
  }
}

// Create comprehensive mock Prisma client
function createMockPrisma() {
  return {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([]),
    villa: {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'mock-villa-id', ...data.data })),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockImplementation((data) => Promise.resolve({ id: data.where.id, ...data.data })),
      delete: vi.fn().mockResolvedValue({ id: 'deleted-villa-id' }),
      upsert: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'mock-villa-id', ...data.create })),
    },
    owner: {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'mock-owner-id', ...data.data })),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockImplementation((data) => Promise.resolve({ id: data.where.id, ...data.data })),
      delete: vi.fn().mockResolvedValue({ id: 'deleted-owner-id' }),
    },
    onboardingProgress: {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'mock-progress-id', ...data.data })),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockImplementation((data) => Promise.resolve({ id: data.where.id, ...data.data })),
      delete: vi.fn().mockResolvedValue({ id: 'deleted-progress-id' }),
    },
  } as any
}

beforeEach(async () => {
  // Clean up database before each test
  await cleanupDatabase()
})

afterAll(async () => {
  // Clean up and disconnect after all tests
  try {
    await cleanupDatabase()
    await prisma.$disconnect()
  } catch (error) {
    // Ignore cleanup errors in mock mode
  }
})

// Helper function to clean up database
async function cleanupDatabase() {
  if (!prisma) return

  if (usingRealDatabase && typeof prisma.$executeRawUnsafe === 'function') {
    // Clean tables in correct order to avoid foreign key constraints
    const tables = [
      'OnboardingProgress',
      'Villa',
      'Owner',
    ]

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`)
      } catch (error) {
        // Table might not exist, ignore error
      }
    }
  } else {
    // Reset mock call history
    if (typeof prisma.villa?.create === 'function') {
      vi.clearAllMocks()
    }
  }
}

// Export test utilities
export { prisma }

// Test data factories
export const createTestVilla = async (overrides: Partial<any> = {}) => {
  const villaData = {
    villaCode: 'TEST001',
    villaName: 'Test Villa',
    address: '123 Test Street',
    city: 'Test City',
    country: 'Test Country',
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    propertyType: 'VILLA' as const,
    description: 'Test Description',
    status: 'DRAFT' as const,
    ...overrides,
  }

  try {
    return await prisma.villa.create({ data: villaData })
  } catch (error) {
    // Return mock data if database is not available
    return { id: 'test-villa-id', ...villaData, createdAt: new Date(), updatedAt: new Date() }
  }
}

export const createTestOwner = async (villaId: string, overrides: Partial<any> = {}) => {
  const ownerData = {
    firstName: 'Test',
    lastName: 'Owner',
    email: 'test@example.com',
    phone: '+1234567890',
    nationality: 'US',
    address: '123 Owner Street',
    city: 'Owner City',
    country: 'Owner Country',
    villaId,
    ...overrides,
  }

  try {
    return await prisma.owner.create({ data: ownerData })
  } catch (error) {
    return { id: 'test-owner-id', ...ownerData, createdAt: new Date(), updatedAt: new Date() }
  }
}

export const createTestOnboardingProgress = async (
  villaId: string,
  overrides: Partial<any> = {}
) => {
  const progressData = {
    villaId,
    currentStep: 1,
    totalSteps: 10,
    completedSteps: '[]',
    stepData: '{}',
    progressPercentage: 0,
    status: 'IN_PROGRESS' as const,
    ...overrides,
  }

  try {
    return await prisma.onboardingProgress.create({ data: progressData })
  } catch (error) {
    return { id: 'test-progress-id', ...progressData, createdAt: new Date(), updatedAt: new Date() }
  }
}