import { PrismaClient, VillaStatus, OnboardingStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import onboardingProgressService, { DashboardOnboardingData, OnboardingProgressSummary } from './onboardingProgressService';

const prisma = new PrismaClient();

export interface DashboardStats {
  totalVillas: number;
  activeVillas: number;
  pendingOnboarding: number;
  staffCount: number;
  totalDocuments: number;
  totalOwners: number;
  // Enhanced onboarding metrics
  onboardingInProgress: number;
  onboardingCompleted: number;
  averageCompletionTime: number;
  mostSkippedFields: Array<{ fieldName: string; skipCount: number }>;
}

export interface VillaManagementData {
  id: string;
  villaCode: string;
  villaName: string;
  destination: string;
  bedrooms: number;
  propertyType: string;
  status: string;
  progress: number;
  owner: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  createdAt: string;
  lastUpdated: string;
}

export interface OwnerManagementData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string | null;
  villaName: string;
  villaCode: string;
  communicationPreference: string;
  createdAt: string;
}

export interface StaffManagementData {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  employmentType: string;
  villaName: string;
  villaCode: string;
  salary: any;
  currency: string;
  startDate: string;
  isActive: boolean;
}

export interface DocumentManagementData {
  id: string;
  fileName: string;
  documentType: string;
  fileSize: number;
  villaName: string;
  villaCode: string;
  uploadedAt: string;
  validUntil: string | null;
}

export interface ManagementDashboard {
  villaManagement: {
    totalVillas: number;
    activeVillas: number;
    pendingApproval: number;
    archivedVillas: number;
    onboardingProgress: any[];
  };
  staffManagement: {
    totalStaff: number;
    activeStaff: number;
    staffByDepartment: any[];
    recentHires: any[];
  };
  documentManagement: {
    totalDocuments: number;
    recentUploads: any[];
    pendingDocuments: any[];
  };
  // Enhanced onboarding dashboard data
  onboardingDashboard: DashboardOnboardingData;
}

class DashboardService {
  /**
   * Get basic dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [
        totalVillas,
        activeVillas,
        pendingOnboarding,
        staffCount,
        totalDocuments,
        totalOwners,
        onboardingData
      ] = await Promise.all([
        this.getTotalVillas(),
        this.getActiveVillas(),
        this.getPendingOnboarding(),
        this.getStaffCount(),
        this.getTotalDocuments(),
        this.getTotalOwners(),
        onboardingProgressService.getDashboardOnboardingData()
      ]);

      return {
        totalVillas,
        activeVillas,
        pendingOnboarding,
        staffCount,
        totalDocuments,
        totalOwners,
        // Enhanced onboarding metrics
        onboardingInProgress: onboardingData.sessionsInProgress.length,
        onboardingCompleted: onboardingData.completionStats.totalCompleted,
        averageCompletionTime: onboardingData.averageCompletionTime,
        mostSkippedFields: onboardingData.commonSkippedFields
          .slice(0, 5)
          .map(field => ({
            fieldName: field.fieldName,
            skipCount: field.skipCount
          }))
      };
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get management dashboard data
   */
  async getManagementDashboard(): Promise<ManagementDashboard> {
    try {
      const [
        totalVillas,
        activeVillas,
        pendingApproval,
        archivedVillas,
        onboardingProgress,
        totalStaff,
        activeStaff,
        staffByDepartment,
        recentHires,
        totalDocuments,
        recentUploads,
        pendingDocuments,
        onboardingDashboard,
      ] = await Promise.all([
        this.getTotalVillas(),
        this.getActiveVillas(),
        this.getPendingApproval(),
        this.getArchivedVillas(),
        this.getOnboardingProgress(),
        this.getStaffCount(),
        this.getActiveStaffCount(),
        this.getStaffByDepartment(),
        this.getRecentHires(),
        this.getTotalDocuments(),
        this.getRecentUploads(),
        this.getPendingDocuments(),
        onboardingProgressService.getDashboardOnboardingData(),
      ]);

      return {
        villaManagement: {
          totalVillas,
          activeVillas,
          pendingApproval,
          archivedVillas,
          onboardingProgress,
        },
        staffManagement: {
          totalStaff,
          activeStaff,
          staffByDepartment,
          recentHires,
        },
        documentManagement: {
          totalDocuments,
          recentUploads,
          pendingDocuments,
        },
        // Enhanced onboarding dashboard data
        onboardingDashboard,
      };
    } catch (error) {
      logger.error('Error getting management dashboard:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getTotalVillas(): Promise<number> {
    return prisma.villa.count();
  }

  private async getActiveVillas(): Promise<number> {
    return prisma.villa.count({
      where: { isActive: true }
    });
  }

  private async getPendingOnboarding(): Promise<number> {
    return prisma.onboardingProgress.count({
      where: { status: OnboardingStatus.IN_PROGRESS }
    });
  }

  private async getPendingApproval(): Promise<number> {
    return prisma.villa.count({
      where: { status: VillaStatus.PENDING_REVIEW }
    });
  }

  private async getArchivedVillas(): Promise<number> {
    return prisma.villa.count({
      where: { isActive: false }
    });
  }

  private async getOnboardingProgress(): Promise<any[]> {
    const progress = await prisma.onboardingProgress.findMany({
      include: {
        villa: {
          include: {
            owner: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return progress.map(p => ({
      id: p.id,
      villaId: p.villaId,
      villaName: p.villa.villaName,
      status: p.status,
      progress: this.calculateOnboardingPercentage(p),
      ownerName: p.villa.owner ? `${p.villa.owner.firstName} ${p.villa.owner.lastName}` : 'Unknown',
    }));
  }

  private async getStaffCount(): Promise<number> {
    return prisma.staff.count();
  }

  private async getActiveStaffCount(): Promise<number> {
    return prisma.staff.count({
      where: { isActive: true }
    });
  }

  private async getStaffByDepartment(): Promise<any[]> {
    const staff = await prisma.staff.groupBy({
      by: ['department'],
      _count: {
        id: true,
      },
    });

    return staff.map(s => ({
      department: s.department,
      count: s._count.id,
    }));
  }

  private async getRecentHires(): Promise<any[]> {
    const recentHires = await prisma.staff.findMany({
      where: {
        startDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        villa: true,
      },
      orderBy: { startDate: 'desc' },
      take: 5,
    });

    return recentHires.map(hire => ({
      id: hire.id,
      name: `${hire.firstName} ${hire.lastName}`,
      position: hire.position,
      villa: hire.villa.villaName,
      startDate: hire.startDate,
    }));
  }

  private async getTotalDocuments(): Promise<number> {
    return prisma.document.count();
  }

  private async getRecentUploads(): Promise<any[]> {
    const recent = await prisma.document.findMany({
      include: {
        villa: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return recent.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      villaName: doc.villa.villaName,
      uploadedAt: doc.createdAt,
      documentType: doc.documentType,
    }));
  }

  private async getPendingDocuments(): Promise<any[]> {
    try {
      // Get documents that are expiring soon or need validation
      const pendingDocs = await prisma.document.findMany({
        where: {
          isActive: true,
          OR: [
            {
              validUntil: {
                gte: new Date(),
                lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
              }
            },
            {
              AND: [
                { validUntil: { not: null } },
                { validUntil: { lt: new Date() } } // Expired documents
              ]
            }
          ]
        },
        include: {
          villa: true
        },
        orderBy: { validUntil: 'asc' },
        take: 10
      });

      return pendingDocs.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        villaName: doc.villa.villaName,
        documentType: doc.documentType,
        validUntil: doc.validUntil,
        status: doc.validUntil && doc.validUntil < new Date() ? 'EXPIRED' : 'EXPIRING_SOON'
      }));
    } catch (error) {
      logger.error('Error getting pending documents:', error);
      return [];
    }
  }

  private calculateOnboardingPercentage(progress: any): number {
    if (!progress) return 0;
    
    // Enhanced progress calculation with weighted steps
    const stepWeights = {
      villaInfoCompleted: 15,      // Villa Information is critical
      ownerDetailsCompleted: 12,   // Owner details are important
      contractualDetailsCompleted: 10,
      bankDetailsCompleted: 8,
      otaCredentialsCompleted: 8,
      staffConfigCompleted: 12,    // Staff config is complex
      facilitiesCompleted: 10,     // Facilities checklist is comprehensive
      photosUploaded: 10,          // Photos are important for listings
      documentsUploaded: 8,        // Documents for compliance
      reviewCompleted: 7           // Final review
    };
    
    let totalScore = 0;
    let maxScore = 0;
    
    Object.entries(stepWeights).forEach(([step, weight]) => {
      maxScore += weight;
      if (progress[step]) {
        totalScore += weight;
      }
    });
    
    // Add partial credit for steps with data but not marked complete
    // Check if there's related data even if step isn't marked complete
    if (!progress.villaInfoCompleted && progress.villa) {
      const villaFields = ['villaName', 'address', 'city', 'bedrooms', 'bathrooms'];
      const completedFields = villaFields.filter(field => 
        progress.villa[field] && progress.villa[field] !== 'TBD' && progress.villa[field] !== null && progress.villa[field] !== ''
      ).length;
      if (completedFields > 0) {
        totalScore += (completedFields / villaFields.length) * stepWeights.villaInfoCompleted * 0.5;
      }
    }
    
    // Add partial credit for owner details if not marked complete but owner exists
    if (!progress.ownerDetailsCompleted && progress.villa && progress.villa.owner) {
      const ownerFields = ['firstName', 'lastName', 'email', 'phone'];
      const completedOwnerFields = ownerFields.filter(field => 
        progress.villa.owner[field] && progress.villa.owner[field] !== '' && progress.villa.owner[field] !== null
      ).length;
      if (completedOwnerFields > 0) {
        totalScore += (completedOwnerFields / ownerFields.length) * stepWeights.ownerDetailsCompleted * 0.5;
      }
    }
    
    return Math.min(100, Math.round((totalScore / maxScore) * 100));
  }

  /**
   * Get villa management data with filters and pagination
   */
  async getVillaManagementData(
    filters: { destination?: string; bedrooms?: number; status?: string; search?: string } = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{ villas: VillaManagementData[]; total: number; totalPages: number }> {
    try {
      const { destination, bedrooms, status, search } = filters;
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (destination) {
        where.OR = [
          { city: { contains: destination, mode: 'insensitive' } },
          { country: { contains: destination, mode: 'insensitive' } },
          { location: { contains: destination, mode: 'insensitive' } }
        ];
      }
      
      if (bedrooms) {
        where.bedrooms = bedrooms;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (search) {
        const searchConditions = [
          { villaName: { contains: search, mode: 'insensitive' } },
          { villaCode: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { country: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { owner: { 
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          } }
        ];
        
        // Merge with existing conditions if destination filter is also applied
        if (where.OR) {
          where.AND = [
            { OR: where.OR },
            { OR: searchConditions }
          ];
          delete where.OR;
        } else {
          where.OR = searchConditions;
        }
      }

      const [villas, total] = await Promise.all([
        prisma.villa.findMany({
          where,
          include: {
            owner: true,
            onboarding: true
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.villa.count({ where })
      ]);

      const villaData: VillaManagementData[] = villas.map(villa => ({
        id: villa.id,
        villaCode: villa.villaCode,
        villaName: villa.villaName,
        destination: `${villa.city}, ${villa.country}`,
        bedrooms: villa.bedrooms,
        propertyType: villa.propertyType,
        status: villa.status.toLowerCase(),
        progress: villa.onboarding ? this.calculateOnboardingPercentage(villa.onboarding) : 0,
        owner: villa.owner ? {
          firstName: villa.owner.firstName,
          lastName: villa.owner.lastName,
          email: villa.owner.email
        } : null,
        createdAt: villa.createdAt.toISOString(),
        lastUpdated: villa.updatedAt.toISOString()
      }));

      return {
        villas: villaData,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error getting villa management data:', error);
      throw error;
    }
  }

  /**
   * Get owner management data with filters and pagination
   */
  async getOwnerManagementData(
    filters: { search?: string; nationality?: string } = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{ owners: OwnerManagementData[]; total: number; totalPages: number }> {
    try {
      const { search, nationality } = filters;
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { passportNumber: { contains: search, mode: 'insensitive' } },
          { idNumber: { contains: search, mode: 'insensitive' } },
          { villa: {
            OR: [
              { villaName: { contains: search, mode: 'insensitive' } },
              { villaCode: { contains: search, mode: 'insensitive' } }
            ]
          } }
        ];
      }
      
      if (nationality) {
        where.nationality = nationality;
      }

      const [owners, total] = await Promise.all([
        prisma.owner.findMany({
          where,
          include: {
            villa: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.owner.count({ where })
      ]);

      const ownerData: OwnerManagementData[] = owners.map(owner => ({
        id: owner.id,
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        phone: owner.phone,
        nationality: owner.nationality,
        villaName: owner.villa.villaName,
        villaCode: owner.villa.villaCode,
        communicationPreference: owner.communicationPreference,
        createdAt: owner.createdAt.toISOString()
      }));

      return {
        owners: ownerData,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error getting owner management data:', error);
      throw error;
    }
  }

  /**
   * Get staff management data with filters and pagination
   */
  async getStaffManagementData(
    filters: { search?: string; position?: string; department?: string; villaId?: string } = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{ staff: StaffManagementData[]; total: number; totalPages: number }> {
    try {
      const { search, position, department, villaId } = filters;
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { idNumber: { contains: search, mode: 'insensitive' } },
          { villa: {
            OR: [
              { villaName: { contains: search, mode: 'insensitive' } },
              { villaCode: { contains: search, mode: 'insensitive' } }
            ]
          } }
        ];
      }
      
      if (position) {
        where.position = position;
      }
      
      if (department) {
        where.department = department;
      }
      
      if (villaId) {
        where.villaId = villaId;
      }

      const [staff, total] = await Promise.all([
        prisma.staff.findMany({
          where,
          include: {
            villa: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.staff.count({ where })
      ]);

      const staffData: StaffManagementData[] = staff.map(member => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        position: member.position,
        department: member.department,
        employmentType: member.employmentType,
        villaName: member.villa.villaName,
        villaCode: member.villa.villaCode,
        salary: member.salary,
        currency: member.currency,
        startDate: member.startDate.toISOString(),
        isActive: member.isActive
      }));

      return {
        staff: staffData,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error getting staff management data:', error);
      throw error;
    }
  }

  /**
   * Get document management data with filters and pagination
   */
  async getDocumentManagementData(
    filters: { search?: string; documentType?: string; villaId?: string } = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{ documents: DocumentManagementData[]; total: number; totalPages: number }> {
    try {
      const { search, documentType, villaId } = filters;
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { isActive: true };
      
      if (search) {
        where.OR = [
          { fileName: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { villa: {
            OR: [
              { villaName: { contains: search, mode: 'insensitive' } },
              { villaCode: { contains: search, mode: 'insensitive' } }
            ]
          } }
        ];
      }
      
      if (documentType) {
        where.documentType = documentType;
      }
      
      if (villaId) {
        where.villaId = villaId;
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          include: {
            villa: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.document.count({ where })
      ]);

      const documentData: DocumentManagementData[] = documents.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        documentType: doc.documentType,
        fileSize: doc.fileSize,
        villaName: doc.villa.villaName,
        villaCode: doc.villa.villaCode,
        uploadedAt: doc.createdAt.toISOString(),
        validUntil: doc.validUntil ? doc.validUntil.toISOString() : null
      }));

      return {
        documents: documentData,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error getting document management data:', error);
      throw error;
    }
  }

  /**
   * Get total owners count
   */
  private async getTotalOwners(): Promise<number> {
    try {
      return await prisma.owner.count();
    } catch (error) {
      logger.error('Error getting total owners count:', error);
      throw error;
    }
  }

  /**
   * Get dashboard overview with key metrics
   */
  async getDashboardOverview(): Promise<{
    totalVillas: number;
    totalOwners: number;
    totalStaff: number;
    totalDocuments: number;
    activeVillas: number;
    pendingOnboarding: number;
    completedOnboarding: number;
    avgCompletionRate: number;
  }> {
    try {
      const [
        totalVillas,
        totalOwners,
        totalStaff,
        totalDocuments,
        activeVillas,
        pendingOnboarding,
        completedOnboarding
      ] = await Promise.all([
        this.getTotalVillas(),
        this.getTotalOwners(),
        this.getStaffCount(),
        this.getTotalDocuments(),
        this.getActiveVillas(),
        this.getPendingOnboarding(),
        prisma.onboardingProgress.count({
          where: { status: 'COMPLETED' }
        })
      ]);

      const avgCompletionRate = totalVillas > 0 
        ? Math.round((completedOnboarding / totalVillas) * 100) 
        : 0;

      return {
        totalVillas,
        totalOwners,
        totalStaff,
        totalDocuments,
        activeVillas,
        pendingOnboarding,
        completedOnboarding,
        avgCompletionRate
      };
    } catch (error) {
      logger.error('Error getting dashboard overview:', error);
      throw error;
    }
  }

  /**
   * Get quick stats for dashboard widgets
   */
  async getQuickStats(): Promise<{
    recentVillas: any[];
    recentDocuments: any[];
    expiringDocuments: any[];
    pendingApprovals: any[];
  }> {
    try {
      const [recentVillas, recentDocuments, expiringDocuments, pendingApprovals] = await Promise.all([
        // Recent villas (last 7 days)
        prisma.villa.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          include: { owner: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        
        // Recent documents (last 7 days)
        prisma.document.findMany({
          where: {
            isActive: true,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          include: { villa: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        
        // Documents expiring in next 30 days
        prisma.document.findMany({
          where: {
            isActive: true,
            validUntil: {
              gte: new Date(),
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          },
          include: { villa: true },
          orderBy: { validUntil: 'asc' },
          take: 5
        }),
        
        // Villas pending approval
        prisma.villa.findMany({
          where: { status: 'PENDING_REVIEW' },
          include: { owner: true, onboarding: true },
          orderBy: { updatedAt: 'desc' },
          take: 5
        })
      ]);

      return {
        recentVillas: recentVillas.map(villa => ({
          id: villa.id,
          villaName: villa.villaName,
          villaCode: villa.villaCode,
          ownerName: villa.owner ? `${villa.owner.firstName} ${villa.owner.lastName}` : 'Unknown',
          createdAt: villa.createdAt.toISOString()
        })),
        recentDocuments: recentDocuments.map(doc => ({
          id: doc.id,
          fileName: doc.fileName,
          villaName: doc.villa.villaName,
          documentType: doc.documentType,
          uploadedAt: doc.createdAt.toISOString()
        })),
        expiringDocuments: expiringDocuments.map(doc => ({
          id: doc.id,
          fileName: doc.fileName,
          villaName: doc.villa.villaName,
          documentType: doc.documentType,
          validUntil: doc.validUntil?.toISOString(),
          daysUntilExpiry: doc.validUntil ? Math.ceil((doc.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
        })),
        pendingApprovals: pendingApprovals.map(villa => ({
          id: villa.id,
          villaName: villa.villaName,
          villaCode: villa.villaCode,
          ownerName: villa.owner ? `${villa.owner.firstName} ${villa.owner.lastName}` : 'Unknown',
          progress: villa.onboarding ? this.calculateOnboardingPercentage(villa.onboarding) : 0,
          updatedAt: villa.updatedAt.toISOString()
        }))
      };
    } catch (error) {
      logger.error('Error getting quick stats:', error);
      throw error;
    }
  }
}

export default new DashboardService();