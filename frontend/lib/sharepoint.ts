/**
 * Microsoft Graph API integration for SharePoint document and photo management
 * Handles automated folder creation, bulk uploads, and file management
 */

import { Client } from '@microsoft/microsoft-graph-client';
import axios from 'axios';

export interface SharePointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteId: string;
  driveId: string;
}

export interface UploadResult {
  success: boolean;
  sharePointUrl?: string;
  sharePointItemId?: string;
  error?: string;
}

interface TokenResponse {
  access_token: string;
  error?: string;
  error_description?: string;
}

export interface FolderStructure {
  villaId: string;
  villaName: string;
  folders: {
    legalDocuments: string[];
    mediaGallery: string[];
    agreements: string[];
    marketingMaterials: string[];
  };
}

// Import constants from schema for consistency
export const PHOTO_CATEGORIES = {
  EXTERIOR_VIEWS: "Exterior Views",
  INTERIOR_LIVING_SPACES: "Interior Living Spaces", 
  BEDROOMS: "Bedrooms",
  BATHROOMS: "Bathrooms",
  KITCHEN: "Kitchen",
  DINING_AREAS: "Dining Areas",
  POOL_OUTDOOR_AREAS: "Pool & Outdoor Areas",
  GARDEN_LANDSCAPING: "Garden & Landscaping",
  AMENITIES_FACILITIES: "Amenities & Facilities",
  VIEWS_SURROUNDINGS: "Views & Surroundings",
  STAFF_AREAS: "Staff Areas",
  UTILITY_AREAS: "Utility Areas",
  LOGO: "Logo",
  FLOOR_PLAN: "Floor Plan",
  VIDEOS: "Videos",
  DRONE_SHOTS: "Drone Shots",
  ENTERTAINMENT: "Entertainment",
  DINING_EXPERIENCE: "Dining Experience",
  NAVIGATION: "Navigation & Orientation"
} as const;

export const DOCUMENT_TYPES = {
  PROPERTY_CONTRACT: "Property Contract",
  INSURANCE_CERTIFICATE: "Insurance Certificate", 
  INVENTORY_LIST: "Inventory List",
  UTILITIES_INFORMATION: "Utilities Information",
  EMERGENCY_CONTACTS: "Emergency Contacts",
  HOUSE_RULES: "House Rules",
  STAFF_EMPLOYMENT_CONTRACTS: "Staff Employment Contracts",
  MAINTENANCE_SERVICES_CONTRACTS: "Maintenance/Services Contracts",
  PROPERTY_PHOTOS: "Property Photos",
  PROPERTY_VIDEOS: "Property Videos",
  VIRTUAL_TOUR: "360° Virtual Tour",
  FLOOR_PLANS: "Floor Plans",
  PROPERTY_LOGO: "Property Logo"
} as const;

export const AGREEMENT_TYPES = {
  PROPERTY_MANAGEMENT_AGREEMENT: "Property Management Agreement",
  OWNER_SERVICE_AGREEMENT: "Owner Service Agreement", 
  STAFF_EMPLOYMENT_CONTRACT: "Staff Employment Contract",
  MAINTENANCE_SERVICE_CONTRACT: "Maintenance Service Contract",
  INSURANCE_AGREEMENT: "Insurance Agreement",
  UTILITY_SERVICE_AGREEMENT: "Utility Service Agreement",
  MARKETING_AGREEMENT: "Marketing Agreement",
  COMMISSION_AGREEMENT: "Commission Agreement"
} as const;

export class SharePointService {
  private client: Client;
  private config: SharePointConfig;

  private constructor(config: SharePointConfig, client: Client) {
    this.config = config;
    this.client = client;
  }

  public static async create(config: SharePointConfig): Promise<SharePointService> {
    const service = new SharePointService(config, Client.init({ authProvider: () => Promise.resolve('') })); // Temp client
    const accessToken = await service.getAccessToken();
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
    return new SharePointService(config, client);
  }

  private async getAccessToken(): Promise<string> {
    try {
      // Get access token using client credentials flow with axios
      const params = new URLSearchParams();
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('scope', 'https://graph.microsoft.com/.default');
      params.append('grant_type', 'client_credentials');

      const tokenResponse = await axios.post(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const tokenData = tokenResponse.data as TokenResponse;

      if (tokenData.access_token) {
        return tokenData.access_token;
      } else {
        throw new Error(`Failed to obtain access token: ${tokenData.error_description || 'No error description'}`);
      }
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  private initializeGraphClient(): Client {
    return Client.init({
      authProvider: async (done) => {
        try {
          const accessToken = await this.getAccessToken();
          done(null, accessToken);
        } catch (error) {
          done(error as Error, null);
        }
      },
    });
  }

  /**
   * Create villa folder structure in SharePoint
   */
  async createVillaFolderStructure(villaId: string, villaName: string): Promise<FolderStructure> {
    const sanitizedVillaName = this.sanitizeFolderName(villaName);
    const basePath = `Villas/${sanitizedVillaName}_${villaId}`;

    const folderStructure: FolderStructure = {
      villaId,
      villaName: sanitizedVillaName,
      folders: {
        legalDocuments: [
          `${basePath}/Legal_Documents/Contracts`,
          `${basePath}/Legal_Documents/Insurance`,
          `${basePath}/Legal_Documents/Inventory`,
          `${basePath}/Legal_Documents/Utilities`,
          `${basePath}/Legal_Documents/Emergency_Contacts`,
          `${basePath}/Legal_Documents/House_Rules`,
          `${basePath}/Legal_Documents/Staff_Contracts`,
          `${basePath}/Legal_Documents/Maintenance_Contracts`,
        ],
        mediaGallery: [
          `${basePath}/Media_Gallery/Branding/Logo`,
          `${basePath}/Media_Gallery/Property_Plans/Floor_Plans`,
          `${basePath}/Media_Gallery/Exterior_Views`,
          `${basePath}/Media_Gallery/Interior_Living_Spaces`,
          `${basePath}/Media_Gallery/Bedrooms`,
          `${basePath}/Media_Gallery/Bathrooms`,
          `${basePath}/Media_Gallery/Kitchen`,
          `${basePath}/Media_Gallery/Dining_Areas`,
          `${basePath}/Media_Gallery/Pool_Outdoor_Areas`,
          `${basePath}/Media_Gallery/Garden_Landscaping`,
          `${basePath}/Media_Gallery/Amenities_Facilities`,
          `${basePath}/Media_Gallery/Views_Surroundings`,
          `${basePath}/Media_Gallery/Staff_Areas`,
          `${basePath}/Media_Gallery/Utility_Areas`,
          `${basePath}/Media_Gallery/Entertainment`,
          `${basePath}/Media_Gallery/Videos`,
          `${basePath}/Media_Gallery/Drone_Shots`,
        ],
        agreements: [
          `${basePath}/Agreements/Property_Management_Agreement`,
          `${basePath}/Agreements/Owner_Service_Agreement`,
          `${basePath}/Agreements/Staff_Employment_Contract`,
          `${basePath}/Agreements/Maintenance_Service_Contract`,
          `${basePath}/Agreements/Insurance_Agreement`,
          `${basePath}/Agreements/Utility_Service_Agreement`,
          `${basePath}/Agreements/Marketing_Agreement`,
          `${basePath}/Agreements/Commission_Agreement`,
        ],
        marketingMaterials: [
          `${basePath}/Marketing_Materials/Property_Descriptions`,
          `${basePath}/Marketing_Materials/Marketing_Photos`,
          `${basePath}/Marketing_Materials/Promotional_Videos`,
          `${basePath}/Marketing_Materials/Brochures`,
          `${basePath}/Marketing_Materials/Virtual_Tours`,
          `${basePath}/Marketing_Materials/Social_Media_Content`,
        ],
      },
    };

    // Create all folders
    const allFolders = [
      ...folderStructure.folders.legalDocuments,
      ...folderStructure.folders.mediaGallery,
      ...folderStructure.folders.agreements,
      ...folderStructure.folders.marketingMaterials,
    ];

    for (const folderPath of allFolders) {
      await this.createFolderIfNotExists(folderPath);
    }

    return folderStructure;
  }

  /**
   * Upload file to SharePoint with automatic folder creation
   */
  async uploadFile(
    file: File | Buffer,
    fileName: string,
    folderPath: string,
    metadata?: Record<string, any>
  ): Promise<UploadResult> {
    try {
      // Ensure folder exists
      await this.createFolderIfNotExists(folderPath);

      // Prepare file content
      const fileContent = file instanceof File ? await file.arrayBuffer() : file;
      const sanitizedFileName = this.sanitizeFileName(fileName);

      // Upload file
      const uploadPath = `/drives/${this.config.driveId}/root:/${folderPath}/${sanitizedFileName}:/content`;
      
      const uploadResponse = await this.client
        .api(uploadPath)
        .put(fileContent);

      // Update file metadata if provided
      if (metadata && uploadResponse.id) {
        await this.updateFileMetadata(uploadResponse.id, metadata);
      }

      return {
        success: true,
        sharePointUrl: uploadResponse.webUrl,
        sharePointItemId: uploadResponse.id,
      };
    } catch (error) {
      console.error('SharePoint upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      };
    }
  }

  /**
   * Bulk upload files with progress tracking
   */
  async bulkUploadFiles(
    files: Array<{
      file: File | Buffer;
      fileName: string;
      folderPath: string;
      metadata?: Record<string, any>;
    }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      const result = await this.uploadFile(
        fileData.file,
        fileData.fileName,
        fileData.folderPath,
        fileData.metadata
      );
      
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    }

    return results;
  }

  /**
   * Create folder if it doesn't exist
   */
  private async createFolderIfNotExists(folderPath: string): Promise<void> {
    try {
      // Check if folder exists
      await this.client
        .api(`/drives/${this.config.driveId}/root:/${folderPath}`)
        .get();
    } catch (error) {
      // Folder doesn't exist, create it
      const pathParts = folderPath.split('/');
      let currentPath = '';

      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        try {
          await this.client
            .api(`/drives/${this.config.driveId}/root:/${currentPath}`)
            .get();
        } catch {
          // Create folder
          const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
          const folderName = currentPath.substring(currentPath.lastIndexOf('/') + 1);
          
          const createPath = parentPath 
            ? `/drives/${this.config.driveId}/root:/${parentPath}:/children`
            : `/drives/${this.config.driveId}/root/children`;

          await this.client
            .api(createPath)
            .post({
              name: folderName,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'rename',
            });
        }
      }
    }
  }

  /**
   * Update file metadata
   */
  private async updateFileMetadata(itemId: string, metadata: Record<string, any>): Promise<void> {
    try {
      await this.client
        .api(`/drives/${this.config.driveId}/items/${itemId}`)
        .patch({
          description: metadata.description,
          // Add other metadata fields as needed
        });
    } catch (error) {
      console.error('Failed to update file metadata:', error);
    }
  }

  /**
   * Get file download URL
   */
  async getFileDownloadUrl(itemId: string): Promise<string | null> {
    try {
      const response = await this.client
        .api(`/drives/${this.config.driveId}/items/${itemId}`)
        .get();
      
      return response['@microsoft.graph.downloadUrl'] || response.webUrl;
    } catch (error) {
      console.error('Failed to get download URL:', error);
      return null;
    }
  }

  /**
   * Delete file from SharePoint
   */
  async deleteFile(itemId: string): Promise<boolean> {
    try {
      await this.client
        .api(`/drives/${this.config.driveId}/items/${itemId}`)
        .delete();
      
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * List files in folder
   */
  async listFilesInFolder(folderPath: string): Promise<any[]> {
    try {
      const response = await this.client
        .api(`/drives/${this.config.driveId}/root:/${folderPath}:/children`)
        .get();
      
      return response.value || [];
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  /**
   * Sanitize folder name for SharePoint
   */
  private sanitizeFolderName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .trim();
  }

  /**
   * Sanitize file name for SharePoint
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .trim();
  }
}

// Export utility functions for use in Convex functions
export const sharePointUtils = {
  generateFolderPath: (villaId: string, villaName: string, category: string, subcategory?: string): string => {
    const sanitizedVillaName = villaName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
    const sanitizedCategory = category.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
    
    let path = `Villas/${sanitizedVillaName}_${villaId}`;
    
    if (category.includes('Photo') || category.includes('Image') || Object.values(PHOTO_CATEGORIES).includes(category as any)) {
      path += `/Photos/${sanitizedCategory}`;
    } else if (category.includes('Agreement') || category.includes('Contract') || Object.values(AGREEMENT_TYPES).includes(category as any)) {
      path += `/Agreements/${sanitizedCategory}`;
    } else {
      path += `/Documents/${sanitizedCategory}`;
    }
    
    if (subcategory) {
      const sanitizedSubcategory = subcategory.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
      path += `/${sanitizedSubcategory}`;
    }
    
    return path;
  },
  
  validateSharePointConfig: (config: Partial<SharePointConfig>): config is SharePointConfig => {
    return !!(
      config.tenantId &&
      config.clientId &&
      config.clientSecret &&
      config.siteId &&
      config.driveId
    );
  },
};
