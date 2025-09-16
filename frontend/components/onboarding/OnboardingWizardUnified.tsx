"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { ClientApiClient, type ApiResponse } from "@/lib/api-client";
import {
  mapOnboardingDataToBackend,
  mapBackendProgressToStepData,
  type StepDataUnion,
} from "@/lib/data-mapper";
import OnboardingLogger from "@/lib/onboarding-logger";
import ProgressTracker from "./ProgressTracker";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import type {
  StepHandle,
  OnboardingProgress,
  OnboardingWizardProps,
} from "./types";
import ErrorBoundary, {
  WizardErrorBoundary,
  StepErrorBoundary,
} from "./ErrorBoundary";
import { BackupData } from "./OnboardingBackupService";
import RecoveryModal from "./RecoveryModal";
import ValidationProvider, { useValidation } from "./ValidationProvider";
import ValidationSummary from "./ValidationSummary";

// Direct imports to avoid chunk loading issues
import VillaInformationStepEnhanced from "./steps/VillaInformationStepEnhanced";
import OwnerDetailsStep from "./steps/OwnerDetailsStep";
import ContractualDetailsStep from "./steps/ContractualDetailsStep";
import BankDetailsStep from "./steps/BankDetailsStep";
import OTACredentialsStep from "./steps/OTACredentialsStep";
import DocumentsUploadStep from "./steps/DocumentsUploadStep";
import StaffConfiguratorStep from "./steps/StaffConfiguratorStep";
import FacilitiesChecklistStep from "./steps/FacilitiesChecklistStep";
import PhotoUploadStep from "./steps/PhotoUploadStep";
import ReviewSubmitStepEnhanced from "./steps/ReviewSubmitStepEnhanced";

// Enhanced auto-save configuration
const AUTO_SAVE_CONFIG = {
  enabled: true,
  debounceTime: 5000, // 5 seconds
  minTimeBetweenSaves: 2000, // 2 seconds rate limit
  periodicSaveInterval: 35000, // 35 seconds
  maxRetries: 3,
  backoffMultiplier: 2,
  maxBackoffTime: 5000,
  batchingEnabled: true, // NEW: Enable batching of saves
  maxBatchSize: 5, // NEW: Maximum saves per batch
};

// Production-ready status indicator

interface OnboardingWizardContentProps {
  forceNewSession?: boolean;
}

type StepDataMap = Record<string, StepDataUnion | Record<string, unknown>>;

const isFlagTrue = (
  value: unknown,
  key: "conflict" | "validationErrors"
): boolean =>
  typeof value === "object" &&
  value !== null &&
  Object.hasOwn(value, key) &&
  (value as Record<string, unknown>)[key] === true;

const ensureError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

type SaveBatchEntry = [number, Record<string, unknown>];

interface StepSaveResult {
  stepNum: number;
  success: boolean;
  version?: number;
  conflict?: boolean;
  validationErrors?: boolean;
  error?: Error;
}

interface AutoSaveSummary {
  successfulSteps: number[];
  conflictedSteps: number[];
  validationErrorSteps: number[];
  versionUpdates: Record<number, number>;
  hadConflictOnCurrentStep: boolean;
  hadValidationOnCurrentStep: boolean;
}

const shouldSkipAutoSave = ({
  userLoaded,
  authLoaded,
  hasUser,
  villaId,
  autoSaveEnabled,
  isSaving,
  pendingBatchSize,
}: {
  userLoaded: boolean;
  authLoaded: boolean;
  hasUser: boolean;
  villaId: string | null;
  autoSaveEnabled: boolean;
  isSaving: boolean;
  pendingBatchSize: number;
}): boolean =>
  !userLoaded ||
  !authLoaded ||
  !hasUser ||
  !villaId ||
  !autoSaveEnabled ||
  isSaving ||
  pendingBatchSize === 0;

const isRateLimited = (now: number, lastSaveTimestamp: number): boolean =>
  now - lastSaveTimestamp < AUTO_SAVE_CONFIG.minTimeBetweenSaves;

const buildSaveBatch = (
  batchedSaves: Map<number, Record<string, unknown>>
): SaveBatchEntry[] => Array.from(batchedSaves.entries());

const summarizeSaveResults = (
  results: StepSaveResult[],
  currentStep: number
): AutoSaveSummary => {
  const summary: AutoSaveSummary = {
    successfulSteps: [],
    conflictedSteps: [],
    validationErrorSteps: [],
    versionUpdates: {},
    hadConflictOnCurrentStep: false,
    hadValidationOnCurrentStep: false,
  };

  results.forEach((result) => {
    if (result.success) {
      summary.successfulSteps.push(result.stepNum);
      if (typeof result.version === "number") {
        summary.versionUpdates[result.stepNum] = result.version;
      }
      return;
    }

    if (result.validationErrors) {
      summary.validationErrorSteps.push(result.stepNum);
      if (result.stepNum === currentStep) {
        summary.hadValidationOnCurrentStep = true;
      }
      return;
    }

    if (result.conflict) {
      summary.conflictedSteps.push(result.stepNum);
      if (result.stepNum === currentStep) {
        summary.hadConflictOnCurrentStep = true;
      }
    }
  });

  return summary;
};

const removeSuccessfulStepsFromBatch = (
  steps: number[],
  batchedSaves: Map<number, Record<string, unknown>>
) => {
  steps.forEach((step) => {
    batchedSaves.delete(step);
  });
};

const applyVersionUpdates = (
  updates: Record<number, number>,
  stepVersionsRef: React.MutableRefObject<Record<number, number>>,
  setStepVersions: Dispatch<SetStateAction<Record<number, number>>>,
  isMountedRef: React.MutableRefObject<boolean>
) => {
  if (Object.keys(updates).length === 0 || !isMountedRef.current) {
    return;
  }

  const merged = {
    ...stepVersionsRef.current,
    ...updates,
  };
  stepVersionsRef.current = merged;
  setStepVersions(merged);
};

const updateSavedDataAfterSuccess = (
  successfulSteps: number[],
  localStepData: StepDataMap,
  lastSavedData: StepDataMap,
  setLastSavedData: Dispatch<SetStateAction<StepDataMap>>,
  setLastSaveTime: Dispatch<SetStateAction<Date | undefined>>,
  isMountedRef: React.MutableRefObject<boolean>
) => {
  if (successfulSteps.length === 0 || !isMountedRef.current) {
    return;
  }

  const updatedSavedData = { ...lastSavedData };
  successfulSteps.forEach((stepNum) => {
    updatedSavedData[`step${stepNum}`] = localStepData[`step${stepNum}`];
  });

  setLastSavedData(updatedSavedData);
  setLastSaveTime(new Date());
};

const clearErrorsForSteps = (
  steps: number[],
  clearStepErrors: (step: number) => void
) => {
  steps.forEach((step) => clearStepErrors(step));
};

const notifyValidationIssues = (
  validationSteps: number[],
  currentStep: number
) => {
  if (validationSteps.length === 0) {
    return;
  }

  if (validationSteps.includes(currentStep)) {
    toast.error("Please fix the highlighted fields before continuing.");
    return;
  }

  toast.warning("Some steps have validation issues. Review highlighted fields.");
};

const notifyPartialSave = (
  successfulCount: number,
  totalCount: number,
  hadValidation: boolean,
  hadConflict: boolean
) => {
  if (
    successfulCount === 0 ||
    successfulCount === totalCount ||
    hadValidation ||
    hadConflict
  ) {
    return;
  }

  toast.warning(
    `Saved ${successfulCount}/${totalCount} changes. Some changes may be retried.`
  );
};

type BackupServiceLike = {
  saveProgressImmediate: (
    villaId: string | undefined,
    currentStep: number,
    stepData: StepDataMap
  ) => Promise<void>;
} | null;

const attemptBackupSave = async (
  backupService: BackupServiceLike,
  villaId: string | null,
  currentStep: number,
  localStepData: StepDataMap,
  logger: OnboardingLogger
) => {
  if (!backupService) {
    return;
  }

  try {
    await backupService.saveProgressImmediate(
      villaId || undefined,
      currentStep,
      localStepData
    );
  } catch (error) {
    const err = ensureError(error);
    logger.trackError("BACKUP", err, {
      context: "auto_save_backup",
    });
  }
};

const readPersistedVillaId = (
  userId: string | null | undefined
): { villaId: string | null; source: "user-specific" | "generic" | "none" } => {
  if (typeof window === "undefined") {
    return { villaId: null, source: "none" };
  }

  if (userId) {
    const userSpecific = localStorage.getItem(`onboarding_villa_${userId}`);
    if (userSpecific) {
      return { villaId: userSpecific, source: "user-specific" };
    }
  }

  const generic = localStorage.getItem("currentVillaId");
  if (generic) {
    return { villaId: generic, source: "generic" };
  }

  return { villaId: null, source: "none" };
};

const storeVillaId = (villaId: string, userId: string | null | undefined) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("currentVillaId", villaId);
  if (userId) {
    localStorage.setItem(`onboarding_villa_${userId}`, villaId);
  }
};

const clearStoredVillaIds = (userId: string | null | undefined) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("currentVillaId");
  if (userId) {
    localStorage.removeItem(`onboarding_villa_${userId}`);
  }
};

const ensureLocalStorageConsistency = (
  villaId: string,
  userId: string | null | undefined,
  logger: OnboardingLogger
) => {
  if (typeof window === "undefined") {
    return;
  }

  const currentGenericId = localStorage.getItem("currentVillaId");
  if (currentGenericId && currentGenericId !== villaId) {
    logger.log("SESSION", "VILLA_ID_INCONSISTENCY_DETECTED", {
      persistedVillaId: villaId,
      currentGenericId,
      source: "generic_localStorage",
    });
  }

  if (!userId) {
    return;
  }

  const currentUserSpecificId = localStorage.getItem(`onboarding_villa_${userId}`);
  if (currentUserSpecificId && currentUserSpecificId !== villaId) {
    logger.log("SESSION", "VILLA_ID_INCONSISTENCY_DETECTED", {
      persistedVillaId: villaId,
      currentUserSpecificId,
      source: "user_specific_localStorage",
    });
  }
};

const determineCurrentStep = (
  progress: OnboardingProgress,
  totalSteps: number
): number => {
  if (Array.isArray(progress.completedSteps)) {
    const completedSet = new Set<number>(progress.completedSteps);
    for (let step = 1; step <= totalSteps; step++) {
      if (!completedSet.has(step)) {
        return step;
      }
    }
    return totalSteps;
  }

  const stepFlags = [
    progress.villaInfoCompleted,
    progress.ownerDetailsCompleted,
    progress.contractualDetailsCompleted,
    progress.bankDetailsCompleted,
    progress.otaCredentialsCompleted,
    progress.documentsUploaded,
    progress.staffConfigCompleted,
    progress.facilitiesCompleted,
    progress.photosUploaded,
    progress.reviewCompleted,
  ];

  for (let index = 0; index < stepFlags.length; index++) {
    if (!stepFlags[index]) {
      return index + 1;
    }
  }

  return totalSteps;
};

const isTextEntryElement = (element: HTMLElement | null): boolean => {
  if (!element) {
    return false;
  }
  const tagName = element.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
};

const shouldIgnoreKeyboardEvent = (event: KeyboardEvent): boolean =>
  isTextEntryElement(event.target as HTMLElement | null) ||
  event.ctrlKey ||
  event.metaKey ||
  event.altKey;

const resolveNumericStep = (key: string): number | null => {
  if (/^[1-9]$/.test(key)) {
    return Number(key);
  }
  if (key === "0") {
    return 10;
  }
  return null;
};

const saveStepBatchEntry = async ({
  stepNum,
  stepData,
  authenticatedApi,
  villaId,
  currentOperationId,
  logger,
  stepVersionsRef,
  parseBackendErrors,
  applyBackendErrors,
}: {
  stepNum: number;
  stepData: Record<string, unknown>;
  authenticatedApi: ClientApiClient;
  villaId: string;
  currentOperationId: number;
  logger: OnboardingLogger;
  stepVersionsRef: React.MutableRefObject<Record<number, number>>;
  parseBackendErrors: (rawErrors: unknown) => Record<string, string>;
  applyBackendErrors: (step: number, errors: Record<string, string>) => void;
}): Promise<StepSaveResult> => {
  const numericStep = Number(stepNum);
  const currentVersion = stepVersionsRef.current[numericStep] ?? 0;
  const operationMeta = {
    operationId: `${currentOperationId}-${numericStep}-${Date.now()}`,
    clientTimestamp: new Date().toISOString(),
    version: currentVersion,
  };

  try {
    const backendData = mapOnboardingDataToBackend(numericStep, stepData);
    logger.log(numericStep, "AUTOSAVE_REQUEST", operationMeta);
    const response = await authenticatedApi.autoSaveOnboardingStep(
      villaId,
      numericStep,
      backendData,
      currentVersion,
      operationMeta
    );

    if (!response.success) {
      if (response.status === 422) {
        const parsedErrors = parseBackendErrors(response.errors || response.error);
        applyBackendErrors(numericStep, parsedErrors);
        logger.log(numericStep, "AUTOSAVE_VALIDATION_ERROR", {
          ...operationMeta,
          errors: parsedErrors,
        });
        return {
          stepNum: numericStep,
          success: false,
          validationErrors: true,
        };
      }

      const conflict =
        response.status === 409 || /version/i.test(response.error || "");
      const errorMessage = response.error || "Auto-save failed";
      throw Object.assign(new Error(errorMessage), {
        conflict,
        stepNum: numericStep,
        operationId: operationMeta.operationId,
      });
    }

    const nextVersion =
      typeof response.version === "number" ? response.version : currentVersion;
    logger.log(numericStep, "AUTOSAVE_RESPONSE", {
      ...operationMeta,
      version: nextVersion,
      success: true,
    });
    return { stepNum: numericStep, success: true, version: nextVersion };
  } catch (error) {
    const err = ensureError(error);
    const conflict = isFlagTrue(error, "conflict");
    const validationErrors = isFlagTrue(error, "validationErrors");
    logger.trackError(numericStep, err, {
      context: "batch_save",
    });
    logger.log(numericStep, "AUTOSAVE_ERROR", {
      ...operationMeta,
      conflict,
      validationErrors,
      message: err.message,
    });
    return {
      stepNum: numericStep,
      success: false,
      error: err,
      conflict,
      validationErrors,
    };
  }
};

const executeAutoSaveBatch = async ({
  saveBatch,
  authenticatedApi,
  villaId,
  currentStep,
  currentOperationId,
  logger,
  stepVersionsRef,
  parseBackendErrors,
  applyBackendErrors,
}: {
  saveBatch: SaveBatchEntry[];
  authenticatedApi: ClientApiClient;
  villaId: string;
  currentStep: number;
  currentOperationId: number;
  logger: OnboardingLogger;
  stepVersionsRef: React.MutableRefObject<Record<number, number>>;
  parseBackendErrors: (rawErrors: unknown) => Record<string, string>;
  applyBackendErrors: (step: number, errors: Record<string, string>) => void;
}): Promise<{ summary: AutoSaveSummary; results: StepSaveResult[] }> => {
  const results = await Promise.all(
    saveBatch.map(([stepNum, stepData]) =>
      saveStepBatchEntry({
        stepNum,
        stepData,
        authenticatedApi,
        villaId,
        currentOperationId,
        logger,
        stepVersionsRef,
        parseBackendErrors,
        applyBackendErrors,
      })
    )
  );

  return {
    summary: summarizeSaveResults(results, currentStep),
    results,
  };
};

const refreshConflictedSteps = async ({
  conflictedSteps,
  villaId,
  getToken,
  logger,
  isMountedRef,
  setOnboardingProgress,
  setLocalStepData,
  setLastSavedData,
  clearStepErrors,
  stepVersionsRef,
  setStepVersions,
}: {
  conflictedSteps: number[];
  villaId: string | null;
  getToken: () => Promise<string | null>;
  logger: OnboardingLogger;
  isMountedRef: React.MutableRefObject<boolean>;
  setOnboardingProgress: Dispatch<SetStateAction<OnboardingProgress | null>>;
  setLocalStepData: Dispatch<SetStateAction<StepDataMap>>;
  setLastSavedData: Dispatch<SetStateAction<StepDataMap>>;
  clearStepErrors: (step: number) => void;
  stepVersionsRef: React.MutableRefObject<Record<number, number>>;
  setStepVersions: Dispatch<SetStateAction<Record<number, number>>>;
}) => {
  if (conflictedSteps.length === 0) {
    return;
  }

  toast.warning(
    "Some changes could not be saved because newer data exists. Refreshing step data..."
  );
  logger.log("AUTOSAVE", "VERSION_CONFLICT", { steps: conflictedSteps });

  if (!villaId) {
    return;
  }

  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Authentication token unavailable");
    }

    const api = new ClientApiClient(token);
    const progressResponse = await api.getOnboardingProgress(villaId);
    if (progressResponse.success && progressResponse.data && isMountedRef.current) {
      setOnboardingProgress(progressResponse.data);
      const mappedStepData = mapBackendProgressToStepData(progressResponse.data);
      const incomingVersions = progressResponse.data.stepVersions || {};
      stepVersionsRef.current = incomingVersions;
      setStepVersions(incomingVersions);
      setLocalStepData(mappedStepData);
      setLastSavedData(mappedStepData);
      conflictedSteps.forEach((step) => clearStepErrors(step));
      toast.info("Latest data loaded. Please review your changes.");
    }
  } catch (error) {
    const err = ensureError(error);
    logger.trackError("AUTOSAVE", err, {
      context: "version_conflict_rehydrate",
    });
    toast.error("Could not refresh data after conflict. Please reload the page.");
  }
};

const loadProgressForVilla = async ({
  authenticatedApi,
  villaId,
  isMountedRef,
  setOnboardingProgress,
  setLocalStepData,
  setLastSavedData,
  clearAllStepErrors,
  stepVersionsRef,
  setStepVersions,
  loadFieldProgress,
  enhanceWithFieldProgress = true,
}: {
  authenticatedApi: ClientApiClient;
  villaId: string;
  isMountedRef: React.MutableRefObject<boolean>;
  setOnboardingProgress: Dispatch<SetStateAction<OnboardingProgress | null>>;
  setLocalStepData: Dispatch<SetStateAction<StepDataMap>>;
  setLastSavedData: Dispatch<SetStateAction<StepDataMap>>;
  clearAllStepErrors: () => void;
  stepVersionsRef: React.MutableRefObject<Record<number, number>>;
  setStepVersions: Dispatch<SetStateAction<Record<number, number>>>;
  loadFieldProgress: (
    villaId: string,
    api: ClientApiClient,
    existingData?: StepDataMap
  ) => Promise<StepDataMap>;
  enhanceWithFieldProgress?: boolean;
}): Promise<OnboardingProgress | null> => {
  const progressResponse = await authenticatedApi.getOnboardingProgress(villaId);
  if (!progressResponse.success || !progressResponse.data) {
    return null;
  }

  const progress = progressResponse.data;
  if (!isMountedRef.current) {
    return progress;
  }

  setOnboardingProgress(progress);

  const mappedStepData = mapBackendProgressToStepData(progress);
  const stepData = enhanceWithFieldProgress
    ? await loadFieldProgress(villaId, authenticatedApi, mappedStepData)
    : mappedStepData;

  if (!isMountedRef.current) {
    return progress;
  }

  setLocalStepData(stepData);
  setLastSavedData(stepData);
  clearAllStepErrors();
  const incomingVersions = progress.stepVersions || {};
  stepVersionsRef.current = incomingVersions;
  setStepVersions(incomingVersions);
  return progress;
};

const startNewOnboardingSession = async ({
  authenticatedApi,
  userId,
  isMountedRef,
  setVillaId,
  setCurrentStep,
  setOnboardingProgress,
  setLocalStepData,
  setLastSavedData,
  clearAllStepErrors,
  stepVersionsRef,
  setStepVersions,
  loadFieldProgress,
}: {
  authenticatedApi: ClientApiClient;
  userId: string | null;
  isMountedRef: React.MutableRefObject<boolean>;
  setVillaId: Dispatch<SetStateAction<string | null>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setOnboardingProgress: Dispatch<SetStateAction<OnboardingProgress | null>>;
  setLocalStepData: Dispatch<SetStateAction<StepDataMap>>;
  setLastSavedData: Dispatch<SetStateAction<StepDataMap>>;
  clearAllStepErrors: () => void;
  stepVersionsRef: React.MutableRefObject<Record<number, number>>;
  setStepVersions: Dispatch<SetStateAction<Record<number, number>>>;
  loadFieldProgress: (
    villaId: string,
    api: ClientApiClient,
    existingData?: StepDataMap
  ) => Promise<StepDataMap>;
}) => {
  const startResponse = await authenticatedApi.startOnboarding("My Villa");
  if (!startResponse.success || !startResponse.data?.villaId) {
    throw new Error("Failed to start new onboarding session");
  }

  const newVillaId = startResponse.data.villaId;
  if (isMountedRef.current) {
    setVillaId(newVillaId);
    setCurrentStep(1);
  }

  storeVillaId(newVillaId, userId);
  const progress = await loadProgressForVilla({
    authenticatedApi,
    villaId: newVillaId,
    isMountedRef,
    setOnboardingProgress,
    setLocalStepData,
    setLastSavedData,
    clearAllStepErrors,
    stepVersionsRef,
    setStepVersions,
    loadFieldProgress,
    enhanceWithFieldProgress: false,
  });

  if (!progress && isMountedRef.current) {
    setLocalStepData({});
    setLastSavedData({});
  }
};

const loadExistingSession = async ({
  persistedVillaId,
  source,
  authenticatedApi,
  userId,
  logger,
  totalSteps,
  isMountedRef,
  setVillaId,
  setCurrentStep,
  setOnboardingProgress,
  setLocalStepData,
  setLastSavedData,
  clearAllStepErrors,
  stepVersionsRef,
  setStepVersions,
  loadFieldProgress,
}: {
  persistedVillaId: string;
  source: string;
  authenticatedApi: ClientApiClient;
  userId: string | null;
  logger: OnboardingLogger;
  totalSteps: number;
  isMountedRef: React.MutableRefObject<boolean>;
  setVillaId: Dispatch<SetStateAction<string | null>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setOnboardingProgress: Dispatch<SetStateAction<OnboardingProgress | null>>;
  setLocalStepData: Dispatch<SetStateAction<StepDataMap>>;
  setLastSavedData: Dispatch<SetStateAction<StepDataMap>>;
  clearAllStepErrors: () => void;
  stepVersionsRef: React.MutableRefObject<Record<number, number>>;
  setStepVersions: Dispatch<SetStateAction<Record<number, number>>>;
  loadFieldProgress: (
    villaId: string,
    api: ClientApiClient,
    existingData?: StepDataMap
  ) => Promise<StepDataMap>;
}): Promise<boolean> => {
  logger.log("SESSION", "VALIDATING_VILLA_ACCESS", {
    villaId: persistedVillaId,
    source,
    userId,
  });

  try {
    const progress = await loadProgressForVilla({
      authenticatedApi,
      villaId: persistedVillaId,
      isMountedRef,
      setOnboardingProgress,
      setLocalStepData,
      setLastSavedData,
      clearAllStepErrors,
      stepVersionsRef,
      setStepVersions,
      loadFieldProgress,
    });

    if (!progress) {
      logger.log("SESSION", "VILLA_ACCESS_DENIED", {
        villaId: persistedVillaId,
      });
      clearStoredVillaIds(userId);
      return false;
    }

    logger.log("SESSION", "VILLA_ACCESS_VALIDATED", {
      villaId: persistedVillaId,
    });

    ensureLocalStorageConsistency(persistedVillaId, userId, logger);
    storeVillaId(persistedVillaId, userId);

    if (isMountedRef.current) {
      setVillaId(persistedVillaId);
      const nextStep = determineCurrentStep(progress, totalSteps);
      setCurrentStep(nextStep);
    }

    return true;
  } catch (error) {
    const err = ensureError(error);
    logger.trackError("SESSION", err, {
      context: "villa_validation_failed",
      villaId: persistedVillaId,
      source,
      userId,
    });
    clearStoredVillaIds(userId);
    return false;
  }
};

const OnboardingWizardContent: React.FC<OnboardingWizardContentProps> = ({
  forceNewSession = false,
}) => {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [localStepData, setLocalStepData] = useState<StepDataMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [autoSaveEnabled] = useState(AUTO_SAVE_CONFIG.enabled);
  const [lastSavedData, setLastSavedData] = useState<StepDataMap>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "error"
  >("idle");
  const [lastSaveTime, setLastSaveTime] = useState<Date>();

  // Performance and logging
  const [logger] = useState(() => OnboardingLogger.getInstance());

  // Backup and recovery state - TEMPORARILY DISABLED
  const [backupService] = useState<null>(() => null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryData, setRecoveryData] = useState<BackupData | null>(null);

  const stepRefs = useRef<Array<StepHandle | null>>([]);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveQueueRef = useRef<Set<number>>(new Set());
  const lastSaveTimeRef = useRef<number>(0);
  const batchedSavesRef = useRef<Map<number, Record<string, unknown>>>(new Map());
  const saveInProgressRef = useRef<boolean>(false); // Prevent concurrent saves
  const saveOperationIdRef = useRef<number>(0); // Track save operations
  const [stepVersions, setStepVersions] = useState<Record<number, number>>({});
  const stepVersionsRef = useRef(stepVersions);

  const totalSteps = 10;
  const userId = user?.id;
  const isMountedRef = useRef(true);

  // State for onboarding progress
  const [onboardingProgress, setOnboardingProgress] =
    useState<OnboardingProgress | null>(null);
  const [villaId, setVillaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [criticalError, setCriticalError] = useState<boolean>(false);
  // Prevent double-initialization in development/StrictMode
  const initialLoadRef = useRef(false);

  const { applyBackendErrors, clearStepErrors, getStepErrors, warnings } =
    useValidation();
  const clearAllStepErrors = useCallback(() => {
    for (let i = 1; i <= totalSteps; i++) {
      clearStepErrors(i);
    }
  }, [clearStepErrors, totalSteps]);

  useEffect(() => {
    stepVersionsRef.current = stepVersions;
  }, [stepVersions]);

  // Connection monitoring and error handling
  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      logger.log("SYSTEM", "CONNECTION_RESTORED");
    };

    const handleOffline = () => {
      setIsOfflineMode(true);
      logger.log("SYSTEM", "CONNECTION_LOST");
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Remove console.error - handled by logger
      logger.trackError(
        "SYSTEM",
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason)),
        {
          context: "unhandled_promise_rejection",
        }
      );
      // Prevent the error from bubbling up and causing the app to crash
      event.preventDefault();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, [logger]);

  // OPTIMIZED: Enhanced field progress loading with batching
  const loadFieldProgress = useCallback(
    async (
      villaId: string,
      authenticatedApi: ClientApiClient,
      existingData?: StepDataMap
    ): Promise<StepDataMap> => {
      try {
        logger.startDataFetch("field_progress_load");

        if (isSaving) {
          logger.endDataFetch("field_progress_load", false);
          return existingData ?? {};
        }

        const heavySteps = [6, 7, 8, 9, 10];

        const fieldProgressResponses = await Promise.all(
          heavySteps.map(async (step) => {
            try {
              const response = (await authenticatedApi.getFieldProgress(
                villaId,
                step
              )) as ApiResponse<Record<string, unknown>>;
              return { step, response };
            } catch (error) {
              const err =
                error instanceof Error ? error : new Error(String(error));
              logger.trackError(step, err, {
                context: "field_progress_load_single_step",
              });
              return {
                step,
                response: { success: false, data: {} as Record<string, unknown> },
              };
            }
          })
        );

        const enhancedStepData: StepDataMap = existingData
          ? { ...existingData }
          : {};

        fieldProgressResponses.forEach(({ step, response }) => {
          if (
            response.success &&
            response.data &&
            Object.keys(response.data).length > 0
          ) {
            const stepKey = `step${step}`;
            const existingStepData = enhancedStepData[stepKey] || {};
            const validFieldProgress: Record<string, unknown> = {};

            Object.entries(response.data).forEach(([key, value]) => {
              if (value !== null && value !== undefined && value !== "") {
                if (
                  typeof value === "string" &&
                  (value.startsWith("{") || value.startsWith("["))
                ) {
                  try {
                    validFieldProgress[key] = JSON.parse(value);
                  } catch {
                    validFieldProgress[key] = value;
                  }
                } else {
                  validFieldProgress[key] = value;
                }
              }
            });

            if (Object.keys(validFieldProgress).length > 0) {
              enhancedStepData[stepKey] = {
                ...existingStepData,
                ...validFieldProgress,
              };
              logger.log(step, "FIELD_PROGRESS_LOADED", {
                fieldsLoaded: Object.keys(validFieldProgress).length,
              });
            }
          }
        });

        logger.endDataFetch("field_progress_load", true, heavySteps.length);
        return enhancedStepData;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.endDataFetch("field_progress_load", false);
        logger.trackError("SYSTEM", err, {
          context: "field_progress_load",
        });
        return existingData ?? {};
      }
    },
    [isSaving, logger]
  );

  const parseBackendErrors = useCallback((rawErrors: unknown): Record<string, string> => {
    if (!rawErrors) {
      return {};
    }

    const entries = Array.isArray(rawErrors) ? rawErrors : [rawErrors];
    const parsed: Record<string, string> = {};

    entries.forEach((entry) => {
      if (entry === undefined || entry === null) {
        return;
      }

      const text =
        typeof entry === "string"
          ? entry
          : JSON.stringify(entry, (_, value) => value ?? null);

      const [fieldPart, ...rest] = text.split(":");
      if (rest.length === 0) {
        parsed._step = fieldPart.trim();
      } else {
        const field = fieldPart.trim() || "_step";
        const message = rest.join(":").trim() || "Invalid value";
        parsed[field] = message;
      }
    });

    return parsed;
  }, []);

  // Helper function to handle auto-save execution logic
  const executeAutoSaveCore = useCallback(async (
    token: string,
    targetVillaId: string,
    currentOperationId: number
  ): Promise<boolean> => {
    const authenticatedApi = new ClientApiClient(token);
    const saveBatch = buildSaveBatch(batchedSavesRef.current);
    const { summary } = await executeAutoSaveBatch({
      saveBatch,
      authenticatedApi,
      villaId: targetVillaId,
      currentStep,
      currentOperationId,
      logger,
      stepVersionsRef,
      parseBackendErrors,
      applyBackendErrors,
    });

    removeSuccessfulStepsFromBatch(
      summary.successfulSteps,
      batchedSavesRef.current
    );
    clearErrorsForSteps(summary.successfulSteps, clearStepErrors);
    applyVersionUpdates(
      summary.versionUpdates,
      stepVersionsRef,
      setStepVersions,
      isMountedRef
    );
    updateSavedDataAfterSuccess(
      summary.successfulSteps,
      localStepData,
      lastSavedData,
      setLastSavedData,
      setLastSaveTime,
      isMountedRef
    );

    await refreshConflictedSteps({
      conflictedSteps: summary.conflictedSteps,
      villaId: targetVillaId,
      getToken,
      logger,
      isMountedRef,
      setOnboardingProgress,
      setLocalStepData,
      setLastSavedData,
      clearStepErrors,
      stepVersionsRef,
      setStepVersions,
    });

    notifyValidationIssues(summary.validationErrorSteps, currentStep);

    const hasValidationIssues = summary.validationErrorSteps.length > 0;
    const hasConflicts = summary.conflictedSteps.length > 0;
    notifyPartialSave(
      summary.successfulSteps.length,
      saveBatch.length,
      hasValidationIssues,
      hasConflicts
    );

    await attemptBackupSave(
      backupService,
      targetVillaId,
      currentStep,
      localStepData,
      logger
    );

    return !summary.hadValidationOnCurrentStep && !summary.hadConflictOnCurrentStep;
  }, [
    currentStep,
    logger,
    parseBackendErrors,
    applyBackendErrors,
    clearStepErrors,
    setStepVersions,
    localStepData,
    lastSavedData,
    setLastSavedData,
    setLastSaveTime,
    getToken,
    setOnboardingProgress,
    setLocalStepData,
    backupService
  ]);

  // Helper function to check if auto-save should be skipped
  const shouldSkipAutoSaveCheck = useCallback((): boolean => {
    const pendingBatchSize = batchedSavesRef.current.size;
    return shouldSkipAutoSave({
      userLoaded,
      authLoaded,
      hasUser: Boolean(user),
      villaId,
      autoSaveEnabled,
      isSaving,
      pendingBatchSize,
    }) || saveInProgressRef.current || !villaId;
  }, [userLoaded, authLoaded, user, villaId, autoSaveEnabled, isSaving]);

  // Enhanced auto-save with batching and race condition prevention
  const performAutoSave = useCallback(async (): Promise<boolean> => {
    if (shouldSkipAutoSaveCheck()) {
      if (saveInProgressRef.current) {
        logger.log("AUTOSAVE", "SAVE_ALREADY_IN_PROGRESS");
      }
      return true;
    }

    saveInProgressRef.current = true;
    const currentOperationId = ++saveOperationIdRef.current;
    let stepSuccess = true;
    const now = Date.now();

    if (isRateLimited(now, lastSaveTimeRef.current)) {
      saveInProgressRef.current = false;
      return true;
    }

    setIsSaving(true);
    setAutoSaveStatus("saving");
    lastSaveTimeRef.current = now;

    logger.startAutoSave(currentStep);

    try {
      const token = await getToken();
      if (!token) {
        const authError = new Error("Authentication token unavailable");
        logger.trackError("AUTOSAVE", authError, {
          context: "auto_save_authentication",
          villaId,
          currentStep,
        });
        throw authError;
      }

      stepSuccess = await executeAutoSaveCore(token, villaId!, currentOperationId);

      logger.endAutoSave(
        currentStep,
        stepSuccess,
        JSON.stringify(buildSaveBatch(batchedSavesRef.current)).length
      );

      if (isMountedRef.current) {
        setAutoSaveStatus(stepSuccess ? "idle" : "error");
      }
    } catch (error) {
      stepSuccess = false;
      logger.endAutoSave(currentStep, false);
      const err = ensureError(error);
      logger.trackError("AUTOSAVE", err, {
        villaId,
        currentStep,
        batchSize: batchedSavesRef.current.size,
      });
      if (isMountedRef.current) {
        setAutoSaveStatus("error");
      }

      if (!isOfflineMode) {
        toast.error("Auto-save failed. Your changes are backed up locally.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
      if (saveOperationIdRef.current === currentOperationId) {
        saveInProgressRef.current = false;
      }
    }

    return stepSuccess;
  }, [
    shouldSkipAutoSaveCheck,
    executeAutoSaveCore,
    currentStep,
    getToken,
    logger,
    isOfflineMode,
    villaId,
  ]);

  // Enhanced update handler with intelligent batching
  const handleUpdate = useCallback(
    (stepNumber: number, data: Record<string, unknown>) => {
      logger.trackUserInteraction(
        stepNumber,
        "data_update",
        Object.keys(data || {}).join(",")
      );

      if (isMountedRef.current) {
        setLocalStepData((prev) => {
          const updated = { ...prev, [`step${stepNumber}`]: data };

          // Add to batched saves
          batchedSavesRef.current.set(stepNumber, data);

          return updated;
        });
      }

      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout with batching
      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave().catch((error) => {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.trackError("AUTOSAVE", err, {
            context: "timeout_autosave",
          });
        });
      }, AUTO_SAVE_CONFIG.debounceTime);
    },
    [performAutoSave, logger]
  );

  // Enhanced error recovery mechanism
  const handleErrorRecovery = useCallback(
    async (error: Error, context: string) => {
      const maxRetries = 3;

      if (retryCount >= maxRetries) {
        setCriticalError(true);
        logger.trackError(
          "SYSTEM",
          new Error(
            `Critical error after ${maxRetries} retries: ${error.message}`
          ),
          {
            context: `${context}_critical_failure`,
            retryCount,
            originalError: error.message,
          }
        );
        return false;
      }

      setRetryCount((prev) => prev + 1);
      logger.log("SYSTEM", "ERROR_RECOVERY_ATTEMPT", {
        context,
        retryCount: retryCount + 1,
        error: error.message,
      });

      // Clear error state and attempt recovery
      if (isMountedRef.current) {
        setError(null);
      }

      // Wait before retry
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, retryCount) * 1000)
      );

      return true;
    },
    [retryCount, logger]
  );

  // Enhanced data loading with performance tracking
  const loadOnboardingData = useCallback(
    async (forceNew = false) => {
      if (!userId) {
        if (isMountedRef.current) {
          setError("Please sign in to access the onboarding wizard");
          setIsLoading(false);
          setHasLoadedInitialData(true);
        }
        return;
      }

      if (isMountedRef.current) {
        setIsLoading(true);
      }
      logger.startDataFetch("initial_load");

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Authentication required. Please sign in again.");
        }

        const authenticatedApi = new ClientApiClient(token);

        if (forceNew) {
          logger.log("SYSTEM", "Force new session - skipping existing villa check");
          clearStoredVillaIds(userId);
          await startNewOnboardingSession({
            authenticatedApi,
            userId,
            isMountedRef,
            setVillaId,
            setCurrentStep,
            setOnboardingProgress,
            setLocalStepData,
            setLastSavedData,
            clearAllStepErrors,
            stepVersionsRef,
            setStepVersions,
            loadFieldProgress,
          });
          logger.endDataFetch("initial_load", true, 0);
          return;
        }

        const { villaId: persistedVillaId, source } = readPersistedVillaId(userId);
        logger.log("SYSTEM", "VILLA_ID_LOADING", {
          userId,
          persistedVillaId,
          source,
        });

        let sessionLoaded = false;
        if (persistedVillaId) {
          sessionLoaded = await loadExistingSession({
            persistedVillaId,
            source,
            authenticatedApi,
            userId,
            logger,
            totalSteps,
            isMountedRef,
            setVillaId,
            setCurrentStep,
            setOnboardingProgress,
            setLocalStepData,
            setLastSavedData,
            clearAllStepErrors,
            stepVersionsRef,
            setStepVersions,
            loadFieldProgress,
          });
        }

        if (!sessionLoaded) {
          if (persistedVillaId) {
            logger.log("SESSION", "STARTING_NEW_SESSION_AFTER_VALIDATION_FAILURE", {
              previousVillaId: persistedVillaId,
            });
          } else {
            logger.log("SYSTEM", "No villa found, starting onboarding process");
          }

          await startNewOnboardingSession({
            authenticatedApi,
            userId,
            isMountedRef,
            setVillaId,
            setCurrentStep,
            setOnboardingProgress,
            setLocalStepData,
            setLastSavedData,
            clearAllStepErrors,
            stepVersionsRef,
            setStepVersions,
            loadFieldProgress,
          });
        }

        logger.endDataFetch("initial_load", true);
      } catch (error) {
        const err = ensureError(error);
        logger.endDataFetch("initial_load", false);
        logger.trackError("SYSTEM", err, {
          context: "initial_load",
        });

        const canRetry = await handleErrorRecovery(err, "initial_load");
        if (canRetry && !criticalError) {
          try {
            await loadOnboardingData(forceNew);
            return;
          } catch (retryError) {
            const retryErr = ensureError(retryError);
            logger.trackError("SYSTEM", retryErr, {
              context: "initial_load_retry",
            });
          }
        }

        if (isMountedRef.current) {
          setError(
            `Failed to load onboarding data: ${err.message || "Unknown error"}`
          );
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setHasLoadedInitialData(true);
        }
      }
    },
    [
      userId,
      getToken,
      loadFieldProgress,
      logger,
      handleErrorRecovery,
      criticalError,
      clearAllStepErrors,
      totalSteps,
    ]
  );

  const validationSummary = useMemo(() => {
    const summary: Record<number, { errors: number; warnings: number }> = {};
    const warningMap = warnings as Record<string, Record<string, unknown>>;
    for (let step = 1; step <= totalSteps; step++) {
      const key = String(step);
      const errorCount = Object.keys(getStepErrors(step) || {}).length;
      const warningCount = Object.keys(warningMap[key] || {}).length;
      if (errorCount > 0 || warningCount > 0) {
        summary[step] = { errors: errorCount, warnings: warningCount };
      }
    }
    return summary;
  }, [getStepErrors, warnings, totalSteps]);

  // Load data on mount
  useEffect(() => {
    // Guard against double-initialization (StrictMode/dev)
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    loadOnboardingData(forceNewSession).catch((error) => {
      const err = ensureError(error);
      logger.trackError("SYSTEM", err, {
        context: "initial_data_load",
      });
    });
  }, [loadOnboardingData, logger, forceNewSession]);

  // Enhanced cleanup - Fix memory leaks
  useEffect(() => {
    const timeoutHandle = autoSaveTimeoutRef.current;
    const batchedSaves = batchedSavesRef.current;
    const saveQueue = saveQueueRef.current;
    const stepHandles = stepRefs.current;

    return () => {
      // Mark component as unmounted to prevent state updates
      isMountedRef.current = false;

      // Clear all timeouts
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      autoSaveTimeoutRef.current = null;

      // Clear all refs to prevent memory leaks
      if (batchedSaves) {
        batchedSaves.clear();
      }
      if (saveQueue) {
        saveQueue.clear();
      }

      // Clear step refs
      if (stepHandles) {
        stepHandles.forEach((_, index) => {
          stepHandles[index] = null;
        });
      }

      stepRefs.current = [];

      logger.log("SYSTEM", "COMPONENT_CLEANUP_COMPLETE");
    };
  }, [logger]);

  // Optimized completedSteps calculation
  const completedSteps = useMemo(() => {
    if (!onboardingProgress) return [];

    if (Array.isArray(onboardingProgress.completedSteps)) {
      return onboardingProgress.completedSteps;
    }

    const steps: number[] = [];
    const stepFlags = [
      { flag: onboardingProgress.villaInfoCompleted, step: 1 },
      { flag: onboardingProgress.ownerDetailsCompleted, step: 2 },
      { flag: onboardingProgress.contractualDetailsCompleted, step: 3 },
      { flag: onboardingProgress.bankDetailsCompleted, step: 4 },
      { flag: onboardingProgress.otaCredentialsCompleted, step: 5 },
      { flag: onboardingProgress.documentsUploaded, step: 6 },
      { flag: onboardingProgress.staffConfigCompleted, step: 7 },
      { flag: onboardingProgress.facilitiesCompleted, step: 8 },
      { flag: onboardingProgress.photosUploaded, step: 9 },
      { flag: onboardingProgress.reviewCompleted, step: 10 },
    ];

    stepFlags.forEach(({ flag, step }) => {
      if (flag) steps.push(step);
    });

    return steps;
  }, [onboardingProgress]);

  const progressPercentage = useMemo(() => {
    return Math.round((completedSteps.length / totalSteps) * 100);
  }, [completedSteps.length, totalSteps]);

  const stepData = localStepData;

  const nextButtonAriaLabel =
    currentStep === totalSteps
      ? "Complete onboarding process"
      : "Continue to next step";

  let nextButtonLabel = "Next";
  if (isLoading) {
    nextButtonLabel = "Processing...";
  } else if (currentStep === totalSteps) {
    nextButtonLabel = "Complete Onboarding";
  }

  let autoSaveIndicatorClass = "bg-green-500";
  if (autoSaveStatus === "saving") {
    autoSaveIndicatorClass = "bg-yellow-500 animate-pulse";
  } else if (autoSaveStatus === "error") {
    autoSaveIndicatorClass = "bg-red-500";
  }

  let autoSaveStatusMessage = "Auto-save enabled";
  if (autoSaveStatus === "saving") {
    autoSaveStatusMessage = "Saving...";
  } else if (autoSaveStatus === "error") {
    autoSaveStatusMessage = "Save failed";
  }

  // Step navigation with performance tracking
  const handleNext = useCallback(async () => {
    if (currentStep >= totalSteps) return;

    logger.startStepLoad(currentStep + 1);

    try {
      // Force save current step before moving
      const saveSuccessful = await performAutoSave();
      if (!saveSuccessful) {
        logger.endStepLoad(currentStep + 1, false);
        return;
      }

      if (isMountedRef.current) {
        setCurrentStep((prev) => {
          const next = prev + 1;
          logger.endStepLoad(next, true);
          return next;
        });
      }
    } catch (error) {
      const err = ensureError(error);
      logger.trackError(currentStep, err, { context: "handleNext" });
      logger.endStepLoad(currentStep + 1, false);
      toast.error("Failed to save current step before proceeding");
    }
  }, [currentStep, totalSteps, performAutoSave, logger]);

  const handlePrevious = useCallback(() => {
    if (currentStep <= 1) return;

    logger.startStepLoad(currentStep - 1);
    if (isMountedRef.current) {
      setCurrentStep((prev) => {
        const next = prev - 1;
        logger.endStepLoad(next, true);
        return next;
      });
    }
  }, [currentStep, logger]);

  const handleStepClick = useCallback(
    (stepNumber: number) => {
      if (stepNumber === currentStep) return;

      logger.startStepLoad(stepNumber);
      if (isMountedRef.current) {
        setCurrentStep(stepNumber);
        logger.endStepLoad(stepNumber, true);
      }
    },
    [currentStep, logger]
  );

  // Recovery handlers
  const handleRecoverData = useCallback(
    (data: BackupData) => {
      setLocalStepData(data.stepData);
      setCurrentStep(data.currentStep);
      setVillaId(data.villaId || null);
      setShowRecoveryModal(false);
      toast.success("Data recovered successfully!");
      logger.log("SYSTEM", "DATA_RECOVERED", { lastSaved: data.lastSaved });
    },
    [logger]
  );

  const handleDiscardRecovery = useCallback(async () => {
    try {
      setShowRecoveryModal(false);
      setRecoveryData(null);

      try {
        if (backupService) {
          logger.log("SYSTEM", "RECOVERY_DISCARDED");
        } else {
          logger.log("SYSTEM", "RECOVERY_DISCARDED_WITHOUT_BACKUP_CLEAR");
        }
      } catch (backupError) {
        const err = ensureError(backupError);
        logger.trackError("BACKUP", err, {
          context: "backup_clear_fallback",
        });
        logger.log("SYSTEM", "RECOVERY_DISCARDED_WITHOUT_BACKUP_CLEAR");
      }
    } catch (error) {
      const err = ensureError(error);
      logger.trackError("SYSTEM", err, {
        context: "handleDiscardRecovery",
      });
      toast.error("Failed to discard recovery data");
    }
  }, [logger, backupService]);

  const executeNextStep = useCallback(
    (context: string) => {
      handleNext().catch((error) => {
        const err = ensureError(error);
        logger.trackError(currentStep, err, {
          context,
        });
      });
    },
    [handleNext, logger, currentStep]
  );

  const handleKeyboardNavigation = useCallback(
    (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardEvent(event)) {
        return;
      }

      if (event.key === "Escape" && showRecoveryModal) {
        event.preventDefault();
        setShowRecoveryModal(false);
        return;
      }

      if (event.key === "ArrowLeft") {
        if (currentStep > 1 && !isLoading) {
          event.preventDefault();
          handlePrevious();
        }
        return;
      }

      if (event.key === "ArrowRight") {
        if (currentStep < totalSteps && !isLoading) {
          event.preventDefault();
          executeNextStep("keyboard_navigation_right");
        }
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        if (currentStep < totalSteps && !isLoading) {
          event.preventDefault();
          executeNextStep("keyboard_navigation_enter");
        }
        return;
      }

      const stepFromKey = resolveNumericStep(event.key);
      if (stepFromKey && !isLoading && stepFromKey <= totalSteps) {
        event.preventDefault();
        handleStepClick(stepFromKey);
      }
    },
    [
      currentStep,
      totalSteps,
      isLoading,
      handlePrevious,
      executeNextStep,
      handleStepClick,
      showRecoveryModal,
    ]
  );

  // Keyboard navigation
  useEffect(() => {
    window.addEventListener("keydown", handleKeyboardNavigation);

    return () => {
      window.removeEventListener("keydown", handleKeyboardNavigation);
    };
  }, [handleKeyboardNavigation]);

  // Render step component
  const renderStepComponent = useCallback(() => {
    const commonProps = {
      ref: (ref: StepHandle | null) => {
        stepRefs.current[currentStep - 1] = ref;
      },
      data: stepData[`step${currentStep}`] || {},
      onUpdate: (data: Record<string, unknown>) =>
        handleUpdate(currentStep, data),
      onNext: handleNext,
      onPrevious: handlePrevious,
      villaId: villaId || undefined,
      isLoading,
      userId,
    };

    const StepComponents = [
      VillaInformationStepEnhanced,
      OwnerDetailsStep,
      ContractualDetailsStep,
      BankDetailsStep,
      OTACredentialsStep,
      DocumentsUploadStep,
      StaffConfiguratorStep,
      FacilitiesChecklistStep,
      PhotoUploadStep,
      ReviewSubmitStepEnhanced,
    ];

    const StepComponent = StepComponents[currentStep - 1];

    return (
      <StepErrorBoundary stepName={`Step ${currentStep}`}>
        <StepComponent {...commonProps} />
      </StepErrorBoundary>
    );
  }, [
    currentStep,
    stepData,
    handleUpdate,
    handleNext,
    handlePrevious,
    villaId,
    isLoading,
    userId,
  ]);

  if (isLoading && !hasLoadedInitialData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#009990] mx-auto"></div>
          <p className="mt-4 text-slate-600">
            Loading your onboarding progress...
          </p>
        </div>
      </div>
    );
  }

  if ((error && !recoveryData) || criticalError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle
            className={`mx-auto h-12 w-12 ${
              criticalError ? "text-red-600" : "text-red-500"
            }`}
          />
          <h2
            className={`mt-4 text-xl font-semibold ${
              criticalError ? "text-red-700" : "text-slate-900"
            }`}
          >
            {criticalError ? "Critical Error" : "Loading Error"}
          </h2>
          <p className="mt-2 text-slate-600">
            {criticalError
              ? "The application encountered a critical error and could not recover. Please refresh the page or contact support if the issue persists."
              : error}
          </p>
          <div className="mt-4 space-x-2">
            {error?.includes("sign in") && !criticalError ? (
              <button
                onClick={() => (window.location.href = "/sign-in")}
                className="bg-[#009990] text-white px-4 py-2 rounded hover:bg-[#007a6b] transition-colors"
              >
                Sign In
              </button>
            ) : null}
            {!criticalError && (
              <button
                onClick={() => {
                  setRetryCount(0);
                  setCriticalError(false);
                  loadOnboardingData(forceNewSession).catch((error) => {
                    const err = ensureError(error);
                    logger.trackError("SYSTEM", err, {
                      context: "try_again_button",
                    });
                  });
                }}
                className="bg-[#009990] text-white px-4 py-2 rounded hover:bg-[#007a6b] transition-colors"
              >
                Try Again {retryCount > 0 && `(${retryCount}/3)`}
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Recovery Modal */}
      {showRecoveryModal && recoveryData && (
        <RecoveryModal
          isOpen={showRecoveryModal}
          onClose={() => setShowRecoveryModal(false)}
          backupData={recoveryData}
          onRecover={() => handleRecoverData(recoveryData)}
          onDiscard={handleDiscardRecovery}
        />
      )}

      <main className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl mx-auto">
            <WizardErrorBoundary>
              <header className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  Villa Onboarding
                </h1>
                <p className="text-slate-600">
                  Complete all steps to set up your villa for management
                </p>
                {villaId && (
                  <p className="text-sm text-slate-500 mt-2">
                    Villa ID: {villaId}
                  </p>
                )}
              </header>

              <ErrorBoundary stepName="Progress Tracker">
                <ProgressTracker
                  currentStep={currentStep}
                  completedSteps={completedSteps}
                  onStepClick={handleStepClick}
                  steps={[
                    { id: 1, title: "Villa Information" },
                    { id: 2, title: "Owner Details" },
                    { id: 3, title: "Contractual Details" },
                    { id: 4, title: "Bank Details" },
                    { id: 5, title: "OTA Credentials" },
                    { id: 6, title: "Documents Upload" },
                    { id: 7, title: "Staff Configuration" },
                    { id: 8, title: "Facilities Checklist" },
                    { id: 9, title: "Photo Upload" },
                    { id: 10, title: "Review & Submit" },
                  ]}
                  validationSummary={validationSummary}
                />
              </ErrorBoundary>

              <section
                className="bg-transparent rounded-xl p-6 mb-6"
                aria-labelledby="current-step-heading"
              >
                <div className="sr-only" id="current-step-heading">
                  Step {currentStep} of {totalSteps}
                </div>

                <ErrorBoundary stepName={`Step ${currentStep}`}>
                  {renderStepComponent()}
                </ErrorBoundary>
              </section>

              {/* Navigation Controls */}
              <ErrorBoundary stepName="Navigation Controls">
                <nav
                  className="flex justify-between items-center mt-8 mb-6"
                  aria-label="Step navigation"
                >
                  <button
                    onClick={handlePrevious}
                    disabled={currentStep === 1 || isLoading}
                    aria-label="Go to previous step"
                    className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => {
                      handleNext().catch((error) => {
                        const err = ensureError(error);
                        logger.trackError(currentStep, err, {
                          context: "next_button_click",
                        });
                      });
                    }}
                    disabled={isLoading}
                    aria-label={nextButtonAriaLabel}
                    className="px-6 py-3 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {nextButtonLabel}
                  </button>
                </nav>
              </ErrorBoundary>

              {/* Progress Status */}
              <div className="mt-6 text-center text-sm text-slate-600 space-y-2">
                <output className="block" aria-live="polite">
                  Step {currentStep} of {totalSteps} • {progressPercentage}%
                </output>
                <div className="text-xs text-slate-500">
                  <span className="inline-flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded">
                        ←
                      </kbd>
                      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded">
                        →
                      </kbd>
                      <span>Navigate</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded">
                        Enter
                      </kbd>
                      <span>Next</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded">
                        1-9
                      </kbd>
                      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded">
                        0
                      </kbd>
                      <span>Jump</span>
                    </span>
                  </span>
                </div>
                {autoSaveEnabled && (
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <div
                      className={`w-2 h-2 rounded-full ${autoSaveIndicatorClass}`}
                      aria-hidden="true"
                    />
                    <output className="text-slate-500">
                      {autoSaveStatusMessage}
                      {lastSaveTime &&
                        autoSaveStatus === "idle" &&
                        ` • Last saved ${lastSaveTime.toLocaleTimeString()}`}
                    </output>
                  </div>
                )}
              </div>

              <ErrorBoundary stepName="Validation Summary">
                <ValidationSummary stepNumber={currentStep} />
              </ErrorBoundary>
            </WizardErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
};

const OnboardingWizardUnified: React.FC<OnboardingWizardProps> = ({
  forceNewSession = false,
}) => {
  return (
    <ValidationProvider enableRealTimeValidation={true} debounceMs={300}>
      <OnboardingWizardContent forceNewSession={forceNewSession} />
    </ValidationProvider>
  );
};

export default OnboardingWizardUnified;
