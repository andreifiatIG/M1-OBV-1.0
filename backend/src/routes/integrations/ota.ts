import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { OTACredentialsService } from '../services/otaCredentialsService';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();
const otaCredentialsService = new OTACredentialsService();

// Validation schemas
const createOTACredentialsSchema = z.object({
  villaId: z.string().uuid(),
  platform: z.enum([
    'BOOKING_COM', 'AIRBNB', 'VRBO', 'EXPEDIA', 'AGODA',
    'HOTELS_COM', 'TRIPADVISOR', 'HOMEAWAY', 'FLIPKEY', 'DIRECT'
  ]),
  propertyId: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateOTACredentialsSchema = createOTACredentialsSchema.partial().omit({ villaId: true, platform: true });

// GET /api/ota - Get all OTA credentials with pagination and filtering
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const villaId = req.query.villaId as string;
    const platform = req.query.platform as string;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const masked = req.query.masked === 'true';
    
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (villaId) where.villaId = villaId;
    if (platform) where.platform = platform;
    if (isActive !== undefined) where.isActive = isActive;

    const [otaCredentials, total] = await Promise.all([
      prisma.oTACredentials.findMany({
        where,
        include: {
          villa: {
            select: {
              id: true,
              villaName: true,
              villaCode: true,
            },
          },
        },
        orderBy: [
          { platform: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.oTACredentials.count({ where }),
    ]);

    // Format response with masking if requested
    let formattedCredentials;
    if (masked) {
      formattedCredentials = await Promise.all(
        otaCredentials.map(async (creds) => 
          await otaCredentialsService.getMaskedOTACredentials(creds.id)
        )
      );
    } else {
      formattedCredentials = await Promise.all(
        otaCredentials.map(async (creds) => {
          const service = new OTACredentialsService();
          return await service.getOTACredentialsById(creds.id);
        })
      );
    }

    res.json({
      otaCredentials: formattedCredentials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.error('Error fetching OTA credentials:', error);
    res.status(500).json({ error: 'Failed to fetch OTA credentials' });
  }
});

// GET /api/ota/platforms - Get available OTA platforms
router.get('/platforms', authMiddleware, async (req: Request, res: Response) => {
  try {
    const platforms = otaCredentialsService.getAvailablePlatforms();
    
    res.json({
      platforms: platforms.map(platform => ({
        value: platform,
        label: platform.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      })),
    });
  } catch (error) {
    logger.error('Error fetching OTA platforms:', error);
    res.status(500).json({ error: 'Failed to fetch OTA platforms' });
  }
});

// GET /api/ota/:id - Get OTA credentials by ID
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const masked = req.query.masked === 'true';

    let otaCredentials;
    if (masked) {
      otaCredentials = await otaCredentialsService.getMaskedOTACredentials(id);
    } else {
      otaCredentials = await otaCredentialsService.getOTACredentialsById(id);
    }

    if (!otaCredentials) {
      return res.status(404).json({ error: 'OTA credentials not found' });
    }

    res.json(otaCredentials);
  } catch (error) {
    logger.error('Error fetching OTA credentials:', error);
    res.status(500).json({ error: 'Failed to fetch OTA credentials' });
  }
});

// GET /api/ota/villa/:villaId - Get OTA credentials by villa ID
router.get('/villa/:villaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const platform = req.query.platform as string;
    const masked = req.query.masked === 'true';

    let otaCredentials;

    if (platform) {
      // Get specific platform credentials
      const creds = await otaCredentialsService.getOTACredentialsByVillaAndPlatform(villaId, platform);
      if (!creds) {
        return res.status(404).json({ error: 'OTA credentials not found for this villa and platform' });
      }
      
      otaCredentials = masked ? await otaCredentialsService.getMaskedOTACredentials(creds.id) : creds;
    } else {
      // Get all credentials for villa
      const allCreds = await otaCredentialsService.getOTACredentialsByVillaId(villaId);
      
      if (masked) {
        otaCredentials = await Promise.all(
          allCreds.map(async (creds) => 
            await otaCredentialsService.getMaskedOTACredentials(creds.id)
          )
        );
      } else {
        otaCredentials = allCreds;
      }
    }

    res.json(otaCredentials);
  } catch (error) {
    logger.error('Error fetching OTA credentials for villa:', error);
    res.status(500).json({ error: 'Failed to fetch OTA credentials' });
  }
});

// POST /api/ota - Create OTA credentials
router.post(
  '/',
  authMiddleware,
  validateRequest(createOTACredentialsSchema),
  async (req: Request, res: Response) => {
    try {
      const otaCredentialsData = req.body;

      // Check if credentials already exist for this villa and platform
      const existingCredentials = await otaCredentialsService.getOTACredentialsByVillaAndPlatform(
        otaCredentialsData.villaId,
        otaCredentialsData.platform
      );

      if (existingCredentials) {
        return res.status(400).json({ 
          error: 'OTA credentials already exist for this villa and platform',
          existingId: existingCredentials.id 
        });
      }

      const otaCredentials = await otaCredentialsService.createOTACredentials(otaCredentialsData);

      logger.info(`OTA credentials created for ${otaCredentials.platform} - villa ${otaCredentials.villa?.villaName}`);
      res.status(201).json(otaCredentials);
    } catch (error) {
      logger.error('Error creating OTA credentials:', error);
      res.status(500).json({ error: 'Failed to create OTA credentials' });
    }
  }
);

// PUT /api/ota/:id - Update OTA credentials
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateOTACredentialsSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if OTA credentials exist
      const existingCredentials = await otaCredentialsService.getOTACredentialsById(id);
      if (!existingCredentials) {
        return res.status(404).json({ error: 'OTA credentials not found' });
      }

      const otaCredentials = await otaCredentialsService.updateOTACredentials(id, updateData);

      logger.info(`OTA credentials updated: ${id} - ${otaCredentials.platform}`);
      res.json(otaCredentials);
    } catch (error) {
      logger.error('Error updating OTA credentials:', error);
      res.status(500).json({ error: 'Failed to update OTA credentials' });
    }
  }
);

// POST /api/ota/:id/test-connection - Test OTA connection
router.post('/:id/test-connection', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if OTA credentials exist
    const existingCredentials = await otaCredentialsService.getOTACredentialsById(id);
    if (!existingCredentials) {
      return res.status(404).json({ error: 'OTA credentials not found' });
    }

    // Mock connection test (in production, you'd integrate with actual OTA APIs)
    const testResult = {
      success: Math.random() > 0.3, // 70% success rate for demo
      platform: existingCredentials.platform,
      propertyId: existingCredentials.propertyId,
      message: Math.random() > 0.3 ? 'Connection successful' : 'Invalid credentials or API error',
      timestamp: new Date(),
    };

    // Update sync status based on test result
    await otaCredentialsService.updateSyncStatus(
      id,
      testResult.success ? 'SUCCESS' : 'FAILED',
      new Date()
    );

    logger.info(`OTA connection test for ${existingCredentials.platform}: ${testResult.success ? 'SUCCESS' : 'FAILED'}`);
    res.json(testResult);
  } catch (error) {
    logger.error('Error testing OTA connection:', error);
    res.status(500).json({ error: 'Failed to test OTA connection' });
  }
});

// POST /api/ota/:id/sync - Trigger sync with OTA platform
router.post('/:id/sync', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { syncType = 'full' } = req.body;

    // Check if OTA credentials exist
    const existingCredentials = await otaCredentialsService.getOTACredentialsById(id);
    if (!existingCredentials) {
      return res.status(404).json({ error: 'OTA credentials not found' });
    }

    if (!existingCredentials.isActive) {
      return res.status(400).json({ error: 'Cannot sync with inactive OTA credentials' });
    }

    // Update sync status to in progress
    await otaCredentialsService.updateSyncStatus(id, 'IN_PROGRESS');

    // Mock sync process (in production, you'd integrate with actual OTA APIs)
    const syncResult = {
      success: Math.random() > 0.2, // 80% success rate for demo
      platform: existingCredentials.platform,
      syncType,
      itemsSynced: Math.floor(Math.random() * 100) + 1,
      startTime: new Date(),
      duration: Math.floor(Math.random() * 30000) + 5000, // 5-35 seconds
    };

    // Update final sync status
    setTimeout(async () => {
      await otaCredentialsService.updateSyncStatus(
        id,
        syncResult.success ? 'SUCCESS' : 'FAILED',
        new Date()
      );
    }, 1000);

    logger.info(`OTA sync triggered for ${existingCredentials.platform}: ${syncType} sync`);
    res.json({
      message: 'Sync initiated successfully',
      ...syncResult,
    });
  } catch (error) {
    logger.error('Error syncing with OTA platform:', error);
    res.status(500).json({ error: 'Failed to sync with OTA platform' });
  }
});

// POST /api/ota/:id/activate - Activate OTA credentials
router.post('/:id/activate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const otaCredentials = await otaCredentialsService.updateOTACredentials(id, { isActive: true });

    logger.info(`OTA credentials activated: ${id} - ${otaCredentials.platform}`);
    res.json(otaCredentials);
  } catch (error) {
    logger.error('Error activating OTA credentials:', error);
    res.status(500).json({ error: 'Failed to activate OTA credentials' });
  }
});

// POST /api/ota/:id/deactivate - Deactivate OTA credentials
router.post('/:id/deactivate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const otaCredentials = await otaCredentialsService.updateOTACredentials(id, { isActive: false });

    logger.info(`OTA credentials deactivated: ${id} - ${otaCredentials.platform}`);
    res.json(otaCredentials);
  } catch (error) {
    logger.error('Error deactivating OTA credentials:', error);
    res.status(500).json({ error: 'Failed to deactivate OTA credentials' });
  }
});

// DELETE /api/ota/:id - Delete OTA credentials
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if OTA credentials exist
    const existingCredentials = await otaCredentialsService.getOTACredentialsById(id);
    if (!existingCredentials) {
      return res.status(404).json({ error: 'OTA credentials not found' });
    }

    await otaCredentialsService.deleteOTACredentials(id);

    logger.info(`OTA credentials deleted: ${id} - ${existingCredentials.platform}`);
    res.json({ message: 'OTA credentials deleted successfully' });
  } catch (error) {
    logger.error('Error deleting OTA credentials:', error);
    res.status(500).json({ error: 'Failed to delete OTA credentials' });
  }
});

// GET /api/ota/stats - Get OTA credentials statistics
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const villaId = req.query.villaId as string;
    const where = villaId ? { villaId } : {};

    const [total, active, inactive, byPlatform, bySyncStatus] = await Promise.all([
      prisma.oTACredentials.count({ where }),
      prisma.oTACredentials.count({ where: { ...where, isActive: true } }),
      prisma.oTACredentials.count({ where: { ...where, isActive: false } }),
      prisma.oTACredentials.groupBy({
        by: ['platform'],
        where,
        _count: { platform: true },
      }),
      prisma.oTACredentials.groupBy({
        by: ['syncStatus'],
        where,
        _count: { syncStatus: true },
      }),
    ]);

    const stats = {
      total,
      active,
      inactive,
      byPlatform: byPlatform.reduce((acc, item) => {
        acc[item.platform] = item._count.platform;
        return acc;
      }, {} as Record<string, number>),
      bySyncStatus: bySyncStatus.reduce((acc, item) => {
        acc[item.syncStatus] = item._count.syncStatus;
        return acc;
      }, {} as Record<string, number>),
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching OTA credentials statistics:', error);
    res.status(500).json({ error: 'Failed to fetch OTA credentials statistics' });
  }
});

export default router;