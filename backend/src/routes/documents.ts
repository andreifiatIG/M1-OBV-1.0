import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { documentUpload, handleMulterError, getFileUrl, deleteFile, getFileInfo, storeDocument } from '../middleware/upload';
import sharePointService from '../services/sharePointService';
import multer from 'multer';
import { logger } from '../utils/logger';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { fileUploadRateLimit } from '../middleware/rateLimiting';

const router = Router();

// Validation schemas
const createDocumentSchema = z.object({
  villaId: z.string().uuid(),
  documentType: z.enum([
    'PROPERTY_CONTRACT', 'INSURANCE_CERTIFICATE', 'PROPERTY_TITLE',
    'TAX_DOCUMENTS', 'UTILITY_BILLS', 'MAINTENANCE_RECORDS',
    'INVENTORY_LIST', 'HOUSE_RULES', 'EMERGENCY_CONTACTS',
    'STAFF_CONTRACTS', 'LICENSES_PERMITS', 'FLOOR_PLANS', 'OTHER'
  ]),
  description: z.string().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

const updateDocumentSchema = createDocumentSchema.partial();

// GET /api/documents - Get all documents with pagination and filtering
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const villaId = req.query.villaId as string;
    const documentType = req.query.documentType as string;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const search = req.query.search as string;
    
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (villaId) where.villaId = villaId;
    if (documentType) where.documentType = documentType;
    if (isActive !== undefined) where.isActive = isActive;
    
    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
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
          { documentType: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    res.json({
      documents,
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
    logger.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/documents/:id - Get document by ID
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
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

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    logger.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// GET /api/documents/villa/:villaId - Get documents by villa ID
router.get('/villa/:villaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const documentType = req.query.documentType as string;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const where: any = { villaId };
    if (documentType) where.documentType = documentType;
    if (isActive !== undefined) where.isActive = isActive;

    const documents = await prisma.document.findMany({
      where,
      orderBy: [
        { documentType: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(documents);
  } catch (error) {
    logger.error('Error fetching villa documents:', error);
    res.status(500).json({ error: 'Failed to fetch villa documents' });
  }
});

// GET /api/documents/file/:filename - Serve document file (fallback to local storage)
router.get('/file/:filename', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // First try to find document in database to get SharePoint info
    const document = await prisma.document.findFirst({
      where: { fileName: filename },
    });

    if (document?.sharePointFileId) {
      try {
        // Download from SharePoint
        const sharePointFile = await sharePointService.downloadDocument(document.sharePointFileId);
        
        res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
        res.setHeader('Content-Type', document.mimeType);
        res.setHeader('Content-Length', sharePointFile.content.byteLength.toString());
        
        const buffer = Buffer.from(sharePointFile.content);
        return res.send(buffer);
      } catch (sharePointError) {
        logger.warn('Failed to download from SharePoint, falling back to local:', sharePointError);
      }
    }

    // Fallback to local file storage
    const filePath = path.join(process.cwd(), 'uploads', 'documents', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document file not found' });
    }

    if (document) {
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      res.setHeader('Content-Type', document.mimeType);
    }

    res.sendFile(filePath);
  } catch (error) {
    logger.error('Error serving document file:', error);
    res.status(500).json({ error: 'Failed to serve document file' });
  }
});

// GET /api/documents/download/:id - Download document by ID
router.get('/download/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Try SharePoint first if available
    if (document.sharePointFileId) {
      try {
        const sharePointFile = await sharePointService.downloadDocument(document.sharePointFileId);
        
        res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
        res.setHeader('Content-Type', document.mimeType);
        res.setHeader('Content-Length', sharePointFile.content.byteLength.toString());
        
        const buffer = Buffer.from(sharePointFile.content);
        return res.send(buffer);
      } catch (sharePointError) {
        logger.warn('Failed to download from SharePoint, falling back to local:', sharePointError);
      }
    }

    // Fallback to local file storage
    const filePath = path.join(process.cwd(), 'uploads', 'documents', document.fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document file not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.setHeader('Content-Type', document.mimeType);
    res.sendFile(filePath);
  } catch (error) {
    logger.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// POST /api/documents/upload - Upload documents
router.post(
  '/upload',
  authMiddleware,
  documentUpload.array('documents', 10),
  handleMulterError,
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { villaId, documentType = 'OTHER', description, validFrom, validUntil } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No documents uploaded' });
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
        files.forEach(file => deleteFile(file.filename, 'document'));
        return res.status(400).json({ error: 'Villa not found' });
      }

      // Upload to SharePoint and create document records
      const documentPromises = files.map(async (file) => {
        const fileInfo = getFileInfo(file);
        let sharePointResult = null;
        let fileUrl = getFileUrl(fileInfo.filename, 'document');
        
        try {
          // Check if SharePoint service is available
          const sharePointStatus = sharePointService.getStatus();
          if (sharePointStatus.initialized) {
            // Upload to SharePoint
            const fileBuffer = fs.readFileSync(file.path);
            sharePointResult = await sharePointService.uploadDocument(
              villaId,
              documentType,
              fileInfo.filename,
              fileBuffer,
              fileInfo.mimetype,
              {
                description,
                validFrom: validFrom ? new Date(validFrom) : undefined,
                validUntil: validUntil ? new Date(validUntil) : undefined,
              }
            );
            fileUrl = sharePointResult.fileUrl;
            
            // Clean up local file after successful SharePoint upload
            try {
              fs.unlinkSync(file.path);
            } catch (cleanupError) {
              logger.warn('Failed to clean up local file:', cleanupError);
            }
          } else {
            logger.warn('SharePoint service not available, storing locally only');
          }
        } catch (sharePointError) {
          logger.error('SharePoint upload failed, keeping local copy:', sharePointError);
        }
        
        return prisma.document.create({
          data: {
            villaId,
            documentType: documentType as any,
            fileName: fileInfo.filename,
            fileUrl,
            fileSize: fileInfo.size,
            mimeType: fileInfo.mimetype,
            description,
            validFrom: validFrom ? new Date(validFrom) : null,
            validUntil: validUntil ? new Date(validUntil) : null,
            sharePointFileId: sharePointResult?.fileId || null,
            sharePointPath: sharePointResult?.filePath || null,
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

      const documents = await Promise.all(documentPromises);

      // Update onboarding progress to mark documents as uploaded
      try {
        const progress = await prisma.onboardingProgress.findUnique({
          where: { villaId },
        });

        if (progress && !progress.documentsUploaded) {
          // Check if the villa now has any documents
          const documentCount = await prisma.document.count({
            where: { villaId, isActive: true },
          });

          if (documentCount > 0) {
            await prisma.onboardingProgress.update({
              where: { villaId },
              data: { documentsUploaded: true },
            });
            logger.info(`[OK] Auto-updated documentsUploaded flag for villa ${villaId} (regular upload)`);
          }
        }
      } catch (error) {
        logger.warn('Failed to update onboarding progress after document upload:', error);
        // Don't fail the request if progress update fails
      }

      logger.info(`${documents.length} documents uploaded for villa ${villa.villaName}`);
      res.status(201).json({
        message: `${documents.length} documents uploaded successfully`,
        documents,
      });
    } catch (error) {
      // Clean up uploaded files on error
      const files = req.files as Express.Multer.File[];
      if (files) {
        files.forEach(file => deleteFile(file.filename, 'document'));
      }
      
      logger.error('Error uploading documents:', error);
      res.status(500).json({ error: 'Failed to upload documents' });
    }
  }
);

// PUT /api/documents/:id - Update document metadata
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateDocumentSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if document exists
      const existingDocument = await prisma.document.findUnique({
        where: { id },
      });

      if (!existingDocument) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // If villaId is being updated, check if new villa exists
      if (updateData.villaId && updateData.villaId !== existingDocument.villaId) {
        const villa = await prisma.villa.findUnique({
          where: { id: updateData.villaId },
        });

        if (!villa) {
          return res.status(400).json({ error: 'Villa not found' });
        }
      }

      const document = await prisma.document.update({
        where: { id },
        data: {
          ...updateData,
          validFrom: updateData.validFrom ? new Date(updateData.validFrom) : undefined,
          validUntil: updateData.validUntil ? new Date(updateData.validUntil) : undefined,
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

      logger.info(`Document updated: ${document.id}`);
      res.json(document);
    } catch (error) {
      logger.error('Error updating document:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  }
);

// DELETE /api/documents/:id - Delete document
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingDocument = await prisma.document.findUnique({
      where: { id },
    });

    if (!existingDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from SharePoint if available
    if (existingDocument.sharePointFileId) {
      try {
        await sharePointService.deleteDocument(existingDocument.sharePointFileId, id);
      } catch (sharePointError) {
        logger.warn('Failed to delete from SharePoint:', sharePointError);
      }
    }

    // Delete the document record
    await prisma.document.delete({
      where: { id },
    });

    // Delete the local physical file if it exists
    try {
      deleteFile(existingDocument.fileName, 'document');
    } catch (localError) {
      logger.warn('Failed to delete local file:', localError);
    }

    logger.info(`Document deleted: ${id}`);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    logger.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// POST /api/documents/:id/deactivate - Deactivate document (soft delete)
router.post('/:id/deactivate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.update({
      where: { id },
      data: { isActive: false },
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

    logger.info(`Document deactivated: ${id}`);
    res.json(document);
  } catch (error) {
    logger.error('Error deactivating document:', error);
    res.status(500).json({ error: 'Failed to deactivate document' });
  }
});

// POST /api/documents/:id/activate - Activate document
router.post('/:id/activate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.update({
      where: { id },
      data: { isActive: true },
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

    logger.info(`Document activated: ${id}`);
    res.json(document);
  } catch (error) {
    logger.error('Error activating document:', error);
    res.status(500).json({ error: 'Failed to activate document' });
  }
});

// DELETE /api/documents/villa/:villaId - Delete all documents for a villa
router.delete('/villa/:villaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;

    const documents = await prisma.document.findMany({
      where: { villaId },
      select: { id: true, fileName: true },
    });

    if (documents.length === 0) {
      return res.json({ message: 'No documents found for this villa' });
    }

    // Delete all document records
    await prisma.document.deleteMany({
      where: { villaId },
    });

    // Delete all physical files
    documents.forEach(doc => deleteFile(doc.fileName, 'document'));

    logger.info(`${documents.length} documents deleted for villa ${villaId}`);
    res.json({ message: `${documents.length} documents deleted successfully` });
  } catch (error) {
    logger.error('Error deleting villa documents:', error);
    res.status(500).json({ error: 'Failed to delete villa documents' });
  }
});

// GET /api/documents/stats - Get document statistics
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const [total, active, inactive, byType, byVilla] = await Promise.all([
      prisma.document.count(),
      prisma.document.count({ where: { isActive: true } }),
      prisma.document.count({ where: { isActive: false } }),
      prisma.document.groupBy({
        by: ['documentType'],
        _count: { documentType: true },
      }),
      prisma.document.groupBy({
        by: ['villaId'],
        _count: { villaId: true },
        _sum: { fileSize: true },
      }),
    ]);

    const totalSize = await prisma.document.aggregate({
      _sum: { fileSize: true },
    });

    const stats = {
      total,
      active,
      inactive,
      totalSize: totalSize._sum.fileSize || 0,
      byType: byType.reduce((acc, item) => {
        acc[item.documentType] = item._count.documentType;
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
    logger.error('Error fetching document statistics:', error);
    res.status(500).json({ error: 'Failed to fetch document statistics' });
  }
});

// GET /api/documents/expiring - Get documents expiring soon
router.get('/expiring', authMiddleware, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const documents = await prisma.document.findMany({
      where: {
        isActive: true,
        validUntil: {
          lte: expiryDate,
          gte: new Date(),
        },
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
      orderBy: { validUntil: 'asc' },
    });

    res.json({
      documents,
      count: documents.length,
      expiryThreshold: days,
    });
  } catch (error) {
    logger.error('Error fetching expiring documents:', error);
    res.status(500).json({ error: 'Failed to fetch expiring documents' });
  }
});

// POST /api/documents/sharepoint/sync/:id - Sync document with SharePoint
router.post('/sharepoint/sync/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.sharePointFileId) {
      return res.status(400).json({ error: 'Document not linked to SharePoint' });
    }

    await sharePointService.syncDocumentMetadata(id);

    logger.info(`Document synced with SharePoint: ${id}`);
    res.json({ message: 'Document synced successfully' });
  } catch (error) {
    logger.error('Error syncing document with SharePoint:', error);
    res.status(500).json({ error: 'Failed to sync document with SharePoint' });
  }
});

// POST /api/documents/sharepoint/permissions/:id - Set SharePoint permissions
router.post('/sharepoint/permissions/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { recipients, roles, message } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients array is required' });
    }

    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: 'Roles array is required' });
    }

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.sharePointFileId) {
      return res.status(400).json({ error: 'Document not stored in SharePoint' });
    }

    await sharePointService.setDocumentPermissions(document.sharePointFileId, {
      recipients,
      roles,
      message,
    });

    logger.info(`SharePoint permissions set for document: ${id}`, { recipients, roles });
    res.json({ message: 'Permissions set successfully' });
  } catch (error) {
    logger.error('Error setting SharePoint permissions:', error);
    res.status(500).json({ error: 'Failed to set SharePoint permissions' });
  }
});

// GET /api/documents/sharepoint/search - Search documents in SharePoint
router.get('/sharepoint/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const villaId = req.query.villaId as string;
    const top = parseInt(req.query.top as string) || 20;
    const skip = parseInt(req.query.skip as string) || 0;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await sharePointService.searchDocuments(query, {
      villaId,
      top,
      skip,
    });

    res.json({
      query,
      results,
      count: results.length,
    });
  } catch (error) {
    logger.error('Error searching SharePoint documents:', error);
    res.status(500).json({ error: 'Failed to search SharePoint documents' });
  }
});

// GET /api/documents/sharepoint/status - Get SharePoint service status
router.get('/sharepoint/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const status = sharePointService.getStatus();
    const connectionTest = await sharePointService.testConnection();

    res.json({
      ...status,
      connectionTest,
    });
  } catch (error) {
    logger.error('Error getting SharePoint status:', error);
    res.status(500).json({ error: 'Failed to get SharePoint status' });
  }
});

// POST /api/documents/upload-sharepoint - Upload documents to SharePoint for onboarding
const memoryStorage = multer.memoryStorage();
const sharePointDocumentUpload = multer({ 
  storage: memoryStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for documents
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, Excel, images and text files are allowed'));
    }
  }
});

router.post(
  '/upload-sharepoint',
  authMiddleware,
  sharePointDocumentUpload.array('documents', 10),
  handleMulterError,
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { villaId, documentType = 'OTHER', category = 'documents' } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No documents uploaded' });
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

      // Map document categories to new SharePoint folder structure
      const categoryFolderMap: Record<string, string> = {
        'legal': '01-Legal-Documents',
        'contracts': '01-Legal-Documents/Property-Contracts',
        'licenses': '01-Legal-Documents/Licenses-Permits',
        'financial': '02-Financial-Documents',
        'insurance': '02-Financial-Documents/Insurance-Policies',
        'utilities': '02-Financial-Documents/Utility-Accounts',
        'operational': '03-Operational-Documents',
        'inventory': '03-Operational-Documents/Inventory-Lists',
        'emergency': '03-Operational-Documents/Emergency-Contacts',
        'house_rules': '03-Operational-Documents/House-Rules',
        'staff_contracts': '04-Contracts-Agreements/Staff-Contracts',
        'maintenance_contracts': '04-Contracts-Agreements/Maintenance-Contracts',
        'service_contracts': '04-Contracts-Agreements/Service-Provider-Agreements',
        'maintenance': '05-Maintenance-Records/Routine-Maintenance',
        'media': '06-Photos-Media/Property-Photos',
        'other': '01-Legal-Documents/Property-Contracts'
      };

      const sharePointFolder = categoryFolderMap[category] || 'Documents/Other';
      
      // Upload files using database-first approach with SharePoint fallback
      const uploadPromises = files.map(async (file, index) => {
        let dbResult = null;
        let sharePointResult = null;
        let error = null;

        // Try database storage first
        try {
          logger.info(`[DB] Attempting database storage for: ${file.originalname}`);
          dbResult = await storeDocument(
            villaId,
            file,
            documentType.toUpperCase(),
            `Uploaded via onboarding - ${category}`
          );
          
          logger.info(`[DB-OK] Document stored in database: ${file.originalname}`, {
            documentId: dbResult.id,
            villaId,
            category,
            size: file.size
          });
          
          // Return database result with file URL
          return {
            ...dbResult,
            fileUrl: getFileUrl(dbResult.id, 'document'),
            storageMethod: 'database',
            fileName: file.originalname,
            fileId: dbResult.id
          };
          
        } catch (dbError) {
          logger.warn(`[DB-FALLBACK] Database storage failed for ${file.originalname}, trying SharePoint:`, dbError);
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
            // Upload to SharePoint using document service
            const fileBuffer = fs.readFileSync(tempFilePath);
            sharePointResult = await sharePointService.uploadDocument(
              villaId,
              documentType.toUpperCase(),
              file.originalname,
              fileBuffer,
              file.mimetype,
              {
                description: `Uploaded via onboarding - ${category} (DB fallback)`,
              }
            );

            logger.info(`[SP-OK] Document uploaded to SharePoint: ${sharePointResult.fileName}`, {
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
              ...sharePointResult,
              storageMethod: 'sharepoint-fallback'
            };
          } catch (sharePointError) {
            // Clean up temporary file on error
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
            
            logger.error(`[SP-FAIL] SharePoint upload failed for ${file.originalname}:`, sharePointError);
            throw new Error(`Both database and SharePoint storage failed. DB: ${error?.message}, SP: ${sharePointError.message}`);
          }
        } catch (fallbackError) {
          logger.error(`[UPLOAD-FAIL] All storage methods failed for ${file.originalname}:`, fallbackError);
          throw fallbackError;
        }
      });

      const documents = await Promise.all(uploadPromises);

      // Update onboarding progress to mark documents as uploaded
      try {
        const progress = await prisma.onboardingProgress.findUnique({
          where: { villaId },
        });

        if (progress && !progress.documentsUploaded) {
          // Check if the villa now has any documents
          const documentCount = await prisma.document.count({
            where: { villaId, isActive: true },
          });

          if (documentCount > 0) {
            await prisma.onboardingProgress.update({
              where: { villaId },
              data: { documentsUploaded: true },
            });
            logger.info(`[OK] Auto-updated documentsUploaded flag for villa ${villaId}`);
          }
        }
      } catch (error) {
        logger.warn('Failed to update onboarding progress after document upload:', error);
        // Don't fail the request if progress update fails
      }

      // Count storage methods used
      const storageStats = documents.reduce((stats, doc) => {
        const method = doc.storageMethod || 'unknown';
        stats[method] = (stats[method] || 0) + 1;
        return stats;
      }, {} as Record<string, number>);

      logger.info(`${documents.length} documents uploaded for villa ${villa.villaName} in category ${category}`, {
        storageStats,
        villaId,
        category
      });
      
      res.status(201).json({
        message: `${documents.length} documents uploaded successfully`,
        documents: documents.map(doc => ({
          ...doc,
          // Ensure all documents have proper file URLs for frontend
          fileUrl: doc.fileUrl || (doc.storageMethod === 'database' ? getFileUrl(doc.fileId, 'document') : doc.filePath)
        })),
        storageStats,
        sharePointFolder: sharePointFolder,
        info: {
          primaryStorage: 'database',
          fallbackStorage: 'sharepoint',
          databaseFirst: true
        }
      });
    } catch (error) {
      logger.error('Error uploading documents to SharePoint:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to upload documents to SharePoint',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
);

// GET /api/documents/sharepoint/:villaId - Get documents from SharePoint for a villa
router.get('/sharepoint/:villaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const documentType = req.query.documentType as string;

    // Build where clause for database query
    const where: any = { villaId, NOT: { sharePointFileId: null } };
    if (documentType) where.documentType = documentType.toUpperCase();

    const documents = await prisma.document.findMany({
      where,
      orderBy: [
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
      
      // Get contents from multiple document folders
      const documentFolders = [
        '01-Legal-Documents',
        '02-Financial-Documents', 
        '03-Operational-Documents',
        '04-Contracts-Agreements',
        '05-Maintenance-Records'
      ];
      
      let folderContents = { value: [] };
      for (const folder of documentFolders) {
        try {
          const contents = await sharePointService.listFiles(`${sharePointPath}/${folder}`);
          if (contents.value) {
            folderContents.value.push(...contents.value);
          }
        } catch (error) {
          logger.warn(`Could not list files in ${folder}:`, error);
        }
      }
      
      res.json({
        documents,
        sharePointFiles: folderContents,
        summary: {
          databaseDocuments: documents.length,
          sharePointFiles: folderContents.length,
          documentType: documentType || 'all'
        }
      });
    } catch (sharePointError) {
      logger.warn('Could not fetch SharePoint folder contents:', sharePointError);
      res.json({ documents });
    }
  } catch (error) {
    logger.error('Error fetching SharePoint documents:', error);
    res.status(500).json({ error: 'Failed to fetch SharePoint documents' });
  }
});

// POST /api/documents/fix-progress/:villaId - Fix onboarding progress for villas with documents
router.post('/fix-progress/:villaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;

    // Check if villa exists
    const villa = await prisma.villa.findUnique({
      where: { id: villaId },
    });

    if (!villa) {
      return res.status(404).json({ error: 'Villa not found' });
    }

    // Check current progress
    const progress = await prisma.onboardingProgress.findUnique({
      where: { villaId },
    });

    if (!progress) {
      return res.status(404).json({ error: 'Onboarding progress not found for this villa' });
    }

    // Count existing documents
    const documentCount = await prisma.document.count({
      where: { villaId, isActive: true },
    });

    let updated = false;

    // Update documents flag if documents exist but flag is false
    if (documentCount > 0 && !progress.documentsUploaded) {
      await prisma.onboardingProgress.update({
        where: { villaId },
        data: { documentsUploaded: true },
      });
      updated = true;
      logger.info(`[OK] Fixed documentsUploaded flag for villa ${villaId}`);
    }

    // Also check for photos and fix that flag if needed
    const photoCount = await prisma.photo.count({
      where: { villaId },
    });

    if (photoCount > 0 && !progress.photosUploaded) {
      await prisma.onboardingProgress.update({
        where: { villaId },
        data: { photosUploaded: true },
      });
      updated = true;
      logger.info(`[OK] Fixed photosUploaded flag for villa ${villaId}`);
    }

    res.json({
      message: updated ? 'Progress flags updated successfully' : 'No updates needed',
      documentCount,
      photoCount,
      before: {
        documentsUploaded: progress.documentsUploaded,
        photosUploaded: progress.photosUploaded,
      },
      after: {
        documentsUploaded: documentCount > 0 || progress.documentsUploaded,
        photosUploaded: photoCount > 0 || progress.photosUploaded,
      }
    });
  } catch (error) {
    logger.error('Error fixing progress:', error);
    res.status(500).json({ error: 'Failed to fix progress' });
  }
});

export default router;
