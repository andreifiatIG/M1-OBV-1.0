import { Router, Request, Response } from 'express';
import { clerkAuth, optionalClerkAuth, authorize, createMockClerkToken } from '../middleware/clerkAuth';
import microsoftGraphService from '../services/microsoftGraphService';
import sharePointService from '../services/sharePointService';
import electricSQLService from '../electric/client';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Health check endpoint (no auth required)
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      microsoftGraph: microsoftGraphService ? 'initialized' : 'not initialized',
      sharePoint: sharePointService ? 'initialized' : 'not initialized',
      electricSQL: electricSQLService.getSyncStatus().connected ? 'connected' : 'disconnected',
    },
  });
});

/**
 * Test Clerk authentication
 */
router.get('/auth', clerkAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Authentication successful',
    user: req.user,
    auth: req.auth,
  });
});

/**
 * Test role-based authorization
 */
router.get('/admin', clerkAuth, authorize(['admin']), (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Admin access granted',
    user: req.user,
  });
});

/**
 * Test optional authentication
 */
router.get('/optional-auth', optionalClerkAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: req.user ? 'Authenticated user' : 'Anonymous user',
    user: req.user || null,
  });
});

/**
 * Microsoft Graph status
 */
router.get('/graph-status', optionalClerkAuth, async (req: Request, res: Response) => {
  try {
    const testConnection = await microsoftGraphService.testConnection();
    const siteUrl = process.env.SHAREPOINT_SITE_URL || 'https://yourcompany.sharepoint.com/sites/VillaDocuments';
    let siteInfo;
    
    try {
      siteInfo = await microsoftGraphService.getSiteInfo(siteUrl);
    } catch (error: any) {
      siteInfo = { error: error.message };
    }
    
    res.json({
      success: true,
      message: testConnection ? 'Microsoft Graph is connected' : 'Microsoft Graph connection failed',
      data: {
        connected: testConnection,
        site: siteInfo,
        siteUrl: siteUrl,
        authenticated: !!req.user,
      },
    });
  } catch (error: any) {
    logger.error('Microsoft Graph test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Microsoft Graph connection failed',
    });
  }
});

/**
 * SharePoint status
 */
router.get('/sharepoint-status', optionalClerkAuth, async (req: Request, res: Response) => {
  try {
    const testConnection = await sharePointService.testConnection();
    let documents;
    
    try {
      // Try to list documents for a test villa
      documents = await sharePointService.listVillaDocuments('test-villa-status');
    } catch (error: any) {
      documents = [];
    }
    
    res.json({
      success: true,
      message: testConnection ? 'SharePoint is connected' : 'SharePoint connection failed',
      data: {
        connected: testConnection,
        documentsFound: documents.length,
        authenticated: !!req.user,
      },
    });
  } catch (error: any) {
    logger.error('SharePoint test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'SharePoint connection failed',
    });
  }
});

/**
 * ElectricSQL status
 */
router.get('/electric-status', optionalClerkAuth, (req: Request, res: Response) => {
  try {
    const status = electricSQLService.getSyncStatus();
    
    res.json({
      success: true,
      message: 'ElectricSQL status retrieved',
      data: {
        connected: status.connected,
        subscriptionsCount: status.subscriptionsCount,
        authContext: status.authContext,
        authenticated: !!req.user,
      },
    });
  } catch (error: any) {
    logger.error('ElectricSQL test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'ElectricSQL status check failed',
    });
  }
});

/**
 * Create mock Clerk token for testing (development only)
 */
router.post('/create-mock-token', (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Mock tokens only available in development',
    });
  }

  const { userId, email, role, villaId } = req.body;
  
  if (!userId || !email) {
    return res.status(400).json({
      success: false,
      error: 'userId and email are required',
    });
  }

  try {
    const token = createMockClerkToken(userId, email, role || 'user', villaId);
    
    res.json({
      success: true,
      message: 'Mock token created',
      data: {
        token,
        bearer: `Bearer ${token}`,
        expires: '24 hours',
      },
    });
  } catch (error: any) {
    logger.error('Mock token creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create mock token',
    });
  }
});

/**
 * WebSocket connection test
 */
router.get('/websocket-status', optionalClerkAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'WebSocket service is available',
    data: {
      endpoint: `ws://localhost:${process.env.PORT || 4001}`,
      authenticated: !!req.user,
      instructions: 'Connect using Socket.io client with authentication token',
    },
  });
});

export default router;