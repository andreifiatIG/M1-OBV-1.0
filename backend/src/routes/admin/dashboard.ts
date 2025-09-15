import { Router, Request, Response } from 'express';
import dashboardService from '../services/dashboardService';
import onboardingProgressService from '../services/onboardingProgressService';
import onboardingService from '../services/onboardingService';
import { simpleClerkAuth } from '../middleware/simpleClerkAuth';

const router = Router();

// Simple development middleware that bypasses authentication
router.use((req: any, _res, next) => {
  req.auth = { userId: 'dev-user-123' };
  req.user = { id: 'dev-user-123', email: 'dev@example.com', role: 'admin' };
  next();
});

/**
 * @route   GET /api/dashboard/test
 * @desc    Test endpoint to verify router is working
 * @access  Public
 */
router.get('/test', (_req: Request, res: Response) => {
  res.json({ message: 'Dashboard router is working!' });
});

/**
 * @route   GET /api/dashboard/debug-auth
 * @desc    Debug authentication issues
 * @access  Public (for debugging)
 */
router.get('/debug-auth', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  res.json({
    success: true,
    debug: {
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeader ? (authHeader.startsWith('Bearer ') ? 'Valid Bearer format' : 'Invalid format') : 'No header',
      authHeaderLength: authHeader ? authHeader.length : 0,
      tokenPresent: authHeader ? authHeader.substring(7).length > 0 : false,
    },
    message: 'Use this info to debug authentication issues',
  });
});

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get basic dashboard statistics
 * @access  Private
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
    });
  }
});

/**
 * @route   GET /api/dashboard/management
 * @desc    Get management dashboard data
 * @access  Private
 */
router.get('/management', async (_req: Request, res: Response) => {
  try {
    const management = await dashboardService.getManagementDashboard();
    res.json({
      success: true,
      data: management,
    });
  } catch (error) {
    console.error('Management dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch management dashboard data',
    });
  }
});

/**
 * @route   GET /api/dashboard/villas
 * @desc    Get villa management data with filters and pagination
 * @access  Private
 */
router.get('/villas', async (req: Request, res: Response) => {
  try {
    const { destination, bedrooms, status, search, page, limit } = req.query;
    
    const filters = {
      destination: destination as string,
      bedrooms: bedrooms ? parseInt(bedrooms as string) : undefined,
      status: status as string,
      search: search as string,
    };
    
    const pagination = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    };
    
    const data = await dashboardService.getVillaManagementData(filters, pagination);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Villa management data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch villa management data',
    });
  }
});

/**
 * @route   GET /api/dashboard/owners
 * @desc    Get owner management data with filters and pagination
 * @access  Private
 */
router.get('/owners', async (req: Request, res: Response) => {
  try {
    const { search, nationality, page, limit } = req.query;
    
    const filters = {
      search: search as string,
      nationality: nationality as string,
    };
    
    const pagination = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    };
    
    const data = await dashboardService.getOwnerManagementData(filters, pagination);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Owner management data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch owner management data',
    });
  }
});

/**
 * @route   GET /api/dashboard/staff
 * @desc    Get staff management data with filters and pagination
 * @access  Private
 */
router.get('/staff', async (req: Request, res: Response) => {
  try {
    const { search, position, department, villaId, page, limit } = req.query;
    
    const filters = {
      search: search as string,
      position: position as string,
      department: department as string,
      villaId: villaId as string,
    };
    
    const pagination = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    };
    
    const data = await dashboardService.getStaffManagementData(filters, pagination);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Staff management data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff management data',
    });
  }
});

/**
 * @route   GET /api/dashboard/documents
 * @desc    Get document management data with filters and pagination
 * @access  Private
 */
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const { search, documentType, villaId, page, limit } = req.query;
    
    const filters = {
      search: search as string,
      documentType: documentType as string,
      villaId: villaId as string,
    };
    
    const pagination = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    };
    
    const data = await dashboardService.getDocumentManagementData(filters, pagination);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Document management data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document management data',
    });
  }
});

// ==================== ENHANCED ONBOARDING PROGRESS ENDPOINTS ====================

/**
 * @route   GET /api/dashboard/onboarding-progress/:villaId
 * @desc    Get detailed onboarding progress for a specific villa
 * @access  Private
 */
router.get('/onboarding-progress/:villaId', simpleClerkAuth, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const progress = await onboardingProgressService.getVillaProgress(villaId);
    
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('Villa onboarding progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch villa onboarding progress',
    });
  }
});

/**
 * @route   POST /api/dashboard/onboarding-progress/:villaId/initialize
 * @desc    Initialize onboarding progress for a villa
 * @access  Private
 */
router.post('/onboarding-progress/:villaId/initialize', simpleClerkAuth, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const { userId, userEmail } = req.body;
    
    await onboardingProgressService.initializeVillaProgress(villaId, userId, userEmail);
    
    res.json({
      success: true,
      message: 'Villa onboarding progress initialized successfully',
    });
  } catch (error) {
    console.error('Initialize onboarding progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize onboarding progress',
    });
  }
});

/**
 * @route   POST /api/dashboard/onboarding-progress/:villaId/skip-field
 * @desc    Skip a specific field in the onboarding process
 * @access  Private
 */
router.post('/onboarding-progress/:villaId/skip-field', simpleClerkAuth, async (_req: Request, res: Response) => {
  return res.status(410).json({ success: false, error: 'Skip/Unskip API has been removed' });
});

/**
 * @route   POST /api/dashboard/onboarding-progress/:villaId/unskip-field
 * @desc    Unskip a previously skipped field
 * @access  Private
 */
router.post('/onboarding-progress/:villaId/unskip-field', simpleClerkAuth, async (_req: Request, res: Response) => {
  return res.status(410).json({ success: false, error: 'Skip/Unskip API has been removed' });
});

/**
 * @route   GET /api/dashboard/onboarding-overview
 * @desc    Get comprehensive onboarding overview for dashboard
 * @access  Private
 */
router.get('/onboarding-overview', async (_req: Request, res: Response) => {
  try {
    const overview = await onboardingProgressService.getDashboardOnboardingData();
    
    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error('Onboarding overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch onboarding overview',
    });
  }
});

/**
 * @route   GET /api/dashboard/overview
 * @desc    Get dashboard overview with key metrics
 * @access  Private
 */
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const overview = await dashboardService.getDashboardOverview();
    
    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard overview',
    });
  }
});

/**
 * @route   GET /api/dashboard/quick-stats
 * @desc    Get quick stats for dashboard widgets
 * @access  Private
 */
router.get('/quick-stats', async (_req: Request, res: Response) => {
  try {
    const quickStats = await dashboardService.getQuickStats();
    
    res.json({
      success: true,
      data: quickStats,
    });
  } catch (error) {
    console.error('Quick stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quick stats',
    });
  }
});

// ==================== ADMIN APPROVAL ENDPOINTS ====================

/**
 * @route   GET /api/dashboard/pending-approvals
 * @desc    Get pending villa approvals for admin review
 * @access  Private (Admin only)
 */
router.get('/pending-approvals', async (_req: Request, res: Response) => {
  return res.status(410).json({ success: false, error: 'Admin approval system has been removed' });
});

/**
 * @route   GET /api/dashboard/approval-stats
 * @desc    Get approval statistics for admin dashboard
 * @access  Private (Admin only)
 */
router.get('/approval-stats', async (_req: Request, res: Response) => {
  return res.status(410).json({ success: false, error: 'Admin approval system has been removed' });
});

/**
 * @route   POST /api/dashboard/approve/:villaId
 * @desc    Approve a villa onboarding application
 * @access  Private (Admin only)
 */
router.post('/approve/:villaId', async (_req: Request, res: Response) => {
  return res.status(410).json({ success: false, error: 'Admin approval system has been removed' });
});

/**
 * @route   POST /api/dashboard/reject/:villaId
 * @desc    Reject a villa onboarding application
 * @access  Private (Admin only)
 */
router.post('/reject/:villaId', async (_req: Request, res: Response) => {
  return res.status(410).json({ success: false, error: 'Admin approval system has been removed' });
});

export default router;