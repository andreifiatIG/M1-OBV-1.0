import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import mockSharePointService from '../services/mockSharePointService';
import { simpleClerkAuth } from '../middleware/simpleClerkAuth';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication middleware
router.use(simpleClerkAuth);

/**
 * @route   POST /api/sharepoint/sync-document/:documentId
 * @desc    Sync a document with SharePoint
 * @access  Private
 */
router.post('/sync-document/:documentId', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    
    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
    }

    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { villa: true }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Sync with SharePoint (mock implementation)
    const syncResult = await mockSharePointService.syncDocument(documentId, document.villaId);
    
    if (syncResult.success) {
      // Update document with SharePoint URL
      await prisma.document.update({
        where: { id: documentId },
        data: {
          sharePointFileId: `sp-${documentId}`,
          sharePointPath: `/M1-Villa-Management/Villas/${document.villa.villaCode}/${document.documentType}/${document.fileName}`,
          updatedAt: new Date()
        }
      });

      logger.info(`Document synced with SharePoint`, { documentId, villaId: document.villaId });
      
      res.json({
        success: true,
        data: {
          documentId,
          sharePointUrl: syncResult.sharePointUrl,
          message: 'Document successfully synced with SharePoint'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to sync document with SharePoint'
      });
    }
  } catch (error) {
    logger.error('SharePoint sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync with SharePoint'
    });
  }
});

/**
 * @route   POST /api/sharepoint/sync-villa/:villaId
 * @desc    Sync all villa documents with SharePoint
 * @access  Private
 */
router.post('/sync-villa/:villaId', async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    
    if (!villaId) {
      return res.status(400).json({
        success: false,
        error: 'Villa ID is required'
      });
    }

    // Get villa and its documents
    const villa = await prisma.villa.findUnique({
      where: { id: villaId },
      include: {
        documents: {
          where: { isActive: true }
        }
      }
    });

    if (!villa) {
      return res.status(404).json({
        success: false,
        error: 'Villa not found'
      });
    }

    // Create villa folder structure in SharePoint
    await mockSharePointService.createVillaFolders(villaId, villa.villaName);

    // Sync all documents
    const syncResults = [];
    for (const document of villa.documents) {
      try {
        const syncResult = await mockSharePointService.syncDocument(document.id, villaId);
        
        if (syncResult.success) {
          // Update document with SharePoint info
          await prisma.document.update({
            where: { id: document.id },
            data: {
              sharePointFileId: `sp-${document.id}`,
              sharePointPath: `/M1-Villa-Management/Villas/${villa.villaCode}/${document.documentType}/${document.fileName}`,
              updatedAt: new Date()
            }
          });
        }

        syncResults.push({
          documentId: document.id,
          fileName: document.fileName,
          success: syncResult.success,
          sharePointUrl: syncResult.sharePointUrl
        });
      } catch (error) {
        logger.error(`Failed to sync document ${document.id}:`, error);
        syncResults.push({
          documentId: document.id,
          fileName: document.fileName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = syncResults.filter(r => r.success).length;
    
    logger.info(`Villa SharePoint sync completed`, { 
      villaId, 
      totalDocuments: villa.documents.length, 
      successCount 
    });

    res.json({
      success: true,
      data: {
        villaId,
        villaName: villa.villaName,
        totalDocuments: villa.documents.length,
        syncedDocuments: successCount,
        results: syncResults,
        message: `Successfully synced ${successCount}/${villa.documents.length} documents with SharePoint`
      }
    });
  } catch (error) {
    logger.error('Villa SharePoint sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync villa with SharePoint'
    });
  }
});

/**
 * @route   GET /api/sharepoint/status
 * @desc    Get SharePoint service status
 * @access  Private
 */
router.get('/status', (_req: Request, res: Response) => {
  try {
    const status = mockSharePointService.getStatus();
    
    res.json({
      success: true,
      data: {
        ...status,
        ready: mockSharePointService.isReady(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('SharePoint status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get SharePoint status'
    });
  }
});

/**
 * @route   GET /api/sharepoint/download/:fileId
 * @desc    Download file from SharePoint (mock endpoint)
 * @access  Public (for simplicity in development)
 */
router.get('/download/:fileId', (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    
    // Mock file download - in real implementation, this would fetch from SharePoint
    res.json({
      success: true,
      message: 'This is a mock download endpoint',
      data: {
        fileId,
        downloadUrl: `https://mock-sharepoint.com/download/${fileId}`,
        note: 'In production, this would serve the actual file content'
      }
    });
  } catch (error) {
    logger.error('SharePoint download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

export default router;