import { logger } from '../../utils/logger';
import path from 'path';
import fs from 'fs';

interface SharePointConfig {
  siteUrl: string;
  driveId?: string;
  siteId?: string;
  baseFolderPath: string;
}

interface UploadResult {
  fileId: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  size: number;
  mimeType: string;
  sharepointUrl?: string;
}

interface FolderStructure {
  documents: string;
  photos: string;
  contracts: string;
  licenses: string;
  maintenance: string;
  insurance: string;
}

/**
 * Mock SharePoint Service for development
 * Simulates SharePoint operations using local storage
 */
class MockSharePointService {
  private config: SharePointConfig | null = null;
  private isInitialized = false;
  private mockSiteInfo = { 
    id: 'mock-site-123',
    name: 'M1 Villa Management Dev Site'
  };
  private mockDriveInfo = {
    id: 'mock-drive-456',
    name: 'M1 Documents'
  };
  private basePath = path.join(process.cwd(), 'mock-sharepoint');

  /**
   * Initialize mock SharePoint service
   */
  async initialize(): Promise<void> {
    try {
      // Use mock configuration
      this.config = {
        siteUrl: 'https://mock-tenant.sharepoint.com/sites/m1-villa-dev',
        driveId: this.mockDriveInfo.id,
        siteId: this.mockSiteInfo.id,
        baseFolderPath: '/M1-Villa-Management'
      };

      // Ensure local mock directory exists
      if (!fs.existsSync(this.basePath)) {
        fs.mkdirSync(this.basePath, { recursive: true });
      }

      // Ensure base folder structure exists
      await this.ensureBaseFolderStructure();

      this.isInitialized = true;
      logger.info('[OK] Mock SharePoint service initialized successfully', {
        siteId: this.mockSiteInfo.id,
        driveId: this.mockDriveInfo.id,
        basePath: this.basePath,
      });
    } catch (error) {
      logger.error('[ERROR] Failed to initialize Mock SharePoint service:', error);
      throw error;
    }
  }

  /**
   * Ensure base folder structure exists locally
   */
  private async ensureBaseFolderStructure(): Promise<void> {
    try {
      const folders = [
        'Templates',
        'Archive',
        'Villas'
      ];

      for (const folder of folders) {
        const folderPath = path.join(this.basePath, folder);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
          logger.debug(`Created mock folder: ${folderPath}`);
        }
      }
    } catch (error) {
      logger.error('Failed to ensure mock folder structure:', error);
      throw error;
    }
  }

  /**
   * Create villa-specific folder structure
   */
  async createVillaFolders(villaId: string, villaName: string): Promise<FolderStructure> {
    try {
      if (!this.isInitialized) {
        throw new Error('Mock SharePoint service not initialized');
      }

      const villaFolder = path.join(this.basePath, 'Villas', `${villaName}-${villaId}`);
      
      const subfolders = {
        documents: 'Documents',
        photos: 'Photos',
        contracts: 'Contracts',
        licenses: 'Licenses',
        maintenance: 'Maintenance',
        insurance: 'Insurance'
      };

      const structure: FolderStructure = {
        documents: '',
        photos: '',
        contracts: '',
        licenses: '',
        maintenance: '',
        insurance: ''
      };

      for (const [key, folderName] of Object.entries(subfolders)) {
        const folderPath = path.join(villaFolder, folderName);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
        structure[key as keyof FolderStructure] = `/Villas/${villaName}-${villaId}/${folderName}`;
      }

      logger.info(`Created villa folder structure for ${villaName}`, { villaId, structure });
      return structure;
    } catch (error) {
      logger.error(`Failed to create villa folders for ${villaName}:`, error);
      throw error;
    }
  }

  /**
   * Upload file to mock SharePoint
   */
  async uploadFile(
    filePath: string,
    villaId: string,
    category: string = 'documents',
    fileName: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<UploadResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('Mock SharePoint service not initialized');
      }

      // Generate unique file ID
      const fileId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Read file if it exists, otherwise create mock content
      let fileBuffer: Buffer;
      let fileSize: number;
      
      if (fs.existsSync(filePath)) {
        fileBuffer = fs.readFileSync(filePath);
        fileSize = fileBuffer.length;
      } else {
        // Create mock file content
        fileBuffer = Buffer.from(`Mock file content for ${fileName}`);
        fileSize = fileBuffer.length;
      }

      // Create villa folder if it doesn't exist
      const villaFolder = path.join(this.basePath, 'Villas', `villa-${villaId}`);
      if (!fs.existsSync(villaFolder)) {
        fs.mkdirSync(villaFolder, { recursive: true });
      }

      // Create category subfolder if it doesn't exist
      const categoryFolder = path.join(villaFolder, category);
      if (!fs.existsSync(categoryFolder)) {
        fs.mkdirSync(categoryFolder, { recursive: true });
      }

      // Save file to local mock storage
      const localFilePath = path.join(categoryFolder, fileName);
      fs.writeFileSync(localFilePath, fileBuffer);

      const result: UploadResult = {
        fileId,
        fileName,
        filePath: `/Villas/villa-${villaId}/${category}/${fileName}`,
        fileUrl: `http://localhost:4001/api/sharepoint/download/${fileId}`,
        size: fileSize,
        mimeType,
        sharepointUrl: `https://mock-tenant.sharepoint.com/sites/m1-villa-dev/Shared Documents/M1-Villa-Management/Villas/villa-${villaId}/${category}/${fileName}`
      };

      logger.info(`Mock file uploaded: ${fileName}`, { fileId, villaId, category });
      return result;
    } catch (error) {
      logger.error(`Failed to upload file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Get file download URL
   */
  async getFileDownloadUrl(fileId: string): Promise<string> {
    return `http://localhost:4001/api/sharepoint/download/${fileId}`;
  }

  /**
   * Delete file from mock SharePoint
   */
  async deleteFile(fileId: string, filePath: string): Promise<void> {
    try {
      const localPath = path.join(this.basePath, filePath);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        logger.info(`Mock file deleted: ${filePath}`, { fileId });
      }
    } catch (error) {
      logger.error(`Failed to delete mock file:`, error);
      throw error;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folderPath: string): Promise<any[]> {
    try {
      const localPath = path.join(this.basePath, folderPath);
      if (!fs.existsSync(localPath)) {
        return [];
      }

      const files = fs.readdirSync(localPath);
      return files.map(fileName => {
        const filePath = path.join(localPath, fileName);
        const stats = fs.statSync(filePath);
        return {
          id: `mock-${fileName}`,
          name: fileName,
          size: stats.size,
          lastModifiedDateTime: stats.mtime,
          webUrl: `https://mock-tenant.sharepoint.com${folderPath}/${fileName}`
        };
      });
    } catch (error) {
      logger.error('Failed to list mock files:', error);
      return [];
    }
  }

  /**
   * List all files for a specific villa
   */
  async listVillaFiles(villaId: string): Promise<any[]> {
    try {
      const villaPath = path.join(this.basePath, 'Villas');
      if (!fs.existsSync(villaPath)) {
        return [];
      }

      // Find villa folder (it might have different naming patterns)
      const villaFolders = fs.readdirSync(villaPath)
        .filter(folderName => folderName.includes(villaId));
      
      if (villaFolders.length === 0) {
        return [];
      }

      const allFiles = [];
      for (const villaFolder of villaFolders) {
        const villaFullPath = path.join(villaPath, villaFolder);
        const categories = fs.readdirSync(villaFullPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        for (const category of categories) {
          const categoryPath = path.join(villaFullPath, category);
          const files = await this.listFiles(`/Villas/${villaFolder}/${category}`);
          allFiles.push(...files.map(file => ({
            ...file,
            category,
            villaId,
            villaFolder
          })));
        }
      }

      return allFiles;
    } catch (error) {
      logger.error(`Failed to list villa files for ${villaId}:`, error);
      return [];
    }
  }

  /**
   * Sync document with SharePoint (mock implementation)
   */
  async syncDocument(documentId: string, villaId: string): Promise<{ success: boolean; sharePointUrl?: string }> {
    try {
      // Simulate SharePoint sync
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      
      const sharePointUrl = `https://mock-tenant.sharepoint.com/sites/m1-villa-dev/Shared Documents/M1-Villa-Management/Villas/villa-${villaId}/document-${documentId}`;
      
      logger.info(`Mock document synced to SharePoint`, { documentId, villaId, sharePointUrl });
      
      return {
        success: true,
        sharePointUrl
      };
    } catch (error) {
      logger.error('Failed to sync document to mock SharePoint:', error);
      return { success: false };
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      service: 'Mock SharePoint',
      siteId: this.mockSiteInfo?.id,
      driveId: this.mockDriveInfo?.id,
      basePath: this.basePath
    };
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    logger.info('Mock SharePoint service cleanup completed');
    this.isInitialized = false;
  }
}

const mockSharePointService = new MockSharePointService();
export default mockSharePointService;