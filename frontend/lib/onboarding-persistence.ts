// Data persistence handler for onboarding stages
import { logger, LogCategory } from "./logger";
import { clientApi } from "./api-client";

interface PersistenceConfig {
  villaId: string;
  userId: string;
  autoSave: boolean;
  debounceMs: number;
}

interface DocumentsData {
  propertyTitle?: unknown;
  businessLicense?: unknown;
  taxCertificate?: unknown;
  insurancePolicy?: unknown;
  bankStatement?: unknown;
  [key: string]: unknown;
}

interface StaffMember {
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

interface Facility {
  name?: string;
  category?: string;
  available?: boolean;
  [key: string]: unknown;
}

interface PhotosData {
  [category: string]: unknown[];
}

interface StageData {
  documents?: DocumentsData;
  staff?: StaffMember[];
  facilities?: Facility[];
  photos?: PhotosData;
  [key: string]: unknown;
}

export class OnboardingPersistence {
  private readonly config: PersistenceConfig;
  private readonly saveTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly pendingData: Map<string, unknown> = new Map();
  private readonly lastSavedData: Map<string, string> = new Map();
  private loadedData: StageData = {};

  constructor(config: PersistenceConfig) {
    this.config = config;
    logger.info(LogCategory.ONBOARDING, "Persistence handler initialized", {
      villaId: config.villaId,
    });
  }

  // Load all onboarding data on initialization or refresh
  async loadAllData(): Promise<StageData> {
    logger.startGroup("load-data", "Loading onboarding data");

    try {
      const response = await clientApi.getOnboardingProgress(
        this.config.villaId
      );

      if (response.success && response.data) {
        this.loadedData = response.data as StageData;

        // Store hashes of loaded data for change detection
        Object.keys(response.data as StageData).forEach((key) => {
          this.lastSavedData.set(
            key,
            JSON.stringify((response.data as StageData)[key])
          );
        });

        logger.info(LogCategory.DATABASE, "Data loaded successfully", {
          stages: Object.keys(response.data as StageData),
          villaId: this.config.villaId,
        });

        // Log specific stage data summaries
        const stageData = response.data as StageData;
        if (stageData.documents) {
          logger.info(LogCategory.ONBOARDING, "Documents loaded", {
            count: Array.isArray(stageData.documents)
              ? stageData.documents.length
              : Object.keys(stageData.documents).length,
          });
        }

        if (stageData.staff) {
          logger.info(LogCategory.ONBOARDING, "Staff members loaded", {
            count: stageData.staff.length || 0,
          });
        }

        if (stageData.facilities) {
          logger.info(LogCategory.ONBOARDING, "Facilities loaded", {
            count: stageData.facilities.length || 0,
          });
        }

        if (stageData.photos) {
          const photoCount = Object.values(stageData.photos).reduce(
            (acc: number, category: unknown) =>
              acc + (Array.isArray(category) ? category.length : 0),
            0
          );
          logger.info(LogCategory.ONBOARDING, "Photos loaded", {
            categories: Object.keys(stageData.photos),
            totalCount: photoCount,
          });
        }
      } else {
        logger.warn(LogCategory.DATABASE, "No existing data found", {
          villaId: this.config.villaId,
        });
      }

      logger.endGroup("load-data");
      return this.loadedData;
    } catch (error: unknown) {
      logger.error(LogCategory.DATABASE, "Failed to load onboarding data", {
        error: error instanceof Error ? error.message : String(error),
        villaId: this.config.villaId,
      });
      logger.endGroup("load-data");
      throw error;
    }
  }

  // Save documents data with proper logging
  async saveDocuments(documents: DocumentsData): Promise<void> {
    const stage = "documents";
    const currentData = JSON.stringify(documents);

    // Check if data has changed
    if (this.lastSavedData.get(stage) === currentData) {
      logger.debug(
        LogCategory.ONBOARDING,
        "Documents unchanged, skipping save"
      );
      return;
    }

    if (this.config.autoSave) {
      this.scheduleSave(stage, documents);
    } else {
      await this.executeSave(stage, documents);
    }
  }

  // Save staff data with proper logging
  async saveStaff(staffMembers: StaffMember[]): Promise<void> {
    const stage = "staff";
    const currentData = JSON.stringify(staffMembers);

    // Check if data has changed
    if (this.lastSavedData.get(stage) === currentData) {
      logger.debug(
        LogCategory.ONBOARDING,
        "Staff data unchanged, skipping save"
      );
      return;
    }

    logger.info(LogCategory.ONBOARDING, "Saving staff members", {
      count: staffMembers.length,
      villaId: this.config.villaId,
    });

    if (this.config.autoSave) {
      this.scheduleSave(stage, staffMembers);
    } else {
      await this.executeSave(stage, staffMembers);
    }
  }

  // Save facilities data with proper logging
  async saveFacilities(facilities: Facility[]): Promise<void> {
    const stage = "facilities";
    const currentData = JSON.stringify(facilities);

    // Check if data has changed
    if (this.lastSavedData.get(stage) === currentData) {
      logger.debug(
        LogCategory.ONBOARDING,
        "Facilities data unchanged, skipping save"
      );
      return;
    }

    // Group facilities by category for logging
    const categoryCounts: Record<string, number> = {};
    facilities.forEach((facility) => {
      const category = facility.category || "uncategorized";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    logger.info(LogCategory.ONBOARDING, "Saving facilities checklist", {
      totalCount: facilities.length,
      byCategory: categoryCounts,
      villaId: this.config.villaId,
    });

    if (this.config.autoSave) {
      this.scheduleSave(stage, facilities);
    } else {
      await this.executeSave(stage, facilities);
    }
  }

  // Save photos data with proper logging
  async savePhotos(photos: PhotosData): Promise<void> {
    const stage = "photos";
    const currentData = JSON.stringify(photos);

    // Check if data has changed
    if (this.lastSavedData.get(stage) === currentData) {
      logger.debug(
        LogCategory.ONBOARDING,
        "Photos data unchanged, skipping save"
      );
      return;
    }

    // Count photos by category for logging
    const photoCounts: Record<string, number> = {};
    Object.keys(photos).forEach((category) => {
      const categoryData = photos[category];
      photoCounts[category] = Array.isArray(categoryData)
        ? categoryData.length
        : 0;
    });

    logger.info(LogCategory.ONBOARDING, "Saving photos metadata", {
      categories: Object.keys(photos),
      photoCounts,
      villaId: this.config.villaId,
    });

    if (this.config.autoSave) {
      this.scheduleSave(stage, photos);
    } else {
      await this.executeSave(stage, photos);
    }
  }

  // Schedule a debounced save
  private scheduleSave(stage: string, data: unknown) {
    // Clear existing timer for this stage
    const existingTimer = this.saveTimers.get(stage);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store pending data
    this.pendingData.set(stage, data);

    // Schedule new save
    const timer = setTimeout(() => {
      this.executeSave(stage, data);
      this.saveTimers.delete(stage);
      this.pendingData.delete(stage);
    }, this.config.debounceMs);

    this.saveTimers.set(stage, timer);

    logger.debug(LogCategory.AUTOSAVE, `Save scheduled for ${stage}`, {
      delayMs: this.config.debounceMs,
    });
  }

  // Execute the actual save operation
  private async executeSave(stage: string, data: unknown): Promise<void> {
    const timer = logger.startTimer(`Save ${stage}`);

    try {
      logger.databaseOperation("UPDATE", stage, {
        villaId: this.config.villaId,
        dataSize: JSON.stringify(data).length,
      });

      let response;

      switch (stage) {
        case "staff":
          response = await clientApi.saveOnboardingStep(
            this.config.villaId,
            7,
            data as Record<string, unknown>
          ); // Staff is step 7
          break;
        case "facilities":
          response = await clientApi.updateFacilities(
            this.config.villaId,
            data as Record<string, unknown>
          );
          break;
        case "documents":
        case "photos":
        default: {
          // Convert stage name to step number
          const stepNumber = this.getStepNumber(stage);
          response = await clientApi.saveOnboardingStep(
            this.config.villaId,
            stepNumber,
            data as Record<string, unknown>
          );
          break;
        }
      }

      if (response.success) {
        // Update last saved data hash
        this.lastSavedData.set(stage, JSON.stringify(data));

        logger.info(LogCategory.DATABASE, `${stage} saved successfully`, {
          villaId: this.config.villaId,
        });
      } else {
        throw new Error(response.error || `Failed to save ${stage}`);
      }
    } catch (error: unknown) {
      logger.error(LogCategory.DATABASE, `Failed to save ${stage}`, {
        error: error instanceof Error ? error.message : String(error),
        villaId: this.config.villaId,
        stage,
      });
      throw error;
    } finally {
      timer();
    }
  }

  // Force save all pending data
  async saveAllPending(): Promise<void> {
    if (this.pendingData.size === 0) {
      logger.debug(LogCategory.AUTOSAVE, "No pending data to save");
      return;
    }

    logger.info(LogCategory.AUTOSAVE, "Saving all pending data", {
      stages: Array.from(this.pendingData.keys()),
    });

    const savePromises = Array.from(this.pendingData.entries()).map(
      ([stage, data]) => this.executeSave(stage, data)
    );

    try {
      await Promise.all(savePromises);
      logger.info(LogCategory.AUTOSAVE, "All pending data saved successfully");
    } catch (error) {
      logger.error(LogCategory.AUTOSAVE, "Some saves failed", { error });
    }

    // Clear timers and pending data
    this.saveTimers.forEach((timer) => clearTimeout(timer));
    this.saveTimers.clear();
    this.pendingData.clear();
  }

  // Convert stage name to step number
  private getStepNumber(stage: string): number {
    const stageToStep: Record<string, number> = {
      "villa-info": 1,
      "owner-details": 2,
      "contractual-details": 3,
      "bank-details": 4,
      "ota-credentials": 5,
      documents: 6, // Documents is step 6
      staff: 7, // Staff is step 7
      facilities: 8, // Facilities is step 8
      photos: 9, // Photos is step 9
      review: 10, // Review is step 10
    };
    return stageToStep[stage] || 1;
  }

  // Check if data has been modified
  hasChanges(stage: string, data: unknown): boolean {
    const currentData = JSON.stringify(data);
    const savedData = this.lastSavedData.get(stage);
    return currentData !== savedData;
  }

  // Get loaded data for a specific stage
  getLoadedData(stage: string): unknown {
    return this.loadedData[stage];
  }

  // Clean up timers on destroy
  destroy() {
    this.saveTimers.forEach((timer) => clearTimeout(timer));
    this.saveTimers.clear();
    this.pendingData.clear();
    logger.info(LogCategory.ONBOARDING, "Persistence handler destroyed");
  }
}
