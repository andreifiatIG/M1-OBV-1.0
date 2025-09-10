import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { logger, morganStream, performanceLogger } from './utils/logger';
import electricSQLService from './electric/client';
import microsoftGraphService from './services/microsoftGraphService';
// Use real Microsoft Graph service for SharePoint integration
import sharePointService from './services/sharePointService';
import websocketService from './services/websocketService';
import { errorHandler, notFoundHandler, timeoutHandler } from './middleware/errorHandler';
import { warmCache } from './middleware/cache';

// Import routers
import villaRouter from './routes/villas';
import ownerRouter from './routes/owners';
import staffRouter from './routes/staff';
import documentRouter from './routes/documents';
import photoRouter from './routes/photos';
import facilityRouter from './routes/facilities';
import facilityPhotosRouter from './routes/facilityPhotos';
import onboardingRouter from './routes/onboarding';
import onboardingBackupRouter from './routes/onboarding-backup';
import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import analyticsRouter from './routes/analytics';
import bankRouter from './routes/bank';
import otaRouter from './routes/ota';
import testRouter from './routes/test';
import sharePointRouter from './routes/sharepoint';
import usersRouter from './routes/users';
import sharepointTestRouter from './routes/sharepoint-test';
import fileServerRouter from './routes/fileServer';

// Load environment variables
dotenv.config();

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Initialize Express app and HTTP server
const app: Express = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4001;

// Global middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: morganStream }));
}

// Request timeout middleware (30 seconds default)
app.use(timeoutHandler(30000));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500'), // Increased for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development mode
  skip: (req) => {
    return process.env.NODE_ENV !== 'production';
  }
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'M1 Villa Management Backend (PostgreSQL)',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    features: [
      'Villa Management',
      'Owner Details',
      'Staff Management',
      'Document Management',
      'Photo Management', 
      'Facilities Management',
      'Bank Details (Encrypted)',
      'OTA Credentials (Encrypted)',
      'Onboarding Workflow',
      'Microsoft Graph Integration',
      'SharePoint Document Management',
      'ElectricSQL Real-time Sync',
      'WebSocket Real-time Updates'
    ],
    services: {
      microsoftGraph: microsoftGraphService.getStatus(),
      sharePoint: sharePointService.getStatus(),
      // electricSQL: electricSQLService.getSyncStatus(), // Not used in this iteration
      websocket: websocketService.getStatus(),
    },
    note: 'M6 Partner Portal is handled separately in M6 microservice',
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/villas', villaRouter);
app.use('/api/owners', ownerRouter);
app.use('/api/staff', staffRouter);
app.use('/api/documents', documentRouter);
app.use('/api/photos', photoRouter);
app.use('/api/facilities', facilityRouter);
app.use('/api/facility-photos', facilityPhotosRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/onboarding', onboardingBackupRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/bank', bankRouter);
app.use('/api/ota', otaRouter);
app.use('/api/test', testRouter);
app.use('/api/sharepoint', sharePointRouter);
app.use('/api/users', usersRouter);
app.use('/api/sharepoint-test', sharepointTestRouter);
app.use('/api/files', fileServerRouter);

// ElectricSQL WebSocket endpoint
app.get('/electric', (_req: Request, res: Response) => {
  res.json({
    status: 'ElectricSQL sync endpoint',
    url: process.env.ELECTRIC_SYNC_URL,
  });
});

// 404 handler (before error handler)
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Initialize all services
async function initializeServices() {
  const results = {
    microsoftGraph: false,
    sharePoint: false,
    electricSQL: false,
    websocket: false,
  };

  // Initialize Microsoft Graph service
  try {
    logger.info('Initializing Microsoft Graph service...');
    await microsoftGraphService.initialize();
    results.microsoftGraph = true;
    logger.info('[SUCCESS] Microsoft Graph service initialized');
  } catch (error) {
    logger.error('[ERROR] Failed to initialize Microsoft Graph service:', error);
  }

  // Initialize SharePoint service
  try {
    logger.info('Initializing SharePoint service...');
    await sharePointService.initialize();
    results.sharePoint = true;
    logger.info('[SUCCESS] SharePoint service initialized');
  } catch (error) {
    logger.error('[ERROR] Failed to initialize SharePoint service:', error);
  }

  // ElectricSQL is not used in this iteration - skipping initialization
  // Uncomment when ElectricSQL is needed
  /*
  try {
    logger.info('Initializing ElectricSQL service...');
    await electricSQLService.initialize({
      url: process.env.ELECTRIC_URL || 'http://localhost:5133',
      authToken: process.env.ELECTRIC_AUTH_TOKEN
    });
    results.electricSQL = true;
    logger.info('[SUCCESS] ElectricSQL service initialized');
  } catch (error) {
    logger.error('[ERROR] Failed to initialize ElectricSQL service:', error);
    if (process.env.NODE_ENV === 'development') {
      logger.warn('[WARNING]  Continuing without ElectricSQL in development mode');
    }
  }
  */

  // Initialize WebSocket service
  try {
    logger.info('Initializing WebSocket service...');
    websocketService.initialize(httpServer);
    results.websocket = true;
    logger.info('[SUCCESS] WebSocket service initialized');
  } catch (error) {
    logger.error('[ERROR] Failed to initialize WebSocket service:', error);
  }

  return results;
}

// Start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('[SUCCESS] Database connected successfully');

    // Initialize all services
    const serviceResults = await initializeServices();
    
    const initializedServices = Object.entries(serviceResults)
      .filter(([_, initialized]) => initialized)
      .map(([service, _]) => service);
    
    const failedServices = Object.entries(serviceResults)
      .filter(([_, initialized]) => !initialized)
      .map(([service, _]) => service);

    if (initializedServices.length > 0) {
      logger.info(`[SUCCESS] Initialized services: ${initializedServices.join(', ')}`);
    }
    
    if (failedServices.length > 0) {
      logger.warn(`[WARNING]  Failed to initialize: ${failedServices.join(', ')}`);
    }
    
    // Warm up cache for critical endpoints
    if (process.env.NODE_ENV === 'production') {
      await warmCache();
    }

    // Start HTTP server (includes WebSocket)
    httpServer.listen(PORT, () => {
      logger.info(`[SERVER] Server is running on port ${PORT}`);
      logger.info(`[ENV] Environment: ${process.env.NODE_ENV}`);
      logger.info(`[LINK] Health check: http://localhost:${PORT}/health`);
      logger.info(`[ELECTRIC] ElectricSQL sync: ${process.env.ELECTRIC_SYNC_URL}`);
      logger.info(`[LINK] SharePoint site: ${process.env.SHAREPOINT_SITE_URL}`);
      logger.info(`[DATABASE]  Database: PostgreSQL with ElectricSQL`);
      logger.info(`[MOBILE] Real-time sync: ${serviceResults.electricSQL ? 'Enabled' : 'Disabled'}`);
      logger.info(`[WEBSOCKET] WebSocket: ${serviceResults.websocket ? 'Enabled' : 'Disabled'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await cleanup();
  process.exit(0);
});

// Cleanup function
async function cleanup() {
  try {
    logger.info('Starting graceful shutdown...');
    
    // Close WebSocket service
    await websocketService.cleanup();
    
    // ElectricSQL cleanup - commented out as it's not used in this iteration
    // await electricSQLService.close();
    
    // Close SharePoint service
    await sharePointService.cleanup();
    
    // Close Microsoft Graph service
    await microsoftGraphService.cleanup();
    
    // Disconnect from database
    await prisma.$disconnect();
    
    // Close HTTP server
    httpServer.close();
    
    logger.info('[SUCCESS] Graceful shutdown completed');
  } catch (error) {
    logger.error('[ERROR] Error during cleanup:', error);
  }
}

// Start the server
startServer();