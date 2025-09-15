import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import sharp from 'sharp';
import { authenticate } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * Upload/Update facility photo
 * Stores thumbnail locally for fast loading, optionally uploads to SharePoint
 */
router.post('/facility/:facilityId/photo', authenticate, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No photo provided' });
    }

    logger.info(`📷 [FACILITY-PHOTO] Processing photo for facility ${facilityId}`);

    // Check if facility exists
    const facility = await prisma.facilityChecklist.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    // Process image with sharp for optimization
    const processedImage = await sharp(file.buffer)
      .resize(800, 600, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Get image metadata
    const metadata = await sharp(processedImage).metadata();

    // Update facility with photo data
    const updatedFacility = await prisma.facilityChecklist.update({
      where: { id: facilityId },
      data: {
        photoData: processedImage,
        photoMimeType: 'image/jpeg',
        photoSize: processedImage.length,
        photoWidth: metadata.width,
        photoHeight: metadata.height,
        // Keep SharePoint URL if it exists (as backup)
      },
    });

    logger.info(`📷 [FACILITY-PHOTO] Stored photo locally for facility ${facilityId}: ${processedImage.length} bytes`);

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        facilityId,
        photoSize: processedImage.length,
        width: metadata.width,
        height: metadata.height,
      },
    });
  } catch (error) {
    logger.error('📷 [FACILITY-PHOTO] Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get facility photo
 * Returns local photo if available, otherwise returns SharePoint URL
 */
router.get('/facility/:facilityId/photo', async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.params;
    const { fallback } = req.query;

    const facility = await prisma.facilityChecklist.findUnique({
      where: { id: facilityId },
      select: {
        photoData: true,
        photoMimeType: true,
        photoUrl: true,
        itemName: true,
      },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    // Try local photo first
    if (facility.photoData) {
      logger.debug(`📷 [FACILITY-PHOTO] Serving local photo for facility ${facilityId}`);
      
      // Set appropriate headers for caching
      res.set({
        'Content-Type': facility.photoMimeType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        'ETag': `"${facilityId}-${Date.now()}"`,
      });

      return res.send(facility.photoData);
    }

    // Fallback to SharePoint URL if available
    if (facility.photoUrl && fallback !== 'false') {
      logger.debug(`📷 [FACILITY-PHOTO] Redirecting to SharePoint for facility ${facilityId}`);
      return res.redirect(facility.photoUrl);
    }

    // No photo available
    res.status(404).json({ 
      error: 'No photo available',
      itemName: facility.itemName 
    });
  } catch (error) {
    logger.error('📷 [FACILITY-PHOTO] Retrieval error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete facility photo (local only)
 */
router.delete('/facility/:facilityId/photo', authenticate, async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.params;

    const updatedFacility = await prisma.facilityChecklist.update({
      where: { id: facilityId },
      data: {
        photoData: null,
        photoMimeType: null,
        photoSize: null,
        photoWidth: null,
        photoHeight: null,
      },
    });

    logger.info(`📷 [FACILITY-PHOTO] Deleted local photo for facility ${facilityId}`);

    res.json({
      success: true,
      message: 'Photo deleted successfully',
      hasSharePointBackup: !!updatedFacility.photoUrl,
    });
  } catch (error) {
    logger.error('📷 [FACILITY-PHOTO] Deletion error:', error);
    res.status(500).json({ 
      error: 'Failed to delete photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Batch get facility photos for a villa
 * Optimized for loading multiple facilities at once
 */
router.get('/villa/:villaId/facility-photos', async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const { category, available } = req.query;

    const whereClause: any = { villaId };
    
    if (category) {
      whereClause.category = category as string;
    }
    
    if (available !== undefined) {
      whereClause.isAvailable = available === 'true';
    }

    const facilities = await prisma.facilityChecklist.findMany({
      where: whereClause,
      select: {
        id: true,
        itemName: true,
        category: true,
        subcategory: true,
        photoData: !!req.query.includeData, // Only include data if requested
        photoMimeType: true,
        photoSize: true,
        photoWidth: true,
        photoHeight: true,
        photoUrl: true,
      },
      orderBy: [
        { category: 'asc' },
        { itemName: 'asc' },
      ],
    });

    const photoInfo = facilities.map(facility => ({
      facilityId: facility.id,
      itemName: facility.itemName,
      category: facility.category,
      subcategory: facility.subcategory,
      hasLocalPhoto: !!facility.photoData,
      hasSharePointPhoto: !!facility.photoUrl,
      photoSize: facility.photoSize,
      photoWidth: facility.photoWidth,
      photoHeight: facility.photoHeight,
      localPhotoUrl: facility.photoData ? `/api/facility-photos/facility/${facility.id}/photo` : null,
      sharePointUrl: facility.photoUrl,
    }));

    logger.debug(`📷 [FACILITY-PHOTO] Retrieved photo info for ${photoInfo.length} facilities in villa ${villaId}`);

    res.json({
      success: true,
      count: photoInfo.length,
      photos: photoInfo,
    });
  } catch (error) {
    logger.error('📷 [FACILITY-PHOTO] Batch retrieval error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve facility photos',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;