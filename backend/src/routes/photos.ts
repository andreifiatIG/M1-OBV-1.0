import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { photoUpload, handleMulterError, getFileUrl, deleteFile, getFileInfo, storePhoto } from '../middleware/upload';
import { logger } from '../utils/logger';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import sharePointService from '../services/sharePointService';
import multer from 'multer';
import { fileUploadRateLimit, onboardingReadRateLimit } from '../middleware/rateLimiting';

const router = Router();

// Validation schemas
const createPhotoSchema = z.object({
  villaId: z.string().uuid(),
  category: z.enum([
    'EXTERIOR_VIEWS', 'INTERIOR_LIVING_SPACES', 'BEDROOMS', 'BATHROOMS',
    'KITCHEN', 'DINING_AREAS', 'POOL_OUTDOOR_AREAS', 'GARDEN_LANDSCAPING',
    'AMENITIES_FACILITIES', 'VIEWS_SURROUNDINGS', 'STAFF_AREAS', 
    'UTILITY_AREAS', 'LOGO', 'FLOOR_PLAN', 'VIDEOS', 'DRONE_SHOTS',
    'ENTERTAINMENT', 'VIRTUAL_TOUR', 'OTHER'
  ]),
  caption: z.string().optional(),
  altText: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isMain: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

const updatePhotoSchema = createPhotoSchema.partial();

// GET /api/photos - Get all photos with pagination and filtering
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const villaId = req.query.villaId as string;
    const category = req.query.category as string;
    const isMain = req.query.isMain === 'true' ? true : req.query.isMain === 'false' ? false : undefined;
    
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (villaId) where.villaId = villaId;
    if (category) where.category = category;
    if (isMain !== undefined) where.isMain = isMain;

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
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
          { isMain: 'desc' },
          { sortOrder: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.photo.count({ where }),
    ]);

    res.json({
      photos,
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
    logger.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// GET /api/photos/:id - Get photo by ID
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        villa: {
          select: {
            id: true,
            villaName: true,
            villaCode: true,
          },
        },
      },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.json(photo);
  } catch (error) {
    logger.error('Error fetching photo:', error);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

// GET /api/photos/villa/:villaId - Get photos by villa ID
router.get('/villa/:villaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const category = req.query.category as string;

    const where: any = { villaId };
    if (category) where.category = category;

    const photos = await prisma.photo.findMany({
      where,
      orderBy: [
        { isMain: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(photos);
  } catch (error) {
    logger.error('Error fetching villa photos:', error);
    res.status(500).json({ error: 'Failed to fetch villa photos' });
  }
});

// GET /api/photos/file/:filename - Serve photo file
router.get('/file/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'photos', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Photo file not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    logger.error('Error serving photo file:', error);
    res.status(500).json({ error: 'Failed to serve photo file' });
  }
});

// GET /api/photos/public/:photoId - Public endpoint for serving photos (no auth required)
router.get('/public/:photoId', async (req: Request, res: Response) => {
  // Set request timeout to prevent hanging
  req.setTimeout(15000, () => {
    if (!res.headersSent) {
      const transparentPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.set({
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      res.send(transparentPixel);
    }
  });
  try {
    const { photoId } = req.params;

    // Find the photo in database
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: {
        fileName: true,
        sharePointFileId: true,
        mimeType: true,
        fileUrl: true,
      },
    });

    if (!photo) {
      // Return a 1x1 transparent pixel instead of error
      const transparentPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.set({
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      return res.send(transparentPixel);
    }

    // Try local file first for faster serving
    const filePath = path.join(process.cwd(), 'uploads', 'photos', photo.fileName);
    
    if (fs.existsSync(filePath)) {
      // Set proper headers for image serving
      res.set({
        'Content-Type': photo.mimeType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      });
      return res.sendFile(filePath);
    }

    // Try SharePoint as fallback (with timeout)
    if (photo.sharePointFileId) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('SharePoint download timeout')), 3000); // 3 second timeout
        });
        
        // Race between download and timeout
        const downloadResult = await Promise.race([
          sharePointService.downloadDocument(photo.sharePointFileId),
          timeoutPromise
        ]) as any;
        
        res.set({
          'Content-Type': downloadResult.mimeType || photo.mimeType || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'X-Content-Type-Options': 'nosniff',
        });
        
        if (Buffer.isBuffer(downloadResult.content)) {
          return res.send(downloadResult.content);
        } else if (downloadResult.content instanceof ArrayBuffer) {
          return res.send(Buffer.from(downloadResult.content));
        } else {
          return res.send(Buffer.from(downloadResult.content));
        }
      } catch (error) {
        logger.warn(`Failed to serve from SharePoint: ${error}`);
      }
    }

    // Return transparent pixel if all fails
    const transparentPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set({
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    return res.send(transparentPixel);
  } catch (error) {
    logger.error('Error serving public photo:', error);
    // Return transparent pixel on error
    const transparentPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set({
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.send(transparentPixel);
  }
});

// GET /api/photos/serve/:photoId - Serve photo by database ID (supports SharePoint and local)
router.get('/serve/:photoId', async (req: Request, res: Response) => {
  // Set request timeout to prevent hanging
  req.setTimeout(15000, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  try {
    const { photoId } = req.params;

    // Find the photo in database
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: {
        fileName: true,
        sharePointFileId: true,
        mimeType: true,
        fileUrl: true,
      },
    });

    if (!photo) {
      // Return a placeholder image instead of JSON error
      const placeholderSvg = `
        <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="400" fill="#f1f5f9"/>
          <text x="200" y="200" font-family="Arial" font-size="20" text-anchor="middle" fill="#64748b">Photo Not Found</text>
        </svg>
      `;
      res.set({
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      return res.send(placeholderSvg);
    }

    // Try SharePoint first if SharePoint file ID exists (with timeout)
    if (photo.sharePointFileId) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('SharePoint download timeout')), 3000); // 3 second timeout
        });
        
        // Race between download and timeout
        const downloadResult = await Promise.race([
          sharePointService.downloadDocument(photo.sharePointFileId),
          timeoutPromise
        ]) as any;
        
        // Set appropriate headers with better caching and CORS support
        res.set({
          'Content-Type': downloadResult.mimeType || photo.mimeType || 'image/jpeg',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'X-Content-Type-Options': 'nosniff',
        });
        
        // Ensure we're sending the buffer correctly
        if (Buffer.isBuffer(downloadResult.content)) {
          return res.send(downloadResult.content);
        } else if (downloadResult.content instanceof ArrayBuffer) {
          return res.send(Buffer.from(downloadResult.content));
        } else {
          // Try to convert to buffer
          return res.send(Buffer.from(downloadResult.content));
        }
      } catch (sharePointError) {
        logger.warn(`Failed to serve from SharePoint, trying local: ${photo.sharePointFileId}`, sharePointError);
      }
    }

    // Fallback to local file if SharePoint fails or doesn't exist
    const filePath = path.join(process.cwd(), 'uploads', 'photos', photo.fileName);
    
    if (!fs.existsSync(filePath)) {
      // Return a placeholder image for missing files
      const placeholderSvg = `
        <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="400" fill="#fef2f2"/>
          <text x="200" y="200" font-family="Arial" font-size="20" text-anchor="middle" fill="#dc2626">Image Not Available</text>
        </svg>
      `;
      res.set({
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      return res.send(placeholderSvg);
    }

    // Set appropriate headers for local file serving
    res.set({
      'Content-Type': photo.mimeType || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.sendFile(filePath);
  } catch (error) {
    logger.error('Error serving photo:', error);
    
    // Return error placeholder image instead of JSON
    const errorSvg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="#fef2f2"/>
        <text x="200" y="190" font-family="Arial" font-size="20" text-anchor="middle" fill="#dc2626">Error Loading Image</text>
        <text x="200" y="220" font-family="Arial" font-size="14" text-anchor="middle" fill="#7f1d1d">${error instanceof Error ? error.message : 'Unknown error'}</text>
      </svg>
    `;
    res.set({
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.status(500).send(errorSvg);
  }
});

// POST /api/photos/upload - Upload photos
router.post(
  '/upload',
  fileUploadRateLimit,
  authMiddleware,
  photoUpload.array('photos', 20),
  handleMulterError,
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { villaId, category = 'OTHER', tags = '[]' } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No photos uploaded' });
      }

      if (!villaId) {
        return res.status(400).json({ error: 'Villa ID is required' });
      }

      // Check if villa exists
      const villa = await prisma.villa.findUnique({
        where: { id: villaId },
      });

      if (!villa) {
        // Clean up uploaded files
        files.forEach(file => deleteFile(file.filename, 'photo'));
        return res.status(400).json({ error: 'Villa not found' });
      }

      const parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags || '[]');
      
      // Create photo records
      const photoPromises = files.map((file, index) => {
        const fileInfo = getFileInfo(file);
        
        return prisma.photo.create({
          data: {
            villaId,
            category: category as any,
            fileName: fileInfo.filename,
            fileUrl: getFileUrl(fileInfo.filename, 'photo'),
            fileSize: fileInfo.size,
            mimeType: fileInfo.mimetype,
            tags: parsedTags,
            sortOrder: index,
          },
          include: {
            villa: {
              select: {
                id: true,
                villaName: true,
                villaCode: true,
              },
            },
          },
        });
      });

      const photos = await Promise.all(photoPromises);

      logger.info(`${photos.length} photos uploaded for villa ${villa.villaName}`);
      res.status(201).json({
        message: `${photos.length} photos uploaded successfully`,
        photos,
      });
    } catch (error) {
      // Clean up uploaded files on error
      const files = req.files as Express.Multer.File[];
      if (files) {
        files.forEach(file => deleteFile(file.filename, 'photo'));
      }
      
      logger.error('Error uploading photos:', error);
      res.status(500).json({ error: 'Failed to upload photos' });
    }
  }
);

// PUT /api/photos/:id - Update photo metadata
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updatePhotoSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if photo exists
      const existingPhoto = await prisma.photo.findUnique({
        where: { id },
      });

      if (!existingPhoto) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      // If villaId is being updated, check if new villa exists
      if (updateData.villaId && updateData.villaId !== existingPhoto.villaId) {
        const villa = await prisma.villa.findUnique({
          where: { id: updateData.villaId },
        });

        if (!villa) {
          return res.status(400).json({ error: 'Villa not found' });
        }
      }

      // If setting as main photo, unset other main photos for the same villa
      if (updateData.isMain === true) {
        await prisma.photo.updateMany({
          where: {
            villaId: updateData.villaId || existingPhoto.villaId,
            isMain: true,
            id: { not: id },
          },
          data: { isMain: false },
        });
      }

      const photo = await prisma.photo.update({
        where: { id },
        data: updateData,
        include: {
          villa: {
            select: {
              id: true,
              villaName: true,
              villaCode: true,
            },
          },
        },
      });

      logger.info(`Photo updated: ${photo.id}`);
      res.json(photo);
    } catch (error) {
      logger.error('Error updating photo:', error);
      res.status(500).json({ error: 'Failed to update photo' });
    }
  }
);

// POST /api/photos/:id/set-main - Set photo as main photo
router.post('/:id/set-main', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Unset other main photos for the same villa
    await prisma.photo.updateMany({
      where: {
        villaId: photo.villaId,
        isMain: true,
        id: { not: id },
      },
      data: { isMain: false },
    });

    // Set this photo as main
    const updatedPhoto = await prisma.photo.update({
      where: { id },
      data: { isMain: true },
      include: {
        villa: {
          select: {
            id: true,
            villaName: true,
            villaCode: true,
          },
        },
      },
    });

    logger.info(`Photo set as main: ${id} for villa ${updatedPhoto.villa.villaName}`);
    res.json(updatedPhoto);
  } catch (error) {
    logger.error('Error setting main photo:', error);
    res.status(500).json({ error: 'Failed to set main photo' });
  }
});

// PUT /api/photos/reorder - Reorder photos
router.put('/reorder', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { photoIds } = req.body;

    if (!Array.isArray(photoIds)) {
      return res.status(400).json({ error: 'photoIds must be an array' });
    }

    // Update sort order for each photo
    const updatePromises = photoIds.map((photoId: string, index: number) =>
      prisma.photo.update({
        where: { id: photoId },
        data: { sortOrder: index },
      })
    );

    await Promise.all(updatePromises);

    logger.info(`Reordered ${photoIds.length} photos`);
    res.json({ message: 'Photos reordered successfully' });
  } catch (error) {
    logger.error('Error reordering photos:', error);
    res.status(500).json({ error: 'Failed to reorder photos' });
  }
});

// DELETE /api/photos/:id - Delete photo
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingPhoto = await prisma.photo.findUnique({
      where: { id },
    });

    if (!existingPhoto) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete the photo record from database
    await prisma.photo.delete({
      where: { id },
    });

    // Delete from SharePoint if SharePoint file ID exists
    if (existingPhoto.sharePointFileId) {
      try {
        await sharePointService.deleteDocument(existingPhoto.sharePointFileId);
        logger.info(`Photo deleted from SharePoint: ${existingPhoto.sharePointFileId}`);
      } catch (sharePointError) {
        logger.error(`Failed to delete photo from SharePoint: ${existingPhoto.sharePointFileId}`, sharePointError);
        // Continue execution - don't fail the entire operation if SharePoint deletion fails
      }
    }

    // Delete the physical file from local storage (if exists)
    try {
      deleteFile(existingPhoto.fileName, 'photo');
    } catch (fileError) {
      logger.warn(`Failed to delete local file: ${existingPhoto.fileName}`, fileError);
    }

    logger.info(`Photo deleted successfully: ${id}`);
    res.json({ message: 'Photo deleted successfully', deletedFromSharePoint: !!existingPhoto.sharePointFileId });
  } catch (error) {
    logger.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// DELETE /api/photos/villa/:villaId - Delete all photos for a villa
router.delete('/villa/:villaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;

    const photos = await prisma.photo.findMany({
      where: { villaId },
      select: { id: true, fileName: true, sharePointFileId: true },
    });

    if (photos.length === 0) {
      return res.json({ message: 'No photos found for this villa' });
    }

    // Delete all photo records from database
    await prisma.photo.deleteMany({
      where: { villaId },
    });

    let sharePointDeletedCount = 0;
    // Delete from SharePoint if SharePoint file IDs exist
    for (const photo of photos) {
      if (photo.sharePointFileId) {
        try {
          await sharePointService.deleteDocument(photo.sharePointFileId);
          sharePointDeletedCount++;
          logger.info(`Photo deleted from SharePoint: ${photo.sharePointFileId}`);
        } catch (sharePointError) {
          logger.error(`Failed to delete photo from SharePoint: ${photo.sharePointFileId}`, sharePointError);
        }
      }
    }

    // Delete all physical files from local storage
    photos.forEach(photo => {
      try {
        deleteFile(photo.fileName, 'photo');
      } catch (fileError) {
        logger.warn(`Failed to delete local file: ${photo.fileName}`, fileError);
      }
    });

    logger.info(`${photos.length} photos deleted for villa ${villaId}, ${sharePointDeletedCount} deleted from SharePoint`);
    res.json({ 
      message: `${photos.length} photos deleted successfully`,
      sharePointDeleted: sharePointDeletedCount,
      total: photos.length
    });
  } catch (error) {
    logger.error('Error deleting villa photos:', error);
    res.status(500).json({ error: 'Failed to delete villa photos' });
  }
});

// POST /api/photos/upload-sharepoint - Upload photos to SharePoint
const memoryStorage = multer.memoryStorage();
const sharePointUpload = multer({ 
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

router.post(
  '/upload-sharepoint',
  fileUploadRateLimit,
  authMiddleware,
  sharePointUpload.array('photos', 20),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { villaId, category = 'OTHER', subfolder = '', tags = '[]' } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No photos uploaded' });
      }

      if (!villaId) {
        return res.status(400).json({ error: 'Villa ID is required' });
      }

      // Check if villa exists
      const villa = await prisma.villa.findUnique({
        where: { id: villaId },
      });

      if (!villa) {
        return res.status(400).json({ error: 'Villa not found' });
      }

      // Map frontend categories to SharePoint folder structure
      const categoryFolderMap: Record<string, string> = {
        'logo': 'Photos/Logo',
        'floor_plan': 'Photos/Floor Plan',
        'exterior_views': 'Photos/Exterior Views',
        'interior_living_spaces': 'Photos/Interior Living Spaces',
        'bedrooms': `Photos/Bedrooms${subfolder ? '/' + subfolder : ''}`,
        'bathrooms': 'Photos/Bathrooms',
        'kitchen': 'Photos/Kitchen',
        'dining_areas': 'Photos/Dining Areas',
        'pool_outdoor_areas': 'Photos/Pool & Outdoor Areas',
        'garden_landscaping': 'Photos/Garden & Landscaping',
        'amenities_facilities': 'Photos/Amenities & Facilities',
        'views_surroundings': 'Photos/Views & Surroundings',
        'staff_areas': 'Photos/Staff Areas',
        'utility_areas': 'Photos/Utility Areas',
        'videos': 'Photos/Videos',
        'drone_shots': 'Photos/Drone Shots',
        'entertainment': 'Photos/Entertainment',
        // Facility-specific categories
        'facility_photos': 'Photos/Facilities'
      };

      const sharePointFolder = categoryFolderMap[category] || 'Photos/Other';
      const parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags || '[]');
      
      // Check if villa has any main photo
      const existingMainPhoto = await prisma.photo.findFirst({
        where: { villaId, isMain: true }
      });
      
      // Upload files using database-first approach with SharePoint fallback
      const uploadPromises = files.map(async (file, index) => {
        let dbResult = null;
        let sharePointResult = null;
        let error = null;

        // Try database storage first
        try {
          logger.info(`[DB] Attempting database storage for photo: ${file.originalname}`);
          dbResult = await storePhoto(
            villaId,
            file,
            category.toUpperCase(),
            {
              subfolder: subfolder || undefined,
              isMain: !existingMainPhoto && index === 0,
              caption: parsedTags.join(', ') || undefined,
              altText: `${category} photo for villa`
            }
          );
          
          logger.info(`[DB-OK] Photo stored in database: ${file.originalname}`, {
            photoId: dbResult.id,
            villaId,
            category,
            size: file.size,
            isMain: !existingMainPhoto && index === 0
          });
          
          // Return database result with proper URLs
          return {
            ...dbResult,
            fileUrl: getFileUrl(dbResult.id, 'photo'),
            thumbnailUrl: getFileUrl(dbResult.id, 'photo') + '/thumbnail',
            storageMethod: 'database',
            villa: {
              id: villaId,
              villaName: villa.villaName,
              villaCode: villa.villaCode
            }
          };
          
        } catch (dbError) {
          logger.warn(`[DB-FALLBACK] Database storage failed for photo ${file.originalname}, trying SharePoint:`, dbError);
          error = dbError;
        }

        // Fallback to SharePoint if database storage fails
        try {
          // Create temporary file for SharePoint upload
          const tempFilePath = path.join(process.cwd(), 'temp', file.originalname);
          
          // Ensure temp directory exists
          const tempDir = path.dirname(tempFilePath);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          // Write file buffer to temporary location
          fs.writeFileSync(tempFilePath, file.buffer);

          try {
            // Upload to SharePoint
            sharePointResult = await sharePointService.uploadFile(
              tempFilePath,
              villaId,
              sharePointFolder,
              file.originalname,
              file.mimetype
            );

            // Extract actual filename from SharePoint URL to handle auto-renamed duplicates
            const actualFileName = sharePointResult.fileUrl.split('/').pop()?.split('?')[0] || sharePointResult.fileName;
            const decodedFileName = decodeURIComponent(actualFileName);

            // Create photo record in database with SharePoint metadata
            const photo = await prisma.photo.create({
              data: {
                villaId,
                category: category.toUpperCase() as any,
                fileName: decodedFileName,
                fileUrl: sharePointResult.fileUrl,
                fileSize: sharePointResult.size,
                mimeType: file.mimetype,
                tags: parsedTags,
                sortOrder: index,
                // Set first photo as main if no main photo exists
                isMain: !existingMainPhoto && index === 0,
                // Store SharePoint metadata
                sharePointPath: sharePointResult.filePath,
                sharePointFileId: sharePointResult.fileId,
                // Store subfolder for bedroom organization
                subfolder: subfolder || null,
              },
              include: {
                villa: {
                  select: {
                    id: true,
                    villaName: true,
                    villaCode: true,
                  },
                },
              },
            });

            logger.info(`[SP-OK] Photo uploaded to SharePoint: ${sharePointResult.fileName}`, {
              photoId: photo.id,
              villaId,
              category,
              sharePointPath: sharePointResult.filePath,
              fileId: sharePointResult.fileId,
              fallback: true
            });

            // Clean up temporary file
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }

            return {
              ...photo,
              storageMethod: 'sharepoint-fallback'
            };
          } catch (sharePointError) {
            // Clean up temporary file on error
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
            
            logger.error(`[SP-FAIL] SharePoint upload failed for photo ${file.originalname}:`, sharePointError);
            throw new Error(`Both database and SharePoint storage failed. DB: ${error?.message}, SP: ${sharePointError.message}`);
          }
        } catch (fallbackError) {
          logger.error(`[UPLOAD-FAIL] All storage methods failed for photo ${file.originalname}:`, fallbackError);
          throw fallbackError;
        }
      });

      const photos = await Promise.all(uploadPromises);

      // Count storage methods used
      const storageStats = photos.reduce((stats, photo) => {
        const method = photo.storageMethod || 'unknown';
        stats[method] = (stats[method] || 0) + 1;
        return stats;
      }, {} as Record<string, number>);

      logger.info(`${photos.length} photos uploaded for villa ${villa.villaName} in category ${category}`, {
        storageStats,
        villaId,
        category,
        subfolder
      });
      
      res.status(201).json({
        message: `${photos.length} photos uploaded successfully`,
        photos: photos.map(photo => ({
          ...photo,
          // Ensure all photos have proper URLs for frontend
          fileUrl: photo.fileUrl || (photo.storageMethod === 'database' ? getFileUrl(photo.id, 'photo') : photo.fileUrl),
          thumbnailUrl: photo.thumbnailUrl || (photo.storageMethod === 'database' ? getFileUrl(photo.id, 'photo') + '/thumbnail' : undefined)
        })),
        storageStats,
        sharePointFolder: sharePointFolder,
        info: {
          primaryStorage: 'database',
          fallbackStorage: 'sharepoint',
          databaseFirst: true,
          category,
          subfolder: subfolder || null
        }
      });
    } catch (error) {
      logger.error('Error uploading photos to SharePoint:', error);
      
      
      res.status(500).json({ 
        error: 'Failed to upload photos to SharePoint',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

// GET /api/photos/sharepoint/:villaId - Get photos from SharePoint for a villa
router.get('/sharepoint/:villaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const category = req.query.category as string;

    // Build where clause for database query
    const where: any = { villaId, NOT: { sharePointFileId: null } };
    if (category) where.category = category.toUpperCase();

    const photos = await prisma.photo.findMany({
      where,
      orderBy: [
        { isMain: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        villa: {
          select: {
            id: true,
            villaName: true,
            villaCode: true,
          },
        },
      },
    });

    // Get real-time SharePoint folder contents for comparison
    try {
      // Get the villa to get the proper SharePoint path
      const villa = await prisma.villa.findUnique({
        where: { id: villaId },
        select: { sharePointPath: true, villaName: true, villaCode: true }
      });
      
      const sharePointPath = villa?.sharePointPath || `/Villas/${villa?.villaName}_${villa?.villaCode}`;
      const folderContents = await sharePointService.listFiles(`${sharePointPath}/Photos`);
      
      res.json({
        photos,
        sharePointFiles: folderContents,
        summary: {
          databasePhotos: photos.length,
          sharePointFiles: folderContents.length,
          category: category || 'all'
        }
      });
    } catch (sharePointError) {
      logger.warn('Could not fetch SharePoint folder contents:', sharePointError);
      res.json({ photos });
    }
  } catch (error) {
    logger.error('Error fetching SharePoint photos:', error);
    res.status(500).json({ error: 'Failed to fetch SharePoint photos' });
  }
});

// POST /api/photos/upload-facility - Upload facility photos with proper naming convention
router.post(
  '/upload-facility',
  fileUploadRateLimit,
  authMiddleware,
  sharePointUpload.array('photos', 20), // Max 20 photos per facility item
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { 
        villaId, 
        facilityCategory, 
        facilityItemName, 
        facilityItemId,
        tags = '[]' 
      } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No photos uploaded' });
      }

      if (!villaId || !facilityCategory || !facilityItemName) {
        return res.status(400).json({ 
          error: 'Villa ID, facility category, and facility item name are required' 
        });
      }

      // Check if villa exists
      const villa = await prisma.villa.findUnique({
        where: { id: villaId },
      });

      if (!villa) {
        return res.status(400).json({ error: 'Villa not found' });
      }

      // Create facility-specific folder structure with naming convention
      // Format: Photos/Facilities/{Category}/{ItemName}
      const sanitizedCategory = facilityCategory.replace(/[^a-zA-Z0-9-_]/g, '_');
      const sanitizedItemName = facilityItemName.replace(/[^a-zA-Z0-9-_\s]/g, '_').replace(/\s+/g, '_');
      const facilityFolder = `Photos/Facilities/${sanitizedCategory}/${sanitizedItemName}`;
      
      const parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags || '[]');
      
      // Add facility-specific tags
      const facilityTags = [
        ...parsedTags,
        `facility:${facilityCategory}`,
        `item:${facilityItemName}`,
        'facilities_checklist'
      ];
      
      // Check if villa has any main photo for facility uploads too
      const existingMainPhotoFacility = await prisma.photo.findFirst({
        where: { villaId, isMain: true }
      });
      
      // Upload files to SharePoint and create database records
      const uploadPromises = files.map(async (file, index) => {
        // Create facility-specific filename: {ItemName}_{Index}_{OriginalName}
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileExtension = path.extname(file.originalname);
        const facilityFileName = `${sanitizedItemName}_${index + 1}_${timestamp}${fileExtension}`;
        
        // Create temporary file for SharePoint upload
        const tempFilePath = path.join(process.cwd(), 'temp', facilityFileName);
        
        // Ensure temp directory exists
        const tempDir = path.dirname(tempFilePath);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Write file buffer to temporary location
        fs.writeFileSync(tempFilePath, file.buffer);

        try {
          // Upload to SharePoint
          const sharePointResult = await sharePointService.uploadFile(
            tempFilePath,
            villaId,
            facilityFolder,
            facilityFileName,
            file.mimetype
          );

          // Extract actual filename from SharePoint URL to handle auto-renamed duplicates
          const actualFileName = sharePointResult.fileUrl.split('/').pop()?.split('?')[0] || sharePointResult.fileName;
          const decodedFileName = decodeURIComponent(actualFileName);

          // Create photo record in database
          const photo = await prisma.photo.create({
            data: {
              villaId,
              category: 'AMENITIES_FACILITIES', // Use existing category for facilities
              fileName: decodedFileName,
              fileUrl: sharePointResult.fileUrl,
              fileSize: sharePointResult.size,
              mimeType: file.mimetype,
              tags: facilityTags,
              sortOrder: index,
              caption: `${facilityItemName} - Photo ${index + 1}`,
              altText: `${facilityCategory} - ${facilityItemName}`,
              // Set first facility photo as main if no main photo exists
              isMain: !existingMainPhotoFacility && index === 0,
              // Store SharePoint metadata
              sharePointPath: sharePointResult.filePath,
              sharePointFileId: sharePointResult.fileId,
              // Store facility item as subfolder for organization
              subfolder: facilityItemName,
            },
            include: {
              villa: {
                select: {
                  id: true,
                  villaName: true,
                  villaCode: true,
                },
              },
            },
          });

          // Clean up temporary file
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }

          return photo;
        } catch (error) {
          // Clean up temporary file on error
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          throw error;
        }
      });

      const photos = await Promise.all(uploadPromises);

      logger.info(`${photos.length} facility photos uploaded for ${facilityItemName} in villa ${villa.villaName}`);
      
      // Update the facility checklist item with the first photo URL
      if (photos.length > 0 && facilityItemId) {
        try {
          await prisma.facilityChecklist.update({
            where: { id: facilityItemId },
            data: { photoUrl: photos[0].fileUrl }
          });
        } catch (facilityError) {
          logger.warn('Could not update facility checklist with photo URL:', facilityError);
        }
      }

      res.status(201).json({
        message: `${photos.length} facility photos uploaded successfully`,
        photos,
        facilityFolder,
        facilityItemName,
        facilityCategory
      });
    } catch (error) {
      logger.error('Error uploading facility photos:', error);
      res.status(500).json({ 
        error: 'Failed to upload facility photos',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

// GET /api/photos/stats - Get photo statistics
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const [total, byCategory, byVilla] = await Promise.all([
      prisma.photo.count(),
      prisma.photo.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
      prisma.photo.groupBy({
        by: ['villaId'],
        _count: { villaId: true },
        _sum: { fileSize: true },
      }),
    ]);

    const totalSize = await prisma.photo.aggregate({
      _sum: { fileSize: true },
    });

    const stats = {
      total,
      totalSize: totalSize._sum.fileSize || 0,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      }, {} as Record<string, number>),
      byVilla: byVilla.map(item => ({
        villaId: item.villaId,
        count: item._count.villaId,
        totalSize: item._sum.fileSize || 0,
      })),
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching photo statistics:', error);
    res.status(500).json({ error: 'Failed to fetch photo statistics' });
  }
});

// GET /api/photos/proxy/:photoId - Proxy SharePoint images with authentication
router.get('/proxy/:photoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    
    // Get photo from database
    const photo = await prisma.photo.findUnique({
      where: { id: photoId }
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    if (!photo.fileUrl) {
      return res.status(404).json({ error: 'Photo URL not available' });
    }
    
    try {
      // Check if we have a SharePoint file ID to download with  
      if (photo.sharePointFileId) {
        try {
          const downloadResult = await sharePointService.downloadDocument(photo.sharePointFileId);
          const buffer = Buffer.from(downloadResult.content);
          
          // Set appropriate headers
          res.set({
            'Content-Type': photo.mimeType || 'image/jpeg',
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            'ETag': `"${photo.id}-${photo.updatedAt.getTime()}"`
          });
          
          // Send the image
          return res.send(buffer);
          
        } catch (downloadError) {
          logger.warn('Failed to download via SharePoint service, trying direct URL', downloadError);
        }
      }
      
      // Fallback: Check if fileUrl is a direct download URL
      if (photo.fileUrl.includes('@microsoft.graph.downloadUrl') || photo.fileUrl.includes('/content')) {
        try {
          const response = await fetch(photo.fileUrl);
          
          if (response.ok) {
            const imageBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(imageBuffer);
            
            res.set({
              'Content-Type': photo.mimeType || 'image/jpeg',
              'Content-Length': buffer.length.toString(),
              'Cache-Control': 'public, max-age=3600',
              'ETag': `"${photo.id}-${photo.updatedAt.getTime()}"`
            });
            
            return res.send(buffer);
          }
        } catch (directError) {
          logger.warn('Direct URL fetch failed', directError);
        }
      }
      
      // If all methods fail
      return res.status(404).json({ error: 'Image not accessible' });
      
    } catch (fetchError) {
      logger.error('Error fetching SharePoint image:', fetchError);
      res.status(500).json({ error: 'Failed to fetch image' });
    }
    
  } catch (error) {
    logger.error('Error in photo proxy:', error);
    res.status(500).json({ error: 'Failed to proxy photo' });
  }
});

export default router;
