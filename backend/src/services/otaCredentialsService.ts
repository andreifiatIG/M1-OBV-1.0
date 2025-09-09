import { prisma } from '../server';
import { encryptOTACredentials, decryptOTACredentials } from '../utils/encryption';
import { logger } from '../utils/logger';

export interface OTACredentialsInput {
  villaId: string;
  platform: string;
  propertyId?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  isActive?: boolean;
}

export interface OTACredentialsResponse {
  id: string;
  villaId: string;
  platform: string;
  propertyId?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  isActive: boolean;
  lastSyncAt?: Date;
  syncStatus: string;
  createdAt: Date;
  updatedAt: Date;
  villa?: {
    id: string;
    villaName: string;
    villaCode: string;
  };
}

export class OTACredentialsService {
  /**
   * Create OTA credentials with encryption
   */
  async createOTACredentials(data: OTACredentialsInput): Promise<OTACredentialsResponse> {
    try {
      // Encrypt sensitive data
      const encryptedData = encryptOTACredentials(
        data.username,
        data.password,
        data.apiKey,
        data.apiSecret
      );
      
      const otaCredentials = await prisma.oTACredentials.create({
        data: {
          villaId: data.villaId,
          platform: data.platform as any,
          propertyId: data.propertyId,
          username: encryptedData.username ? JSON.stringify(encryptedData.username) : null,
          password: encryptedData.password ? JSON.stringify(encryptedData.password) : null,
          apiKey: encryptedData.apiKey ? JSON.stringify(encryptedData.apiKey) : null,
          apiSecret: encryptedData.apiSecret ? JSON.stringify(encryptedData.apiSecret) : null,
          isActive: data.isActive ?? true,
          syncStatus: 'PENDING',
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

      return this.formatOTACredentialsResponse(otaCredentials);
    } catch (error) {
      logger.error('Error creating OTA credentials:', error);
      throw new Error('Failed to create OTA credentials');
    }
  }

  /**
   * Get OTA credentials by ID with decryption
   */
  async getOTACredentialsById(id: string): Promise<OTACredentialsResponse | null> {
    try {
      const otaCredentials = await prisma.oTACredentials.findUnique({
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

      if (!otaCredentials) {
        return null;
      }

      return this.formatOTACredentialsResponse(otaCredentials);
    } catch (error) {
      logger.error('Error fetching OTA credentials:', error);
      throw new Error('Failed to fetch OTA credentials');
    }
  }

  /**
   * Get OTA credentials by villa ID and platform
   */
  async getOTACredentialsByVillaAndPlatform(
    villaId: string,
    platform: string
  ): Promise<OTACredentialsResponse | null> {
    try {
      const otaCredentials = await prisma.oTACredentials.findUnique({
        where: {
          villaId_platform: {
            villaId,
            platform: platform as any,
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
      });

      if (!otaCredentials) {
        return null;
      }

      return this.formatOTACredentialsResponse(otaCredentials);
    } catch (error) {
      logger.error('Error fetching OTA credentials by villa and platform:', error);
      throw new Error('Failed to fetch OTA credentials');
    }
  }

  /**
   * Get all OTA credentials for a villa
   */
  async getOTACredentialsByVillaId(villaId: string): Promise<OTACredentialsResponse[]> {
    try {
      const otaCredentials = await prisma.oTACredentials.findMany({
        where: { villaId },
        include: {
          villa: {
            select: {
              id: true,
              villaName: true,
              villaCode: true,
            },
          },
        },
        orderBy: { platform: 'asc' },
      });

      return otaCredentials.map(creds => this.formatOTACredentialsResponse(creds));
    } catch (error) {
      logger.error('Error fetching OTA credentials for villa:', error);
      throw new Error('Failed to fetch OTA credentials');
    }
  }

  /**
   * Update OTA credentials with encryption
   */
  async updateOTACredentials(id: string, data: Partial<OTACredentialsInput>): Promise<OTACredentialsResponse> {
    try {
      const updateData: any = { ...data };

      // Handle encryption for sensitive fields if they're being updated
      if (data.username || data.password || data.apiKey || data.apiSecret) {
        // Get current data first to preserve non-updated encrypted fields
        const currentCreds = await prisma.oTACredentials.findUnique({
          where: { id },
        });

        if (!currentCreds) {
          throw new Error('OTA credentials not found');
        }

        let currentUsername = data.username;
        let currentPassword = data.password;
        let currentApiKey = data.apiKey;
        let currentApiSecret = data.apiSecret;

        // Decrypt current values if not updating them
        const currentDecrypted = decryptOTACredentials({
          username: currentCreds.username ? JSON.parse(currentCreds.username) : null,
          password: currentCreds.password ? JSON.parse(currentCreds.password) : null,
          apiKey: currentCreds.apiKey ? JSON.parse(currentCreds.apiKey) : null,
          apiSecret: currentCreds.apiSecret ? JSON.parse(currentCreds.apiSecret) : null,
        });

        if (!data.username) currentUsername = currentDecrypted.username || undefined;
        if (!data.password) currentPassword = currentDecrypted.password || undefined;
        if (!data.apiKey) currentApiKey = currentDecrypted.apiKey || undefined;
        if (!data.apiSecret) currentApiSecret = currentDecrypted.apiSecret || undefined;

        // Encrypt the data (current + updates)
        const encryptedData = encryptOTACredentials(
          currentUsername || undefined,
          currentPassword || undefined,
          currentApiKey || undefined,
          currentApiSecret || undefined
        );

        updateData.username = encryptedData.username ? JSON.stringify(encryptedData.username) : null;
        updateData.password = encryptedData.password ? JSON.stringify(encryptedData.password) : null;
        updateData.apiKey = encryptedData.apiKey ? JSON.stringify(encryptedData.apiKey) : null;
        updateData.apiSecret = encryptedData.apiSecret ? JSON.stringify(encryptedData.apiSecret) : null;
      }

      const otaCredentials = await prisma.oTACredentials.update({
        where: { id },
        data: updateData,
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

      return this.formatOTACredentialsResponse(otaCredentials);
    } catch (error) {
      logger.error('Error updating OTA credentials:', error);
      throw new Error('Failed to update OTA credentials');
    }
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: string, status: string, lastSyncAt?: Date): Promise<OTACredentialsResponse> {
    try {
      const otaCredentials = await prisma.oTACredentials.update({
        where: { id },
        data: {
          syncStatus: status as any,
          lastSyncAt: lastSyncAt || new Date(),
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

      return this.formatOTACredentialsResponse(otaCredentials);
    } catch (error) {
      logger.error('Error updating sync status:', error);
      throw new Error('Failed to update sync status');
    }
  }

  /**
   * Delete OTA credentials
   */
  async deleteOTACredentials(id: string): Promise<void> {
    try {
      await prisma.oTACredentials.delete({
        where: { id },
      });
      
      logger.info(`OTA credentials deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting OTA credentials:', error);
      throw new Error('Failed to delete OTA credentials');
    }
  }

  /**
   * Get masked OTA credentials for display purposes
   */
  async getMaskedOTACredentials(id: string): Promise<any> {
    try {
      const otaCredentials = await this.getOTACredentialsById(id);
      
      if (!otaCredentials) {
        return null;
      }

      // Mask sensitive data
      return {
        ...otaCredentials,
        username: otaCredentials.username ? this.maskCredential(otaCredentials.username) : undefined,
        password: otaCredentials.password ? this.maskCredential(otaCredentials.password) : undefined,
        apiKey: otaCredentials.apiKey ? this.maskCredential(otaCredentials.apiKey) : undefined,
        apiSecret: otaCredentials.apiSecret ? this.maskCredential(otaCredentials.apiSecret) : undefined,
      };
    } catch (error) {
      logger.error('Error getting masked OTA credentials:', error);
      throw new Error('Failed to get masked OTA credentials');
    }
  }

  /**
   * Format OTA credentials response with decrypted sensitive data
   */
  private formatOTACredentialsResponse(otaCredentials: any): OTACredentialsResponse {
    try {
      // Decrypt sensitive fields
      const decryptedData = decryptOTACredentials({
        username: otaCredentials.username ? JSON.parse(otaCredentials.username) : null,
        password: otaCredentials.password ? JSON.parse(otaCredentials.password) : null,
        apiKey: otaCredentials.apiKey ? JSON.parse(otaCredentials.apiKey) : null,
        apiSecret: otaCredentials.apiSecret ? JSON.parse(otaCredentials.apiSecret) : null,
      });

      return {
        id: otaCredentials.id,
        villaId: otaCredentials.villaId,
        platform: otaCredentials.platform,
        propertyId: otaCredentials.propertyId || undefined,
        username: decryptedData.username || undefined,
        password: decryptedData.password || undefined,
        apiKey: decryptedData.apiKey || undefined,
        apiSecret: decryptedData.apiSecret || undefined,
        isActive: otaCredentials.isActive,
        lastSyncAt: otaCredentials.lastSyncAt || undefined,
        syncStatus: otaCredentials.syncStatus,
        createdAt: otaCredentials.createdAt,
        updatedAt: otaCredentials.updatedAt,
        villa: otaCredentials.villa || undefined,
      };
    } catch (error) {
      logger.error('Error formatting OTA credentials response:', error);
      throw new Error('Failed to decrypt OTA credentials');
    }
  }

  /**
   * Mask credential for display
   */
  private maskCredential(credential: string): string {
    if (credential.length <= 4) return credential;
    return '*'.repeat(credential.length - 4) + credential.slice(-4);
  }

  /**
   * Get available OTA platforms
   */
  getAvailablePlatforms(): string[] {
    return [
      'BOOKING_COM',
      'AIRBNB',
      'VRBO',
      'EXPEDIA',
      'AGODA',
      'HOTELS_COM',
      'TRIPADVISOR',
      'HOMEAWAY',
      'FLIPKEY',
      'DIRECT'
    ];
  }
}