import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import databaseFileStorageService from '../services/databaseFileStorageService';
import { logger } from '../utils/logger';
import { onboardingReadRateLimit } from '../middleware/rateLimiting';

const router = Router();

/**
 * Serve document from database
 * GET /api/files/documents/:documentId
 */
router.get('/documents/:documentId', 
  authMiddleware, 
  onboardingReadRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const download = req.query.download === 'true';

      logger.info(`[FILE-SERVER] Serving document: ${documentId}`);

      const file = await databaseFileStorageService.retrieveDocument(documentId);

      // Set appropriate headers
      res.set({
        'Content-Type': file.mimeType,
        'Content-Length': file.size.toString(),
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'ETag': `"${documentId}"`,
        ...(download && {
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`
        })
      });

      // Check if client has cached version
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag === `"${documentId}"`) {
        return res.status(304).end();
      }

      res.send(file.content);
      logger.info(`[FILE-SERVER] Document served: ${file.fileName} (${file.size} bytes)`);

    } catch (error) {
      logger.error(`[FILE-SERVER] Failed to serve document ${req.params.documentId}:`, error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to serve document'
      });
    }
  }
);

/**
 * Serve photo from database
 * GET /api/files/photos/:photoId
 * GET /api/files/photos/:photoId/thumbnail
 */
router.get('/photos/:photoId/:size?', 
  authMiddleware, 
  onboardingReadRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { photoId, size } = req.params;
      const thumbnail = size === 'thumbnail';
      const download = req.query.download === 'true';

      logger.info(`[FILE-SERVER] Serving photo: ${photoId} (${thumbnail ? 'thumbnail' : 'full'})`);

      const file = await databaseFileStorageService.retrievePhoto(photoId, thumbnail);

      // Set appropriate headers for images
      res.set({
        'Content-Type': file.mimeType,
        'Content-Length': file.size.toString(),
        'Cache-Control': 'public, max-age=604800', // 7 days for images
        'ETag': `"${photoId}-${thumbnail ? 'thumb' : 'full'}"`,
        ...(download && {
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`
        })
      });

      // Check if client has cached version
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag === `"${photoId}-${thumbnail ? 'thumb' : 'full'}"`) {
        return res.status(304).end();
      }

      res.send(file.content);
      logger.info(`[FILE-SERVER] Photo served: ${file.fileName} (${file.size} bytes)`);

    } catch (error) {
      logger.error(`[FILE-SERVER] Failed to serve photo ${req.params.photoId}:`, error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Photo not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to serve photo'
      });
    }
  }
);

/**
 * Get storage statistics
 * GET /api/files/stats
 */
router.get('/stats', 
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const stats = await databaseFileStorageService.getStorageStats();

      res.json({
        success: true,
        data: {
          ...stats,
          totalStorageSizeMB: Math.round(stats.totalStorageSize / (1024 * 1024) * 100) / 100,
          totalFiles: stats.totalDocuments + stats.totalPhotos
        }
      });

    } catch (error) {
      logger.error('[FILE-SERVER] Failed to get storage stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get storage statistics'
      });
    }
  }
);

/**
 * Health check for file server
 * GET /api/files/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const stats = await databaseFileStorageService.getStorageStats();
    
    res.json({
      success: true,
      service: 'Database File Server',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats: {
        totalFiles: stats.totalDocuments + stats.totalPhotos,
        storageUsedMB: Math.round(stats.totalStorageSize / (1024 * 1024) * 100) / 100
      }
    });

  } catch (error) {
    logger.error('[FILE-SERVER] Health check failed:', error);
    res.status(503).json({
      success: false,
      service: 'Database File Server',
      status: 'unhealthy',
      error: 'Service unavailable'
    });
  }
});

export default router;