import { PrismaClient, Villa, Prisma, VillaStatus } from '@prisma/client';
import { logger } from '../utils/logger';
// import { ElectricClient } from 'electric-sql/client'; // Removed - using mock implementation
import { generateVillaCode } from '../utils/helpers';

const prisma = new PrismaClient();

export interface CreateVillaInput {
  villaName: string;
  location: string;
  address: string;
  city: string;
  country: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  propertySize?: number;
  plotSize?: number;
  yearBuilt?: number;
  renovationYear?: number;
  propertyType: string;
  villaStyle?: string;
  description?: string;
  shortDescription?: string;
  tags?: string[];
}

export interface UpdateVillaInput extends Partial<CreateVillaInput> {
  status?: VillaStatus;
  isActive?: boolean;
}

export interface VillaFilters {
  status?: VillaStatus;
  isActive?: boolean;
  location?: string;
  city?: string;
  country?: string;
  minBedrooms?: number;
  maxBedrooms?: number;
  minGuests?: number;
  maxGuests?: number;
  propertyType?: string;
  search?: string;
}

class VillaService {
  /**
   * Create a new villa
   */
  async createVilla(data: CreateVillaInput): Promise<Villa> {
    try {
      const villaCode = await generateVillaCode();
      
      const villa = await prisma.villa.create({
        data: {
          ...data,
          villaCode,
          propertyType: data.propertyType as any,
          villaStyle: data.villaStyle as any,
          tags: data.tags || [],
        },
        include: {
          owner: true,
          contractualDetails: true,
          onboarding: true,
        },
      });

      logger.info(`Villa created: ${villa.villaCode} - ${villa.villaName}`);
      return villa;
    } catch (error) {
      logger.error('Error creating villa:', error);
      throw error;
    }
  }

  /**
   * Create a new villa for onboarding with minimal required data
   */
  async createVillaForOnboarding(data: { name: string; owner_id?: string }): Promise<Villa> {
    // Retry up to 3 times in case of villa code conflicts
    for (let retry = 1; retry <= 3; retry++) {
      try {
        const villaCode = await generateVillaCode();
        
        // Create villa with proper initialization
        const villa = await prisma.villa.create({
          data: {
            villaCode,
            villaName: data.name || 'New Villa',
            location: 'TBD',
            address: 'TBD', 
            city: 'TBD',
            country: 'Indonesia',
            bedrooms: 1,
            bathrooms: 1,
            maxGuests: 2,
            propertyType: 'VILLA',
            status: 'DRAFT',
            description: 'Villa created during onboarding',
            // Create onboarding progress directly
            onboarding: {
              create: {
                currentStep: 1,
                totalSteps: 10,
                status: 'IN_PROGRESS',
                villaInfoCompleted: false,
                ownerDetailsCompleted: false,
                contractualDetailsCompleted: false,
                bankDetailsCompleted: false,
                otaCredentialsCompleted: false,
                staffConfigCompleted: false,
                facilitiesCompleted: false,
                photosUploaded: false,
                documentsUploaded: false,
                reviewCompleted: false
              }
            }
          },
          include: {
            owner: true,
            contractualDetails: true,
            onboarding: true,
          },
        });

        logger.info(`Villa created for onboarding: ${villa.villaCode} - ${villa.villaName}`);
        return villa;
      } catch (error: any) {
        // Check if it's a unique constraint violation on villaCode
        if (error.code === 'P2002' && error.meta?.target?.includes('villaCode')) {
          if (retry < 3) {
            logger.warn(`Villa code conflict on attempt ${retry}, retrying...`);
            continue;
          } else {
            logger.error('Failed to generate unique villa code after 3 attempts');
            throw new Error('Unable to generate unique villa code. Please try again.');
          }
        }
        
        // For other errors, don't retry
        logger.error('Error creating villa for onboarding:', error);
        throw error;
      }
    }
    
    // This should never be reached, but just in case
    throw new Error('Failed to create villa after multiple attempts');
  }

  /**
   * Get villa by ID
   */
  async getVillaById(id: string) {
    try {
      const villa = await prisma.villa.findUnique({
        where: { id },
        include: {
          owner: true,
          contractualDetails: true,
          bankDetails: true,
          otaCredentials: true,
          staff: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          },
          photos: {
            orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
          },
          documents: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          },
          facilities: {
            orderBy: [{ category: 'asc' }, { subcategory: 'asc' }],
          },
          onboarding: true,
          // bookings: { // Removed - booking model not available yet
          //   take: 10,
          //   orderBy: { checkInDate: 'desc' },
          // },
        },
      });

      if (!villa) {
        throw new Error('Villa not found');
      }

      return villa;
    } catch (error) {
      logger.error('Error fetching villa:', error);
      throw error;
    }
  }

  /**
   * Get villa by code
   */
  async getVillaByCode(villaCode: string) {
    try {
      const villa = await prisma.villa.findUnique({
        where: { villaCode },
        include: {
          owner: true,
          contractualDetails: true,
          onboarding: true,
        },
      });

      if (!villa) {
        throw new Error('Villa not found');
      }

      return villa;
    } catch (error) {
      logger.error('Error fetching villa by code:', error);
      throw error;
    }
  }

  /**
   * Update villa
   */
  async updateVilla(id: string, data: UpdateVillaInput) {
    try {
      const villa = await prisma.villa.update({
        where: { id },
        data: {
          ...data,
          propertyType: data.propertyType as any,
          villaStyle: data.villaStyle as any,
        },
      });

      logger.info(`Villa updated: ${villa.villaCode}`);
      return villa;
    } catch (error) {
      logger.error('Error updating villa:', error);
      throw error;
    }
  }

  /**
   * List villas with filters and pagination
   */
  async listVillas(
    filters: VillaFilters = {},
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const where: Prisma.VillaWhereInput = {};

      // Apply filters
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      if (filters.location) {
        where.location = { contains: filters.location, mode: 'insensitive' };
      }
      if (filters.city) {
        where.city = { contains: filters.city, mode: 'insensitive' };
      }
      if (filters.country) {
        where.country = { contains: filters.country, mode: 'insensitive' };
      }
      if (filters.propertyType) {
        where.propertyType = filters.propertyType as any;
      }
      if (filters.minBedrooms || filters.maxBedrooms) {
        where.bedrooms = {};
        if (filters.minBedrooms) {
          where.bedrooms.gte = filters.minBedrooms;
        }
        if (filters.maxBedrooms) {
          where.bedrooms.lte = filters.maxBedrooms;
        }
      }
      if (filters.minGuests || filters.maxGuests) {
        where.maxGuests = {};
        if (filters.minGuests) {
          where.maxGuests.gte = filters.minGuests;
        }
        if (filters.maxGuests) {
          where.maxGuests.lte = filters.maxGuests;
        }
      }
      if (filters.search) {
        where.OR = [
          { villaName: { contains: filters.search, mode: 'insensitive' } },
          { villaCode: { contains: filters.search, mode: 'insensitive' } },
          { location: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await prisma.villa.count({ where });

      // Get paginated results
      const villas = await prisma.villa.findMany({
        where,
        include: {
          owner: true,
          onboarding: true,
          photos: {
            where: { isMain: true },
            take: 1,
          },
          _count: {
            select: {
              // bookings: true, // Removed - booking model not available yet
              staff: true,
              documents: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return {
        data: villas,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing villas:', error);
      throw error;
    }
  }

  /**
   * Delete villa permanently from database
   */
  async deleteVilla(id: string) {
    try {
      // Get villa details before deletion for logging
      const villa = await prisma.villa.findUnique({
        where: { id },
      });
      
      if (!villa) {
        throw new Error('Villa not found');
      }

      // Delete all related records first (cascade delete)
      await prisma.$transaction(async (tx) => {
        // Delete related records
        await tx.photo.deleteMany({ where: { villaId: id } });
        await tx.document.deleteMany({ where: { villaId: id } });
        await tx.facilityChecklist.deleteMany({ where: { villaId: id } });
        await tx.staff.deleteMany({ where: { villaId: id } });
        await tx.oTACredentials.deleteMany({ where: { villaId: id } });
        await tx.bankDetails.deleteMany({ where: { villaId: id } });
        await tx.contractualDetails.deleteMany({ where: { villaId: id } });
        // Don't delete owner as they might have other villas
        await tx.onboardingProgress.deleteMany({ where: { villaId: id } });
        await tx.onboardingSession.deleteMany({ where: { villaId: id } });
        
        // Finally delete the villa
        await tx.villa.delete({ where: { id } });
      });

      logger.info(`Villa permanently deleted: ${villa.villaCode}`);
      return villa;
    } catch (error) {
      logger.error('Error deleting villa:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive villa profile with all related data optimized for frontend
   */
  async getVillaProfile(id: string) {
    try {
      const villa = await prisma.villa.findUnique({
        where: { id },
        include: {
          owner: true,
          contractualDetails: true,
          bankDetails: true,
          otaCredentials: true,
          staff: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          },
          photos: {
            orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
          },
          documents: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          },
          facilities: {
            orderBy: [{ category: 'asc' }, { subcategory: 'asc' }],
          },
          onboarding: true,
        },
      });

      if (!villa) {
        throw new Error('Villa not found');
      }

      // Transform the data to match frontend expectations
      const villaProfile = {
        villa: {
          id: villa.id,
          villaCode: villa.villaCode,
          villaName: villa.villaName,
          villaAddress: villa.address, // Map address to villaAddress
          villaCity: villa.city, // Map city to villaCity
          villaPostalCode: villa.zipCode, // Map zipCode to villaPostalCode
          location: villa.location,
          address: villa.address,
          city: villa.city,
          country: villa.country,
          zipCode: villa.zipCode,
          latitude: villa.latitude,
          longitude: villa.longitude,
          bedrooms: villa.bedrooms,
          bathrooms: villa.bathrooms,
          maxGuests: villa.maxGuests,
          propertySize: villa.propertySize,
          plotSize: villa.plotSize,
          landArea: villa.plotSize, // Map plotSize to landArea for frontend
          villaArea: villa.propertySize, // Map propertySize to villaArea for frontend
          yearBuilt: villa.yearBuilt,
          renovationYear: villa.renovationYear,
          propertyType: villa.propertyType,
          villaStyle: villa.villaStyle,
          description: villa.description,
          shortDescription: villa.shortDescription,
          tags: villa.tags,
          status: villa.status,
          isActive: villa.isActive,
          createdAt: villa.createdAt,
          updatedAt: villa.updatedAt,
          // Additional fields expected by frontend
          googleCoordinates: villa.latitude && villa.longitude ? 
            `${villa.latitude}, ${villa.longitude}` : null,
          locationType: villa.villaStyle || null, // Map villaStyle to locationType
          googleMapsLink: villa.googleMapsLink || null,
          oldRatesCardLink: villa.oldRatesCardLink || null,
          iCalCalendarLink: villa.iCalCalendarLink || null,
          
          // Missing fields from database mapping analysis
          // Add database fields that might be missing in frontend
          thumbnailUrl: villa.photos && villa.photos.length > 0 ? villa.photos[0].fileUrl : null,
          
          // Add coordinates processing for frontend coordinate picker
          coords: villa.latitude && villa.longitude ? {
            lat: villa.latitude,
            lng: villa.longitude
          } : null
        },
        ownerDetails: villa.owner ? {
          // Core ID and metadata
          id: villa.owner.id,
          villaId: villa.owner.villaId,
          createdAt: villa.owner.createdAt,
          updatedAt: villa.owner.updatedAt,
          
          // Owner Type
          ownerType: villa.owner.ownerType || 'INDIVIDUAL',
          
          // Company Information
          companyName: villa.owner.companyName,
          companyAddress: villa.owner.companyAddress,
          companyTaxId: villa.owner.companyTaxId,
          companyVat: villa.owner.companyVat,
          
          // Owner Information (transformed for frontend compatibility)
          ownerFullName: `${villa.owner.firstName || ''} ${villa.owner.lastName || ''}`.trim(),
          ownerEmail: villa.owner.email,
          ownerPhone: villa.owner.phone,
          ownerPhoneCountryCode: villa.owner.phoneCountryCode,
          ownerPhoneDialCode: villa.owner.phoneDialCode,
          ownerAddress: villa.owner.address,
          ownerCity: villa.owner.city,
          ownerCountry: villa.owner.country,
          ownerNationality: villa.owner.nationality,
          ownerPassportNumber: villa.owner.passportNumber,
          
          // Additional owner fields from mapping analysis
          registeredOwnerType: villa.owner.ownerType || 'INDIVIDUAL',
          
          // Original database fields for backend compatibility
          firstName: villa.owner.firstName,
          lastName: villa.owner.lastName,
          email: villa.owner.email,
          phone: villa.owner.phone,
          alternativePhone: villa.owner.alternativePhone,
          nationality: villa.owner.nationality,
          passportNumber: villa.owner.passportNumber,
          idNumber: villa.owner.idNumber,
          address: villa.owner.address,
          city: villa.owner.city,
          country: villa.owner.country,
          zipCode: villa.owner.zipCode,
          preferredLanguage: villa.owner.preferredLanguage,
          communicationPreference: villa.owner.communicationPreference,
          notes: villa.owner.notes,
          
          // Phone details
          alternativePhoneCountryCode: villa.owner.alternativePhoneCountryCode,
          alternativePhoneDialCode: villa.owner.alternativePhoneDialCode,
          phoneCountryCode: villa.owner.phoneCountryCode,
          phoneDialCode: villa.owner.phoneDialCode,
          
          // Property Manager (transformed for frontend compatibility)
          villaManagerName: villa.owner.managerName,
          villaManagerEmail: villa.owner.managerEmail,
          villaManagerPhone: villa.owner.managerPhone,
          
          // Original manager fields for backend compatibility
          managerEmail: villa.owner.managerEmail,
          managerName: villa.owner.managerName,
          managerPhone: villa.owner.managerPhone,
          managerPhoneCountryCode: villa.owner.managerPhoneCountryCode,
          managerPhoneDialCode: villa.owner.managerPhoneDialCode,
          
          // Property details
          propertyEmail: villa.owner.propertyEmail,
          propertyWebsite: villa.owner.propertyWebsite
        } : null,
        contractualDetails: villa.contractualDetails || null,
        bankDetails: villa.bankDetails ? {
          // Transform database fields to frontend expected names
          id: villa.bankDetails.id,
          villaId: villa.bankDetails.villaId,
          accountName: villa.bankDetails.accountHolderName,
          bankName: villa.bankDetails.bankName,
          swiftBicCode: villa.bankDetails.swiftCode,
          maskedAccountNumber: villa.bankDetails.accountNumber ? 
            '***' + villa.bankDetails.accountNumber.slice(-4) : '',
          bankBranch: villa.bankDetails.branchCode,
          bankAddress: villa.bankDetails.bankAddress,
          securityAcknowledgment: villa.bankDetails.isVerified,
          // Include original fields for backend compatibility
          accountHolderName: villa.bankDetails.accountHolderName,
          accountNumber: villa.bankDetails.accountNumber,
          iban: villa.bankDetails.iban,
          swiftCode: villa.bankDetails.swiftCode,
          branchCode: villa.bankDetails.branchCode,
          currency: villa.bankDetails.currency,
          bankCountry: villa.bankDetails.bankCountry,
          isVerified: villa.bankDetails.isVerified,
          verifiedAt: villa.bankDetails.verifiedAt,
          createdAt: villa.bankDetails.createdAt,
          updatedAt: villa.bankDetails.updatedAt
        } : null,
        otaCredentials: villa.otaCredentials || [],
        documents: villa.documents || [],
        staff: villa.staff || [],
        facilities: villa.facilities || [],
        photos: villa.photos || [],
        onboarding: villa.onboarding || null,
        recentBookings: [], // Temporarily empty as booking model is not available
      };
      
      logger.info(`Villa profile fetched: ${villa.villaCode}`);
      return villaProfile;
    } catch (error) {
      logger.error('Error fetching villa profile:', error);
      throw error;
    }
  }

  /**
   * Get villa statistics
   */
  async getVillaStats(villaId: string) {
    try {
      const [
        bookingStats,
        occupancyRate,
        revenue,
        upcomingBookings,
        staffCount,
      ] = await Promise.all([
        // Booking statistics - Temporarily disabled
        Promise.resolve({ _count: 0, _sum: { totalAmount: 0 } }),
        
        // Calculate occupancy rate (last 30 days) - Temporarily disabled
        Promise.resolve(0),
        
        // Revenue (last 12 months) - Temporarily disabled
        Promise.resolve(0),
        
        // Upcoming bookings - Temporarily disabled
        Promise.resolve(0),
        
        // Active staff count
        prisma.staff.count({
          where: { villaId, isActive: true },
        }),
      ]);

      return {
        totalBookings: bookingStats._count,
        totalRevenue: bookingStats._sum.totalAmount || 0,
        occupancyRate,
        monthlyRevenue: revenue,
        upcomingBookings,
        activeStaff: staffCount,
      };
    } catch (error) {
      logger.error('Error fetching villa stats:', error);
      throw error;
    }
  }

  /**
   * Bulk update villa status
   */
  async bulkUpdateStatus(villaIds: string[], status: VillaStatus) {
    try {
      const result = await prisma.villa.updateMany({
        where: { id: { in: villaIds } },
        data: { status },
      });

      logger.info(`Bulk updated ${result.count} villas to status: ${status}`);
      return result;
    } catch (error) {
      logger.error('Error bulk updating villa status:', error);
      throw error;
    }
  }

  /**
   * Search villas for autocomplete
   */
  async searchVillas(query: string, limit: number = 10) {
    try {
      const villas = await prisma.villa.findMany({
        where: {
          isActive: true,
          OR: [
            { villaName: { contains: query, mode: 'insensitive' } },
            { villaCode: { contains: query, mode: 'insensitive' } },
            { location: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          villaCode: true,
          villaName: true,
          location: true,
          city: true,
        },
        take: limit,
      });

      return villas;
    } catch (error) {
      logger.error('Error searching villas:', error);
      throw error;
    }
  }
}

export default new VillaService();