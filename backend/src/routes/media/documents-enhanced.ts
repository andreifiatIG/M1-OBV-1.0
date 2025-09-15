import express, { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { mediaService } from '../../services/storage/mediaService';
import { authMiddleware } from '../../middleware/auth';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Configure multer for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for documents
    files: 15 // Maximum 15 documents per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png' // Allow images for scanned documents
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported document type: ${file.mimetype}`));
    }
  }
});

// Rate limiting for document uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 uploads per window
  message: 'Too many document uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const documentUploadSchema = z.object({
  villaId: z.string().uuid(),
  documentType: z.enum([
    'PROPERTY_CONTRACT',
    'PROPERTY_TITLE', 
    'LICENSES_PERMITS',
    'INSURANCE_CERTIFICATE',
    'TAX_DOCUMENTS',
    'UTILITY_BILLS',
    'INVENTORY_LIST',
    'EMERGENCY_CONTACTS',
    'HOUSE_RULES',
    'STAFF_CONTRACTS',
    'MAINTENANCE_RECORDS',
    'OTHER'
  ])
});

/**
 * POST /api/documents - Upload single or multiple documents
 */
router.post('/', authMiddleware, uploadLimiter, upload.array('documents', 15), async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();
  
  try {
    logger.info(`[${requestId}] Documents upload started`, {
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
    const validationResult = documentUploadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const { villaId, documentType } = validationResult.data;
    const results = [];
    const errors = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        logger.info(`[${requestId}] Processing document ${i + 1}/${files.length}:`, {
          fileName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          documentType
        });

        const result = await mediaService.uploadDocument(
          file.buffer,
          file.originalname,
          file.mimetype,
          documentType,
          villaId
        );

        results.push(result);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[${requestId}] Failed to upload document ${file.originalname}:`, error);
        
        errors.push({
          fileName: file.originalname,
          error: errorMessage
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Documents upload completed`, {
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
    logger.error(`[${requestId}] Documents upload request failed:`, {
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
 * GET /api/documents/villa/:villaId - Get all documents for a villa
 */
router.get('/villa/:villaId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();
  
  try {
    const { villaId } = req.params;
    const { documentType } = req.query;

    logger.info(`[${requestId}] Getting villa documents:`, {
      villaId,
      documentType: documentType as string,
      userId: (req as any).userId
    });

    const documents = await mediaService.getVillaDocuments(
      villaId, 
      documentType as string
    );

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Villa documents retrieved:`, {
      villaId,
      count: documents.length,
      duration
    });

    // Set cache headers for performance
    res.set({
      'Cache-Control': 'private, max-age=300', // 5 minutes
      'ETag': `"documents-${villaId}-${documents.length}-${Date.now()}"`
    });

    res.json({
      success: true,
      data: documents,
      count: documents.length,
      groupedByType: documents.reduce((groups, doc) => {
        const type = doc.documentType;
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(doc);
        return groups;
      }, {} as Record<string, typeof documents>)
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Failed to get villa documents:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      villaId: req.params.villaId,
      duration
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve documents'
    });
  }
});

/**
 * GET /api/documents/public/:documentId - Get document content (public endpoint)
 */
router.get('/public/:documentId', async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();
  
  try {
    const { documentId } = req.params;
    const { download } = req.query;
    
    const document = await mediaService.getDocumentById(documentId);
    if (!document || !document.fileContent) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const duration = Date.now() - startTime;
    
    // Set appropriate headers
    const headers: Record<string, string> = {
      'Content-Type': document.mimeType,
      'Content-Length': document.fileContent.length.toString(),
      'Cache-Control': 'private, max-age=3600', // 1 hour cache
      'ETag': `"doc-${documentId}-${document.updatedAt.getTime()}"`,
      'X-Response-Time': `${duration}ms`
    };

    // Force download if requested
    if (download === 'true') {
      headers['Content-Disposition'] = `attachment; filename="${document.fileName}"`;
    } else {
      // Try to display inline for supported types
      const inlineTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png'];
      if (inlineTypes.includes(document.mimeType)) {
        headers['Content-Disposition'] = `inline; filename="${document.fileName}"`;
      } else {
        headers['Content-Disposition'] = `attachment; filename="${document.fileName}"`;
      }
    }

    res.set(headers);
    res.send(document.fileContent);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Failed to serve document:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      documentId: req.params.documentId,
      duration
    });

    res.status(500).json({
      success: false,
      error: 'Failed to serve document'
    });
  }
});

/**
 * GET /api/documents/:documentId/info - Get document info without content
 */
router.get('/:documentId/info', authMiddleware, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();
  
  try {
    const { documentId } = req.params;
    
    const document = await mediaService.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const duration = Date.now() - startTime;
    
    // Return document info without file content
    res.json({
      success: true,
      data: {
        id: document.id,
        fileName: document.fileName,
        fileUrl: `/api/documents/public/${document.id}`,
        sharePointUrl: document.sharePointUrl,
        sharePointFileId: document.sharePointFileId,
        documentType: document.documentType,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      },
      responseTime: `${duration}ms`
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Failed to get document info:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      documentId: req.params.documentId,
      duration
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get document info'
    });
  }
});

/**
 * DELETE /api/documents/:documentId - Delete document
 */
router.delete('/:documentId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();
  
  try {
    const { documentId } = req.params;
    
    logger.info(`[${requestId}] Deleting document:`, {
      documentId,
      userId: (req as any).userId
    });

    const success = await mediaService.deleteDocument(documentId);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Document deleted:`, {
      documentId,
      duration
    });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Failed to delete document:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      documentId: req.params.documentId,
      duration
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
});

/**
 * POST /api/documents/batch-upload - Upload multiple documents in one request
 */
router.post('/batch-upload', authMiddleware, uploadLimiter, upload.fields([
  { name: 'PROPERTY_CONTRACT', maxCount: 5 },
  { name: 'PROPERTY_TITLE', maxCount: 5 },
  { name: 'LICENSES_PERMITS', maxCount: 10 },
  { name: 'INSURANCE_CERTIFICATE', maxCount: 3 },
  { name: 'TAX_DOCUMENTS', maxCount: 10 },
  { name: 'UTILITY_BILLS', maxCount: 10 },
  { name: 'INVENTORY_LIST', maxCount: 5 },
  { name: 'EMERGENCY_CONTACTS', maxCount: 3 },
  { name: 'HOUSE_RULES', maxCount: 3 },
  { name: 'STAFF_CONTRACTS', maxCount: 20 },
  { name: 'MAINTENANCE_RECORDS', maxCount: 10 },
  { name: 'OTHER', maxCount: 5 }
]), async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = Date.now();
  
  try {
    const { villaId } = req.body;
    
    if (!villaId) {
      return res.status(400).json({
        success: false,
        error: 'villaId is required'
      });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    logger.info(`[${requestId}] Batch document upload started:`, {
      villaId,
      documentTypes: Object.keys(files),
      totalFiles: Object.values(files).flat().length,
      userId: (req as any).userId
    });

    const results = [];
    const errors = [];

    // Process each document type
    for (const [documentType, fileList] of Object.entries(files)) {
      for (const file of fileList) {
        try {
          const result = await mediaService.uploadDocument(
            file.buffer,
            file.originalname,
            file.mimetype,
            documentType,
            villaId
          );

          results.push({
            ...result,
            documentType
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`[${requestId}] Failed to upload document ${file.originalname}:`, error);
          
          errors.push({
            fileName: file.originalname,
            documentType,
            error: errorMessage
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Batch document upload completed:`, {
      successful: results.length,
      failed: errors.length,
      duration
    });

    // Group results by document type
    const groupedResults = results.reduce((groups, result) => {
      const type = result.documentType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(result);
      return groups;
    }, {} as Record<string, any[]>);

    res.status(errors.length > 0 ? 207 : 201).json({
      success: true,
      data: groupedResults,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        uploaded: results.length,
        failed: errors.length,
        byType: Object.keys(groupedResults).reduce((summary, type) => {
          summary[type] = groupedResults[type].length;
          return summary;
        }, {} as Record<string, number>)
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Batch document upload failed:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      userId: (req as any).userId
    });

    res.status(500).json({
      success: false,
      error: 'Batch upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
router.use((error: any, req: Request, res: Response, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 25MB for documents.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum is 15 files per request.'
      });
    }
  }

  if (error.message && error.message.includes('Unsupported document type')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  logger.error('Documents router error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

export default router;