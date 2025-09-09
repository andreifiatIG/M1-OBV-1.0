/**
 * Microsoft Graph API client for SharePoint integration
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

// Interface for SharePoint upload result
export interface SharePointUploadResult {
  success: boolean;
  url?: string;
  driveId?: string;
  itemId?: string;
  error?: string;
}

// Interface for folder creation result
export interface SharePointFolderResult {
  success: boolean;
  folderId?: string;
  folderPath?: string;
  error?: string;
}

class MicrosoftGraphClient {
  private client: Client | null = null;
  private tenantId: string;
  private clientId: string;
  private clientSecret: string;
  private siteId: string;
  private driveId: string;

  constructor() {
    this.tenantId = process.env.SHAREPOINT_TENANT_ID || '';
    this.clientId = process.env.SHAREPOINT_CLIENT_ID || '';
    this.clientSecret = process.env.SHAREPOINT_CLIENT_SECRET || '';
    this.siteId = process.env.SHAREPOINT_SITE_ID || '';
    this.driveId = process.env.SHAREPOINT_DRIVE_ID || '';

    if (!this.tenantId || !this.clientId || !this.clientSecret || !this.siteId || !this.driveId) {
      console.error('Missing SharePoint environment variables');
    }
  }

  /**
   * Initialize the Microsoft Graph client with authentication
   */
  private async initializeClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    try {
      const credential = new ClientSecretCredential(
        this.tenantId,
        this.clientId,
        this.clientSecret
      );

      this.client = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
            return tokenResponse?.token || '';
          }
        }
      });

      return this.client;
    } catch (error) {
      console.error('Failed to initialize Microsoft Graph client:', error);
      throw error;
    }
  }

  /**
   * Create a folder in SharePoint
   */
  async createFolder(folderPath: string, folderName: string): Promise<SharePointFolderResult> {
    try {
      const client = await this.initializeClient();
      
      // Create folder in SharePoint
      const folderData = {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      };

      const response = await client
        .api(`/sites/${this.siteId}/drives/${this.driveId}/root:/${folderPath}:/children`)
        .post(folderData);

      return {
        success: true,
        folderId: response.id,
        folderPath: `${folderPath}/${folderName}`,
      };
    } catch (error: any) {
      console.error('Error creating SharePoint folder:', error);
      return {
        success: false,
        error: error.message || 'Failed to create folder',
      };
    }
  }

  /**
   * Upload a file to SharePoint
   */
  async uploadFile(
    filePath: string,
    fileName: string,
    fileContent: Buffer | string,
    contentType: string = 'application/octet-stream'
  ): Promise<SharePointUploadResult> {
    try {
      const client = await this.initializeClient();
      
      // Convert base64 string to buffer if needed
      const buffer = typeof fileContent === 'string' 
        ? Buffer.from(fileContent, 'base64')
        : fileContent;

      // Upload file to SharePoint
      const response = await client
        .api(`/sites/${this.siteId}/drives/${this.driveId}/root:/${filePath}/${fileName}:/content`)
        .putStream(buffer);

      return {
        success: true,
        url: response.webUrl,
        driveId: response.parentReference?.driveId,
        itemId: response.id,
      };
    } catch (error: any) {
      console.error('Error uploading file to SharePoint:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file',
      };
    }
  }

  /**
   * Create the complete folder structure for a villa
   */
  async createVillaFolderStructure(villaName: string, villaId: string): Promise<SharePointFolderResult> {
    try {
      const sanitizedVillaName = villaName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const baseFolderName = `${sanitizedVillaName}_${villaId}`;
      
      // Create main villa folder
      const mainFolderResult = await this.createFolder('Villas', baseFolderName);
      
      if (!mainFolderResult.success) {
        return mainFolderResult;
      }

      // Create subfolders
      const subfolders = ['Documents', 'Photos', 'Agreements', 'Videos'];
      const basePath = `Villas/${baseFolderName}`;
      
      for (const subfolder of subfolders) {
        const subfolderResult = await this.createFolder(basePath, subfolder);
        if (!subfolderResult.success) {
          console.warn(`Failed to create subfolder ${subfolder}:`, subfolderResult.error);
        }
      }

      return {
        success: true,
        folderPath: basePath,
      };
    } catch (error: any) {
      console.error('Error creating villa folder structure:', error);
      return {
        success: false,
        error: error.message || 'Failed to create villa folder structure',
      };
    }
  }

  /**
   * Upload multiple files to SharePoint
   */
  async uploadMultipleFiles(
    basePath: string,
    files: Array<{
      fileName: string;
      content: Buffer | string;
      contentType?: string;
      subfolder?: string;
    }>
  ): Promise<SharePointUploadResult[]> {
    const results: SharePointUploadResult[] = [];

    for (const file of files) {
      const filePath = file.subfolder 
        ? `${basePath}/${file.subfolder}`
        : basePath;
      
      const result = await this.uploadFile(
        filePath,
        file.fileName,
        file.content,
        file.contentType
      );
      
      results.push(result);
    }

    return results;
  }
}

// Export singleton instance
export const microsoftGraphClient = new MicrosoftGraphClient();