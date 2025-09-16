import microsoftGraphService from './microsoftGraphService';
import { prisma } from '../../server';
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
  id?: string;
  downloadUrl?: string;
  webUrl?: string;
}

interface FolderStructure {
  legalDocuments: string;
  propertyContracts: string;
  propertyTitleDeeds: string;
  licensesPermits: string;
  legalCorrespondence: string;
  financialDocuments: string;
  insurancePolicies: string;
  taxDocuments: string;
  utilityAccounts: string;
  financialRecords: string;
  operationalDocuments: string;
  houseRules: string;
  emergencyContacts: string;
  inventoryLists: string;
  operatingProcedures: string;
  contractsAgreements: string;
  staffContracts: string;
  maintenanceContracts: string;
  serviceProviderAgreements: string;
  vendorContracts: string;
  maintenanceRecords: string;
  routineMaintenance: string;
  repairRecords: string;
  equipmentManuals: string;
  warrantyDocuments: string;
  photosMedia: string;
  propertyPhotos: string;
  marketingMaterials: string;
  beforeAfterPhotos: string;
  virtualTourAssets: string;
  archive: string;
  expiredDocuments: string;
  previousVersions: string;
  historicalRecords: string;
}

/**
 * SharePoint Service for managing document operations in SharePoint Online
 */
class SharePointService {
  private config: SharePointConfig | null = null;
  private isInitialized = false;
  private siteInfo: any = null;
  private driveInfo: any = null;

  /**
   * Initialize SharePoint service
   */
  private isEnabled(): boolean {
    const flag = process.env.ENABLE_SHAREPOINT;
    if (flag && flag.toLowerCase() === 'false') {
      return false;
    }
    return true;
  }

  async initialize(): Promise<void> {
    try {
      if (!this.isEnabled()) {
        logger.warn('[SharePoint] Initialization skipped because ENABLE_SHAREPOINT=false');
        this.isInitialized = false;
        return;
      }

      const siteUrl = process.env.SHAREPOINT_SITE_URL;
      const driveId = process.env.SHAREPOINT_DRIVE_ID;
      const baseFolderPath = process.env.SHAREPOINT_BASE_FOLDER || '';

      if (!siteUrl) {
        throw new Error('SharePoint site URL not configured. Please set SHAREPOINT_SITE_URL environment variable.');
      }

      this.config = {
        siteUrl,
        driveId,
        baseFolderPath,
      };

      // Initialize Microsoft Graph service if not already done
      const graphStatus = microsoftGraphService.getStatus();
      if (!graphStatus.initialized) {
        await microsoftGraphService.initialize();
      }

      // Get site information
      this.siteInfo = await microsoftGraphService.getSiteInfo(siteUrl);
      this.config.siteId = this.siteInfo.id;

      // Get drive information
      this.driveInfo = await microsoftGraphService.getDrive(this.siteInfo.id, driveId);
      this.config.driveId = this.driveInfo.id;

      // Ensure base folder structure exists
      await this.ensureBaseFolderStructure();

      this.isInitialized = true;
      logger.info('[OK] SharePoint service initialized successfully', {
        siteId: this.siteInfo.id,
        driveId: this.driveInfo.id,
        basePath: baseFolderPath,
      });
    } catch (error) {
      logger.error('[ERROR] Failed to initialize SharePoint service:', error);
      throw error;
    }
  }

  /**
   * Ensure base folder structure exists in SharePoint
   */
  private async ensureBaseFolderStructure(): Promise<void> {
    try {
      if (!this.config) {
        throw new Error('SharePoint service not configured');
      }

      // Skip folder creation if base folder path is empty (using root)
      if (!this.config.baseFolderPath || this.config.baseFolderPath.trim() === '') {
        logger.info('Using SharePoint root folder, skipping base folder structure creation');
        return;
      }

      const folders = [
        this.config.baseFolderPath,
        `${this.config.baseFolderPath}/Templates`,
        `${this.config.baseFolderPath}/Archive`,
      ];

      for (const folderPath of folders) {
        try {
          // Try to get the folder first
          await microsoftGraphService.getClient()
            .api(`/sites/${this.config.siteId}/drives/${this.config.driveId}/root:${folderPath}`)
            .get();
          
          logger.debug(`Folder exists: ${folderPath}`);
        } catch (error) {
          // Folder doesn't exist, create it
          const pathParts = folderPath.split('/').filter(part => part);
          let currentPath = '';
          
          for (const part of pathParts) {
            const parentPath = currentPath || '/';
            currentPath += `/${part}`;
            
            try {
              await microsoftGraphService.createFolder(
                this.config.siteId!,
                this.config.driveId!,
                parentPath,
                part
              );
              logger.debug(`Created folder: ${currentPath}`);
            } catch (createError: any) {
              // Ignore if folder already exists
              if (!createError.message?.includes('already exists')) {
                throw createError;
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to ensure base folder structure:', error);
      throw error;
    }
  }

  /**
   * Get or generate villa code
   */
  private async getOrGenerateVillaCode(villaId: string): Promise<string> {
    logger.info(`🏷️  Getting/generating villa code for villa: ${villaId}`);
    
    const villa = await prisma.villa.findUnique({
      where: { id: villaId },
      select: { villaCode: true, villaName: true }
    });

    logger.info(`📋 Current villa code in DB: ${villa?.villaCode || 'NONE'}`);

    // If villa has a proper code (not the UUID), use it
    if (villa?.villaCode && villa.villaCode !== villaId && villa.villaCode.match(/^VIL\d{6}$/)) {
      logger.info(`[OK] Using existing villa code: ${villa.villaCode}`);
      return villa.villaCode;
    }

    // Generate a new unique code
    let attempts = 0;
    let newCode: string;
    const maxAttempts = 10;
    
    do {
      // Get all existing villa codes to find the next available number
      const existingCodes = await prisma.villa.findMany({
        select: { villaCode: true },
        where: {
          villaCode: {
            startsWith: 'VIL',
            not: { in: [villaId, villa?.villaCode || ''] } // Exclude UUIDs and current invalid codes
          }
        }
      });

      // Extract numbers from existing codes
      const codeNumbers = existingCodes
        .map(v => v.villaCode)
        .filter(code => code.match(/^VIL\d{6}$/))
        .map(code => parseInt(code.substring(3)))
        .filter(num => !isNaN(num))
        .sort((a, b) => a - b);

      // Find next available number
      let nextNumber = 1;
      for (const num of codeNumbers) {
        if (num === nextNumber) {
          nextNumber++;
        } else {
          break;
        }
      }

      newCode = `VIL${String(nextNumber).padStart(6, '0')}`;
      
      // Check if this code already exists (race condition protection)
      const existingVilla = await prisma.villa.findUnique({
        where: { villaCode: newCode }
      });
      
      if (!existingVilla) {
        break;
      }
      
      attempts++;
      logger.warn(`Villa code ${newCode} already exists, trying again (attempt ${attempts})`);
      
    } while (attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique villa code after maximum attempts');
    }
    
    logger.info(`🆕 Generated new villa code: ${newCode} (sequence number: ${parseInt(newCode.substring(3))})`);
    
    // Update the villa with the new code
    await prisma.villa.update({
      where: { id: villaId },
      data: { villaCode: newCode }
    });

    logger.info(`💾 Updated villa ${villaId} with new code: ${newCode}`);
    return newCode;
  }

  /**
   * Check if villa folder exists in SharePoint
   */
  async checkVillaFolderExists(villaId: string, villaName: string): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('SharePoint service not initialized');
      }

      const villa = await prisma.villa.findUnique({
        where: { id: villaId },
        select: { villaCode: true, sharePointPath: true }
      });

      // If SharePoint path is already stored and valid, check that path
      if (villa?.sharePointPath) {
        try {
          await microsoftGraphService.getClient()
            .api(`/sites/${this.config.siteId}/drives/${this.config.driveId}/root:${villa.sharePointPath}`)
            .get();
          
          logger.info(`Villa folder exists at stored path: ${villa.sharePointPath}`);
          return true;
        } catch (error: any) {
          if (error.statusCode === 404) {
            logger.warn(`Stored SharePoint path not found: ${villa.sharePointPath}. Will regenerate.`);
            // Clear invalid path from database
            await prisma.villa.update({
              where: { id: villaId },
              data: { 
                sharePointPath: null, 
                documentsPath: null, 
                photosPath: null 
              }
            });
            return false;
          }
          throw error;
        }
      }

      // Generate proper villa code if needed
      const villaCode = await this.getOrGenerateVillaCode(villaId);
      
      const sanitizedVillaName = this.sanitizeFolderName(villaName);
      const basePath = this.config.baseFolderPath || '';
      const villaFolderName = `${sanitizedVillaName}_${villaCode}`;
      const villaBasePath = basePath ? `${basePath}/Villas/${villaFolderName}` : `/Villas/${villaFolderName}`;

      try {
        // Try to get the folder with the expected path
        await microsoftGraphService.getClient()
          .api(`/sites/${this.config.siteId}/drives/${this.config.driveId}/root:${villaBasePath}`)
          .get();
        
        logger.info(`Villa folder found at expected path: ${villaBasePath}`);
        
        // Update database with found path
        const folderStructure = this.getExistingFolderStructure(villaBasePath);
        await prisma.villa.update({
          where: { id: villaId },
          data: {
            sharePointPath: villaBasePath,
            documentsPath: folderStructure.legalDocuments,
            photosPath: folderStructure.photosMedia,
          },
        });
        
        return true;
      } catch (error: any) {
        if (error.statusCode === 404) {
          logger.info(`Villa folder does not exist at expected path: ${villaBasePath}`);
          return false;
        }
        throw error;
      }
    } catch (error) {
      logger.error('Failed to check villa folder existence:', error);
      throw error;
    }
  }

  /**
   * Create villa-specific folder structure
   */
  async createVillaFolders(villaId: string, villaName: string): Promise<FolderStructure> {
    try {
      if (!this.config) {
        throw new Error('SharePoint service not initialized');
      }

      // Get villa code for folder naming - ensure we get the short code
      const villa = await prisma.villa.findUnique({
        where: { id: villaId },
        select: { villaCode: true, sharePointPath: true, id: true }
      });

      // If SharePoint path already exists, return the existing structure
      if (villa?.sharePointPath) {
        logger.info(`Using existing SharePoint structure for villa ${villaName}`);
        return this.getExistingFolderStructure(villa.sharePointPath);
      }

      // Get or generate proper villa code
      const villaCode = await this.getOrGenerateVillaCode(villaId);
      
      const sanitizedVillaName = this.sanitizeFolderName(villaName);
      const basePath = this.config.baseFolderPath || '';
      // Use format: VillaName_VIL0001 (not the long UUID)
      const villaFolderName = `${sanitizedVillaName}_${villaCode}`;
      const villaBasePath = basePath ? `${basePath}/Villas/${villaFolderName}` : `/Villas/${villaFolderName}`;
      
      logger.info(`🏗️  Building villa folder structure:`, {
        originalVillaName: villaName,
        sanitizedVillaName: sanitizedVillaName,
        villaCode: villaCode,
        villaFolderName: villaFolderName,
        villaBasePath: villaBasePath
      });

      const folderStructure: FolderStructure = {
        // Legal Documents
        legalDocuments: `${villaBasePath}/01-Legal-Documents`,
        propertyContracts: `${villaBasePath}/01-Legal-Documents/Property-Contracts`,
        propertyTitleDeeds: `${villaBasePath}/01-Legal-Documents/Property-Title-Deeds`,
        licensesPermits: `${villaBasePath}/01-Legal-Documents/Licenses-Permits`,
        legalCorrespondence: `${villaBasePath}/01-Legal-Documents/Legal-Correspondence`,
        
        // Financial Documents
        financialDocuments: `${villaBasePath}/02-Financial-Documents`,
        insurancePolicies: `${villaBasePath}/02-Financial-Documents/Insurance-Policies`,
        taxDocuments: `${villaBasePath}/02-Financial-Documents/Tax-Documents`,
        utilityAccounts: `${villaBasePath}/02-Financial-Documents/Utility-Accounts`,
        financialRecords: `${villaBasePath}/02-Financial-Documents/Financial-Records`,
        
        // Operational Documents
        operationalDocuments: `${villaBasePath}/03-Operational-Documents`,
        houseRules: `${villaBasePath}/03-Operational-Documents/House-Rules`,
        emergencyContacts: `${villaBasePath}/03-Operational-Documents/Emergency-Contacts`,
        inventoryLists: `${villaBasePath}/03-Operational-Documents/Inventory-Lists`,
        operatingProcedures: `${villaBasePath}/03-Operational-Documents/Operating-Procedures`,
        
        // Contracts & Agreements
        contractsAgreements: `${villaBasePath}/04-Contracts-Agreements`,
        staffContracts: `${villaBasePath}/04-Contracts-Agreements/Staff-Contracts`,
        maintenanceContracts: `${villaBasePath}/04-Contracts-Agreements/Maintenance-Contracts`,
        serviceProviderAgreements: `${villaBasePath}/04-Contracts-Agreements/Service-Provider-Agreements`,
        vendorContracts: `${villaBasePath}/04-Contracts-Agreements/Vendor-Contracts`,
        
        // Maintenance Records
        maintenanceRecords: `${villaBasePath}/05-Maintenance-Records`,
        routineMaintenance: `${villaBasePath}/05-Maintenance-Records/Routine-Maintenance`,
        repairRecords: `${villaBasePath}/05-Maintenance-Records/Repair-Records`,
        equipmentManuals: `${villaBasePath}/05-Maintenance-Records/Equipment-Manuals`,
        warrantyDocuments: `${villaBasePath}/05-Maintenance-Records/Warranty-Documents`,
        
        // Photos & Media
        photosMedia: `${villaBasePath}/06-Photos-Media`,
        propertyPhotos: `${villaBasePath}/06-Photos-Media/Property-Photos`,
        marketingMaterials: `${villaBasePath}/06-Photos-Media/Marketing-Materials`,
        beforeAfterPhotos: `${villaBasePath}/06-Photos-Media/Before-After-Photos`,
        virtualTourAssets: `${villaBasePath}/06-Photos-Media/Virtual-Tour-Assets`,
        
        // Archive
        archive: `${villaBasePath}/07-Archive`,
        expiredDocuments: `${villaBasePath}/07-Archive/Expired-Documents`,
        previousVersions: `${villaBasePath}/07-Archive/Previous-Versions`,
        historicalRecords: `${villaBasePath}/07-Archive/Historical-Records`,
      };

      // Create folders in the correct order - parent folders first
      const foldersToCreate = [
        // Base Villas folder
        { parentPath: this.config.baseFolderPath || '/', folderName: 'Villas' },
        // Villa specific folder - use the villaFolderName variable
        { parentPath: `${this.config.baseFolderPath}/Villas`, folderName: villaFolderName },
        
        // Main category folders (direct children of villa folder)
        { parentPath: villaBasePath, folderName: '01-Legal-Documents' },
        { parentPath: villaBasePath, folderName: '02-Financial-Documents' },
        { parentPath: villaBasePath, folderName: '03-Operational-Documents' },
        { parentPath: villaBasePath, folderName: '04-Contracts-Agreements' },
        { parentPath: villaBasePath, folderName: '05-Maintenance-Records' },
        { parentPath: villaBasePath, folderName: '06-Photos-Media' },
        { parentPath: villaBasePath, folderName: '07-Archive' },
        
        // Legal Documents subfolders
        { parentPath: `${villaBasePath}/01-Legal-Documents`, folderName: 'Property-Contracts' },
        { parentPath: `${villaBasePath}/01-Legal-Documents`, folderName: 'Property-Title-Deeds' },
        { parentPath: `${villaBasePath}/01-Legal-Documents`, folderName: 'Licenses-Permits' },
        { parentPath: `${villaBasePath}/01-Legal-Documents`, folderName: 'Legal-Correspondence' },
        
        // Financial Documents subfolders
        { parentPath: `${villaBasePath}/02-Financial-Documents`, folderName: 'Insurance-Policies' },
        { parentPath: `${villaBasePath}/02-Financial-Documents`, folderName: 'Tax-Documents' },
        { parentPath: `${villaBasePath}/02-Financial-Documents`, folderName: 'Utility-Accounts' },
        { parentPath: `${villaBasePath}/02-Financial-Documents`, folderName: 'Financial-Records' },
        
        // Operational Documents subfolders
        { parentPath: `${villaBasePath}/03-Operational-Documents`, folderName: 'House-Rules' },
        { parentPath: `${villaBasePath}/03-Operational-Documents`, folderName: 'Emergency-Contacts' },
        { parentPath: `${villaBasePath}/03-Operational-Documents`, folderName: 'Inventory-Lists' },
        { parentPath: `${villaBasePath}/03-Operational-Documents`, folderName: 'Operating-Procedures' },
        
        // Contracts & Agreements subfolders
        { parentPath: `${villaBasePath}/04-Contracts-Agreements`, folderName: 'Staff-Contracts' },
        { parentPath: `${villaBasePath}/04-Contracts-Agreements`, folderName: 'Maintenance-Contracts' },
        { parentPath: `${villaBasePath}/04-Contracts-Agreements`, folderName: 'Service-Provider-Agreements' },
        { parentPath: `${villaBasePath}/04-Contracts-Agreements`, folderName: 'Vendor-Contracts' },
        
        // Maintenance Records subfolders
        { parentPath: `${villaBasePath}/05-Maintenance-Records`, folderName: 'Routine-Maintenance' },
        { parentPath: `${villaBasePath}/05-Maintenance-Records`, folderName: 'Repair-Records' },
        { parentPath: `${villaBasePath}/05-Maintenance-Records`, folderName: 'Equipment-Manuals' },
        { parentPath: `${villaBasePath}/05-Maintenance-Records`, folderName: 'Warranty-Documents' },
        
        // Photos & Media subfolders
        { parentPath: `${villaBasePath}/06-Photos-Media`, folderName: 'Property-Photos' },
        { parentPath: `${villaBasePath}/06-Photos-Media`, folderName: 'Marketing-Materials' },
        { parentPath: `${villaBasePath}/06-Photos-Media`, folderName: 'Before-After-Photos' },
        { parentPath: `${villaBasePath}/06-Photos-Media`, folderName: 'Virtual-Tour-Assets' },
        
        // Archive subfolders
        { parentPath: `${villaBasePath}/07-Archive`, folderName: 'Expired-Documents' },
        { parentPath: `${villaBasePath}/07-Archive`, folderName: 'Previous-Versions' },
        { parentPath: `${villaBasePath}/07-Archive`, folderName: 'Historical-Records' },
      ];

      logger.info(`📁 Creating ${foldersToCreate.length} folders for villa: ${villaFolderName}`);
      
      for (const folder of foldersToCreate) {
        try {
          logger.info(`🔨 Creating folder: ${folder.folderName} in parent: ${folder.parentPath}`);
          await microsoftGraphService.createFolder(
            this.config.siteId!,
            this.config.driveId!,
            folder.parentPath,
            folder.folderName
          );
          logger.info(`[OK] Successfully created folder: ${folder.parentPath}/${folder.folderName}`);
        } catch (error: any) {
          // Ignore if folder already exists
          if (!error.message?.includes('already exists') && !error.message?.includes('409')) {
            logger.warn(`[ERROR] Failed to create folder ${folder.parentPath}/${folder.folderName}:`, error);
          } else {
            logger.info(`📂 Folder already exists: ${folder.parentPath}/${folder.folderName}`);
          }
        }
      }

      // Update villa record with SharePoint paths
      await prisma.villa.update({
        where: { id: villaId },
        data: {
          sharePointPath: villaBasePath,
          documentsPath: folderStructure.legalDocuments, // Main documents path for compatibility
          photosPath: folderStructure.photosMedia,
        },
      });

      logger.info(`[OK] Villa folder structure created for ${villaName}`, { villaId, basePath: villaBasePath });
      return folderStructure;
    } catch (error) {
      logger.error(`[ERROR] Failed to create villa folders for ${villaName}:`, error);
      throw error;
    }
  }

  /**
   * Get existing folder structure from SharePoint path
   */
  private getExistingFolderStructure(villaBasePath: string): FolderStructure {
    return {
      // Legal Documents
      legalDocuments: `${villaBasePath}/01-Legal-Documents`,
      propertyContracts: `${villaBasePath}/01-Legal-Documents/Property-Contracts`,
      propertyTitleDeeds: `${villaBasePath}/01-Legal-Documents/Property-Title-Deeds`,
      licensesPermits: `${villaBasePath}/01-Legal-Documents/Licenses-Permits`,
      legalCorrespondence: `${villaBasePath}/01-Legal-Documents/Legal-Correspondence`,
      
      // Financial Documents
      financialDocuments: `${villaBasePath}/02-Financial-Documents`,
      insurancePolicies: `${villaBasePath}/02-Financial-Documents/Insurance-Policies`,
      taxDocuments: `${villaBasePath}/02-Financial-Documents/Tax-Documents`,
      utilityAccounts: `${villaBasePath}/02-Financial-Documents/Utility-Accounts`,
      financialRecords: `${villaBasePath}/02-Financial-Documents/Financial-Records`,
      
      // Operational Documents
      operationalDocuments: `${villaBasePath}/03-Operational-Documents`,
      houseRules: `${villaBasePath}/03-Operational-Documents/House-Rules`,
      emergencyContacts: `${villaBasePath}/03-Operational-Documents/Emergency-Contacts`,
      inventoryLists: `${villaBasePath}/03-Operational-Documents/Inventory-Lists`,
      operatingProcedures: `${villaBasePath}/03-Operational-Documents/Operating-Procedures`,
      
      // Contracts & Agreements
      contractsAgreements: `${villaBasePath}/04-Contracts-Agreements`,
      staffContracts: `${villaBasePath}/04-Contracts-Agreements/Staff-Contracts`,
      maintenanceContracts: `${villaBasePath}/04-Contracts-Agreements/Maintenance-Contracts`,
      serviceProviderAgreements: `${villaBasePath}/04-Contracts-Agreements/Service-Provider-Agreements`,
      vendorContracts: `${villaBasePath}/04-Contracts-Agreements/Vendor-Contracts`,
      
      // Maintenance Records
      maintenanceRecords: `${villaBasePath}/05-Maintenance-Records`,
      routineMaintenance: `${villaBasePath}/05-Maintenance-Records/Routine-Maintenance`,
      repairRecords: `${villaBasePath}/05-Maintenance-Records/Repair-Records`,
      equipmentManuals: `${villaBasePath}/05-Maintenance-Records/Equipment-Manuals`,
      warrantyDocuments: `${villaBasePath}/05-Maintenance-Records/Warranty-Documents`,
      
      // Photos & Media
      photosMedia: `${villaBasePath}/06-Photos-Media`,
      propertyPhotos: `${villaBasePath}/06-Photos-Media/Property-Photos`,
      marketingMaterials: `${villaBasePath}/06-Photos-Media/Marketing-Materials`,
      beforeAfterPhotos: `${villaBasePath}/06-Photos-Media/Before-After-Photos`,
      virtualTourAssets: `${villaBasePath}/06-Photos-Media/Virtual-Tour-Assets`,
      
      // Archive
      archive: `${villaBasePath}/07-Archive`,
      expiredDocuments: `${villaBasePath}/07-Archive/Expired-Documents`,
      previousVersions: `${villaBasePath}/07-Archive/Previous-Versions`,
      historicalRecords: `${villaBasePath}/07-Archive/Historical-Records`,
    };
  }

  /**
   * Upload document to SharePoint
   */
  async uploadDocument(
    villaId: string,
    documentType: string,
    fileName: string,
    fileContent: Buffer,
    mimeType: string,
    options: {
      description?: string;
      validFrom?: Date;
      validUntil?: Date;
      replaceExisting?: boolean;
    } = {}
  ): Promise<UploadResult> {
    try {
      if (!this.isEnabled()) {
        logger.warn('[SharePoint] uploadDocument skipped because integration disabled', { villaId, documentType, fileName });
        return {
          fileId: '',
          fileName,
          filePath: '',
          fileUrl: '',
          size: fileContent.length,
          mimeType,
          sharepointUrl: undefined,
        };
      }

      if (!this.config) {
        throw new Error('SharePoint service not initialized');
      }

      // Get villa information
      const villa = await prisma.villa.findUnique({
        where: { id: villaId },
        select: { id: true, villaName: true, sharePointPath: true, documentsPath: true, villaCode: true },
      });

      if (!villa) {
        throw new Error(`Villa not found: ${villaId}`);
      }

      // Check if villa folders exist first
      const folderExists = villa.sharePointPath ? true : await this.checkVillaFolderExists(villaId, villa.villaName);
      
      logger.info(`📊 Villa SharePoint status for ${villa.villaName}:`, {
        villaId: villaId,
        currentSharePointPath: villa.sharePointPath,
        currentDocumentsPath: villa.documentsPath,
        currentVillaCode: villa.villaCode,
        folderExists: folderExists
      });
      
      let documentsPath = villa.documentsPath;
      let sharePointPath = villa.sharePointPath;
      
      // Only create folders if they don't exist
      if (!folderExists) {
        logger.info(`🆕 Path 1: Creating NEW SharePoint folder structure for villa ${villa.villaName} (${villa.villaCode})`);
        const folderStructure = await this.createVillaFolders(villaId, villa.villaName);
        
        // Get the updated villa record to get the correct SharePoint path
        const updatedVilla = await prisma.villa.findUnique({
          where: { id: villaId },
          select: { sharePointPath: true, documentsPath: true }
        });
        
        documentsPath = updatedVilla?.documentsPath || folderStructure.legalDocuments;
        sharePointPath = updatedVilla?.sharePointPath || sharePointPath;
        logger.info(`✨ NEW SharePoint path from DB: ${sharePointPath}`);
      } else if (villa.sharePointPath) {
        logger.info(`📁 Path 2: Using EXISTING folder structure from DB: ${villa.sharePointPath}`);
        // Use existing folder structure
        const folderStructure = this.getExistingFolderStructure(villa.sharePointPath);
        documentsPath = folderStructure.legalDocuments;
        sharePointPath = villa.sharePointPath;
      } else {
        logger.info(`🔧 Path 3: Folder exists but not tracked in DB, updating record`);
        // Folder exists but not tracked in DB, update the villa record
        const villaCode = await this.getOrGenerateVillaCode(villaId);
        sharePointPath = `${this.config.baseFolderPath || ''}/Villas/${this.sanitizeFolderName(villa.villaName)}_${villaCode}`;
        logger.info(`🔧 Generated SharePoint path: ${sharePointPath}`);
        const folderStructure = this.getExistingFolderStructure(sharePointPath);
        documentsPath = folderStructure.legalDocuments;
        
        // Update villa record with existing SharePoint path
        await prisma.villa.update({
          where: { id: villaId },
          data: {
            sharePointPath,
            documentsPath,
            photosPath: folderStructure.photosMedia,
          },
        });
      }
      
      logger.info(`📂 Final paths for upload:`, {
        sharePointPath: sharePointPath,
        documentsPath: documentsPath
      });

      // Determine subfolder based on document type - use villa base path, not documentsPath
      const subfolder = this.getDocumentSubfolder(documentType);
      const fullPath = `${sharePointPath}/${subfolder}`;

      // Sanitize filename
      const sanitizedFileName = this.sanitizeFileName(fileName);
      const conflictBehavior = options.replaceExisting ? 'replace' : 'rename';

      // Upload file to SharePoint
      const uploadResult = await microsoftGraphService.uploadFile(
        this.config.siteId!,
        this.config.driveId!,
        fullPath,
        sanitizedFileName,
        fileContent,
        {
          conflictBehavior,
          description: options.description,
        }
      );

      // Create document record in database
      const document = await prisma.document.create({
        data: {
          villaId,
          documentType: documentType as any,
          fileName: sanitizedFileName,
          fileUrl: uploadResult.webUrl || uploadResult['@microsoft.graph.downloadUrl'],
          fileSize: fileContent.length,
          mimeType,
          description: options.description,
          validFrom: options.validFrom,
          validUntil: options.validUntil,
          sharePointFileId: uploadResult.id,
          sharePointPath: `${fullPath}/${sanitizedFileName}`,
          isActive: true,
        },
      });

      const result: UploadResult = {
        fileId: uploadResult.id,
        fileName: sanitizedFileName,
        filePath: `${fullPath}/${sanitizedFileName}`,
        fileUrl: uploadResult.webUrl || uploadResult['@microsoft.graph.downloadUrl'],
        size: fileContent.length,
        mimeType,
        sharepointUrl: uploadResult.webUrl,
      };

      logger.info(`[OK] Document uploaded to SharePoint: ${sanitizedFileName}`, {
        villaId,
        documentId: document.id,
        sharePointFileId: uploadResult.id,
      });

      return result;
    } catch (error) {
      logger.error(`[ERROR] Failed to upload document ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Download document from SharePoint
   */
  async downloadDocument(sharePointFileId: string): Promise<{
    content: ArrayBuffer;
    fileName: string;
    mimeType: string;
  }> {
    try {
      if (!this.isEnabled()) {
        throw new Error('SharePoint integration disabled');
      }

      if (!this.config) {
        throw new Error('SharePoint service not initialized');
      }

      // Get file metadata
      const fileInfo = await microsoftGraphService.getFile(
        this.config.siteId!,
        this.config.driveId!,
        sharePointFileId
      );

      // Download file content
      const content = await microsoftGraphService.downloadFile(
        this.config.siteId!,
        this.config.driveId!,
        sharePointFileId
      );

      logger.debug(`[OK] Document downloaded from SharePoint: ${fileInfo.name}`);

      return {
        content,
        fileName: fileInfo.name,
        mimeType: fileInfo.file?.mimeType || 'application/octet-stream',
      };
    } catch (error) {
      logger.error(`[ERROR] Failed to download document ${sharePointFileId}:`, error);
      throw error;
    }
  }

  /**
   * Delete document from SharePoint
   */
  async deleteDocument(sharePointFileId: string, documentId?: string): Promise<void> {
    try {
      if (!this.isEnabled()) {
        logger.warn('[SharePoint] deleteDocument skipped because integration disabled', { sharePointFileId });
        return;
      }

      if (!this.config) {
        throw new Error('SharePoint service not initialized');
      }

      // Delete from SharePoint
      await microsoftGraphService.deleteFile(
        this.config.siteId!,
        this.config.driveId!,
        sharePointFileId
      );

      // Update database record if document ID provided
      if (documentId) {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            isActive: false,
            deletedAt: new Date(),
          },
        });
      }

      logger.info(`[OK] Document deleted from SharePoint: ${sharePointFileId}`);
    } catch (error) {
      logger.error(`[ERROR] Failed to delete document ${sharePointFileId}:`, error);
      throw error;
    }
  }

  /**
   * List documents in villa folder
   */
  async listVillaDocuments(
    villaId: string,
    options: {
      documentType?: string;
      top?: number;
      skip?: number;
    } = {}
  ): Promise<any[]> {
    try {
      if (!this.config) {
        throw new Error('SharePoint service not initialized');
      }

      const villa = await prisma.villa.findUnique({
        where: { id: villaId },
        select: { documentsPath: true },
      });

      if (!villa?.documentsPath) {
        return [];
      }

      let folderPath = villa.documentsPath;
      if (options.documentType) {
        const subfolder = this.getDocumentSubfolder(options.documentType);
        folderPath = `${villa.documentsPath}/${subfolder}`;
      }

      const result = await microsoftGraphService.listFiles(
        this.config.siteId!,
        this.config.driveId!,
        folderPath,
        {
          top: options.top,
          skip: options.skip,
          orderBy: 'lastModifiedDateTime desc',
        }
      );

      logger.debug(`Documents listed for villa ${villaId}`, { count: result.value?.length || 0 });
      return result.value || [];
    } catch (error) {
      logger.error(`Failed to list documents for villa ${villaId}:`, error);
      throw error;
    }
  }

  /**
   * Search documents across all villas
   */
  async searchDocuments(
    query: string,
    options: {
      villaId?: string;
      documentType?: string;
      top?: number;
      skip?: number;
    } = {}
  ): Promise<any[]> {
    try {
      if (!this.config) {
        throw new Error('SharePoint service not initialized');
      }

      let searchPath = this.config.baseFolderPath;
      
      if (options.villaId) {
        const villa = await prisma.villa.findUnique({
          where: { id: options.villaId },
          select: { sharePointPath: true },
        });
        
        if (villa?.sharePointPath) {
          searchPath = villa.sharePointPath;
        }
      }

      // Perform search in SharePoint
      const result = await microsoftGraphService.searchFiles(
        this.config.siteId!,
        this.config.driveId!,
        query,
        {
          top: options.top,
          skip: options.skip,
        }
      );

      // Filter results by path if needed
      let filteredResults = result.value || [];
      
      if (searchPath !== this.config.baseFolderPath) {
        filteredResults = filteredResults.filter((file: any) => 
          file.parentReference?.path?.includes(searchPath)
        );
      }

      logger.debug(`Document search completed for query: ${query}`, { count: filteredResults.length });
      return filteredResults;
    } catch (error) {
      logger.error(`Failed to search documents with query ${query}:`, error);
      throw error;
    }
  }

  /**
   * Set document permissions
   */
  async setDocumentPermissions(
    sharePointFileId: string,
    permissions: {
      recipients: string[];
      roles: ('read' | 'write' | 'owner')[];
      message?: string;
    }
  ): Promise<void> {
    try {
      if (!this.config) {
        throw new Error('SharePoint service not initialized');
      }

      await microsoftGraphService.setFilePermissions(
        this.config.siteId!,
        this.config.driveId!,
        sharePointFileId,
        {
          ...permissions,
          requireSignIn: true,
          sendInvitation: true,
        }
      );

      logger.info(`[OK] Permissions set for document ${sharePointFileId}`, { recipients: permissions.recipients });
    } catch (error) {
      logger.error(`[ERROR] Failed to set permissions for document ${sharePointFileId}:`, error);
      throw error;
    }
  }

  /**
   * Sync document metadata between database and SharePoint
   */
  async syncDocumentMetadata(documentId: string): Promise<void> {
    try {
      if (!this.config) {
        throw new Error('SharePoint service not initialized');
      }

      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document?.sharePointFileId) {
        throw new Error('Document not linked to SharePoint');
      }

      // Get current file info from SharePoint
      const sharePointFile = await microsoftGraphService.getFile(
        this.config.siteId!,
        this.config.driveId!,
        document.sharePointFileId
      );

      // Update database with SharePoint metadata
      await prisma.document.update({
        where: { id: documentId },
        data: {
          fileSize: sharePointFile.size || document.fileSize,
          fileUrl: sharePointFile.webUrl || document.fileUrl,
          updatedAt: new Date(sharePointFile.lastModifiedDateTime) || new Date(),
        },
      });

      logger.debug(`[OK] Document metadata synced: ${documentId}`);
    } catch (error) {
      logger.error(`[ERROR] Failed to sync document metadata ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get document subfolder based on type
   */
  private getDocumentSubfolder(documentType: string): string {
    const folderMap: Record<string, string> = {
      // Legal Documents
      'PROPERTY_CONTRACT': '01-Legal-Documents/Property-Contracts',
      'PROPERTY_TITLE': '01-Legal-Documents/Property-Title-Deeds',
      'LICENSES_PERMITS': '01-Legal-Documents/Licenses-Permits',
      
      // Financial Documents
      'INSURANCE_CERTIFICATE': '02-Financial-Documents/Insurance-Policies',
      'TAX_DOCUMENTS': '02-Financial-Documents/Tax-Documents',
      'UTILITY_BILLS': '02-Financial-Documents/Utility-Accounts',
      
      // Operational Documents
      'HOUSE_RULES': '03-Operational-Documents/House-Rules',
      'EMERGENCY_CONTACTS': '03-Operational-Documents/Emergency-Contacts',
      'INVENTORY_LIST': '03-Operational-Documents/Inventory-Lists',
      
      // Contracts & Agreements
      'STAFF_CONTRACTS': '04-Contracts-Agreements/Staff-Contracts',
      'MAINTENANCE_CONTRACTS': '04-Contracts-Agreements/Maintenance-Contracts',
      'SERVICE_CONTRACTS': '04-Contracts-Agreements/Service-Provider-Agreements',
      'VENDOR_CONTRACTS': '04-Contracts-Agreements/Vendor-Contracts',
      
      // Maintenance Records
      'MAINTENANCE_RECORDS': '05-Maintenance-Records/Routine-Maintenance',
      'REPAIR_RECORDS': '05-Maintenance-Records/Repair-Records',
      'EQUIPMENT_MANUALS': '05-Maintenance-Records/Equipment-Manuals',
      'WARRANTY_DOCUMENTS': '05-Maintenance-Records/Warranty-Documents',
      
      // Photos & Media
      'FLOOR_PLANS': '06-Photos-Media/Property-Photos',
      'MARKETING_MATERIALS': '06-Photos-Media/Marketing-Materials',
      
      // Default
      'OTHER': '01-Legal-Documents/Property-Contracts',
    };

    return folderMap[documentType] || '01-Legal-Documents/Property-Contracts';
  }

  /**
   * Upload photo file to SharePoint (similar to uploadDocument but for photos)
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    filePath: string,
    villaId: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<UploadResult> {
    try {
      if (!this.isEnabled()) {
        logger.warn('[SharePoint] uploadFile skipped because integration disabled', { villaId, fileName });
        return {
          fileId: '',
          fileName,
          filePath,
          fileUrl: '',
          size: fileBuffer.length,
          mimeType,
          sharepointUrl: undefined,
        };
      }

      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('File buffer is empty');
      }

      // Get villa info for folder structure
      const villa = await prisma.villa.findUnique({
        where: { id: villaId },
        select: { villaName: true, villaCode: true, sharePointPath: true, photosPath: true }
      });

      if (!villa) {
        throw new Error(`Villa not found: ${villaId}`);
      }

      // Check if villa folders exist first
      const folderExists = villa.sharePointPath ? true : await this.checkVillaFolderExists(villaId, villa.villaName);
      
      let photosPath: string;
      
      // Only create folders if they don't exist
      if (!folderExists) {
        logger.info(`Creating SharePoint folder structure for villa ${villa.villaName} (${villa.villaCode})`);
        const folderStructure = await this.createVillaFolders(villaId, villa.villaName);
        photosPath = folderStructure.photosMedia;
      } else if (villa.photosPath) {
        // Use existing photos path
        photosPath = villa.photosPath;
      } else {
        // Folder exists but not tracked in DB, update the villa record
        const villaCode = villa.villaCode || `VIL${villaId.slice(-4)}`;
        const sharePointPath = `${this.config?.baseFolderPath || ''}/Villas/${this.sanitizeFolderName(villa.villaName)}_${villaCode}`;
        const folderStructure = this.getExistingFolderStructure(sharePointPath);
        photosPath = folderStructure.photosMedia;
        
        // Update villa record with existing SharePoint path
        await prisma.villa.update({
          where: { id: villaId },
          data: {
            sharePointPath,
            photosPath,
            documentsPath: folderStructure.legalDocuments,
          },
        });
      }

      // Sanitize file name
      const sanitizedFileName = this.sanitizeFileName(fileName);
      
      // Use the provided filePath directly
      const fullPath = filePath;
      
      // Use provided file buffer
      const fileContent = fileBuffer;

      // Upload file using Microsoft Graph service
      const uploadResult = await microsoftGraphService.uploadFile(
        this.siteInfo!.id,
        this.driveInfo!.id,
        fullPath,
        sanitizedFileName,
        fileContent,
        { description: `Photo for villa ${villaId}` }
      );

      logger.info('Photo uploaded to SharePoint successfully', {
        villaId,
        fileName: sanitizedFileName,
        sharePointPath: `${fullPath}/${sanitizedFileName}`,
        fileId: uploadResult.id
      });

      return {
        fileId: uploadResult.id,
        fileName: sanitizedFileName,
        filePath: `${fullPath}/${sanitizedFileName}`,
        fileUrl: uploadResult.webUrl || `${this.config?.siteUrl}${fullPath}/${sanitizedFileName}`,
        size: uploadResult.size || 0,
        mimeType,
        sharepointUrl: uploadResult.webUrl
      };

    } catch (error) {
      logger.error('Failed to upload photo to SharePoint:', error);
      throw error;
    }
  }

  /**
   * List files in a SharePoint folder
   */
  async listFiles(folderPath: string): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.config?.siteId || !this.config?.driveId) {
        throw new Error('SharePoint configuration not available');
      }

      const result = await microsoftGraphService.listFiles(
        this.config.siteId,
        this.config.driveId,
        folderPath
      );

      const files = result.value || [];
      return files.map((file: any) => ({
        id: file.id,
        name: file.name,
        webUrl: file.webUrl,
        size: file.size,
        mimeType: file.file?.mimeType,
        lastModified: file.lastModifiedDateTime,
        downloadUrl: file['@microsoft.graph.downloadUrl']
      }));

    } catch (error: any) {
      if (error.message?.includes('Resource not found') || error.statusCode === 404) {
        logger.warn(`SharePoint folder not found: ${folderPath}`);
        return [];
      }
      logger.error('Failed to list SharePoint files:', error);
      throw error;
    }
  }

  /**
   * Sanitize file name for SharePoint
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[.-]+$/, '') // Remove trailing dots and hyphens
      .substring(0, 128); // Limit length
  }

  /**
   * Sanitize folder name for SharePoint
   */
  private sanitizeFolderName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[.-]+$/, '') // Remove trailing dots and hyphens
      .substring(0, 100); // Limit length
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    siteConnected: boolean;
    driveConnected: boolean;
    config?: SharePointConfig;
    enabled: boolean;
  } {
    return {
      initialized: this.isInitialized,
      siteConnected: this.siteInfo !== null,
      driveConnected: this.driveInfo !== null,
      config: this.config || undefined,
      enabled: this.isEnabled(),
    };
  }

  /**
   * Test SharePoint connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('SharePoint service not initialized');
      }

      // Test by listing root folder
      await microsoftGraphService.listFiles(
        this.config.siteId!,
        this.config.driveId!,
        '/',
        { top: 1 }
      );

      logger.info('[OK] SharePoint connection test successful');
      return true;
    } catch (error) {
      logger.error('[ERROR] SharePoint connection test failed:', error);
      return false;
    }
  }

  /**
   * Ensure villa folders exist (helper method for fixing SharePoint paths)
   */
  async ensureVillaFolders(villaId: string, villaName: string): Promise<void> {
    try {
      // Check if folders already exist
      const folderExists = await this.checkVillaFolderExists(villaId, villaName);
      
      if (!folderExists) {
        // Create the folder structure
        await this.createVillaFolders(villaId, villaName);
        logger.info(`[OK] Villa folders ensured for ${villaName}`);
      } else {
        // Folders exist, but make sure the database is updated
        const villa = await prisma.villa.findUnique({
          where: { id: villaId },
          select: { sharePointPath: true, documentsPath: true, photosPath: true }
        });
        
        if (!villa?.sharePointPath) {
          // Update database with existing folder paths
          const villaCode = await this.getOrGenerateVillaCode(villaId);
          const sanitizedVillaName = this.sanitizeFolderName(villaName);
          const basePath = this.config?.baseFolderPath || '';
          const villaBasePath = basePath ? `${basePath}/Villas/${sanitizedVillaName}_${villaCode}` : `/Villas/${sanitizedVillaName}_${villaCode}`;
          const folderStructure = this.getExistingFolderStructure(villaBasePath);
          
          await prisma.villa.update({
            where: { id: villaId },
            data: {
              sharePointPath: villaBasePath,
              documentsPath: folderStructure.legalDocuments,
              photosPath: folderStructure.photosMedia,
            },
          });
          
          logger.info(`[OK] Database updated with existing SharePoint paths for ${villaName}`);
        }
      }
    } catch (error) {
      logger.error(`[ERROR] Failed to ensure villa folders for ${villaName}:`, error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SharePointConfig | null {
    return this.config;
  }

  /**
   * Cleanup and close connections
   */
  async cleanup(): Promise<void> {
    try {
      this.config = null;
      this.siteInfo = null;
      this.driveInfo = null;
      this.isInitialized = false;
      
      logger.info('[OK] SharePoint service cleaned up');
    } catch (error) {
      logger.error('[ERROR] Error during SharePoint service cleanup:', error);
    }
  }
}

export default new SharePointService();
export { SharePointService, UploadResult, FolderStructure };
