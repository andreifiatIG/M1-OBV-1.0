import { describe, it, expect, beforeEach, vi } from 'vitest';

function createPrismaMock() {
  const mock: any = {};
  mock.onboardingStepProgress = {
    upsert: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  };
  mock.onboardingProgress = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  mock.villa = {
    update: vi.fn(),
    findUnique: vi.fn(),
  };
  mock.staff = {
    findMany: vi.fn(),
  };
  mock.document = {
    findMany: vi.fn(),
    count: vi.fn(),
  };
  mock.photo = {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  };
  mock.onboardingSession = {
    update: vi.fn(),
  };
  mock.stepFieldProgress = {
    create: vi.fn(),
    update: vi.fn(),
  };
  mock.onboardingBackup = {
    findFirst: vi.fn(),
  };
  mock.$transaction = vi.fn(async (cb: any) => cb(mock));
  mock.$connect = vi.fn();
  mock.$disconnect = vi.fn();
  return mock;
}

const prismaMock = vi.hoisted(() => createPrismaMock());

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn(() => prismaMock),
    OnboardingStatus: { IN_PROGRESS: 'IN_PROGRESS' },
    StepStatus: { NOT_STARTED: 'NOT_STARTED', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', SKIPPED: 'SKIPPED' },
    FieldStatus: { NOT_STARTED: 'NOT_STARTED', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', SKIPPED: 'SKIPPED' },
    VillaStatus: { DRAFT: 'DRAFT' },
  };
});

import onboardingService, { VersionConflictError } from '../../services/core/onboardingService';

const baseProgress = {
  villaId: 'villa-1',
  currentStep: 1,
  totalSteps: 10,
  villaInfoCompleted: false,
  ownerDetailsCompleted: false,
  contractualDetailsCompleted: false,
  bankDetailsCompleted: false,
  otaCredentialsCompleted: false,
  documentsUploaded: false,
  staffConfigCompleted: false,
  facilitiesCompleted: false,
  photosUploaded: false,
  reviewCompleted: false,
  status: 'IN_PROGRESS',
  stepProgress: [],
  villa: {
    staff: [],
    facilities: [],
    photos: [],
    documents: [],
    stepProgress: [],
  },
};

const stepPayload = {
  villaName: 'Villa Example',
  address: '123 Beach Road',
  city: 'Phuket',
  country: 'Thailand',
  bedrooms: 4,
  bathrooms: 4,
  maxGuests: 8,
  propertyType: 'VILLA',
};

const resolvedValidation = { isValid: true, errors: [], warnings: [] };

const spyValidate = vi.spyOn(onboardingService as any, 'validateStepData').mockResolvedValue(resolvedValidation);
const spySave = vi.spyOn(onboardingService as any, 'saveStepData').mockResolvedValue(undefined);
const spyEnhanced = vi.spyOn(onboardingService as any, 'updateEnhancedProgress').mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  spyValidate.mockResolvedValue(resolvedValidation);
});

describe('OnboardingService.updateStep', () => {
  it('increments version and returns updated progress on successful auto-save', async () => {
    prismaMock.onboardingStepProgress.upsert.mockResolvedValue({
      version: 0,
      stepNumber: 1,
    });
    prismaMock.onboardingStepProgress.update.mockResolvedValue(undefined);
    prismaMock.onboardingProgress.findUnique.mockResolvedValue({
      ...baseProgress,
      villa: { ...baseProgress.villa, stepProgress: [] },
    });
    prismaMock.onboardingProgress.update.mockResolvedValue({
      ...baseProgress,
      villaInfoCompleted: false,
      villa: { ...baseProgress.villa, stepProgress: [] },
    });

    const result = await onboardingService.updateStep('villa-1', {
      step: 1,
      data: stepPayload,
      completed: false,
      isAutoSave: true,
      version: 0,
    });

    expect(prismaMock.onboardingStepProgress.update).toHaveBeenCalledWith({
      where: {
        villaId_stepNumber: {
          villaId: 'villa-1',
          stepNumber: 1,
        },
      },
      data: {
        version: 1,
      },
    });

    expect(result.version).toBe(1);
    expect(result.progress.villaId).toBe('villa-1');
    expect(spySave).toHaveBeenCalled();
  });

  it('throws VersionConflictError when provided version is stale', async () => {
    prismaMock.onboardingStepProgress.upsert.mockResolvedValue({
      version: 5,
      stepNumber: 1,
    });

    await expect(
      onboardingService.updateStep('villa-1', {
        step: 1,
        data: stepPayload,
        completed: false,
        isAutoSave: true,
        version: 2,
      })
    ).rejects.toBeInstanceOf(VersionConflictError);

    expect(spySave).not.toHaveBeenCalled();
  });
});
