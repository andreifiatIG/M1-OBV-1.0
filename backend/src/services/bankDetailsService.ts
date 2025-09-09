import { prisma } from '../server';
import { encryptBankData, decryptBankData } from '../utils/encryption';
import { logger } from '../utils/logger';

export interface BankDetailsInput {
  villaId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  iban?: string;
  swiftCode?: string;
  branchCode?: string;
  currency?: string;
  bankAddress?: string;
  bankCountry?: string;
}

export interface BankDetailsResponse {
  id: string;
  villaId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string; // Decrypted for response
  iban?: string; // Decrypted for response
  swiftCode?: string;
  branchCode?: string;
  currency: string;
  bankAddress?: string;
  bankCountry?: string;
  isVerified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  villa?: {
    id: string;
    villaName: string;
    villaCode: string;
  };
}

export class BankDetailsService {
  /**
   * Create bank details with encryption
   */
  async createBankDetails(data: BankDetailsInput): Promise<BankDetailsResponse> {
    try {
      // Encrypt sensitive data
      const encryptedData = encryptBankData(data.accountNumber, data.iban);
      
      const bankDetails = await prisma.bankDetails.create({
        data: {
          villaId: data.villaId,
          accountHolderName: data.accountHolderName,
          bankName: data.bankName,
          accountNumber: JSON.stringify(encryptedData.accountNumber),
          iban: encryptedData.iban ? JSON.stringify(encryptedData.iban) : null,
          swiftCode: data.swiftCode,
          branchCode: data.branchCode,
          currency: data.currency || 'USD',
          bankAddress: data.bankAddress,
          bankCountry: data.bankCountry,
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

      return this.formatBankDetailsResponse(bankDetails);
    } catch (error) {
      logger.error('Error creating bank details:', error);
      throw new Error('Failed to create bank details');
    }
  }

  /**
   * Get bank details by ID with decryption
   */
  async getBankDetailsById(id: string): Promise<BankDetailsResponse | null> {
    try {
      const bankDetails = await prisma.bankDetails.findUnique({
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

      if (!bankDetails) {
        return null;
      }

      return this.formatBankDetailsResponse(bankDetails);
    } catch (error) {
      logger.error('Error fetching bank details:', error);
      throw new Error('Failed to fetch bank details');
    }
  }

  /**
   * Get bank details by villa ID with decryption
   */
  async getBankDetailsByVillaId(villaId: string): Promise<BankDetailsResponse | null> {
    try {
      const bankDetails = await prisma.bankDetails.findUnique({
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
      });

      if (!bankDetails) {
        return null;
      }

      return this.formatBankDetailsResponse(bankDetails);
    } catch (error) {
      logger.error('Error fetching bank details by villa ID:', error);
      throw new Error('Failed to fetch bank details');
    }
  }

  /**
   * Update bank details with encryption
   */
  async updateBankDetails(id: string, data: Partial<BankDetailsInput>): Promise<BankDetailsResponse> {
    try {
      const updateData: any = { ...data };

      // Handle encryption for sensitive fields if they're being updated
      if (data.accountNumber || data.iban) {
        // Get current data first to preserve non-updated encrypted fields
        const currentDetails = await prisma.bankDetails.findUnique({
          where: { id },
        });

        if (!currentDetails) {
          throw new Error('Bank details not found');
        }

        let currentAccountNumber = data.accountNumber;
        let currentIban = data.iban;

        // If not updating account number, decrypt the current one
        if (!data.accountNumber && currentDetails.accountNumber) {
          const decryptedCurrent = decryptBankData(
            JSON.parse(currentDetails.accountNumber),
            currentDetails.iban ? JSON.parse(currentDetails.iban) : null
          );
          currentAccountNumber = decryptedCurrent.accountNumber;
        }

        // If not updating IBAN, decrypt the current one
        if (!data.iban && currentDetails.iban) {
          const decryptedCurrent = decryptBankData(
            JSON.parse(currentDetails.accountNumber),
            currentDetails.iban ? JSON.parse(currentDetails.iban) : null
          );
          currentIban = decryptedCurrent.iban || undefined;
        }

        // Encrypt the data (current + updates)
        const encryptedData = encryptBankData(
          currentAccountNumber || '',
          currentIban
        );

        updateData.accountNumber = JSON.stringify(encryptedData.accountNumber);
        updateData.iban = encryptedData.iban ? JSON.stringify(encryptedData.iban) : null;
      }

      const bankDetails = await prisma.bankDetails.update({
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

      return this.formatBankDetailsResponse(bankDetails);
    } catch (error) {
      logger.error('Error updating bank details:', error);
      throw new Error('Failed to update bank details');
    }
  }

  /**
   * Verify bank details
   */
  async verifyBankDetails(id: string): Promise<BankDetailsResponse> {
    try {
      const bankDetails = await prisma.bankDetails.update({
        where: { id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
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

      return this.formatBankDetailsResponse(bankDetails);
    } catch (error) {
      logger.error('Error verifying bank details:', error);
      throw new Error('Failed to verify bank details');
    }
  }

  /**
   * Delete bank details
   */
  async deleteBankDetails(id: string): Promise<void> {
    try {
      await prisma.bankDetails.delete({
        where: { id },
      });
      
      logger.info(`Bank details deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting bank details:', error);
      throw new Error('Failed to delete bank details');
    }
  }

  /**
   * Format bank details response with decrypted sensitive data
   */
  private formatBankDetailsResponse(bankDetails: any): BankDetailsResponse {
    try {
      // Decrypt sensitive fields
      const encryptedAccountNumber = JSON.parse(bankDetails.accountNumber);
      const encryptedIban = bankDetails.iban ? JSON.parse(bankDetails.iban) : null;
      
      const decryptedData = decryptBankData(encryptedAccountNumber, encryptedIban);

      return {
        id: bankDetails.id,
        villaId: bankDetails.villaId,
        accountHolderName: bankDetails.accountHolderName,
        bankName: bankDetails.bankName,
        accountNumber: decryptedData.accountNumber,
        iban: decryptedData.iban || undefined,
        swiftCode: bankDetails.swiftCode || undefined,
        branchCode: bankDetails.branchCode || undefined,
        currency: bankDetails.currency,
        bankAddress: bankDetails.bankAddress || undefined,
        bankCountry: bankDetails.bankCountry || undefined,
        isVerified: bankDetails.isVerified,
        verifiedAt: bankDetails.verifiedAt || undefined,
        createdAt: bankDetails.createdAt,
        updatedAt: bankDetails.updatedAt,
        villa: bankDetails.villa || undefined,
      };
    } catch (error) {
      logger.error('Error formatting bank details response:', error);
      throw new Error('Failed to decrypt bank details');
    }
  }

  /**
   * Get masked bank details for display purposes
   */
  async getMaskedBankDetails(id: string): Promise<any> {
    try {
      const bankDetails = await this.getBankDetailsById(id);
      
      if (!bankDetails) {
        return null;
      }

      // Mask sensitive data
      return {
        ...bankDetails,
        accountNumber: this.maskAccountNumber(bankDetails.accountNumber),
        iban: bankDetails.iban ? this.maskIban(bankDetails.iban) : undefined,
      };
    } catch (error) {
      logger.error('Error getting masked bank details:', error);
      throw new Error('Failed to get masked bank details');
    }
  }

  /**
   * Mask account number for display
   */
  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber;
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  }

  /**
   * Mask IBAN for display
   */
  private maskIban(iban: string): string {
    if (iban.length <= 8) return iban;
    return iban.slice(0, 4) + '*'.repeat(iban.length - 8) + iban.slice(-4);
  }
}