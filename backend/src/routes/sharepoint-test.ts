import { Router } from 'express';
import { logger } from '../utils/logger';
import sharePointService from '../services/sharePointService';
import microsoftGraphService from '../services/microsoftGraphService';

const router = Router();

/**
 * Test SharePoint folder creation
 */
router.post('/create-test-folders', async (req, res) => {
  try {
    logger.info('🧪 Testing SharePoint folder creation...');
    
    // Check if services are initialized
    const spStatus = sharePointService.getStatus();
    const graphStatus = microsoftGraphService.getStatus();
    
    if (!spStatus.initialized || !graphStatus.initialized) {
      return res.status(503).json({
        success: false,
        error: 'SharePoint or Microsoft Graph service not initialized',
        status: { sharePoint: spStatus, microsoftGraph: graphStatus }
      });
    }

    // Test 1: Create villa folder structure
    const testVillaId = `TEST-${Date.now()}`;
    const testVillaName = 'Test Villa Automation';
    
    logger.info(`Creating villa folders for: ${testVillaName} (ID: ${testVillaId})`);
    
    const villaFolders = await sharePointService.createVillaFolders(testVillaId, testVillaName);
    
    // Test 2: Create custom test folder
    const config = sharePointService.getConfig();
    if (!config?.siteId || !config?.driveId) {
      throw new Error('SharePoint configuration not available');
    }
    
    const testFolder = await microsoftGraphService.createFolder(
      config.siteId,
      config.driveId,
      '',
      `TestFolder-${Date.now()}`
    );
    
    // Test 3: List root folders to verify creation
    const rootFolders = await microsoftGraphService.listFiles(
      config.siteId,
      config.driveId,
      '/',
      { top: 20 }
    );
    
    const folders = rootFolders.value?.filter((item: any) => item.folder) || [];
    
    res.json({
      success: true,
      message: 'SharePoint folder creation test completed',
      results: {
        villaFolders: {
          villaId: testVillaId,
          villaName: testVillaName,
          structure: villaFolders
        },
        customFolder: {
          id: testFolder.id,
          name: testFolder.name,
          webUrl: testFolder.webUrl
        },
        rootFolders: {
          total: folders.length,
          folders: folders.map((f: any) => ({
            name: f.name,
            id: f.id,
            created: f.createdDateTime
          }))
        }
      }
    });
    
    logger.info('[OK] SharePoint folder creation test completed successfully');
    
  } catch (error) {
    logger.error('[ERROR] SharePoint folder creation test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    });
  }
});

/**
 * Get SharePoint service status
 */
router.get('/status', async (req, res) => {
  try {
    const spStatus = sharePointService.getStatus();
    const graphStatus = microsoftGraphService.getStatus();
    const config = sharePointService.getConfig();
    
    res.json({
      success: true,
      status: {
        sharePoint: spStatus,
        microsoftGraph: graphStatus,
        configuration: config ? {
          siteUrl: config.siteUrl,
          siteId: config.siteId?.substring(0, 20) + '...',
          driveId: config.driveId?.substring(0, 20) + '...',
          baseFolderPath: config.baseFolderPath || '(root)'
        } : null
      }
    });
    
  } catch (error) {
    logger.error('Failed to get SharePoint status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * List SharePoint folders
 */
router.get('/folders', async (req, res) => {
  try {
    const config = sharePointService.getConfig();
    if (!config?.siteId || !config?.driveId) {
      return res.status(503).json({
        success: false,
        error: 'SharePoint configuration not available'
      });
    }
    
    const folderPath = (req.query.path as string) || '/';
    const limit = parseInt(req.query.limit as string) || 50;
    
    const result = await microsoftGraphService.listFiles(
      config.siteId,
      config.driveId,
      folderPath,
      { top: limit }
    );
    
    const folders = result.value?.filter((item: any) => item.folder) || [];
    const files = result.value?.filter((item: any) => !item.folder) || [];
    
    res.json({
      success: true,
      path: folderPath,
      data: {
        folders: folders.map((f: any) => ({
          name: f.name,
          id: f.id,
          created: f.createdDateTime,
          modified: f.lastModifiedDateTime,
          webUrl: f.webUrl
        })),
        files: files.map((f: any) => ({
          name: f.name,
          id: f.id,
          size: f.size,
          created: f.createdDateTime,
          modified: f.lastModifiedDateTime,
          webUrl: f.webUrl
        })),
        totals: {
          folders: folders.length,
          files: files.length,
          total: result.value?.length || 0
        }
      }
    });
    
  } catch (error) {
    logger.error('Failed to list SharePoint folders:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete test folders (cleanup)
 */
router.delete('/cleanup-test-folders', async (req, res) => {
  try {
    const config = sharePointService.getConfig();
    if (!config?.siteId || !config?.driveId) {
      return res.status(503).json({
        success: false,
        error: 'SharePoint configuration not available'
      });
    }
    
    // List root folders and find test folders
    const rootFolders = await microsoftGraphService.listFiles(
      config.siteId,
      config.driveId,
      '/',
      { top: 100 }
    );
    
    const testFolders = rootFolders.value?.filter((item: any) => 
      item.folder && (
        item.name.startsWith('TestFolder-') ||
        item.name.includes('Test Villa') ||
        item.name.startsWith('TEST-')
      )
    ) || [];
    
    const deletedFolders = [];
    
    for (const folder of testFolders) {
      try {
        await microsoftGraphService.deleteFile(config.siteId, config.driveId, folder.id);
        deletedFolders.push({
          name: folder.name,
          id: folder.id
        });
        logger.info(`Deleted test folder: ${folder.name}`);
      } catch (error) {
        logger.warn(`Failed to delete folder ${folder.name}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedFolders.length} test folders`,
      deletedFolders
    });
    
  } catch (error) {
    logger.error('Failed to cleanup test folders:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;