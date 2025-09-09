import { PrismaClient, StepStatus, FieldStatus, SkippedItemType, SkipCategory } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Types for frontend consumption
export interface OnboardingProgressSummary {
  villaId: string;
  villaName: string;
  currentStep: number;
  totalSteps: number;
  stepsCompleted: number;
  stepsSkipped: number;
  fieldsCompleted: number;
  fieldsSkipped: number;
  totalFields: number;
  progressPercentage: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PENDING_REVIEW';
  estimatedTimeRemaining?: number; // Minutes
  lastActivityAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface StepProgressDetail {
  stepNumber: number;
  stepName: string;
  status: StepStatus;
  fieldsCompleted: number;
  fieldsTotal: number;
  fieldsSkipped: number;
  startedAt?: Date;
  completedAt?: Date;
  skippedAt?: Date;
  isValid: boolean;
  validationErrors?: any;
  fields: FieldProgressDetail[];
}

export interface FieldProgressDetail {
  fieldName: string;
  fieldLabel?: string;
  fieldType: string;
  status: FieldStatus;
  isSkipped: boolean;
  skipReason?: string;
  value?: any;
  isValid: boolean;
  validationMessage?: string;
  isRequired: boolean;
}

export interface SkippedItemDetail {
  itemType: SkippedItemType;
  stepNumber?: number;
  fieldName?: string;
  sectionName?: string;
  skipReason?: string;
  skipCategory: SkipCategory;
  skippedAt: Date;
  skippedBy: string;
}

export interface DashboardOnboardingData {
  sessionsInProgress: OnboardingProgressSummary[];
  recentlyCompleted: OnboardingProgressSummary[];
  pendingReview: OnboardingProgressSummary[];
  totalSessions: number;
  averageCompletionTime: number; // Minutes
  commonSkippedFields: Array<{
    fieldName: string;
    stepNumber: number;
    skipCount: number;
    skipReasons: Array<{ reason: string; count: number }>;
  }>;
  completionStats: {
    last7Days: number;
    last30Days: number;
    totalCompleted: number;
  };
}

class OnboardingProgressService {
  // Initialize step progress for a new villa
  async initializeVillaProgress(villaId: string, userId: string, userEmail?: string): Promise<void> {
    try {
      // First check if villa exists
      const villa = await prisma.villa.findUnique({
        where: { id: villaId }
      });

      if (!villa) {
        throw new Error(`Villa with ID ${villaId} not found. Cannot initialize progress for non-existent villa.`);
      }

      // Check if session already exists
      const existingSession = await prisma.onboardingSession.findUnique({
        where: { villaId }
      });

      if (!existingSession) {
        // Create onboarding session
        await prisma.onboardingSession.create({
          data: {
            villaId,
            userId,
            userEmail,
            totalSteps: 10,
            totalFields: await this.calculateTotalFields()
          }
        });

        // Initialize all steps
        const stepConfigurations = [
          { number: 1, name: "Villa Information", fields: ["villaName", "villaAddress", "bedrooms", "bathrooms", "maxGuests"] },
          { number: 2, name: "Owner Details", fields: ["ownerFullName", "ownerEmail", "ownerPhone", "ownerAddress"] },
          { number: 3, name: "Contractual Details", fields: ["contractStartDate", "contractEndDate", "commissionRate"] },
          { number: 4, name: "Bank Details", fields: ["accountHolderName", "bankName", "accountNumber", "iban"] },
          { number: 5, name: "OTA Credentials", fields: ["bookingComListed", "airbnbListed", "tripadvisorListed"] },
          { number: 6, name: "Documents", fields: ["propertyContract", "insuranceCertificate", "utilityBills"] },
          { number: 7, name: "Staff", fields: ["staffMembers", "positions", "salaries"] },
          { number: 8, name: "Facilities", fields: ["kitchenEquipment", "bathroomAmenities", "outdoorFacilities"] },
          { number: 9, name: "Photos", fields: ["exteriorPhotos", "interiorPhotos", "amenityPhotos"] },
          { number: 10, name: "Review & Submit", fields: ["finalReview", "termsAccepted"] }
        ];

        for (const step of stepConfigurations) {
          const stepProgress = await prisma.onboardingStepProgress.create({
            data: {
              villaId,
              stepNumber: step.number,
              stepName: step.name,
              status: step.number === 1 ? 'NOT_STARTED' : 'NOT_STARTED',
              estimatedDuration: this.getEstimatedStepDuration(step.number)
            }
          });

          // Initialize field progress for each step
          for (const fieldName of step.fields) {
            await prisma.stepFieldProgress.create({
              data: {
                stepProgressId: stepProgress.id,
                fieldName,
                fieldLabel: this.getFieldLabel(fieldName),
                fieldType: this.getFieldType(fieldName),
                isRequired: this.isFieldRequired(fieldName)
              }
            });
          }
        }
      }

      logger.info(`Villa onboarding progress initialized for villa: ${villaId}`);
    } catch (error) {
      logger.error('Error initializing villa progress:', error);
      throw error;
    }
  }

  // Get comprehensive progress data for a villa
  async getVillaProgress(villaId: string): Promise<{
    summary: OnboardingProgressSummary;
    steps: StepProgressDetail[];
    skippedItems: SkippedItemDetail[];
  }> {
    try {
      const session = await prisma.onboardingSession.findUnique({
        where: { villaId },
        include: {
          villa: {
            select: { villaName: true }
          }
        }
      });

      if (!session) {
        throw new Error(`No onboarding session found for villa: ${villaId}`);
      }

      const steps = await prisma.onboardingStepProgress.findMany({
        where: { villaId },
        include: {
          fields: true
        },
        orderBy: { stepNumber: 'asc' }
      });

      const skippedItems = await prisma.skippedItem.findMany({
        where: { villaId, isActive: true },
        orderBy: { skippedAt: 'desc' }
      });

      // Calculate progress percentage
      const completedSteps = steps.filter(s => s.status === 'COMPLETED').length;
      const skippedSteps = steps.filter(s => s.status === 'SKIPPED').length;
      const totalCompletedFields = steps.reduce((sum, step) => 
        sum + step.fields.filter(f => f.status === 'COMPLETED').length, 0);
      const totalSkippedFields = steps.reduce((sum, step) => 
        sum + step.fields.filter(f => f.isSkipped).length, 0);
      
      const progressPercentage = Math.round(
        ((completedSteps + skippedSteps + (totalCompletedFields + totalSkippedFields) * 0.1) / session.totalSteps) * 100
      );

      const summary: OnboardingProgressSummary = {
        villaId: session.villaId,
        villaName: session.villa?.villaName || 'Unknown Villa',
        currentStep: session.currentStep,
        totalSteps: session.totalSteps,
        stepsCompleted: completedSteps,
        stepsSkipped: skippedSteps,
        fieldsCompleted: totalCompletedFields,
        fieldsSkipped: totalSkippedFields,
        totalFields: session.totalFields,
        progressPercentage,
        status: this.determineOnboardingStatus(session, steps),
        estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(steps),
        lastActivityAt: session.lastActivityAt,
        startedAt: session.sessionStartedAt,
        completedAt: session.completedAt || undefined
      };

      const stepsDetail: StepProgressDetail[] = steps.map(step => ({
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        status: step.status,
        fieldsCompleted: step.fields.filter(f => f.status === 'COMPLETED').length,
        fieldsTotal: step.fields.length,
        fieldsSkipped: step.fields.filter(f => f.isSkipped).length,
        startedAt: step.startedAt || undefined,
        completedAt: step.completedAt || undefined,
        skippedAt: step.skippedAt || undefined,
        isValid: step.isValid,
        validationErrors: step.validationErrors,
        fields: step.fields.map(field => ({
          fieldName: field.fieldName,
          fieldLabel: field.fieldLabel || undefined,
          fieldType: field.fieldType,
          status: field.status,
          isSkipped: field.isSkipped,
          skipReason: field.skipReason || undefined,
          value: field.value,
          isValid: field.isValid,
          validationMessage: field.validationMessage || undefined,
          isRequired: field.isRequired
        }))
      }));

      const skippedItemsDetail: SkippedItemDetail[] = skippedItems.map(item => ({
        itemType: item.itemType,
        stepNumber: item.stepNumber || undefined,
        fieldName: item.fieldName || undefined,
        sectionName: item.sectionName || undefined,
        skipReason: item.skipReason || undefined,
        skipCategory: item.skipCategory,
        skippedAt: item.skippedAt,
        skippedBy: item.skippedBy
      }));

      return {
        summary,
        steps: stepsDetail,
        skippedItems: skippedItemsDetail
      };

    } catch (error) {
      logger.error(`Error getting villa progress for ${villaId}:`, error);
      throw error;
    }
  }

  // Get dashboard overview data
  async getDashboardOnboardingData(): Promise<DashboardOnboardingData> {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      // Get all active sessions
      const activeSessions = await prisma.onboardingSession.findMany({
        where: {
          isCompleted: false
        },
        include: {
          villa: {
            select: { villaName: true }
          }
        }
      });

      // Get recently completed sessions
      const recentlyCompleted = await prisma.onboardingSession.findMany({
        where: {
          isCompleted: true,
          completedAt: {
            gte: sevenDaysAgo
          }
        },
        include: {
          villa: {
            select: { villaName: true }
          }
        },
        take: 10,
        orderBy: { completedAt: 'desc' }
      });

      // Get sessions pending review
      const pendingReview = await prisma.onboardingSession.findMany({
        where: {
          submittedForReview: true,
          isCompleted: false
        },
        include: {
          villa: {
            select: { villaName: true }
          }
        }
      });

      // Calculate completion stats
      const completedLast7Days = await prisma.onboardingSession.count({
        where: {
          isCompleted: true,
          completedAt: { gte: sevenDaysAgo }
        }
      });

      const completedLast30Days = await prisma.onboardingSession.count({
        where: {
          isCompleted: true,
          completedAt: { gte: thirtyDaysAgo }
        }
      });

      const totalCompleted = await prisma.onboardingSession.count({
        where: { isCompleted: true }
      });

      // Calculate average completion time
      const completedSessions = await prisma.onboardingSession.findMany({
        where: {
          isCompleted: true,
          totalTimeSpent: { not: null }
        },
        select: { totalTimeSpent: true }
      });

      const averageCompletionTime = completedSessions.length > 0
        ? Math.round(completedSessions.reduce((sum, s) => sum + (s.totalTimeSpent || 0), 0) / completedSessions.length)
        : 0;

      // Get common skipped fields
      const skippedFieldsData = await prisma.skippedItem.groupBy({
        by: ['fieldName', 'stepNumber', 'skipCategory'],
        where: {
          itemType: 'FIELD',
          isActive: true,
          fieldName: { not: null }
        },
        _count: {
          fieldName: true
        }
      });

      const commonSkippedFields = this.aggregateSkippedFields(skippedFieldsData);

      // Convert sessions to progress summaries
      const sessionsInProgress = await Promise.all(
        activeSessions.map(session => this.convertSessionToSummary(session))
      );

      const recentlyCompletedSummaries = await Promise.all(
        recentlyCompleted.map(session => this.convertSessionToSummary(session))
      );

      const pendingReviewSummaries = await Promise.all(
        pendingReview.map(session => this.convertSessionToSummary(session))
      );

      return {
        sessionsInProgress,
        recentlyCompleted: recentlyCompletedSummaries,
        pendingReview: pendingReviewSummaries,
        totalSessions: activeSessions.length + recentlyCompleted.length + pendingReview.length,
        averageCompletionTime,
        commonSkippedFields,
        completionStats: {
          last7Days: completedLast7Days,
          last30Days: completedLast30Days,
          totalCompleted
        }
      };

    } catch (error) {
      logger.error('Error getting dashboard onboarding data:', error);
      throw error;
    }
  }

  // Skip a field
  async skipField(villaId: string, stepNumber: number, fieldName: string, skipReason?: string, skipCategory: SkipCategory = 'OTHER', userId: string = 'system'): Promise<void> {
    try {
      // Find the step progress
      const stepProgress = await prisma.onboardingStepProgress.findUnique({
        where: {
          villaId_stepNumber: {
            villaId,
            stepNumber
          }
        }
      });

      if (!stepProgress) {
        throw new Error(`Step ${stepNumber} not found for villa ${villaId}`);
      }

      // Update field progress
      await prisma.stepFieldProgress.updateMany({
        where: {
          stepProgressId: stepProgress.id,
          fieldName
        },
        data: {
          isSkipped: true,
          skipReason,
          status: 'SKIPPED',
          skippedAt: new Date()
        }
      });

      // Create skip record
      await prisma.skippedItem.create({
        data: {
          villaId,
          itemType: 'FIELD',
          stepNumber,
          fieldName,
          skipReason,
          skipCategory,
          skippedBy: userId
        }
      });

      // Update session counters
      await this.updateSessionCounters(villaId);

      logger.info(`Field ${fieldName} skipped for villa ${villaId}, step ${stepNumber}`);
    } catch (error) {
      logger.error(`Error skipping field ${fieldName}:`, error);
      throw error;
    }
  }

  // Unskip a field
  async unskipField(villaId: string, stepNumber: number, fieldName: string, userId: string = 'system'): Promise<void> {
    try {
      // Find the step progress
      const stepProgress = await prisma.onboardingStepProgress.findUnique({
        where: {
          villaId_stepNumber: {
            villaId,
            stepNumber
          }
        }
      });

      if (!stepProgress) {
        throw new Error(`Step ${stepNumber} not found for villa ${villaId}`);
      }

      // Update field progress
      await prisma.stepFieldProgress.updateMany({
        where: {
          stepProgressId: stepProgress.id,
          fieldName
        },
        data: {
          isSkipped: false,
          skipReason: null,
          status: 'NOT_STARTED',
          skippedAt: null
        }
      });

      // Mark skip record as inactive
      await prisma.skippedItem.updateMany({
        where: {
          villaId,
          itemType: 'FIELD',
          stepNumber,
          fieldName,
          isActive: true
        },
        data: {
          isActive: false,
          unskippedAt: new Date(),
          unskippedBy: userId
        }
      });

      // Update session counters
      await this.updateSessionCounters(villaId);

      logger.info(`Field ${fieldName} unskipped for villa ${villaId}, step ${stepNumber}`);
    } catch (error) {
      logger.error(`Error unskipping field ${fieldName}:`, error);
      throw error;
    }
  }

  // Helper methods
  private async calculateTotalFields(): Promise<number> {
    // This would typically be calculated based on your step configurations
    return 50; // Placeholder - adjust based on actual field count
  }

  private getEstimatedStepDuration(stepNumber: number): number {
    const durations = {
      1: 10, 2: 8, 3: 12, 4: 15, 5: 20, 6: 25, 7: 15, 8: 10, 9: 30, 10: 5
    };
    return durations[stepNumber as keyof typeof durations] || 10;
  }

  private getFieldLabel(fieldName: string): string {
    // Map field names to human-readable labels
    const labels: Record<string, string> = {
      villaName: 'Villa Name',
      villaAddress: 'Villa Address',
      bedrooms: 'Number of Bedrooms',
      bathrooms: 'Number of Bathrooms',
      ownerFullName: 'Owner Full Name',
      ownerEmail: 'Owner Email Address',
      // Add more mappings as needed
    };
    return labels[fieldName] || fieldName;
  }

  private getFieldType(fieldName: string): string {
    // Determine field type based on field name
    if (fieldName.includes('email')) return 'email';
    if (fieldName.includes('phone')) return 'tel';
    if (fieldName.includes('date')) return 'date';
    if (['bedrooms', 'bathrooms', 'maxGuests'].includes(fieldName)) return 'number';
    return 'text';
  }

  private isFieldRequired(fieldName: string): boolean {
    // Define which fields are required
    const requiredFields = ['villaName', 'ownerFullName', 'ownerEmail', 'contractStartDate'];
    return requiredFields.includes(fieldName);
  }

  private determineOnboardingStatus(session: any, steps: any[]): OnboardingProgressSummary['status'] {
    if (session.isCompleted) return 'COMPLETED';
    if (session.submittedForReview) return 'PENDING_REVIEW';
    if (steps.some(s => s.status !== 'NOT_STARTED')) return 'IN_PROGRESS';
    return 'NOT_STARTED';
  }

  private calculateEstimatedTimeRemaining(steps: any[]): number {
    return steps
      .filter(s => s.status === 'NOT_STARTED')
      .reduce((sum: number, step: any) => sum + (step.estimatedDuration || 10), 0);
  }

  private async convertSessionToSummary(session: any): Promise<OnboardingProgressSummary> {
    // Get enhanced step progress data
    const steps = await prisma.onboardingStepProgress.findMany({
      where: { villaId: session.villaId },
      include: { fields: true }
    });

    const completedSteps = steps.filter(s => s.status === 'COMPLETED').length;
    const skippedSteps = steps.filter(s => s.status === 'SKIPPED').length;
    
    // Use enhanced progress calculation with field-level granularity
    let progressPercentage = 0;
    if (steps.length > 0) {
      const stepWeights = { 1: 15, 2: 12, 3: 10, 4: 8, 5: 8, 6: 12, 7: 10, 8: 10, 9: 8, 10: 7 };
      let totalScore = 0;
      let maxScore = Object.values(stepWeights).reduce((sum, weight) => sum + weight, 0);
      
      steps.forEach((step, index) => {
        const weight = stepWeights[(index + 1) as keyof typeof stepWeights] || 10;
        if (step.status === 'COMPLETED') {
          totalScore += weight;
        } else if (step.status === 'SKIPPED') {
          totalScore += weight * 0.5; // Partial credit for skipped items
        } else if (step.status === 'IN_PROGRESS') {
          // Add partial credit based on field completion
          const completedFields = step.fields.filter(f => f.status === 'COMPLETED').length;
          const totalFields = step.fields.length;
          if (totalFields > 0) {
            totalScore += weight * (completedFields / totalFields) * 0.7;
          }
        }
      });
      
      progressPercentage = Math.min(100, Math.round((totalScore / maxScore) * 100));
    } else {
      // Fallback to basic calculation if no step progress data
      progressPercentage = Math.round(((completedSteps + skippedSteps) / session.totalSteps) * 100);
    }

    return {
      villaId: session.villaId,
      villaName: session.villa?.villaName || 'Unknown Villa',
      currentStep: session.currentStep,
      totalSteps: session.totalSteps,
      stepsCompleted: completedSteps,
      stepsSkipped: skippedSteps,
      fieldsCompleted: session.fieldsCompleted,
      fieldsSkipped: session.fieldsSkipped,
      totalFields: session.totalFields,
      progressPercentage,
      status: this.determineOnboardingStatus(session, steps),
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(steps),
      lastActivityAt: session.lastActivityAt,
      startedAt: session.sessionStartedAt,
      completedAt: session.completedAt
    };
  }

  private aggregateSkippedFields(skippedFieldsData: any[]): DashboardOnboardingData['commonSkippedFields'] {
    const fieldGroups = new Map<string, { stepNumber: number; skipCount: number; skipReasons: Map<string, number> }>();

    skippedFieldsData.forEach(item => {
      if (!item.fieldName) return;

      const key = `${item.fieldName}-${item.stepNumber}`;
      if (!fieldGroups.has(key)) {
        fieldGroups.set(key, {
          stepNumber: item.stepNumber,
          skipCount: 0,
          skipReasons: new Map()
        });
      }

      const group = fieldGroups.get(key)!;
      group.skipCount += item._count.fieldName;
      
      const reason = item.skipCategory || 'OTHER';
      group.skipReasons.set(reason, (group.skipReasons.get(reason) || 0) + item._count.fieldName);
    });

    return Array.from(fieldGroups.entries())
      .map(([key, data]) => ({
        fieldName: key.split('-')[0],
        stepNumber: data.stepNumber,
        skipCount: data.skipCount,
        skipReasons: Array.from(data.skipReasons.entries()).map(([reason, count]) => ({ reason, count }))
      }))
      .sort((a, b) => b.skipCount - a.skipCount)
      .slice(0, 10); // Top 10 most skipped fields
  }

  private async updateSessionCounters(villaId: string): Promise<void> {
    const steps = await prisma.onboardingStepProgress.findMany({
      where: { villaId },
      include: { fields: true }
    });

    const stepsCompleted = steps.filter(s => s.status === 'COMPLETED').length;
    const stepsSkipped = steps.filter(s => s.status === 'SKIPPED').length;
    const fieldsCompleted = steps.reduce((sum, step) => sum + step.fields.filter(f => f.status === 'COMPLETED').length, 0);
    const fieldsSkipped = steps.reduce((sum, step) => sum + step.fields.filter(f => f.isSkipped).length, 0);

    await prisma.onboardingSession.update({
      where: { villaId },
      data: {
        stepsCompleted,
        stepsSkipped,
        fieldsCompleted,
        fieldsSkipped,
        lastActivityAt: new Date()
      }
    });
  }
}

export default new OnboardingProgressService();