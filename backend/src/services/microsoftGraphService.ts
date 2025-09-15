import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { logger } from '../utils/logger';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface GraphConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  scopes: string[];
}

/**
 * Custom authentication provider for Microsoft Graph client
 */
class ClientCredentialAuthProvider implements AuthenticationProvider {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly config: GraphConfig;

  constructor(config: GraphConfig) {
    this.config = config;
  }

  /**
   * Get access token for Microsoft Graph API
   */
  async getAccessToken(): Promise<string> {
    try {
      // Check if current token is still valid (with 5 minute buffer)
      const now = Date.now();
      if (this.accessToken && this.tokenExpiry > now + 300000) {
        return this.accessToken;
      }

      // Request new token using client credentials flow
      const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams();
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('scope', this.config.scopes.join(' '));
      params.append('grant_type', 'client_credentials');

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token request failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json() as TokenResponse;
      
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = now + (tokenData.expires_in * 1000);

      logger.debug('Microsoft Graph access token refreshed successfully');
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get Microsoft Graph access token:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Clear cached token
   */
  clearToken(): void {
    this.accessToken = null;
    this.tokenExpiry = 0;
  }
}

/**
 * Microsoft Graph Service for managing Azure AD and SharePoint operations
 */
class MicrosoftGraphService {
  private client: Client | null = null;
  private authProvider: ClientCredentialAuthProvider | null = null;
  private isInitialized = false;

  /**
   * Initialize Microsoft Graph client
   */
  async initialize(): Promise<void> {
    try {
      const clientId = process.env.AZURE_CLIENT_ID;
      const clientSecret = process.env.AZURE_CLIENT_SECRET;
      const tenantId = process.env.AZURE_TENANT_ID;

      if (!clientId || !clientSecret || !tenantId) {
        throw new Error('Microsoft Graph credentials not configured. Please set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID environment variables.');
      }

      const config: GraphConfig = {
        clientId,
        clientSecret,
        tenantId,
        scopes: [
          'https://graph.microsoft.com/.default'
        ],
      };

      this.authProvider = new ClientCredentialAuthProvider(config);

      // Test authentication
      await this.authProvider.getAccessToken();

      // Initialize Graph client
      this.client = Client.initWithMiddleware({
        authProvider: this.authProvider,
      });

      this.isInitialized = true;
      logger.info('[OK] Microsoft Graph service initialized successfully');
    } catch (error) {
      logger.error('[ERROR] Failed to initialize Microsoft Graph service:', error);
      throw error;
    }
  }

  /**
   * Get the Graph client instance
   */
  getClient(): Client {
    if (!this.client || !this.isInitialized) {
      throw new Error('Microsoft Graph service not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Test Graph API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      // Test by getting organization info
      const org = await this.client.api('/organization').get();
      logger.info('[OK] Microsoft Graph connection test successful', { orgName: org.value?.[0]?.displayName });
      return true;
    } catch (error) {
      logger.error('[ERROR] Microsoft Graph connection test failed:', error);
      return false;
    }
  }

  /**
   * Get SharePoint site information
   */
  async getSiteInfo(siteUrl: string): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      // Extract site path from URL
      const url = new URL(siteUrl);
      const hostname = url.hostname;
      const sitePath = url.pathname;

      const site = await this.client
        .api(`/sites/${hostname}:${sitePath}`)
        .get();

      logger.debug('SharePoint site info retrieved', { siteId: site.id, siteName: site.name });
      return site;
    } catch (error) {
      logger.error('Failed to get SharePoint site info:', error);
      throw error;
    }
  }

  /**
   * Get SharePoint drive (document library)
   */
  async getDrive(siteId: string, driveId?: string): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      let driveEndpoint: string;
      
      if (driveId) {
        driveEndpoint = `/sites/${siteId}/drives/${driveId}`;
      } else {
        // Get default document library
        driveEndpoint = `/sites/${siteId}/drive`;
      }

      const drive = await this.client.api(driveEndpoint).get();
      logger.debug('SharePoint drive retrieved', { driveId: drive.id, driveName: drive.name });
      return drive;
    } catch (error) {
      logger.error('Failed to get SharePoint drive:', error);
      throw error;
    }
  }

  /**
   * Create a folder in SharePoint
   */
  async createFolder(siteId: string, driveId: string, parentPath: string, folderName: string): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const endpoint = `/sites/${siteId}/drives/${driveId}/root:${parentPath}:/children`;
      
      const folderData = {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      };

      const folder = await this.client
        .api(endpoint)
        .post(folderData);

      logger.info(`[OK] Folder created: ${folderName} at ${parentPath}`, { folderId: folder.id });
      return folder;
    } catch (error) {
      logger.error(`[ERROR] Failed to create folder ${folderName}:`, error);
      throw error;
    }
  }

  /**
   * Upload file to SharePoint
   */
  async uploadFile(
    siteId: string,
    driveId: string,
    filePath: string,
    fileName: string,
    fileContent: Buffer | ArrayBuffer,
    options: {
      conflictBehavior?: 'rename' | 'replace' | 'fail';
      description?: string;
    } = {}
  ): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const { conflictBehavior = 'rename', description } = options;
      
      // For files larger than 4MB, use upload session
      if (fileContent.byteLength > 4 * 1024 * 1024) {
        return await this.uploadLargeFile(siteId, driveId, filePath, fileName, fileContent, options);
      }

      // Direct upload for smaller files
      // Ensure proper path construction
      const cleanPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
      const endpoint = `/sites/${siteId}/drives/${driveId}/root:${cleanPath}/${fileName}:/content`;
      
      const uploadResponse = await this.client
        .api(endpoint)
        .query({ '@microsoft.graph.conflictBehavior': conflictBehavior })
        .put(fileContent);

      // Update file metadata if description provided
      if (description && uploadResponse.id) {
        await this.client
          .api(`/sites/${siteId}/drives/${driveId}/items/${uploadResponse.id}`)
          .patch({ description });
      }

      logger.info(`[OK] File uploaded: ${fileName} to ${filePath}`, { fileId: uploadResponse.id });
      return uploadResponse;
    } catch (error) {
      logger.error(`[ERROR] Failed to upload file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Upload large file using upload session
   */
  private async uploadLargeFile(
    siteId: string,
    driveId: string,
    filePath: string,
    fileName: string,
    fileContent: Buffer | ArrayBuffer,
    options: { conflictBehavior?: string; description?: string } = {}
  ): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const { conflictBehavior = 'rename' } = options;
      
      // Create upload session
      // Ensure proper path construction
      const cleanPath = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
      const sessionEndpoint = `/sites/${siteId}/drives/${driveId}/root:${cleanPath}/${fileName}:/createUploadSession`;
      
      const sessionData = {
        item: {
          '@microsoft.graph.conflictBehavior': conflictBehavior,
          name: fileName
        }
      };

      const session = await this.client
        .api(sessionEndpoint)
        .post(sessionData);

      const uploadUrl = session.uploadUrl;
      const fileSize = fileContent.byteLength;
      const chunkSize = 320 * 1024; // 320KB chunks
      
      let uploadedBytes = 0;
      const buffer = Buffer.from(fileContent as any);

      while (uploadedBytes < fileSize) {
        const chunk = buffer.slice(uploadedBytes, Math.min(uploadedBytes + chunkSize, fileSize));
        const contentRange = `bytes ${uploadedBytes}-${uploadedBytes + chunk.length - 1}/${fileSize}`;

        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Range': contentRange,
            'Content-Type': 'application/octet-stream',
          },
          body: chunk,
        });

        if (!response.ok) {
          throw new Error(`Upload chunk failed: ${response.status} ${response.statusText}`);
        }

        uploadedBytes += chunk.length;
        
        if (uploadedBytes < fileSize) {
          // Continue uploading
          logger.debug(`Upload progress: ${uploadedBytes}/${fileSize} bytes (${Math.round(uploadedBytes / fileSize * 100)}%)`);
        } else {
          // Upload complete, return the file item
          const result = await response.json() as any;
          logger.info(`[OK] Large file uploaded: ${fileName} (${fileSize} bytes)`, { fileId: result.id });
          return result;
        }
      }
    } catch (error) {
      logger.error(`[ERROR] Failed to upload large file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Get file from SharePoint
   */
  async getFile(siteId: string, driveId: string, fileId: string): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const file = await this.client
        .api(`/sites/${siteId}/drives/${driveId}/items/${fileId}`)
        .get();

      logger.debug('File retrieved from SharePoint', { fileId, fileName: file.name });
      return file;
    } catch (error) {
      logger.error(`Failed to get file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Download file content from SharePoint
   */
  async downloadFile(siteId: string, driveId: string, fileId: string): Promise<ArrayBuffer> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      // Try to get the content directly as a response
      const response = await this.client
        .api(`/sites/${siteId}/drives/${driveId}/items/${fileId}/content`)
        .responseType('buffer' as any)
        .get();

      // If response is already an ArrayBuffer, return it
      if (response instanceof ArrayBuffer) {
        return response;
      }
      
      // If response is a Buffer, convert to ArrayBuffer
      if (Buffer.isBuffer(response)) {
        const arrayBuffer = response.buffer as ArrayBuffer;
        return arrayBuffer.slice(response.byteOffset, response.byteOffset + response.byteLength);
      }
      
      // If response is something else (shouldn't happen), try to handle it
      logger.warn('Unexpected response type from SharePoint download:', typeof response);
      
      // Try alternative stream approach if available
      const streamResponse = await this.client
        .api(`/sites/${siteId}/drives/${driveId}/items/${fileId}/content`)
        .getStream();
        
      // Check if it's a readable stream
      if (streamResponse && typeof streamResponse.pipe === 'function') {
        const chunks: Buffer[] = [];
        return new Promise((resolve, reject) => {
          streamResponse.on('data', (chunk: Buffer) => chunks.push(chunk));
          streamResponse.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
          });
          streamResponse.on('error', reject);
        });
      }
      
      throw new Error('Unable to download file content from SharePoint');
    } catch (error) {
      logger.error(`Failed to download file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Delete file from SharePoint
   */
  async deleteFile(siteId: string, driveId: string, fileId: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      await this.client
        .api(`/sites/${siteId}/drives/${driveId}/items/${fileId}`)
        .delete();

      logger.info(`[OK] File deleted from SharePoint: ${fileId}`);
    } catch (error) {
      logger.error(`[ERROR] Failed to delete file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * List files in a SharePoint folder
   */
  async listFiles(
    siteId: string,
    driveId: string,
    folderPath: string = '/',
    options: {
      filter?: string;
      orderBy?: string;
      top?: number;
      skip?: number;
    } = {}
  ): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      let endpoint: string;
      if (folderPath === '/') {
        endpoint = `/sites/${siteId}/drives/${driveId}/root/children`;
      } else {
        endpoint = `/sites/${siteId}/drives/${driveId}/root:${folderPath}:/children`;
      }

      let query = this.client.api(endpoint);

      if (options.filter) {
        query = query.filter(options.filter);
      }
      if (options.orderBy) {
        query = query.orderby(options.orderBy);
      }
      if (options.top) {
        query = query.top(options.top);
      }
      if (options.skip) {
        query = query.skip(options.skip);
      }

      const result = await query.get();
      logger.debug(`Files listed from ${folderPath}`, { count: result.value?.length || 0 });
      return result;
    } catch (error) {
      logger.error(`Failed to list files in ${folderPath}:`, error);
      throw error;
    }
  }

  /**
   * Set file permissions
   */
  async setFilePermissions(
    siteId: string,
    driveId: string,
    fileId: string,
    permissions: {
      recipients: string[];
      roles: ('read' | 'write' | 'owner')[];
      requireSignIn?: boolean;
      sendInvitation?: boolean;
      message?: string;
    }
  ): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const inviteData = {
        recipients: permissions.recipients.map(email => ({ email })),
        roles: permissions.roles,
        requireSignIn: permissions.requireSignIn || true,
        sendInvitation: permissions.sendInvitation || false,
        message: permissions.message || '',
      };

      const result = await this.client
        .api(`/sites/${siteId}/drives/${driveId}/items/${fileId}/invite`)
        .post(inviteData);

      logger.info(`[OK] Permissions set for file ${fileId}`, { recipients: permissions.recipients });
      return result;
    } catch (error) {
      logger.error(`[ERROR] Failed to set permissions for file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Search for files in SharePoint
   */
  async searchFiles(
    siteId: string,
    driveId: string,
    query: string,
    options: {
      top?: number;
      skip?: number;
    } = {}
  ): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      let searchQuery = this.client
        .api(`/sites/${siteId}/drives/${driveId}/root/search(q='${encodeURIComponent(query)}')`);

      if (options.top) {
        searchQuery = searchQuery.top(options.top);
      }
      if (options.skip) {
        searchQuery = searchQuery.skip(options.skip);
      }

      const result = await searchQuery.get();
      logger.debug(`Search completed for query: ${query}`, { resultsCount: result.value?.length || 0 });
      return result;
    } catch (error) {
      logger.error(`Failed to search files with query ${query}:`, error);
      throw error;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<void> {
    try {
      if (!this.authProvider) {
        throw new Error('Auth provider not initialized');
      }

      this.authProvider.clearToken();
      await this.authProvider.getAccessToken();
      logger.info('[OK] Microsoft Graph token refreshed successfully');
    } catch (error) {
      logger.error('[ERROR] Failed to refresh Microsoft Graph token:', error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus(): { initialized: boolean; hasClient: boolean } {
    return {
      initialized: this.isInitialized,
      hasClient: this.client !== null,
    };
  }

  /**
   * Cleanup and close connections
   */
  async cleanup(): Promise<void> {
    try {
      if (this.authProvider) {
        this.authProvider.clearToken();
      }
      
      this.client = null;
      this.authProvider = null;
      this.isInitialized = false;
      
      logger.info('[OK] Microsoft Graph service cleaned up');
    } catch (error) {
      logger.error('[ERROR] Error during Microsoft Graph service cleanup:', error);
    }
  }
}

export default new MicrosoftGraphService();
export { MicrosoftGraphService };