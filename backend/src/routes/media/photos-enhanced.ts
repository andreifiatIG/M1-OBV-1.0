import express, { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { mediaService } from '../../services/storage/mediaService';
import { authMiddleware } from '../../middleware/auth';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// Rate limiting for uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 uploads per window
  message: 'Too many uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const photoUploadSchema = z.object({
  villaId: z.string().uuid(),
  category: z.enum(['EXTERIOR', 'INTERIOR', 'BEDROOMS', 'BATHROOMS', 'AMENITIES', 'LOGO']),
  subfolder: z.string().optional(),
  tags: z.array(z.string()).optional(),
  caption: z.string().optional(),
  altText: z.string().optional(),
  generateThumbnail: z.boolean().optional().default(true),
  quality: z.number().min(10).max(100).optional().default(80)
});

const photoMetadataUpdateSchema = z.object({
  tags: z.array(z.string()).optional(),
  caption: z.string().optional(),
  altText: z.string().optional(),
  isMain: z.boolean().optional(),
  sortOrder: z.number().optional()
});

/**
 * POST /api/photos - Upload single or multiple photos
 */
router.post('/', authMiddleware, uploadLimiter, upload.array('photos', 10), async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();
  
  try {
    logger.info(`[${requestId}] Photos upload started`, {
      fileCount: (req.files as Express.Multer.File[])?.length || 0,
      userId: (req as any).userId
    });

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    // Validate request body
    const validationResult = photoUploadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const options = validationResult.data;
    const results = [];
    const errors = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        logger.info(`[${requestId}] Processing file ${i + 1}/${files.length}:`, {
          fileName: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        });

        const result = await mediaService.uploadPhoto(
          file.buffer,
          file.originalname,
          file.mimetype,
          {
            ...options,
            tags: options.tags || [],
            altText: options.altText || file.originalname
          }
        );

        results.push(result);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[${requestId}] Failed to upload file ${file.originalname}:`, error);
        
        errors.push({
          fileName: file.originalname,
          error: errorMessage
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Photos upload completed`, {
      successful: results.length,
      failed: errors.length,
      duration
    });

    // Return results
    if (results.length > 0) {
      res.status(errors.length > 0 ? 207 : 201).json({
        success: true,
        data: results,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          uploaded: results.length,
          failed: errors.length,
          total: files.length
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'All uploads failed',
        errors
      });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Photos upload request failed:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      userId: (req as any).userId
    });

    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/photos/villa/:villaId - Get all photos for a villa
 */
router.get('/villa/:villaId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();
  
  try {
    const { villaId } = req.params;
    const { category } = req.query;

    logger.info(`[${requestId}] Getting villa photos:`, {
      villaId,
      category: category as string,
      userId: (req as any).userId
    });

    const photos = await mediaService.getVillaPhotos(
      villaId, 
      category as string
    );

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Villa photos retrieved:`, {
      villaId,
      count: photos.length,
      duration
    });

    // Set cache headers for performance
    res.set({
      'Cache-Control': 'private, max-age=300', // 5 minutes
      'ETag': `"photos-${villaId}-${photos.length}-${Date.now()}"`
    });

    res.json({
      success: true,
      data: photos,
      count: photos.length
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Failed to get villa photos:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      villaId: req.params.villaId,
      duration
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve photos'
    });
  }
});

/**
 * GET /api/photos/public/:photoId - Get photo content (public endpoint for img tags)
 */
router.get('/public/:photoId', async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();
  
  try {
    const { photoId } = req.params;
    
    const photo = await mediaService.getPhotoById(photoId, true);
    if (!photo || !photo.fileContent) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }

    const duration = Date.now() - startTime;
    
    // Set appropriate headers
    res.set({
      'Content-Type': photo.mimeType,
      'Content-Length': photo.fileContent.length.toString(),
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'ETag': `"photo-${photoId}-${photo.updatedAt.getTime()}"`,
      'X-Response-Time': `${duration}ms`
    });

    res.send(photo.fileContent);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Failed to serve photo:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      photoId: req.params.photoId,
      duration
    });

    res.status(500).json({
      success: false,
      error: 'Failed to serve photo'
    });
  }
});

/**
 * GET /api/photos/thumbnail/:photoId - Get photo thumbnail
 */
router.get('/thumbnail/:photoId', async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();
  
  try {
    const { photoId } = req.params;
    
    const photo = await mediaService.getPhotoById(photoId, true);
    if (!photo || !photo.thumbnailContent) {
      // Fallback to full image if no thumbnail
      if (photo?.fileContent) {
        res.set({
          'Content-Type': photo.mimeType,
          'Content-Length': photo.fileContent.length.toString(),
          'Cache-Control': 'public, max-age=31536000'
        });
        return res.send(photo.fileContent);
      }
      
      return res.status(404).json({
        success: false,
        error: 'Thumbnail not found'
      });
    }

    const duration = Date.now() - startTime;
    
    // Set appropriate headers for thumbnail
    res.set({
      'Content-Type': 'image/jpeg', // Thumbnails are always JPEG
      'Content-Length': photo.thumbnailContent.length.toString(),
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'ETag': `"thumb-${photoId}-${photo.updatedAt.getTime()}"`,
      'X-Response-Time': `${duration}ms`
    });

    res.send(photo.thumbnailContent);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Failed to serve thumbnail:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      photoId: req.params.photoId,
      duration
    });

    res.status(500).json({
      success: false,
      error: 'Failed to serve thumbnail'
    });
  }
});

/**
 * PUT /api/photos/:photoId/metadata - Update photo metadata
 */
router.put('/:photoId/metadata', authMiddleware, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();
  
  try {
    const { photoId } = req.params;
    
    // Validate request body
    const validationResult = photoMetadataUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const updates = validationResult.data;
    
    logger.info(`[${requestId}] Updating photo metadata:`, {
      photoId,
      updates: Object.keys(updates),
      userId: (req as any).userId
    });

    const result = await mediaService.updatePhotoMetadata(photoId, updates);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Photo metadata updated:`, {
      photoId,
      duration
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Failed to update photo metadata:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      photoId: req.params.photoId,
      duration
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update photo metadata'
    });
  }
});

/**
 * DELETE /api/photos/:photoId - Delete photo
 */
router.delete('/:photoId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();
  
  try {
    const { photoId } = req.params;
    
    logger.info(`[${requestId}] Deleting photo:`, {
      photoId,
      userId: (req as any).userId
    });

    const success = await mediaService.deletePhoto(photoId);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Photo deleted:`, {
      photoId,
      duration
    });

    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Failed to delete photo:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      photoId: req.params.photoId,
      duration
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete photo'
    });
  }
});

// Error handling middleware
router.use((error: any, req: Request, res: Response, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum is 10 files per request.'
      });
    }
  }

  if (error.message && error.message.includes('Unsupported file type')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  logger.error('Photos router error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

export default router;