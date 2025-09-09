import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Singleton instance with optimized configuration
let prisma: PrismaClient | null = null;

export const getOptimizedPrismaClient = () => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      errorFormat: 'minimal',
    });
    
    // Add middleware for query optimization and monitoring
    prisma.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();
      
      // Log slow queries
      const duration = after - before;
      if (duration > 1000) {
        logger.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
      }
      
      return result;
    });
  }
  
  return prisma;
};

// Query optimization utilities
export class QueryOptimizer {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = getOptimizedPrismaClient();
  }
  
  /**
   * Batch operations to reduce database round trips
   */
  async batchCreate<T>(model: string, data: any[]): Promise<number> {
    try {
      const result = await (this.prisma as any)[model].createMany({
        data,
        skipDuplicates: true,
      });
      return result.count;
    } catch (error) {
      logger.error(`Batch create error for ${model}:`, error);
      throw error;
    }
  }
  
  /**
   * Optimized villa fetch with selective includes based on need
   */
  async getOptimizedVilla(villaId: string, includeOptions?: {
    owner?: boolean;
    contractual?: boolean;
    bank?: boolean;
    ota?: boolean;
    staff?: boolean;
    facilities?: boolean;
    photos?: boolean;
    documents?: boolean;
  }) {
    const include: any = {};
    
    // Only include what's needed to reduce payload
    if (includeOptions?.owner) include.owner = true;
    if (includeOptions?.contractual) include.contractualDetails = true;
    if (includeOptions?.bank) include.bankDetails = true;
    if (includeOptions?.ota) include.otaCredentials = true;
    if (includeOptions?.staff) include.staff = { where: { isActive: true } };
    if (includeOptions?.facilities) include.facilities = true;
    if (includeOptions?.photos) include.photos = { 
      select: { id: true, url: true, isMain: true, category: true },
      orderBy: { sortOrder: 'asc' },
      take: 20, // Limit photos to prevent large payloads
    };
    if (includeOptions?.documents) include.documents = { 
      where: { isActive: true },
      select: { id: true, documentType: true, fileName: true, uploadedAt: true },
    };
    
    return this.prisma.villa.findUnique({
      where: { id: villaId },
      include,
    });
  }
  
  /**
   * Paginated query helper
   */
  async paginatedQuery<T>(
    model: string, 
    options: {
      where?: any;
      orderBy?: any;
      page?: number;
      limit?: number;
      include?: any;
    }
  ): Promise<{ data: T[]; total: number; page: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      (this.prisma as any)[model].findMany({
        where: options.where,
        orderBy: options.orderBy,
        include: options.include,
        skip,
        take: limit,
      }),
      (this.prisma as any)[model].count({ where: options.where }),
    ]);
    
    return {
      data,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
  
  /**
   * Bulk update with transaction
   */
  async bulkUpdate<T>(operations: Array<{
    model: string;
    where: any;
    data: any;
  }>): Promise<T[]> {
    const results = await this.prisma.$transaction(
      operations.map(op => 
        (this.prisma as any)[op.model].update({
          where: op.where,
          data: op.data,
        })
      )
    );
    
    return results;
  }
  
  /**
   * Optimized onboarding progress fetch with minimal data
   */
  async getMinimalOnboardingProgress(villaId: string) {
    return this.prisma.onboardingProgress.findUnique({
      where: { villaId },
      select: {
        id: true,
        villaId: true,
        currentStep: true,
        totalSteps: true,
        status: true,
        villaInfoCompleted: true,
        ownerDetailsCompleted: true,
        contractualDetailsCompleted: true,
        bankDetailsCompleted: true,
        otaCredentialsCompleted: true,
        staffConfigCompleted: true,
        facilitiesCompleted: true,
        photosUploaded: true,
        documentsUploaded: true,
        reviewCompleted: true,
      },
    });
  }
  
  /**
   * Create database indexes for frequently queried fields
   */
  async createIndexes() {
    try {
      // These would normally be in migrations, but can be run as optimization
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_villa_status ON "Villa"("status");
      `;
      
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_villa_owner ON "Villa"("ownerId");
      `;
      
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_onboarding_status ON "OnboardingProgress"("status");
      `;
      
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_photo_villa ON "Photo"("villaId");
      `;
      
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_document_villa ON "Document"("villaId");
      `;
      
      logger.info('Database indexes created/verified successfully');
    } catch (error) {
      logger.error('Error creating indexes:', error);
    }
  }
  
  /**
   * Connection pool monitoring
   */
  async getConnectionPoolStats() {
    // Note: $metrics API is not available in current Prisma version
    // const metrics = await this.prisma.$metrics.json();
    // return metrics;
    return { message: 'Metrics API not available in current Prisma version' };
  }
  
  /**
   * Clean up inactive sessions and temporary data
   */
  async cleanupStaleData() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    try {
      // Clean up abandoned onboarding sessions
      const deletedSessions = await this.prisma.onboardingProgress.deleteMany({
        where: {
          status: 'IN_PROGRESS',
          updatedAt: { lt: thirtyDaysAgo },
        },
      });
      
      logger.info(`Cleaned up ${deletedSessions.count} stale onboarding sessions`);
      
      // Note: Photos cannot be orphaned as villaId is required
      // Commenting out orphaned photo cleanup since villaId is not nullable
      // const deletedPhotos = await this.prisma.photo.deleteMany({
      //   where: {
      //     villa: null,
      //     createdAt: { lt: thirtyDaysAgo },
      //   },
      // });
      // logger.info(`Cleaned up ${deletedPhotos.count} orphaned photos`);
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer();