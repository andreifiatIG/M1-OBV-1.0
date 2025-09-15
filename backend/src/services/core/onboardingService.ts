import { PrismaClient, OnboardingStatus, VillaStatus, StepStatus, FieldStatus } from '@prisma/client';
import { logger } from '../../utils/logger';
import onboardingProgressService from '../admin/onboardingProgressService';

const prisma = new PrismaClient();

export interface OnboardingStepData {
  step: number;
  data: any;
  completed: boolean;
}

export interface OnboardingValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class OnboardingService {
  private readonly TOTAL_STEPS = 10;
  
  private readonly STEP_NAMES = {
    1: 'villaInfo',
    2: 'ownerDetails',
    3: 'contractualDetails',
    4: 'bankDetails',
    5: 'otaCredentials',
    6: 'documents',
    7: 'staffConfig',
    8: 'facilities',
    9: 'photos',
    10: 'review',
  };

  // Map step numbers to actual database boolean field names
  private readonly STEP_COMPLETION_FIELDS = {
    1: 'villaInfoCompleted',
    2: 'ownerDetailsCompleted',
    3: 'contractualDetailsCompleted',
    4: 'bankDetailsCompleted',
    5: 'otaCredentialsCompleted',
    6: 'documentsUploaded',
    7: 'staffConfigCompleted',
    8: 'facilitiesCompleted',
    9: 'photosUploaded',
    10: 'reviewCompleted',
  };

  /**
   * Get progress status based on completion percentage
   */
  private getProgressStatus(progressPercentage: number): string {
    if (progressPercentage >= 100) return 'COMPLETED';
    if (progressPercentage >= 90) return 'READY_FOR_REVIEW';
    if (progressPercentage >= 70) return 'MOSTLY_COMPLETE';
    if (progressPercentage >= 50) return 'IN_PROGRESS';
    if (progressPercentage >= 20) return 'STARTED';
    return 'NOT_STARTED';
  }

  /**
   * Validate staff data before database operations
   */
  private validateStaffData(staffData: any): string[] {
    const errors: string[] = [];

    // Required fields validation
    if (!staffData.firstName || staffData.firstName.trim().length === 0) {
      errors.push('firstName is required');
    }
    if (!staffData.lastName || staffData.lastName.trim().length === 0) {
      errors.push('lastName is required');
    }
    if (!staffData.position || staffData.position.trim().length === 0) {
      errors.push('position is required');
    }

    // Position enum validation
    const validPositions = [
      'VILLA_MANAGER', 'HOUSEKEEPER', 'GARDENER', 'POOL_MAINTENANCE',
      'SECURITY', 'CHEF', 'DRIVER', 'CONCIERGE', 'MAINTENANCE', 'OTHER'
    ];
    if (staffData.position && !validPositions.includes(staffData.position)) {
      errors.push(`Invalid position: ${staffData.position}. Must be one of: ${validPositions.join(', ')}`);
    }

    // Department enum validation
    const validDepartments = [
      'MANAGEMENT', 'HOUSEKEEPING', 'MAINTENANCE', 'SECURITY', 'HOSPITALITY', 'ADMINISTRATION'
    ];
    if (staffData.department && !validDepartments.includes(staffData.department)) {
      errors.push(`Invalid department: ${staffData.department}. Must be one of: ${validDepartments.join(', ')}`);
    }

    // Employment type enum validation
    const validEmploymentTypes = [
      'FULL_TIME', 'PART_TIME', 'CONTRACT', 'SEASONAL', 'FREELANCE'
    ];
    if (staffData.employmentType && !validEmploymentTypes.includes(staffData.employmentType)) {
      errors.push(`Invalid employment type: ${staffData.employmentType}. Must be one of: ${validEmploymentTypes.join(', ')}`);
    }

    // Salary frequency enum validation
    const validSalaryFrequencies = [
      'HOURLY', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ANNUALLY'
    ];
    if (staffData.salaryFrequency && !validSalaryFrequencies.includes(staffData.salaryFrequency)) {
      errors.push(`Invalid salary frequency: ${staffData.salaryFrequency}. Must be one of: ${validSalaryFrequencies.join(', ')}`);
    }

    // Numeric field validation
    if (staffData.salary !== null && (isNaN(staffData.salary) || staffData.salary < 0)) {
      errors.push('salary must be a valid non-negative number');
    }
    if (staffData.numberOfDaySalary !== null && (isNaN(staffData.numberOfDaySalary) || staffData.numberOfDaySalary < 0)) {
      errors.push('numberOfDaySalary must be a valid non-negative number');
    }

    // Email validation
    if (staffData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffData.email)) {
      errors.push('email must be a valid email address');
    }

    // Currency validation (basic 3-letter code)
    if (staffData.currency && !/^[A-Z]{3}$/.test(staffData.currency)) {
      errors.push('currency must be a valid 3-letter currency code (e.g., USD)');
    }

    // Date validation
    if (staffData.startDate && isNaN(Date.parse(staffData.startDate))) {
      errors.push('startDate must be a valid date');
    }
    if (staffData.endDate && isNaN(Date.parse(staffData.endDate))) {
      errors.push('endDate must be a valid date');
    }
    if (staffData.dateOfBirth && isNaN(Date.parse(staffData.dateOfBirth))) {
      errors.push('dateOfBirth must be a valid date');
    }

    return errors;
  }

  /**
   * Process emergency contacts with proper validation and JSON handling
   */
  private processEmergencyContacts(emergencyContacts: any): any {
    try {
      // Handle null/undefined cases
      if (!emergencyContacts) {
        return null;
      }

      // If it's already a string (JSON), try to parse it first
      let contactsArray = emergencyContacts;
      if (typeof emergencyContacts === 'string') {
        try {
          contactsArray = JSON.parse(emergencyContacts);
        } catch (e) {
          logger.warn('Failed to parse emergency contacts JSON string:', e);
          return null;
        }
      }

      // Ensure it's an array
      if (!Array.isArray(contactsArray)) {
        logger.warn('Emergency contacts is not an array:', contactsArray);
        return null;
      }

      // Filter and validate contacts
      const validContacts = contactsArray
        .filter((contact: any) => {
          // Must have at least one meaningful piece of information
          return contact && (
            (contact.firstName && contact.firstName.trim()) ||
            (contact.lastName && contact.lastName.trim()) ||
            (contact.phone && contact.phone.trim())
          );
        })
        .map((contact: any) => {
          // Sanitize and validate each contact
          const processedContact = {
            firstName: contact.firstName ? contact.firstName.trim() : '',
            lastName: contact.lastName ? contact.lastName.trim() : '',
            phone: contact.phone ? contact.phone.trim() : '',
            phoneCountryCode: contact.phoneCountryCode ? contact.phoneCountryCode.trim() : '',
            phoneDialCode: contact.phoneDialCode ? contact.phoneDialCode.trim() : '',
            email: contact.email ? contact.email.trim() : '',
            relationship: contact.relationship ? contact.relationship.trim() : 'OTHER'
          };

          // Validate email format if provided
          if (processedContact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(processedContact.email)) {
            logger.warn('Invalid email format in emergency contact, removing:', processedContact.email);
            processedContact.email = '';
          }

          // Validate relationship enum
          const validRelationships = [
            'SPOUSE', 'PARTNER', 'PARENT', 'CHILD', 'SIBLING', 
            'FRIEND', 'COLLEAGUE', 'NEIGHBOR', 'RELATIVE', 'OTHER'
          ];
          if (!validRelationships.includes(processedContact.relationship)) {
            processedContact.relationship = 'OTHER';
          }

          return processedContact;
        });

      // Return null if no valid contacts remain
      if (validContacts.length === 0) {
        return null;
      }

      logger.info(`Processed ${validContacts.length} valid emergency contacts`);
      return validContacts;

    } catch (error) {
      logger.error('Error processing emergency contacts:', error);
      return null;
    }
  }

  /**
   * Map staff position to appropriate department and employment type defaults
   */
  private mapStaffDefaults(position: string) {
    const departmentMap: Record<string, string> = {
      'VILLA_MANAGER': 'MANAGEMENT',
      'HOUSEKEEPER': 'HOUSEKEEPING',
      'GARDENER': 'MAINTENANCE',
      'POOL_MAINTENANCE': 'MAINTENANCE',
      'SECURITY': 'SECURITY',
      'CHEF': 'HOSPITALITY',
      'DRIVER': 'HOSPITALITY',
      'CONCIERGE': 'HOSPITALITY',
      'MAINTENANCE': 'MAINTENANCE',
      'OTHER': 'ADMINISTRATION'
    };

    const employmentTypeMap: Record<string, string> = {
      'VILLA_MANAGER': 'FULL_TIME',
      'HOUSEKEEPER': 'FULL_TIME',
      'GARDENER': 'PART_TIME',
      'POOL_MAINTENANCE': 'CONTRACT',
      'SECURITY': 'FULL_TIME',
      'CHEF': 'FULL_TIME',
      'DRIVER': 'PART_TIME',
      'CONCIERGE': 'FULL_TIME',
      'MAINTENANCE': 'CONTRACT',
      'OTHER': 'FULL_TIME'
    };

    return {
      department: departmentMap[position] || 'ADMINISTRATION',
      employmentType: employmentTypeMap[position] || 'FULL_TIME'
    };
  }

  /**
   * Get or create onboarding progress for a villa
   */
  async getOnboardingProgress(villaId: string, userId?: string) {
    try {
      // FIXED: Staff relation issue resolved - relations restored!
      logger.debug('[FIXED] Fixed version with restored relations called');
      // First check if villa exists
      const villa = await prisma.villa.findUnique({
        where: { id: villaId }
      });

      if (!villa) {
        throw new Error(`Villa with ID ${villaId} not found. Please create the villa first.`);
      }

      // 🔍 STAFF DEBUG: First, let's check if staff records exist in database
      const staffCheck = await prisma.staff.findMany({
        where: { villaId, isActive: true }
      });
      logger.info('🔍 [STAFF-DEBUG] Direct staff query result:', {
        villaId,
        staffCount: staffCheck.length,
        staffRecords: staffCheck.map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, position: s.position }))
      });

      let progress = await prisma.onboardingProgress.findUnique({
        where: { villaId },
        include: {
          villa: {
            include: {
              owner: true,
              contractualDetails: true,
              bankDetails: true,
              otaCredentials: true,
              staff: { where: { isActive: true } }, // Re-enabled staff relation
              facilities: true,
              photos: { orderBy: { sortOrder: 'asc' } },
              documents: { where: { isActive: true } },
              onboardingSession: true,
              stepProgress: {
                include: {
                  fields: true
                }
              }
            },
          },
        },
      });

      // 🔍 STAFF DEBUG: Check if staff was included in the progress query
      logger.info('🔍 [STAFF-DEBUG] Progress query result - staff relation:', {
        villaId,
        hasProgress: !!progress,
        hasVilla: !!progress?.villa,
        hasStaffRelation: !!progress?.villa?.staff,
        staffCountInRelation: progress?.villa?.staff?.length || 0,
        staffInRelation: progress?.villa?.staff?.map((s: any) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName })) || []
      });

      if (!progress) {
        progress = await prisma.onboardingProgress.create({
          data: {
            villaId,
            currentStep: 1,
            totalSteps: this.TOTAL_STEPS,
            status: OnboardingStatus.IN_PROGRESS,
          },
          include: {
            villa: {
              include: {
                owner: true,
                contractualDetails: true,
                bankDetails: true,
                otaCredentials: true,
                staff: { where: { isActive: true } },
                facilities: true,
                photos: { orderBy: { sortOrder: 'asc' } },
                documents: { where: { isActive: true } },
                onboardingSession: true,
                stepProgress: {
                  include: {
                    fields: true
                  }
                }
              },
            },
          },
        });

        // Initialize OnboardingSession and StepProgress if user is provided
        if (userId) {
          await this.initializeEnhancedProgress(villaId, userId);
        }
      }

      // Auto-update progress flags based on data presence
      const progressVilla = progress.villa;
      const hasDocuments = progressVilla.documents && progressVilla.documents.length > 0;
      const hasPhotos = progressVilla.photos && progressVilla.photos.length > 0;
      
      const autoProgressUpdates: any = {};
      if (hasDocuments && !progress.documentsUploaded) {
        autoProgressUpdates.documentsUploaded = true;
        logger.info(`Auto-marking documents as completed for villa ${villaId}`);
      }
      if (hasPhotos && !progress.photosUploaded) {
        autoProgressUpdates.photosUploaded = true;
        logger.info(`Auto-marking photos as completed for villa ${villaId}`);
      }
      
      // Update progress if needed
      if (Object.keys(autoProgressUpdates).length > 0) {
        progress = await prisma.onboardingProgress.update({
          where: { villaId },
          data: autoProgressUpdates,
          include: {
            villa: {
              include: {
                owner: true,
                contractualDetails: true,
                bankDetails: true,
                otaCredentials: true,
                staff: { where: { isActive: true } },
                facilities: true,
                photos: { orderBy: { sortOrder: 'asc' } },
                documents: { where: { isActive: true } },
                onboardingSession: true,
                stepProgress: {
                  include: {
                    fields: true
                  }
                }
              },
            },
          },
        });
      }

      // Calculate completion percentage using both legacy and data-based methods
      const legacyCompletedStepsCount = this.countCompletedSteps(progress);
      const legacyCompletedStepsArray = this.getCompletedStepsArray(progress);
      const legacyCompletionPercentage = Math.round((legacyCompletedStepsCount / this.TOTAL_STEPS) * 100);
      
      // NEW: Data-based completion calculation
      const dataBasedCompletion = await this.calculateDataBasedCompletion(progress);
      
      // Bridge enhanced and legacy systems: sync boolean flags with data-based completion
      await this.syncLegacyProgressFlags(villaId, dataBasedCompletion.stepCompletionDetails);
      
      // Use data-based calculation as primary, legacy as fallback
      const completedStepsCount = dataBasedCompletion.completedSteps;
      const completionPercentage = dataBasedCompletion.overallProgress;
      const completedStepsArray = Object.entries(dataBasedCompletion.stepCompletionDetails)
        .filter(([_, details]) => details.isComplete)
        .map(([step, _]) => parseInt(step));
      
      logger.info(`Villa ${villaId} progress calculation (ENHANCED):`, {
        legacyCompletedSteps: legacyCompletedStepsCount,
        legacyCompletionPercentage,
        dataBasedCompletedSteps: completedStepsCount,
        dataBasedCompletionPercentage: completionPercentage,
        totalSteps: this.TOTAL_STEPS,
        completedSteps: completedStepsArray,
        currentStep: progress.currentStep,
        stepBreakdown: dataBasedCompletion.stepCompletionDetails
      });

      // Get validation for current step
      const validation = await this.validateStep(villaId, progress.currentStep);

      // Transform stepProgress fields into fieldProgress object for compatibility
      const fieldProgress: Record<number, Record<string, any>> = {};
      if (progress.villa?.stepProgress) {
        progress.villa.stepProgress.forEach((step) => {
          if (step.fields && step.fields.length > 0) {
            const stepFields: Record<string, any> = {};
            step.fields.forEach((field) => {
              if (field.value !== null) {
                // Special handling for bedroom data - try to parse JSON
                if (field.fieldName === 'bedrooms' || field.fieldName === 'bedrooms_config') {
                  try {
                    if (typeof field.value === 'string') {
                      stepFields[field.fieldName] = JSON.parse(field.value);
                    } else {
                      stepFields[field.fieldName] = field.value;
                    }
                  } catch (e) {
                    stepFields[field.fieldName] = field.value;
                  }
                } else {
                  stepFields[field.fieldName] = field.value;
                }
              }
            });
            if (Object.keys(stepFields).length > 0) {
              fieldProgress[step.stepNumber] = stepFields;
            }
          }
        });
      }

      // Add fieldProgress to villa data for compatibility with data mapper
      const step9FieldProgress = fieldProgress[9] || {};
      logger.info(`[BEDROOM] Backend: Step 9 field progress for villa ${villaId}:`, step9FieldProgress);
      logger.info(`[BEDROOM] Backend: Full field progress structure:`, fieldProgress);
      
      // Special handling: if we have bedroom data in field progress, also add it directly to the villa
      if (step9FieldProgress.bedrooms || step9FieldProgress.bedrooms_config) {
        const bedroomData = step9FieldProgress.bedrooms || step9FieldProgress.bedrooms_config;
        logger.info(`[BEDROOM] Backend: Found bedroom data in field progress, adding to villa:`, bedroomData);
      } else {
        logger.warn(`[BEDROOM] Backend: No bedroom data found in step 9 field progress for villa ${villaId}`);
      }
      
      const enhancedVilla = progress.villa ? {
        ...progress.villa,
        fieldProgress: step9FieldProgress // Add step 9 field progress for photos/bedrooms
      } : undefined;

      const finalResult = {
        ...progress,
        villa: enhancedVilla,
        completedStepsCount,
        completedSteps: completedStepsArray, // Array of completed step numbers
        completionPercentage,
        currentStepValidation: validation,
        stepDetails: this.getStepDetails(progress),
        fieldProgress, // Include all field progress for reference
        // NEW: Enhanced step-by-step progress details
        stepCompletionDetails: dataBasedCompletion.stepCompletionDetails,
        legacyProgress: {
          completedSteps: legacyCompletedStepsCount,
          completionPercentage: legacyCompletionPercentage,
          completedStepsArray: legacyCompletedStepsArray
        }
      };

      // 🔍 STAFF DEBUG: Final result being returned
      logger.info('🔍 [STAFF-DEBUG] Final getOnboardingProgress result:', {
        villaId,
        hasVilla: !!finalResult.villa,
        hasStaffInVilla: !!finalResult.villa?.staff,
        staffCountInFinalResult: finalResult.villa?.staff?.length || 0,
        finalStaffData: finalResult.villa?.staff?.map((s: any) => ({ 
          id: s.id, 
          firstName: s.firstName, 
          lastName: s.lastName, 
          position: s.position 
        })) || []
      });

      return finalResult;
    } catch (error) {
      logger.error('Error getting onboarding progress:', error);
      throw error;
    }
  }

  /**
   * Initialize enhanced progress tracking (OnboardingSession and StepFieldProgress)
   */
  async initializeEnhancedProgress(villaId: string, userId: string, userEmail?: string) {
    try {
      // Initialize the onboarding progress service for this villa
      await onboardingProgressService.initializeVillaProgress(villaId, userId, userEmail);
      logger.info(`Enhanced progress tracking initialized for villa ${villaId}`);
    } catch (error) {
      logger.error('Error initializing enhanced progress tracking:', error);
      // Don't throw here - the basic onboarding can still work without enhanced tracking
    }
  }

  /**
   * Update onboarding step
   */
  async updateStep(villaId: string, stepData: OnboardingStepData, userId?: string) {
    try {
      const { step, data, completed } = stepData;
      
      logger.info(`[UPDATE] updateStep called for villa ${villaId}, step ${step}`, {
        dataKeys: data ? Object.keys(data) : [],
        completed,
        userId
      });

      // Check if step is being skipped
      const isSkipped = data?.skipped === true;
      
      // Debug logging for step update
      logger.info(`[STEP_UPDATE] Villa ${villaId}, Step ${step}, Completed: ${completed}, Skipped: ${isSkipped}`);
      logger.info(`[STEP_UPDATE] Raw data received:`, JSON.stringify(data, null, 2));

      // Validate step data only if not skipped
      if (!isSkipped) {
        const validation = await this.validateStepData(villaId, step, data);
        if (!validation.isValid && completed) {
          throw new Error(`Step ${step} validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Update the specific step data
      await this.saveStepData(villaId, step, data, userId);

      // Update enhanced progress tracking
      if (userId) {
        await this.updateEnhancedProgress(villaId, step, data, completed, isSkipped, userId);
      }

      // Update progress using correct database field names
      const updateData: any = {};
      const stepCompletionField = this.STEP_COMPLETION_FIELDS[step as keyof typeof this.STEP_COMPLETION_FIELDS];
      
      if (!stepCompletionField) {
        throw new Error(`Invalid step number: ${step}. Must be between 1 and ${this.TOTAL_STEPS}.`);
      }
      
      logger.info(`Updating completion field '${stepCompletionField}' to ${completed} for villa ${villaId}, step ${step}`);
      updateData[stepCompletionField] = completed;

      // Auto-advance to next step if current step is completed
      if (completed) {
        updateData.currentStep = Math.min(step + 1, this.TOTAL_STEPS);
        logger.info(`Auto-advancing villa ${villaId} to step ${updateData.currentStep}`);
      }

      // Ensure OnboardingProgress exists before updating
      const existingProgress = await prisma.onboardingProgress.findUnique({
        where: { villaId }
      });

      if (!existingProgress) {
        throw new Error(`OnboardingProgress not found for villa ${villaId}. Please initialize onboarding first.`);
      }

      const progress = await prisma.onboardingProgress.update({
        where: { villaId },
        data: updateData,
        include: {
          villa: true,
        },
      });
      
      logger.info(`Successfully updated onboarding progress for villa ${villaId}:`, {
        stepCompletionField,
        completed,
        currentStep: progress.currentStep,
        completedStepsCount: this.countCompletedSteps(progress)
      });

      // Check if all steps are completed
      const completedStepsCount = this.countCompletedSteps(progress);
      logger.info(`Villa ${villaId} has ${completedStepsCount}/${this.TOTAL_STEPS} steps completed`);
      
if (completedStepsCount === this.TOTAL_STEPS) {
        logger.info(`All steps completed for villa ${villaId}, completing onboarding`);
        await this.completeOnboarding(villaId);
      }

      logger.info(`Onboarding step ${step} updated for villa ${villaId}`);
      return progress;
    } catch (error) {
      logger.error('Error updating onboarding step:', error);
      throw error;
    }
  }

  /**
   * Update enhanced progress tracking for step and field level
   */
  private async updateEnhancedProgress(
    villaId: string, 
    stepNumber: number, 
    stepData: any, 
    completed: boolean, 
    isSkipped: boolean, 
    userId: string
  ) {
    try {
      // Update step progress
      const stepProgress = await prisma.onboardingStepProgress.findUnique({
        where: {
          villaId_stepNumber: {
            villaId,
            stepNumber
          }
        },
        include: {
          fields: true
        }
      });

      if (stepProgress) {
        // Update step status
        let stepStatus: StepStatus = 'IN_PROGRESS';
        if (isSkipped) {
          stepStatus = 'SKIPPED';
        } else if (completed) {
          stepStatus = 'COMPLETED';
        }

        await prisma.onboardingStepProgress.update({
          where: { id: stepProgress.id },
          data: {
            status: stepStatus,
            startedAt: stepProgress.startedAt || new Date(),
            completedAt: completed ? new Date() : null,
            skippedAt: isSkipped ? new Date() : null,
            isValid: completed || isSkipped,
            lastUpdatedAt: new Date()
          }
        });

        // Ensure fields exist for keys present in stepData (auto-create if missing)
        if (stepData && typeof stepData === 'object') {
          const existingFieldNames = new Set(stepProgress.fields.map(f => f.fieldName));
          for (const [key, value] of Object.entries(stepData)) {
            if (!existingFieldNames.has(key)) {
              try {
                await prisma.stepFieldProgress.create({
                  data: {
                    stepProgressId: stepProgress.id,
                    fieldName: key,
                    fieldLabel: key,
                    fieldType: typeof value === 'string' ? 'string' : Array.isArray(value) || typeof value === 'object' ? 'json' : typeof value,
                    status: (value !== undefined && value !== null && value !== '') ? 'IN_PROGRESS' : 'NOT_STARTED',
                    isSkipped: false,
                    isValid: value !== undefined && value !== null && value !== '',
                    value: value !== undefined && value !== null ? value as any : null,
                    isRequired: false,
                    dependsOnFields: [],
                  }
                });
                existingFieldNames.add(key);
              } catch (e) {
                logger.warn('Failed to auto-create StepFieldProgress for field', { villaId, stepNumber, key, error: e });
              }
            }
          }

          // Update individual field progress for existing (and newly created) fields
          const refreshedStepProgress = await prisma.onboardingStepProgress.findUnique({
            where: { id: stepProgress.id },
            include: { fields: true }
          });

          if (refreshedStepProgress?.fields) {
            for (const field of refreshedStepProgress.fields) {
              const fieldValue = (stepData as any)[field.fieldName];
              const fieldHasValue = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
              
              let fieldStatus: FieldStatus = field.status;
              if (isSkipped) {
                fieldStatus = 'SKIPPED';
              } else if (fieldHasValue) {
                fieldStatus = 'COMPLETED';
              } else if (field.status === 'NOT_STARTED' && stepStatus === 'IN_PROGRESS') {
                fieldStatus = 'IN_PROGRESS';
              }

              await prisma.stepFieldProgress.update({
                where: { id: field.id },
                data: {
                  status: fieldStatus,
                  value: fieldHasValue ? fieldValue : field.value,
                  isSkipped: isSkipped,
                  isValid: fieldHasValue || isSkipped || !field.isRequired,
                  startedAt: field.startedAt || (fieldStatus === 'IN_PROGRESS' ? new Date() : null),
                  completedAt: fieldStatus === 'COMPLETED' ? new Date() : null,
                  skippedAt: fieldStatus === 'SKIPPED' ? new Date() : null,
                  lastModifiedAt: new Date()
                }
              });
            }
          }
        }

        // Update onboarding session counters
        await this.updateSessionCounters(villaId);
      }
    } catch (error) {
      logger.error('Error updating enhanced progress tracking:', error);
      // Don't throw - allow the main onboarding to continue
    }
  }

  /**
   * Update session counters
   */
  private async updateSessionCounters(villaId: string) {
    try {
      const steps = await prisma.onboardingStepProgress.findMany({
        where: { villaId },
        include: { fields: true }
      });

      const stepsCompleted = steps.filter(s => s.status === 'COMPLETED').length;
      const stepsSkipped = steps.filter(s => s.status === 'SKIPPED').length;
      const fieldsCompleted = steps.reduce((sum, step) => 
        sum + step.fields.filter(f => f.status === 'COMPLETED').length, 0);
      const fieldsSkipped = steps.reduce((sum, step) => 
        sum + step.fields.filter(f => f.isSkipped).length, 0);

      const currentStep = Math.max(1, stepsCompleted + stepsSkipped + 1);

      await prisma.onboardingSession.update({
        where: { villaId },
        data: {
          currentStep,
          stepsCompleted,
          stepsSkipped,
          fieldsCompleted,
          fieldsSkipped,
          lastActivityAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error updating session counters:', error);
    }
  }

  /**
   * Save step-specific data
   */
  private async saveStepData(villaId: string, step: number, data: any, userId?: string) {
    logger.info(`Saving step ${step} data for villa ${villaId}:`, {
      stepName: this.STEP_NAMES[step as keyof typeof this.STEP_NAMES],
      dataKeys: Object.keys(data || {}),
      dataSize: JSON.stringify(data || {}).length,
      isSkipped: data?.skipped === true
    });
    
    // Add comprehensive logging for debugging field mapping issues
    if (data && Object.keys(data).length > 0) {
      logger.debug(`Step ${step} field mapping debug:`, {
        villaId,
        receivedFields: Object.keys(data),
        fieldValues: Object.entries(data).reduce((acc, [key, value]) => {
          acc[key] = typeof value === 'string' && value.length > 50 ? 
            `${value.substring(0, 50)}...` : value;
          return acc;
        }, {} as any)
      });
    }
    
    // If step is skipped, just log it and return
    if (data?.skipped === true) {
      logger.info(`Step ${step} skipped for villa ${villaId}`);
      // Could also store skip information in a separate table if needed
      return;
    }
    
    if (!data || Object.keys(data).length === 0) {
      logger.warn(`No data provided for step ${step} of villa ${villaId}`);
      return;
    }
    
    try {
      switch (step) {
        case 1: // Villa Information
          logger.info(`Saving villa information for villa ${villaId}`, {
            villaName: data.villaName,
            city: data.city || data.villaCity,
            country: data.country || data.villaCountry,
            bedrooms: data.bedrooms,
            bathrooms: data.bathrooms,
            maxGuests: data.maxGuests
          });
          
          // Handle coordinate parsing from googleCoordinates field
          let parsedLatitude = data.latitude;
          let parsedLongitude = data.longitude;
          
          if (data.googleCoordinates && typeof data.googleCoordinates === 'string') {
            const coords = data.googleCoordinates.split(',').map((coord: string) => coord.trim());
            if (coords.length === 2) {
              parsedLatitude = parseFloat(coords[0]);
              parsedLongitude = parseFloat(coords[1]);
            }
          }

          // Build update data, filtering out undefined values to prevent field reset
          const updateData: any = {};
          
          // Core villa fields - only set if provided
          if (data.villaName || data.name) updateData.villaName = data.villaName || data.name;
          if (data.address || data.villaAddress) updateData.address = data.address || data.villaAddress;
          if (data.city || data.villaCity) updateData.city = data.city || data.villaCity;
          if (data.country || data.villaCountry) updateData.country = data.country || data.villaCountry;
          if (data.zipCode || data.villaPostalCode) updateData.zipCode = data.zipCode || data.villaPostalCode;
          
          // Coordinate handling - only update if valid values provided (allow 0 values)
          if (parsedLatitude !== undefined && parsedLatitude !== null && parsedLatitude !== '' && !isNaN(parseFloat(parsedLatitude))) {
            updateData.latitude = parseFloat(parsedLatitude);
          }
          if (parsedLongitude !== undefined && parsedLongitude !== null && parsedLongitude !== '' && !isNaN(parseFloat(parsedLongitude))) {
            updateData.longitude = parseFloat(parsedLongitude);
          }
          
          // Numeric fields - only update if valid values provided
          if (data.bedrooms !== undefined && data.bedrooms !== null && data.bedrooms !== '' && !isNaN(parseInt(data.bedrooms))) {
            updateData.bedrooms = parseInt(data.bedrooms);
          }
          if (data.bathrooms !== undefined && data.bathrooms !== null && data.bathrooms !== '' && !isNaN(parseInt(data.bathrooms))) {
            updateData.bathrooms = parseInt(data.bathrooms);
          }
          if (data.maxGuests !== undefined && data.maxGuests !== null && data.maxGuests !== '' && !isNaN(parseInt(data.maxGuests))) {
            updateData.maxGuests = parseInt(data.maxGuests);
          }
          
          // Area fields - only update if valid values provided
          const propertySize = data.propertySize || data.villaArea;
          if (propertySize !== undefined && propertySize !== null && propertySize !== '' && !isNaN(parseFloat(propertySize))) {
            updateData.propertySize = parseFloat(propertySize);
          }
          
          const plotSize = data.plotSize || data.landArea;
          if (plotSize !== undefined && plotSize !== null && plotSize !== '' && !isNaN(parseFloat(plotSize))) {
            updateData.plotSize = parseFloat(plotSize);
          }
          
          // Property details - only update if provided
          if (data.yearBuilt !== undefined && data.yearBuilt !== null && data.yearBuilt !== '' && !isNaN(parseInt(data.yearBuilt))) {
            updateData.yearBuilt = parseInt(data.yearBuilt);
          }
          if (data.renovationYear !== undefined && data.renovationYear !== null && data.renovationYear !== '' && !isNaN(parseInt(data.renovationYear))) {
            updateData.renovationYear = parseInt(data.renovationYear);
          }
          if (data.propertyType) updateData.propertyType = data.propertyType;
          if (data.villaStyle || data.locationType) {
            updateData.villaStyle = data.villaStyle || data.locationType;
          }
          
          // Descriptions - only update if provided
          if (data.description !== undefined) updateData.description = data.description;
          if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
          
          // External links - only update if provided
          if (data.googleMapsLink !== undefined) updateData.googleMapsLink = data.googleMapsLink;
          if (data.oldRatesCardLink !== undefined) updateData.oldRatesCardLink = data.oldRatesCardLink;
          if (data.iCalCalendarLink !== undefined) updateData.iCalCalendarLink = data.iCalCalendarLink;
          
          // Property contact information - only update if provided
          if (data.propertyEmail !== undefined) updateData.propertyEmail = data.propertyEmail;
          if (data.propertyWebsite !== undefined) updateData.propertyWebsite = data.propertyWebsite;

          await prisma.villa.update({
            where: { id: villaId },
            data: updateData,
          });
          
          logger.info(`Villa information saved successfully for villa ${villaId}`);
          break;

        case 2: // Owner Details
          logger.info(`Saving owner details for villa ${villaId}`, {
            dataKeys: Object.keys(data),
            firstName: data.firstName,
            lastName: data.lastName,
            ownerFullName: data.ownerFullName,
            email: data.email,
            ownerEmail: data.ownerEmail,
            phone: data.phone,
            ownerType: data.ownerType
          });
          
          // Handle name splitting from ownerFullName if firstName/lastName not provided
          let firstName = data.firstName;
          let lastName = data.lastName;
          
          if (!firstName && !lastName && data.ownerFullName) {
            const nameParts = data.ownerFullName.trim().split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
          }
          
          // Handle email field mapping
          const email = data.email || data.ownerEmail;
          const phone = data.phone || data.ownerPhone;
          
          // Validate required fields before saving (check DB schema for required fields)
          const requiredFields = {
            firstName,
            lastName,
            email,
            phone,
            address: data.address,
            city: data.city,
            country: data.country
          };
          
          const missingFields = Object.entries(requiredFields)
            .filter(([key, value]) => !value)
            .map(([key]) => key);
          
          if (missingFields.length > 0) {
            logger.warn(`Missing required owner fields for villa ${villaId}:`, {
              missingFields,
              providedData: {
                firstName,
                lastName,
                email,
                phone,
                address: data.address,
                city: data.city,
                country: data.country
              }
            });
            // Don't throw error, just log warning and skip saving
            logger.warn(`Skipping owner save for villa ${villaId} due to missing required fields: ${missingFields.join(', ')}`);
            return;
          }
          
          logger.info(`Attempting to upsert owner for villa ${villaId} with:`, {
            firstName,
            lastName,
            email,
            phone,
            address: data.address
          });
          
          await prisma.owner.upsert({
            where: { villaId },
            update: {
              firstName: firstName,
              lastName: lastName,
              email: email,
              phone: phone,
              alternativePhone: data.alternativePhone,
              nationality: data.nationality,
              passportNumber: data.passportNumber,
              idNumber: data.idNumber,
              address: data.address,
              city: data.city,
              country: data.country,
              zipCode: data.zipCode,
              preferredLanguage: data.preferredLanguage || 'en',
              communicationPreference: data.communicationPreference || 'EMAIL',
              notes: data.notes,
              alternativePhoneCountryCode: data.alternativePhoneCountryCode,
              alternativePhoneDialCode: data.alternativePhoneDialCode,
              phoneCountryCode: data.phoneCountryCode,
              phoneDialCode: data.phoneDialCode,
              companyAddress: data.companyAddress,
              companyName: data.companyName,
              companyTaxId: data.companyTaxId,
              companyVat: data.companyVat,
              managerEmail: data.managerEmail,
              managerName: data.managerName,
              managerPhone: data.managerPhone,
              managerPhoneCountryCode: data.managerPhoneCountryCode,
              managerPhoneDialCode: data.managerPhoneDialCode,
              ownerType: data.ownerType || 'INDIVIDUAL',
              propertyEmail: data.propertyEmail,
              propertyWebsite: data.propertyWebsite,
            },
            create: {
              villaId,
              firstName: firstName,
              lastName: lastName,
              email: email,
              phone: phone,
              alternativePhone: data.alternativePhone,
              nationality: data.nationality,
              passportNumber: data.passportNumber,
              idNumber: data.idNumber,
              address: data.address,
              city: data.city,
              country: data.country,
              zipCode: data.zipCode,
              preferredLanguage: data.preferredLanguage || 'en',
              communicationPreference: data.communicationPreference || 'EMAIL',
              notes: data.notes,
              alternativePhoneCountryCode: data.alternativePhoneCountryCode,
              alternativePhoneDialCode: data.alternativePhoneDialCode,
              phoneCountryCode: data.phoneCountryCode,
              phoneDialCode: data.phoneDialCode,
              companyAddress: data.companyAddress,
              companyName: data.companyName,
              companyTaxId: data.companyTaxId,
              companyVat: data.companyVat,
              managerEmail: data.managerEmail,
              managerName: data.managerName,
              managerPhone: data.managerPhone,
              managerPhoneCountryCode: data.managerPhoneCountryCode,
              managerPhoneDialCode: data.managerPhoneDialCode,
              ownerType: data.ownerType || 'INDIVIDUAL',
              propertyEmail: data.propertyEmail,
              propertyWebsite: data.propertyWebsite,
            },
          });
          
          logger.info(`Owner details saved successfully for villa ${villaId}`);
          break;

        case 3: // Contractual Details
          logger.info(`Saving contractual details for villa ${villaId}`, {
            contractType: data.contractType,
            commissionRate: data.commissionRate
          });
          
          await prisma.contractualDetails.upsert({
            where: { villaId },
            update: {
              contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : new Date(),
              contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : undefined,
              contractType: data.contractType,
              commissionRate: data.commissionRate ? parseFloat(data.commissionRate) : 0,
              managementFee: data.managementFee ? parseFloat(data.managementFee) : undefined,
              marketingFee: data.marketingFee ? parseFloat(data.marketingFee) : undefined,
              paymentTerms: data.paymentTerms,
              paymentSchedule: data.paymentSchedule || 'MONTHLY',
              minimumStayNights: data.minimumStayNights ? parseInt(data.minimumStayNights) : 1,
              cancellationPolicy: data.cancellationPolicy || 'MODERATE',
              checkInTime: data.checkInTime || '15:00',
              checkOutTime: data.checkOutTime || '11:00',
              insuranceProvider: data.insuranceProvider,
              insurancePolicyNumber: data.insurancePolicyNumber,
              insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : undefined,
              specialTerms: data.specialTerms,
              payoutDay1: data.payoutDay1 ? parseInt(data.payoutDay1) : undefined,
              payoutDay2: data.payoutDay2 ? parseInt(data.payoutDay2) : undefined,
              dbdNumber: data.dbdNumber,
              paymentThroughIPL: data.paymentThroughIPL || false,
              vatPaymentTerms: data.vatPaymentTerms,
              vatRegistrationNumber: data.vatRegistrationNumber,
            },
            create: {
              villaId,
              contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : new Date(),
              contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : undefined,
              contractType: data.contractType,
              commissionRate: data.commissionRate ? parseFloat(data.commissionRate) : 0,
              managementFee: data.managementFee ? parseFloat(data.managementFee) : undefined,
              marketingFee: data.marketingFee ? parseFloat(data.marketingFee) : undefined,
              paymentTerms: data.paymentTerms,
              paymentSchedule: data.paymentSchedule || 'MONTHLY',
              minimumStayNights: data.minimumStayNights ? parseInt(data.minimumStayNights) : 1,
              cancellationPolicy: data.cancellationPolicy || 'MODERATE',
              checkInTime: data.checkInTime || '15:00',
              checkOutTime: data.checkOutTime || '11:00',
              insuranceProvider: data.insuranceProvider,
              insurancePolicyNumber: data.insurancePolicyNumber,
              insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : undefined,
              specialTerms: data.specialTerms,
              payoutDay1: data.payoutDay1 ? parseInt(data.payoutDay1) : undefined,
              payoutDay2: data.payoutDay2 ? parseInt(data.payoutDay2) : undefined,
              dbdNumber: data.dbdNumber,
              paymentThroughIPL: data.paymentThroughIPL || false,
              vatPaymentTerms: data.vatPaymentTerms,
              vatRegistrationNumber: data.vatRegistrationNumber,
            },
          });
          
          logger.info(`Contractual details saved successfully for villa ${villaId}`);
          break;

        case 4: // Bank Details
          logger.info(`Saving bank details for villa ${villaId}`, {
            accountHolderName: data.accountHolderName,
            bankName: data.bankName
          });
          
          // Check if required fields are present
          if (!data.accountHolderName || !data.bankName || !data.accountNumber) {
            logger.warn(`Skipping bank details save for villa ${villaId}: missing required fields`, {
              hasAccountHolder: !!data.accountHolderName,
              hasBankName: !!data.bankName,
              hasAccountNumber: !!data.accountNumber
            });
            break;
          }
          
          await prisma.bankDetails.upsert({
            where: { villaId },
            update: {
              accountHolderName: data.accountHolderName,
              bankName: data.bankName,
              accountNumber: data.accountNumber,
              iban: data.iban,
              swiftCode: data.swiftCode,
              branchName: data.branchName,
              branchCode: data.branchCode,
              branchAddress: data.branchAddress || data.bankAddress,
              bankAddress: data.bankAddress,
              bankCountry: data.bankCountry,
              currency: data.currency || 'USD',
              accountType: data.accountType,
              notes: data.notes,
              isVerified: data.isVerified || false,
            },
            create: {
              villaId,
              accountHolderName: data.accountHolderName,
              bankName: data.bankName,
              accountNumber: data.accountNumber,
              iban: data.iban,
              swiftCode: data.swiftCode,
              branchName: data.branchName,
              branchCode: data.branchCode,
              branchAddress: data.branchAddress || data.bankAddress,
              bankAddress: data.bankAddress,
              bankCountry: data.bankCountry,
              currency: data.currency || 'USD',
              accountType: data.accountType,
              notes: data.notes,
              isVerified: data.isVerified || false,
            },
          });
          
          logger.info(`Bank details saved successfully for villa ${villaId}`);
          break;

      case 5: // OTA Credentials
        // Handle multiple OTA platforms
        if (Array.isArray(data.platforms)) {
          logger.info(`Saving OTA credentials for villa ${villaId} - ${data.platforms.length} platforms`);
          for (const platform of data.platforms) {
            await prisma.oTACredentials.upsert({
              where: {
                villaId_platform: {
                  villaId,
                  platform: platform.platform,
                },
              },
              update: platform,
              create: {
                villaId,
                ...platform,
              },
            });
          }
          logger.info(`OTA credentials saved successfully for villa ${villaId}`);
        }
        break;

      case 6: // Documents Upload
        logger.info(`Documents upload step for villa ${villaId} - handled separately via SharePoint`);
        break;

      case 7: // Staff Configuration
        // 🕵️‍♂️ SHERLOCK INVESTIGATION - Staff Case (moved to case 7)
        logger.info(`🔍 CASE 7 INVESTIGATION: Step 7 (Staff Configuration) processing started`);
        logger.info(`🔍 Villa ID: ${villaId}`);
        logger.info(`🔍 Data object keys: ${data ? Object.keys(data).join(', ') : 'NO DATA'}`);
        logger.info(`🔍 Staff data present: ${!!data.staff}`);
        logger.info(`🔍 Staff data is array: ${Array.isArray(data.staff)}`);
        if (data.staff) {
          logger.info(`🔍 Staff array length: ${Array.isArray(data.staff) ? data.staff.length : 'NOT ARRAY'}`);
          logger.info(`🔍 Staff array content: ${JSON.stringify(data.staff, null, 2)}`);
        } else {
          logger.warn(`🔍 NO STAFF DATA FOUND! Data object: ${JSON.stringify(data, null, 2)}`);
        }
        
        // Handle multiple staff members with transaction safety
        let staffOperationResult: any;
        if (Array.isArray(data.staff)) {
          logger.info(`🔍 PROCESSING: Saving staff configuration for villa ${villaId} - ${data.staff.length} staff members`);
          
          // Use database transaction to ensure atomicity
          staffOperationResult = await prisma.$transaction(async (prismaTransaction) => {
            const results = {
              deactivated: 0,
              created: 0,
              updated: 0,
              failed: 0,
              errors: [] as string[]
            };
            
            // Get current staff emails to track which to keep
            const newStaffEmails = data.staff
              .filter((s: any) => s.email)
              .map((s: any) => s.email.toLowerCase());
            logger.info(`🔍 New staff emails to keep: ${newStaffEmails.join(', ') || 'NONE'}`);
            
            // Deactivate existing staff not in the new list (by email)
            if (newStaffEmails.length > 0) {
              const deactivateResult = await prismaTransaction.staff.updateMany({
                where: {
                  villaId,
                  email: { notIn: newStaffEmails },
                  isActive: true,
                },
                data: { isActive: false },
              });
              results.deactivated = deactivateResult.count;
              logger.info(`🔍 Deactivated ${deactivateResult.count} existing staff members`);
            }

            // Process staff members
            for (let i = 0; i < data.staff.length; i++) {
              const staffMember = data.staff[i];
              logger.info(`🔍 Processing staff member ${i + 1}:`, JSON.stringify(staffMember, null, 2));
              
              try {
                // Check if staff already exists by email, then by name if email fails
                let existingStaff = null;
                
                // First try email search
                if (staffMember.email) {
                  const searchEmail = staffMember.email.toLowerCase();
                  logger.info(`🔍 SEARCHING for existing staff with email: ${searchEmail}`);
                  existingStaff = await prismaTransaction.staff.findFirst({
                    where: {
                      villaId,
                      email: searchEmail,
                    },
                  });
                  logger.info(`🔍 EMAIL SEARCH RESULT: ${existingStaff ? 'Found existing staff with ID: ' + existingStaff.id : 'No staff found by email'}`);
                }
                
                // If email search fails, try name-based search
                if (!existingStaff && staffMember.firstName && staffMember.lastName) {
                  logger.info(`🔍 FALLBACK: Searching by name: ${staffMember.firstName} ${staffMember.lastName}`);
                  existingStaff = await prismaTransaction.staff.findFirst({
                    where: {
                      villaId,
                      firstName: staffMember.firstName,
                      lastName: staffMember.lastName,
                      isActive: true,
                    },
                  });
                  logger.info(`🔍 NAME SEARCH RESULT: ${existingStaff ? 'Found existing staff with ID: ' + existingStaff.id : 'No staff found by name'}`);
                }
            
            // Prepare staff data with proper field mappings and validation
            const staffDefaults = this.mapStaffDefaults(staffMember.position);
            
            // Handle field mapping for frontend->backend compatibility
            const mappedStaff = {
              // Map frontend field names to database field names
              salary: staffMember.salary || staffMember.baseSalary || 0, // baseSalary -> salary
              idNumber: staffMember.idNumber || staffMember.idCard || null, // idCard -> idNumber
              otherDeductions: staffMember.otherDeductions || staffMember.otherDeduct || null, // otherDeduct -> otherDeductions
              hasWorkInsurance: staffMember.hasWorkInsurance || staffMember.workInsurance || false, // workInsurance -> hasWorkInsurance
              hasHealthInsurance: staffMember.hasHealthInsurance || staffMember.healthInsurance || false, // healthInsurance -> hasHealthInsurance
              ...staffMember // Include all other fields as-is
            };
            
            const preparedStaffData = {
              firstName: mappedStaff.firstName || '',
              lastName: mappedStaff.lastName || '',
              nickname: mappedStaff.nickname || null,
              email: mappedStaff.email ? mappedStaff.email.toLowerCase() : null,
              phone: mappedStaff.phone || '',
              idNumber: mappedStaff.idNumber,
              passportNumber: mappedStaff.passportNumber || null,
              nationality: mappedStaff.nationality || null,
              dateOfBirth: mappedStaff.dateOfBirth ? new Date(mappedStaff.dateOfBirth) : null,
              maritalStatus: mappedStaff.maritalStatus,
              position: mappedStaff.position,
              department: mappedStaff.department || staffDefaults.department,
              employmentType: mappedStaff.employmentType || staffDefaults.employmentType,
              startDate: mappedStaff.startDate ? new Date(mappedStaff.startDate) : new Date(),
              endDate: mappedStaff.endDate ? new Date(mappedStaff.endDate) : null,
              salary: parseFloat(mappedStaff.salary.toString()) || 0, // Ensure numeric conversion
              salaryFrequency: mappedStaff.salaryFrequency || 'MONTHLY',
              currency: mappedStaff.currency || 'USD',
              numberOfDaySalary: mappedStaff.numberOfDaySalary ? parseInt(mappedStaff.numberOfDaySalary.toString()) : null,
              serviceCharge: mappedStaff.serviceCharge ? parseFloat(mappedStaff.serviceCharge.toString()) : null,
              totalIncome: mappedStaff.totalIncome ? parseFloat(mappedStaff.totalIncome.toString()) : null,
              totalNetIncome: mappedStaff.totalNetIncome ? parseFloat(mappedStaff.totalNetIncome.toString()) : null,
              otherDeductions: mappedStaff.otherDeductions ? parseFloat(mappedStaff.otherDeductions.toString()) : null,
              hasAccommodation: mappedStaff.hasAccommodation || false,
              hasTransport: mappedStaff.hasTransport || false,
              hasHealthInsurance: mappedStaff.hasHealthInsurance || false,
              hasWorkInsurance: mappedStaff.hasWorkInsurance || false,
              foodAllowance: mappedStaff.foodAllowance || false,
              transportation: mappedStaff.transportation || null,
              // Handle emergency contacts properly - ensure it's stored as valid JSON
              emergencyContacts: this.processEmergencyContacts(mappedStaff.emergencyContacts) as any,
              isActive: true
            };
            
            if (existingStaff) {
              logger.info(`🔍 UPDATING existing staff with email: ${staffMember.email}`);
              
              // Validate required fields before update
              const validationErrors = this.validateStaffData(preparedStaffData);
              if (validationErrors.length > 0) {
                logger.error(`🔍 UPDATE VALIDATION FAILED for staff ${existingStaff.id}:`, {
                  errors: validationErrors,
                  staffData: { firstName: staffMember.firstName, lastName: staffMember.lastName, position: staffMember.position }
                });
                logger.info(`🔍 SKIPPING UPDATE for staff ${existingStaff.id} due to validation errors`);
                return; // Skip this staff member
              }
              
                const updateResult = await prismaTransaction.staff.update({
                  where: { id: existingStaff.id },
                  data: preparedStaffData,
                });
                results.updated++;
                logger.info(`🔍 UPDATE SUCCESS: Staff ID ${updateResult.id} (${updateResult.firstName} ${updateResult.lastName}) updated successfully`);
            } else {
              logger.info(`🔍 CREATING new staff member: ${staffMember.firstName} ${staffMember.lastName} (${staffMember.position})`);
              logger.info(`🔍 Staff defaults for position ${staffMember.position}:`, staffDefaults);
              
              // Validate required fields before create
              const validationErrors = this.validateStaffData(preparedStaffData);
              if (validationErrors.length > 0) {
                logger.error(`🔍 CREATE VALIDATION FAILED for staff ${staffMember.firstName} ${staffMember.lastName}:`, {
                  errors: validationErrors,
                  position: staffMember.position,
                  villaId
                });
                logger.info(`🔍 SKIPPING CREATE for staff ${staffMember.firstName} ${staffMember.lastName} due to validation errors`);
                return; // Skip this staff member
              }
              
              const createData = {
                villaId,
                ...preparedStaffData
              };
              
              // 🔍 STAFF DEBUG: Log staff creation data with villaId
              logger.info('🔍 [STAFF-CREATE-DEBUG] Creating staff member:', {
                villaId,
                staffName: `${preparedStaffData.firstName} ${preparedStaffData.lastName}`,
                position: preparedStaffData.position,
                createDataVillaId: createData.villaId,
                stepContext: 'onboarding-step-7'
              });
              
              logger.info(`🔍 CREATE DATA SUMMARY:`, {
                name: `${preparedStaffData.firstName} ${preparedStaffData.lastName}`,
                position: preparedStaffData.position,
                department: preparedStaffData.department,
                employmentType: preparedStaffData.employmentType,
                salary: preparedStaffData.salary,
                currency: preparedStaffData.currency,
                hasEmergencyContacts: !!preparedStaffData.emergencyContacts,
                emergencyContactsCount: Array.isArray(preparedStaffData.emergencyContacts) ? preparedStaffData.emergencyContacts.length : 0
              });
              
                const createResult = await prismaTransaction.staff.create({
                  data: createData,
                });
                results.created++;
                logger.info(`🔍 CREATE SUCCESS: Staff ID ${createResult.id} (${createResult.firstName} ${createResult.lastName}) created successfully`);
              }
              } catch (staffProcessingError: any) {
                results.failed++;
                const errorMessage = `Failed to process staff ${staffMember.firstName} ${staffMember.lastName}: ${staffProcessingError.message}`;
                results.errors.push(errorMessage);
                
                logger.error(`🔍 STAFF PROCESSING FAILED:`, {
                  error: staffProcessingError.message,
                  code: staffProcessingError.code,
                  meta: staffProcessingError.meta,
                  staffName: `${staffMember.firstName} ${staffMember.lastName}`,
                  position: staffMember.position,
                  villaId
                });
                
                // Log specific constraint violations
                if (staffProcessingError.code === 'P2002') {
                  logger.error(`🔍 UNIQUE CONSTRAINT VIOLATION: Duplicate key for staff ${staffMember.firstName} ${staffMember.lastName}`);
                }
                if (staffProcessingError.code === 'P2003') {
                  logger.error(`🔍 FOREIGN KEY CONSTRAINT VIOLATION: Invalid villaId ${villaId}`);
                }
                if (staffProcessingError.code === 'P2000') {
                  logger.error(`🔍 VALUE OUT OF RANGE: Check numeric fields for staff ${staffMember.firstName} ${staffMember.lastName}`);
                }
              }
            }
            
            return results;
          });
          
          // Log transaction results
          if (staffOperationResult) {
            logger.info(`🔍 STAFF TRANSACTION COMPLETED for villa ${villaId}:`, {
              deactivated: staffOperationResult.deactivated,
              created: staffOperationResult.created,
              updated: staffOperationResult.updated,
              failed: staffOperationResult.failed,
              errors: staffOperationResult.errors.length > 0 ? staffOperationResult.errors : 'No errors'
            });
            
            if (staffOperationResult.failed > 0) {
              logger.warn(`🔍 Some staff operations failed for villa ${villaId}. Check logs above for details.`);
            }
          }
          
          logger.info(`🔍 CASE CLOSED: Staff configuration saved successfully for villa ${villaId}`);
        } else {
          logger.warn(`🔍 CASE FAILED: No staff array found or not an array. Data.staff type: ${typeof data.staff}`);
        }
        break;

      case 8: // Facilities - Enhanced with transaction safety and batch processing
        logger.info(`🏭 [FACILITY] Step 8 processing started for villa ${villaId}`);
        logger.info(`🏭 [FACILITY] Received ${data.facilities?.length || 0} facilities`);
        logger.info(`🏭 [FACILITY] Raw data structure:`, {
          hasFacilities: !!data.facilities,
          isArray: Array.isArray(data.facilities),
          facilityCount: data.facilities?.length || 0,
          sampleFacility: data.facilities?.[0] ? {
            category: data.facilities[0].category,
            itemName: data.facilities[0].itemName,
            isAvailable: data.facilities[0].isAvailable,
            hasNotes: !!data.facilities[0].notes
          } : null
        });
        
        // Log each facility in detail for debugging
        if (Array.isArray(data.facilities) && data.facilities.length > 0) {
          data.facilities.forEach((facility: any, index: number) => {
            logger.info(`🏭 [FACILITY] Facility ${index + 1}:`, {
              category: facility.category,
              subcategory: facility.subcategory,
              itemName: facility.itemName,
              isAvailable: facility.isAvailable || facility.available,
              quantity: facility.quantity,
              condition: facility.condition,
              notes: facility.notes ? `"${facility.notes.substring(0, 50)}${facility.notes.length > 50 ? '...' : ''}"` : null,
              specifications: facility.specifications ? `"${facility.specifications.substring(0, 50)}${facility.specifications.length > 50 ? '...' : ''}"` : null,
              hasPhotoData: !!facility.photoData,
              hasPhotoUrl: !!facility.photoUrl
            });
          });
        }
        
        logger.debug(`🏭 [FACILITY] Full raw facilities data:`, JSON.stringify(data.facilities, null, 2));
        
        if (Array.isArray(data.facilities) && data.facilities.length > 0) {
          // Use database transaction for atomic facility updates
          const facilitiesResult = await prisma.$transaction(async (prismaTransaction) => {
            const results = {
              processed: 0,
              created: 0,
              updated: 0,
              deleted: 0,
              skipped: 0,
              errors: [] as string[]
            };

            logger.info(`🏭 [FACILITY] Processing ${data.facilities.length} facilities in transaction`);

            // Group facilities by availability for batch processing
            const availableFacilities = [];
            const unavailableFacilities = [];

            for (const facility of data.facilities) {
              const isAvailable = Boolean(facility.isAvailable || facility.available);
              
              if (isAvailable) {
                availableFacilities.push(facility);
              } else {
                unavailableFacilities.push(facility);
              }
            }

            logger.info(`🏭 [FACILITY] Categorized: ${availableFacilities.length} available, ${unavailableFacilities.length} unavailable`);

            // First, handle unavailable facilities (deletions)
            for (const facility of unavailableFacilities) {
              try {
                const category = facility.category;
                const subcategory = facility.subcategory || '';
                const itemName = facility.itemName;

                if (!category || !itemName) {
                  logger.warn(`🏭 [FACILITY] Skipping facility with missing category/itemName:`, { category, itemName });
                  results.skipped++;
                  continue;
                }

                const deleteResult = await prismaTransaction.facilityChecklist.deleteMany({
                  where: {
                    villaId,
                    category,
                    subcategory,
                    itemName,
                  },
                });

                results.deleted += deleteResult.count;
                results.processed++;

                logger.debug(`🏭 [FACILITY] Deleted ${deleteResult.count} records for unavailable: ${category}/${itemName}`);
              } catch (error) {
                const errorMsg = `Failed to delete facility ${facility.category}/${facility.itemName}: ${error instanceof Error ? error.message : String(error)}`;
                results.errors.push(errorMsg);
                logger.error(`🏭 [FACILITY] ${errorMsg}`, error);
              }
            }

            // Then, handle available facilities (upserts)
            for (const facility of availableFacilities) {
              try {
                const category = facility.category;
                const subcategory = facility.subcategory || '';
                const itemName = facility.itemName;
                const isAvailable = true;

                // Validate required fields
                if (!category || !itemName) {
                  logger.warn(`🏭 [FACILITY] Skipping facility with missing required fields:`, { 
                    category, 
                    itemName, 
                    villaId 
                  });
                  results.skipped++;
                  continue;
                }

                // Validate category enum
                const validCategories = [
                  'property_layout_spaces', 'occupancy_sleeping', 'bathrooms', 'kitchen_dining',
                  'service_staff', 'living_spaces', 'outdoor_facilities', 'home_office',
                  'entertainment_gaming', 'technology', 'wellness_spa', 'accessibility',
                  'safety_security', 'child_friendly',
                  // Legacy categories
                  'KITCHEN_EQUIPMENT', 'BATHROOM_AMENITIES', 'BEDROOM_AMENITIES',
                  'LIVING_ROOM', 'OUTDOOR_FACILITIES', 'POOL_AREA', 'ENTERTAINMENT', 'SAFETY_SECURITY'
                ];

                if (!validCategories.includes(category)) {
                  logger.warn(`🏭 [FACILITY] Invalid category '${category}' for facility '${itemName}', skipping`);
                  results.skipped++;
                  continue;
                }

                // DEBUG: Force tsx recompilation - NEW VERSION
                logger.info(`🏭 [FACILITY] CRITICAL DEBUG v2 - Processing facility ${itemName}, userId: "${userId || 'undefined'}", type: ${typeof userId}`);

                // Prepare facility data with enhanced validation and photo handling
                const facilityData: any = {
                  villaId,
                  category,
                  subcategory: subcategory.substring(0, 100), // Limit subcategory length
                  itemName: itemName.substring(0, 200), // Limit itemName length
                  isAvailable,
                  quantity: facility.quantity ? Math.max(1, parseInt(facility.quantity.toString())) : 1,
                  condition: ['new', 'good', 'fair', 'poor'].includes(facility.condition) ? facility.condition : 'good',
                  notes: facility.notes ? (facility.notes || '').substring(0, 5000) : null, // Increased limit for detailed notes
                  specifications: facility.specifications ? (facility.specifications || '').substring(0, 5000) : null,
                  photoUrl: facility.photoUrl ? facility.photoUrl.substring(0, 500) : null,
                  productLink: facility.productLink ? facility.productLink.substring(0, 500) : null,
                  checkedBy: facility.checkedBy ? facility.checkedBy.substring(0, 100) : (userId ? userId.substring(0, 100) : 'system'), // ROBUST FIX: Handle undefined userId
                  lastCheckedAt: facility.lastCheckedAt ? new Date(facility.lastCheckedAt) : new Date(),
                };

                // Handle local photo storage if base64 data is provided
                if (facility.photoData && facility.photoData.startsWith('data:')) {
                  try {
                    // Extract base64 data and MIME type
                    const matches = facility.photoData.match(/^data:([^;]+);base64,(.+)$/);
                    if (matches) {
                      const mimeType = matches[1];
                      const base64Data = matches[2];
                      const photoBuffer = Buffer.from(base64Data, 'base64');
                      
                      // Compress/resize image if too large (max 500KB for thumbnail)
                      const maxSize = 500 * 1024; // 500KB
                      if (photoBuffer.length <= maxSize) {
                        facilityData.photoData = photoBuffer;
                        facilityData.photoMimeType = mimeType;
                        facilityData.photoSize = photoBuffer.length;
                        
                        // Extract dimensions if possible (basic check for JPEG/PNG)
                        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
                          // JPEG dimension extraction would go here
                          logger.debug(`🏭 [FACILITY] Storing JPEG photo (${photoBuffer.length} bytes) for ${itemName}`);
                        } else if (mimeType.includes('png')) {
                          // PNG dimension extraction would go here
                          logger.debug(`🏭 [FACILITY] Storing PNG photo (${photoBuffer.length} bytes) for ${itemName}`);
                        }
                      } else {
                        logger.warn(`🏭 [FACILITY] Photo too large (${photoBuffer.length} bytes) for ${itemName}, skipping local storage`);
                      }
                    }
                  } catch (photoError) {
                    logger.error(`🏭 [FACILITY] Failed to process photo for ${itemName}:`, photoError);
                  }
                } else if (facility.photoData) {
                  // If photoData is already a buffer (from previous save)
                  facilityData.photoData = facility.photoData;
                  facilityData.photoMimeType = facility.photoMimeType;
                  facilityData.photoSize = facility.photoSize;
                  facilityData.photoWidth = facility.photoWidth;
                  facilityData.photoHeight = facility.photoHeight;
                }

                logger.debug(`🏭 [FACILITY] Prepared facility data for ${itemName}:`, {
                  category,
                  subcategory,
                  quantity: facilityData.quantity,
                  condition: facilityData.condition,
                  hasNotes: !!facilityData.notes,
                  hasSpecs: !!facilityData.specifications,
                  hasPhoto: !!facilityData.photoData || !!facilityData.photoUrl,
                  hasProductLink: !!facilityData.productLink
                });

                logger.debug(`🏭 [FACILITY] Upserting facility: ${category}/${itemName} (${isAvailable ? 'Available' : 'Not Available'})`);

                // Check if record exists first for proper logging
                const existingFacility = await prismaTransaction.facilityChecklist.findUnique({
                  where: {
                    villaId_category_subcategory_itemName: {
                      villaId,
                      category,
                      subcategory,
                      itemName,
                    },
                  },
                });

                const upsertResult = await prismaTransaction.facilityChecklist.upsert({
                  where: {
                    villaId_category_subcategory_itemName: {
                      villaId,
                      category,
                      subcategory,
                      itemName,
                    },
                  },
                  update: facilityData,
                  create: facilityData,
                });

                if (existingFacility) {
                  results.updated++;
                  logger.debug(`🏭 [FACILITY] Updated existing facility: ${upsertResult.id}`);
                } else {
                  results.created++;
                  logger.debug(`🏭 [FACILITY] Created new facility: ${upsertResult.id}`);
                }

                results.processed++;
              } catch (error) {
                const errorMsg = `Failed to upsert facility ${facility.category}/${facility.itemName}: ${error instanceof Error ? error.message : String(error)}`;
                results.errors.push(errorMsg);
                logger.error(`🏭 [FACILITY] ${errorMsg}`, error);
              }
            }

            return results;
          });

          // Log comprehensive transaction results
          logger.info(`🏭 [FACILITY] Transaction completed for villa ${villaId}:`, {
            processed: facilitiesResult.processed,
            created: facilitiesResult.created,
            updated: facilitiesResult.updated,
            deleted: facilitiesResult.deleted,
            skipped: facilitiesResult.skipped,
            errorCount: facilitiesResult.errors.length,
            totalInput: data.facilities.length
          });

          if (facilitiesResult.errors.length > 0) {
            logger.warn(`🏭 [FACILITY] Some operations failed:`, facilitiesResult.errors);
          }

          // Verify the final state
          const finalFacilityCount = await prisma.facilityChecklist.count({
            where: { villaId, isAvailable: true }
          });
          
          logger.info(`🏭 [FACILITY] Final state: ${finalFacilityCount} available facilities for villa ${villaId}`);
          
        } else if (Array.isArray(data.facilities) && data.facilities.length === 0) {
          logger.info(`🏭 [FACILITY] Empty facilities array - clearing all facilities for villa ${villaId}`);
          
          // Clear all existing facilities when empty array is sent
          const deleteResult = await prisma.facilityChecklist.deleteMany({
            where: { villaId }
          });
          
          logger.info(`🏭 [FACILITY] Cleared ${deleteResult.count} existing facilities`);
        } else {
          logger.warn(`🏭 [FACILITY] Invalid facilities data format for villa ${villaId}:`, {
            dataType: typeof data.facilities,
            isArray: Array.isArray(data.facilities),
            hasData: !!data,
            hasFacilities: !!data.facilities
          });
        }
        break;

      case 9: // Photos Upload
        logger.info(`Photos upload handling for villa ${villaId} - handled separately via upload endpoints`);
        
        // Save bedroom configuration data if provided
        if (data.bedrooms && Array.isArray(data.bedrooms)) {
          logger.info(`Saving bedroom configuration for villa ${villaId}:`, data.bedrooms);
          
          // Store bedroom data in the field progress for step 9 with enhanced persistence
          await this.saveFieldProgress(villaId, step, 'bedrooms', JSON.stringify(data.bedrooms), 'system');
          
          // Also save as a separate dedicated field for reliability
          await this.saveFieldProgress(villaId, step, 'bedrooms_config', JSON.stringify(data.bedrooms), 'system');
          
          logger.info(`[OK] Bedroom configuration persisted to field progress for villa ${villaId}`);
        }
        break;

      case 10: // Review - no specific data to save
        logger.info(`Review step completed for villa ${villaId}`);
        break;
          
        default:
          logger.warn(`Unknown step ${step} for villa ${villaId}`);
          break;
      }
      
      logger.info(`Step ${step} data saved successfully for villa ${villaId}`);
    } catch (error) {
      logger.error(`Error saving step ${step} data for villa ${villaId}:`, error);
      throw error;
    }
  }

  /**
   * Validate step data
   */
  private async validateStepData(villaId: string, step: number, data: any): Promise<OnboardingValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Debug logging to understand what data is being validated
    logger.info(`[VALIDATION] Step ${step} data for villa ${villaId}:`, JSON.stringify(data, null, 2));

    switch (step) {
      case 1: // Villa Information
        if (!data.villaName) errors.push('Villa name is required');
        // Require city and country combination
        if (!(data.city && data.country)) {
          errors.push('City and country are required');
        }
        if (!data.address) errors.push('Address is required');
        if (!data.bedrooms || data.bedrooms < 1) errors.push('Number of bedrooms must be at least 1');
        if (!data.bathrooms || data.bathrooms < 1) errors.push('Number of bathrooms must be at least 1');
        if (!data.maxGuests || data.maxGuests < 1) errors.push('Maximum guests must be at least 1');
        if (!data.propertyType) errors.push('Property type is required');
        
        if (!data.description) warnings.push('Description is recommended for better listing visibility');
        if (data.latitude === undefined || data.longitude === undefined) warnings.push('GPS coordinates help with map display');
        break;

      case 2: // Owner Details
        if (!data.firstName) errors.push('First name is required');
        if (!data.lastName) errors.push('Last name is required');
        if (!data.email) errors.push('Email is required');
        if (!data.phone) errors.push('Phone number is required');
        if (!data.address) errors.push('Owner address is required');
        
        if (!data.passportNumber && !data.idNumber) warnings.push('ID document recommended for verification');
        break;

      case 3: // Contractual Details
        if (!data.contractStartDate) errors.push('Contract start date is required');
        if (!data.contractType) errors.push('Contract type is required');
        if (data.commissionRate === undefined || data.commissionRate < 0) errors.push('Commission rate is required');
        
        if (!data.insuranceProvider) warnings.push('Insurance information recommended');
        if (!data.cancellationPolicy) warnings.push('Cancellation policy should be defined');
        break;

      case 4: // Bank Details
        if (!data.accountHolderName) errors.push('Account holder name is required');
        if (!data.bankName) errors.push('Bank name is required');
        if (!data.accountNumber && !data.iban) errors.push('Account number or IBAN is required');
        
        if (!data.swiftCode) warnings.push('SWIFT code recommended for international transfers');
        break;

      case 5: // OTA Credentials
        // Optional step, but validate if provided
        if (data.platforms && Array.isArray(data.platforms)) {
          data.platforms.forEach((platform: any, index: number) => {
            if (!platform.platform) errors.push(`Platform ${index + 1}: Platform name is required`);
            if (!platform.propertyId && !platform.apiKey) {
              warnings.push(`Platform ${index + 1}: Property ID or API key recommended for integration`);
            }
          });
        }
        break;

      case 6: // Documents
        const requiredDocs = ['PROPERTY_CONTRACT', 'INSURANCE_CERTIFICATE'];
        const documents = await prisma.document.findMany({
          where: { villaId, isActive: true },
          select: { documentType: true },
        });
        
        const docTypes = new Set(documents.map(d => d.documentType));
        requiredDocs.forEach(docType => {
          if (!docTypes.has(docType as any)) {
            errors.push(`Document type ${docType} is required`);
          }
        });
        break;

      case 7: // Staff Configuration
        if (!data.staff || !Array.isArray(data.staff) || data.staff.length === 0) {
          warnings.push('At least one staff member recommended');
        } else {
          data.staff.forEach((staff: any, index: number) => {
            if (!staff.firstName) errors.push(`Staff ${index + 1}: First name is required`);
            if (!staff.lastName) errors.push(`Staff ${index + 1}: Last name is required`);
            if (!staff.position) errors.push(`Staff ${index + 1}: Position is required`);
            if (!staff.phone) errors.push(`Staff ${index + 1}: Phone number is required`);
          });
        }
        break;

      case 8: // Facilities
        // Check for minimum required facilities
        const requiredCategories = ['KITCHEN_EQUIPMENT', 'BATHROOM_AMENITIES', 'SAFETY_SECURITY'];
        if (data.facilities && Array.isArray(data.facilities)) {
          const categories = new Set(data.facilities.map((f: any) => f.category));
          requiredCategories.forEach(cat => {
            if (!categories.has(cat)) {
              warnings.push(`Facilities in category ${cat} are recommended`);
            }
          });
        }
        break;

      case 9: // Photos
        const photos = await prisma.photo.count({ where: { villaId } });
        if (photos < 10) warnings.push('At least 10 photos recommended for better listing');
        
        const mainPhoto = await prisma.photo.findFirst({ where: { villaId, isMain: true } });
        if (!mainPhoto) errors.push('Main photo is required');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a specific step
   */
  async validateStep(villaId: string, step: number): Promise<OnboardingValidation> {
    const villa = await prisma.villa.findUnique({
      where: { id: villaId },
      include: {
        owner: true,
        contractualDetails: true,
        bankDetails: true,
        otaCredentials: true,
        staff: { where: { isActive: true } },
        facilities: true,
        photos: true,
        documents: { where: { isActive: true } },
      },
    });

    if (!villa) {
      return {
        isValid: false,
        errors: ['Villa not found'],
        warnings: [],
      };
    }

    // Map villa data to step data format and validate
    let stepData: any = {};
    
    switch (step) {
      case 1:
        stepData = villa;
        break;
      case 2:
        stepData = villa.owner || {};
        break;
      case 3:
        stepData = villa.contractualDetails || {};
        break;
      case 4:
        stepData = villa.bankDetails || {};
        break;
      case 5:
        stepData = { platforms: villa.otaCredentials };
        break;
      case 6:
        stepData = { documents: villa.documents };
        break;
      case 7:
        stepData = { staff: villa.staff };
        break;
      case 8:
        stepData = { facilities: villa.facilities };
        break;
      case 9:
        stepData = { photos: villa.photos };
        break;
    }

    return this.validateStepData(villaId, step, stepData);
  }

  /**
   * Submit onboarding for review
   */
async submitForReview(_villaId: string) {
    throw new Error('Admin approval system has been removed');
  }

  /**
   * Approve onboarding
   */
async approveOnboarding(_villaId: string, _approvedBy: string, _notes?: string) {
    throw new Error('Admin approval system has been removed');
  }

  /**
   * Reject onboarding
   */
async rejectOnboarding(_villaId: string, _rejectedBy: string, _reason: string) {
    throw new Error('Admin approval system has been removed');
  }

  /**
   * Complete onboarding (mark as fully complete and activate villa)
   */
  async completeOnboarding(villaId: string) {
    try {
      // Ensure OnboardingProgress exists before updating
      const existingProgress = await prisma.onboardingProgress.findUnique({
        where: { villaId }
      });

      if (!existingProgress) {
        throw new Error(`OnboardingProgress not found for villa ${villaId}. Cannot complete non-existent onboarding.`);
      }

      // Update onboarding status to COMPLETED
      const progress = await prisma.onboardingProgress.update({
        where: { villaId },
        data: {
          status: OnboardingStatus.COMPLETED,
        },
        include: {
          villa: {
            include: {
              owner: true,
            },
          },
        },
      });

      // Update villa status to ACTIVE
      await prisma.villa.update({
        where: { id: villaId },
        data: {
          status: VillaStatus.ACTIVE,
        },
      });

      // Get villa data for notifications
      const villaWithOwner = await prisma.villa.findUnique({
        where: { id: villaId },
        include: { owner: true },
      });

// Notifications removed for production launch

      logger.info(`Villa ${villaId} onboarding completed successfully`);
      return progress;
    } catch (error) {
      logger.error('Error completing onboarding:', error);
      throw error;
    }
  }

  /**
   * Count completed steps with detailed logging
   */
  private countCompletedSteps(progress: any): number {
    const stepFlags = {
      villaInfoCompleted: progress.villaInfoCompleted || false,
      ownerDetailsCompleted: progress.ownerDetailsCompleted || false,
      contractualDetailsCompleted: progress.contractualDetailsCompleted || false,
      bankDetailsCompleted: progress.bankDetailsCompleted || false,
      otaCredentialsCompleted: progress.otaCredentialsCompleted || false,
      staffConfigCompleted: progress.staffConfigCompleted || false,
      facilitiesCompleted: progress.facilitiesCompleted || false,
      photosUploaded: progress.photosUploaded || false,
      documentsUploaded: progress.documentsUploaded || false,
      reviewCompleted: progress.reviewCompleted || false,
    };
    
    const completedFlags = Object.entries(stepFlags).filter(([_, completed]) => completed);
    const count = completedFlags.length;
    
    logger.debug(`Completed steps count for villa ${progress.villaId || 'unknown'}:`, {
      count,
      totalSteps: this.TOTAL_STEPS,
      completedFlags: completedFlags.map(([flag, _]) => flag),
      allFlags: stepFlags
    });
    
    return count;
  }

  /**
   * Enhanced progress calculation based on actual data completion
   * This method checks if step data actually exists and is meaningful
   */
  private async calculateDataBasedCompletion(progress: any): Promise<{
    completedSteps: number;
    stepCompletionDetails: Record<number, { isComplete: boolean; reason: string; requiredFields: string[]; completedFields: string[] }>;
    overallProgress: number;
  }> {
    const villa = progress.villa;
    const stepCompletionDetails: Record<number, { isComplete: boolean; reason: string; requiredFields: string[]; completedFields: string[] }> = {};
    
    // Step 1: Villa Info
    // Require city and country combination
    const hasLocation = Boolean(villa?.city && villa?.country);
    const step1Required = ['villaName', 'address', 'bedrooms', 'bathrooms', 'maxGuests', 'propertyType', 'city', 'country'];

    // Compute completed fields
    const step1Completed = step1Required.filter(field => {
      if (field === 'city' || field === 'country') return Boolean(villa?.[field]);
      if (field === 'location') return hasLocation;
      const value = (villa as any)?.[field];
      if (value === null || value === undefined) return false;
      if (typeof value === 'number') return !isNaN(value) && value > 0; // require > 0 for numeric fields
      if (typeof value === 'string') return value.trim() !== '';
      return Boolean(value);
    });

    stepCompletionDetails[1] = {
      isComplete: step1Completed.length === step1Required.length,
      reason: `${step1Completed.length}/${step1Required.length} required fields completed`,
      requiredFields: step1Required,
      completedFields: step1Completed
    };

    // Step 2: Owner Details
    const step2Required = ['firstName', 'lastName', 'email'];
    const step2Completed = step2Required.filter(field => villa?.owner?.[field] && villa.owner[field] !== '');
    stepCompletionDetails[2] = {
      isComplete: step2Completed.length === step2Required.length && !!villa?.owner,
      reason: villa?.owner ? `${step2Completed.length}/${step2Required.length} required fields completed` : 'No owner details',
      requiredFields: step2Required,
      completedFields: step2Completed
    };

    // Step 3: Contractual Details - Only contract type required, dates can be optional
    const step3Required = ['contractType'];
    const step3Completed = step3Required.filter(field => villa?.contractualDetails?.[field]);
    stepCompletionDetails[3] = {
      isComplete: step3Completed.length === step3Required.length && !!villa?.contractualDetails,
      reason: villa?.contractualDetails ? `Contract type specified: ${villa.contractualDetails.contractType}` : 'No contractual details',
      requiredFields: step3Required,
      completedFields: step3Completed
    };

    // Step 4: Bank Details - Only bank name and account number required, routing can be optional  
    const step4Required = ['bankName', 'accountNumber'];
    const step4Completed = step4Required.filter(field => villa?.bankDetails?.[field] && villa.bankDetails[field] !== '');
    stepCompletionDetails[4] = {
      isComplete: step4Completed.length === step4Required.length && !!villa?.bankDetails,
      reason: villa?.bankDetails ? `${step4Completed.length}/${step4Required.length} required fields completed` : 'No bank details',
      requiredFields: step4Required,
      completedFields: step4Completed
    };

    // Step 5: OTA Credentials
    const otaCredentialsCount = villa?.otaCredentials?.length || 0;
    stepCompletionDetails[5] = {
      isComplete: otaCredentialsCount >= 1, // At least one OTA platform configured
      reason: `${otaCredentialsCount} OTA platform(s) configured`,
      requiredFields: ['At least 1 OTA platform'],
      completedFields: otaCredentialsCount > 0 ? [`${otaCredentialsCount} platforms`] : []
    };

    // Step 6: Documents - More lenient: at least 1 document or allow skip for now
    const documentsCount = villa?.documents?.filter((doc: any) => doc.isActive)?.length || 0;
    stepCompletionDetails[6] = {
      isComplete: documentsCount >= 1, // At least 1 document required (more realistic)
      reason: `${documentsCount} document(s) uploaded`,
      requiredFields: ['At least 1 document'],
      completedFields: documentsCount >= 1 ? [`${documentsCount} documents`] : []
    };

    // Step 7: Staff Configuration
    const staffCount = villa?.staff?.filter((staff: any) => staff.isActive)?.length || 0;
    stepCompletionDetails[7] = {
      isComplete: staffCount >= 1, // At least one staff member
      reason: `${staffCount} staff member(s) configured`,
      requiredFields: ['At least 1 staff member'],
      completedFields: staffCount > 0 ? [`${staffCount} staff members`] : []
    };

    // Step 8: Facilities - More realistic: at least 1 facility configured  
    const facilitiesCount = villa?.facilities?.filter((facility: any) => facility.isAvailable)?.length || 0;
    stepCompletionDetails[8] = {
      isComplete: facilitiesCount >= 1, // At least 1 facility configured (more realistic)
      reason: `${facilitiesCount} facilit(y/ies) configured`,
      requiredFields: ['At least 1 facility'],
      completedFields: facilitiesCount >= 1 ? [`${facilitiesCount} facilities`] : []
    };

    // Step 9: Photos - More realistic: at least 1 photo uploaded
    const photosCount = villa?.photos?.length || 0;
    stepCompletionDetails[9] = {
      isComplete: photosCount >= 1, // At least 1 photo uploaded (more realistic)
      reason: `${photosCount} photo(s) uploaded`,
      requiredFields: ['At least 1 photo'],
      completedFields: photosCount >= 1 ? [`${photosCount} photos`] : []
    };

    // Step 10: Review
    stepCompletionDetails[10] = {
      isComplete: progress.reviewCompleted === true,
      reason: progress.reviewCompleted ? 'Review completed by owner' : 'Pending owner review',
      requiredFields: ['Owner review completion'],
      completedFields: progress.reviewCompleted ? ['Review completed'] : []
    };

    // Count completed steps
    const completedSteps = Object.values(stepCompletionDetails).filter(detail => detail.isComplete).length;
    const overallProgress = Math.round((completedSteps / this.TOTAL_STEPS) * 100);

    logger.info(`Data-based completion analysis for villa ${progress.villaId}:`, {
      completedSteps,
      totalSteps: this.TOTAL_STEPS,
      overallProgress,
      stepBreakdown: Object.entries(stepCompletionDetails).map(([step, details]) => ({
        step: parseInt(step),
        complete: details.isComplete,
        reason: details.reason
      }))
    });

    return {
      completedSteps,
      stepCompletionDetails,
      overallProgress
    };
  }

  /**
   * Sync legacy progress flags with data-based completion
   * This bridges the gap between enhanced tracking and legacy boolean flags
   */
  private async syncLegacyProgressFlags(villaId: string, stepCompletionDetails: Record<number, { isComplete: boolean; reason: string; requiredFields: string[]; completedFields: string[] }>) {
    try {
      const updateData: any = {};
      
      // Map data-based completion to legacy boolean flags
      if (stepCompletionDetails[1]?.isComplete) updateData.villaInfoCompleted = true;
      if (stepCompletionDetails[2]?.isComplete) updateData.ownerDetailsCompleted = true;
      if (stepCompletionDetails[3]?.isComplete) updateData.contractualDetailsCompleted = true;
      if (stepCompletionDetails[4]?.isComplete) updateData.bankDetailsCompleted = true;
      if (stepCompletionDetails[5]?.isComplete) updateData.otaCredentialsCompleted = true;
      if (stepCompletionDetails[6]?.isComplete) updateData.documentsUploaded = true;
      if (stepCompletionDetails[7]?.isComplete) updateData.staffConfigCompleted = true;
      if (stepCompletionDetails[8]?.isComplete) updateData.facilitiesCompleted = true;
      if (stepCompletionDetails[9]?.isComplete) updateData.photosUploaded = true;
      if (stepCompletionDetails[10]?.isComplete) updateData.reviewCompleted = true;

      // Only update if there are changes to make
      if (Object.keys(updateData).length > 0) {
        await prisma.onboardingProgress.update({
          where: { villaId },
          data: updateData
        });
        
        logger.info(`Synced legacy progress flags for villa ${villaId}:`, {
          updatedFlags: Object.keys(updateData),
          flagValues: updateData
        });
      }
      
      return updateData;
    } catch (error) {
      logger.error(`Error syncing legacy progress flags for villa ${villaId}:`, error);
      // Don't throw - this is a sync operation that shouldn't break the main flow
      return {};
    }
  }

  /**
   * Auto-save field progress (for real-time saving)
   */
  async saveFieldProgress(
    villaId: string, 
    stepNumber: number, 
    fieldName: string, 
    value: any, 
    userId: string
  ) {
    try {
      // Find step progress
      const stepProgress = await prisma.onboardingStepProgress.findUnique({
        where: {
          villaId_stepNumber: {
            villaId,
            stepNumber
          }
        }
      });

      if (!stepProgress) {
        // Initialize progress if not exists
        await this.initializeEnhancedProgress(villaId, userId);
        return;
      }

      // Update field progress with upsert to handle missing records
      const hasValue = value !== undefined && value !== null && value !== '';
      
      logger.debug(`Saving field progress for villa ${villaId}, step ${stepNumber}, field ${fieldName}:`, {
        value: hasValue ? 'has value' : 'empty',
        valueType: typeof value
      });
      
      // Use upsert to create field record if it doesn't exist
      await prisma.stepFieldProgress.upsert({
        where: {
          stepProgressId_fieldName: {
            stepProgressId: stepProgress.id,
            fieldName
          }
        },
        create: {
          stepProgressId: stepProgress.id,
          fieldName,
          fieldType: 'TEXT', // Default field type
          value,
          status: hasValue ? 'COMPLETED' : 'IN_PROGRESS',
          isValid: hasValue,
          startedAt: new Date(),
          lastModifiedAt: new Date(),
          completedAt: hasValue ? new Date() : undefined
        },
        update: {
          value,
          status: hasValue ? 'COMPLETED' : 'IN_PROGRESS',
          isValid: hasValue,
          lastModifiedAt: new Date(),
          completedAt: hasValue ? new Date() : undefined
        }
      });
      
      logger.debug(`Field progress updated successfully for villa ${villaId}, step ${stepNumber}, field ${fieldName}`);

      // Update session activity
      await prisma.onboardingSession.update({
        where: { villaId },
        data: {
          lastActivityAt: new Date()
        }
      });

      // Update session counters
      await this.updateSessionCounters(villaId);

      logger.debug(`Field ${fieldName} auto-saved for villa ${villaId}, step ${stepNumber}`);
    } catch (error) {
      logger.error(`Error saving field progress for villa ${villaId}, step ${stepNumber}, field ${fieldName}:`, error);
      // Don't throw - this is auto-save, should fail silently
    }
  }

  /**
   * Get field progress for auto-save restoration
   */
  async getFieldProgress(villaId: string, stepNumber: number) {
    try {
      const stepProgress = await prisma.onboardingStepProgress.findUnique({
        where: {
          villaId_stepNumber: {
            villaId,
            stepNumber
          }
        },
        include: {
          fields: true
        }
      });

      if (!stepProgress) {
        return {};
      }

      // Convert field progress to key-value pairs for frontend consumption
      const fieldData: Record<string, any> = {};
      for (const field of stepProgress.fields) {
        if (field.value !== null) {
          fieldData[field.fieldName] = field.value;
        }
      }

      return fieldData;
    } catch (error) {
      logger.error('Error getting field progress:', error);
      return {};
    }
  }

  private getCompletedStepsArray(progress: any): number[] {
    const completedSteps: number[] = [];
    const stepToFieldMapping = [
      { step: 1, field: 'villaInfoCompleted' },
      { step: 2, field: 'ownerDetailsCompleted' },
      { step: 3, field: 'contractualDetailsCompleted' },
      { step: 4, field: 'bankDetailsCompleted' },
      { step: 5, field: 'otaCredentialsCompleted' },
      { step: 6, field: 'documentsUploaded' },
      { step: 7, field: 'staffConfigCompleted' },
      { step: 8, field: 'facilitiesCompleted' },
      { step: 9, field: 'photosUploaded' },
      { step: 10, field: 'reviewCompleted' }
    ];
    
    stepToFieldMapping.forEach(({ step, field }) => {
      if (progress[field]) {
        completedSteps.push(step);
      }
    });
    
    logger.debug(`Completed steps array for villa ${progress.villaId || 'unknown'}:`, {
      completedSteps,
      stepFlags: stepToFieldMapping.map(({ step, field }) => ({ step, field, value: progress[field] || false }))
    });
    
    return completedSteps;
  }

  /**
   * Get detailed step information
   */
  private getStepDetails(progress: any) {
    return [
      {
        step: 1,
        name: 'Villa Information',
        completed: progress.villaInfoCompleted,
        required: true,
      },
      {
        step: 2,
        name: 'Owner Details',
        completed: progress.ownerDetailsCompleted,
        required: true,
      },
      {
        step: 3,
        name: 'Contractual Details',
        completed: progress.contractualDetailsCompleted,
        required: true,
      },
      {
        step: 4,
        name: 'Bank Details',
        completed: progress.bankDetailsCompleted,
        required: true,
      },
      {
        step: 5,
        name: 'OTA Credentials',
        completed: progress.otaCredentialsCompleted,
        required: false,
      },
      {
        step: 6,
        name: 'Documents Upload',
        completed: progress.documentsUploaded,
        required: true,
      },
      {
        step: 7,
        name: 'Staff Configuration',
        completed: progress.staffConfigCompleted,
        required: false,
      },
      {
        step: 8,
        name: 'Facilities Checklist',
        completed: progress.facilitiesCompleted,
        required: true,
      },
      {
        step: 9,
        name: 'Photo Upload',
        completed: progress.photosUploaded,
        required: true,
      },
      {
        step: 10,
        name: 'Review & Submit',
        completed: progress.reviewCompleted,
        required: true,
      },
    ];
  }

  /**
   * Get pending approvals for admin dashboard
   */
  async getPendingApprovals(filters?: any, pagination?: any) {
    try {
      const where: any = {
        status: {
          in: [OnboardingStatus.PENDING_REVIEW, OnboardingStatus.IN_PROGRESS],
        },
      };

      // Add filters
      if (filters?.status && filters.status !== 'all') {
        where.status = filters.status;
      }

      if (filters?.location) {
        where.villa = {
          ...where.villa,
          OR: [
            { city: { contains: filters.location, mode: 'insensitive' } },
            { country: { contains: filters.location, mode: 'insensitive' } },
          ],
        };
      }

      if (filters?.search) {
        where.villa = {
          ...where.villa,
          OR: [
            { villaName: { contains: filters.search, mode: 'insensitive' } },
            { villaCode: { contains: filters.search, mode: 'insensitive' } },
            { owner: { firstName: { contains: filters.search, mode: 'insensitive' } } },
            { owner: { lastName: { contains: filters.search, mode: 'insensitive' } } },
          ],
        };
      }

      // Calculate pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 5;
      const skip = (page - 1) * limit;

      // Get the data
      const [approvals, total] = await Promise.all([
        prisma.onboardingProgress.findMany({
          where,
          include: {
            villa: {
              include: {
                owner: true,
                photos: { 
                  where: { isMain: true },
                  take: 1 
                },
                documents: { 
                  where: { isActive: true } 
                },
                staff: { 
                  where: { isActive: true } 
                },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.onboardingProgress.count({ where }),
      ]);

      // Transform data to match frontend interface with enhanced data accuracy
      const transformedApprovals = approvals.map((approval: any) => {
        const completedSteps = this.countCompletedSteps(approval);
        const progressPercentage = Math.round((completedSteps / this.TOTAL_STEPS) * 100);
        
        // Ensure we have villa data
        if (!approval.villa) {
          logger.warn(`Missing villa data for approval ${approval.id}`);
          return null;
        }
        
        // Calculate time since submission with proper null checking
        const submissionDate = approval.submittedAt ? new Date(approval.submittedAt) : new Date(approval.updatedAt);
        const daysSinceSubmission = Math.floor((Date.now() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: approval.villaId, // Use villaId as the approval ID
          villaId: approval.villaId, // Explicit villa ID
          villaName: approval.villa.villaName || 'Unnamed Villa',
          villaCode: approval.villa.villaCode || 'NO-CODE',
          ownerName: approval.villa.owner
            ? `${approval.villa.owner.firstName || ''} ${approval.villa.owner.lastName || ''}`.trim() || 'Unknown'
            : 'No Owner',
          ownerEmail: approval.villa.owner?.email || 'No email provided',
          currentStep: approval.currentStep || 1,
          totalSteps: approval.totalSteps || this.TOTAL_STEPS,
          stepsCompleted: completedSteps,
          progress: progressPercentage,
          progressStatus: this.getProgressStatus(progressPercentage),
          status: approval.status,
          submittedAt: approval.submittedAt || approval.updatedAt,
          lastUpdatedAt: approval.updatedAt,
          documentsCount: approval.villa.documents?.length || 0,
          photosCount: approval.villa.photos?.length || 0,
          staffCount: approval.villa.staff?.length || 0,
          location: `${approval.villa.city || 'Unknown'}, ${approval.villa.country || 'Unknown'}`,
          city: approval.villa.city || 'Unknown',
          country: approval.villa.country || 'Unknown',
          bedrooms: approval.villa.bedrooms || 0,
          bathrooms: approval.villa.bathrooms || 0,
          maxGuests: approval.villa.maxGuests || 0,
          
          // Data completeness indicators
          hasOwnerDetails: !!approval.villa.owner,
          hasDocuments: (approval.villa.documents?.length || 0) > 0,
          hasPhotos: (approval.villa.photos?.length || 0) > 0,
          hasStaff: (approval.villa.staff?.length || 0) > 0,
          
          // Validation status
          isReadyForReview: progressPercentage >= 90 && approval.status === 'PENDING_REVIEW',
          requiresAttention: progressPercentage < 70 && approval.status === 'PENDING_REVIEW',
          
          // Time tracking
          daysSinceSubmission,
        };
      }).filter(Boolean); // Remove any null entries

      return {
        approvals: transformedApprovals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting pending approvals:', error);
      throw error;
    }
  }

  /**
   * Get approval statistics for admin dashboard
   */
  async getApprovalStats() {
    try {
      const [
        pendingReview,
        inProgress,
        approved,
        rejected,
        totalApplications,
        averageProgress
      ] = await Promise.all([
        prisma.onboardingProgress.count({
          where: { status: OnboardingStatus.PENDING_REVIEW },
        }),
        prisma.onboardingProgress.count({
          where: { status: OnboardingStatus.IN_PROGRESS },
        }),
        prisma.onboardingProgress.count({
          where: { status: OnboardingStatus.APPROVED },
        }),
        prisma.onboardingProgress.count({
          where: { status: OnboardingStatus.REJECTED },
        }),
        prisma.onboardingProgress.count(),
        prisma.onboardingProgress.findMany({
          select: {
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
        }),
      ]);

      // Calculate average progress
      const avgProgress = averageProgress.reduce((sum, progress) => {
        return sum + this.countCompletedSteps(progress);
      }, 0) / (averageProgress.length || 1);

      return {
        pendingReview,
        inProgress,
        approved,
        rejected,
        totalApplications,
        averageProgress: Math.round((avgProgress / this.TOTAL_STEPS) * 100),
      };
    } catch (error) {
      logger.error('Error getting approval stats:', error);
      throw error;
    }
  }
}

export default new OnboardingService();