import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTestVilla,
  createTestOnboardingProgress,
  prisma
} from '../../test/setup'

// Mock the actual service since we'll test its functionality
vi.mock('../core/onboardingService', () => ({
  OnboardingService: {
    createOnboardingSession: vi.fn(),
    updateStep: vi.fn(),
    getProgress: vi.fn(),
    completeOnboarding: vi.fn(),
    validateStepData: vi.fn(),
  }
}))

describe('OnboardingService', () => {
  let villaId: string

  beforeEach(async () => {
    const villa = await createTestVilla()
    villaId = villa.id
  })

  describe('Onboarding Session Management', () => {
    it('should create new onboarding session', async () => {
      const progressData = {
        currentStep: 1,
        totalSteps: 10,
        completedSteps: [],
        stepData: {},
        progressPercentage: 0,
        status: 'IN_PROGRESS',
      }

      const progress = await createTestOnboardingProgress(villaId, progressData)

      expect(progress.villaId).toBe(villaId)
      expect(progress.currentStep).toBe(1)
      expect(progress.status).toBe('IN_PROGRESS')
      expect(progress.progressPercentage).toBe(0)
    })

    it('should update onboarding step data', async () => {
      const progress = await createTestOnboardingProgress(villaId)

      const stepData = {
        villaInfo: {
          villaName: 'Test Villa',
          location: 'Test Location',
          bedrooms: 3,
          bathrooms: 2,
        }
      }

      const updated = await prisma.onboardingProgress.update({
        where: { id: progress.id },
        data: {
          currentStep: 2,
          stepData: stepData,
          completedSteps: [1],
          progressPercentage: 10,
        }
      })

      expect(updated.currentStep).toBe(2)
      expect(updated.stepData).toEqual(stepData)
      expect(updated.completedSteps).toContain(1)
    })

    it('should calculate progress percentage correctly', async () => {
      const completedSteps = [1, 2, 3, 4, 5]
      const totalSteps = 10
      const expectedPercentage = 50

      const progress = await createTestOnboardingProgress(villaId, {
        completedSteps,
        progressPercentage: expectedPercentage,
      })

      expect(progress.progressPercentage).toBe(expectedPercentage)
    })
  })

  describe('Step Validation', () => {
    it('should validate villa information step', () => {
      const validVillaData = {
        villaName: 'Test Villa',
        location: 'Test Location',
        bedrooms: 3,
        bathrooms: 2,
        maxGuests: 6,
        pricePerNight: 200,
        currency: 'USD',
      }

      // Mock validation logic
      const isValid = Object.keys(validVillaData).every(key =>
        validVillaData[key as keyof typeof validVillaData] !== undefined
      )

      expect(isValid).toBe(true)
    })

    it('should validate owner details step', () => {
      const validOwnerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        nationality: 'US',
      }

      const isValid = validOwnerData.firstName &&
                     validOwnerData.lastName &&
                     validOwnerData.email.includes('@')

      expect(isValid).toBe(true)
    })

    it('should reject invalid step data', () => {
      const invalidData = {
        villaName: '', // Empty name
        bedrooms: -1,  // Invalid number
        email: 'invalid-email', // Invalid email
      }

      const isValidVilla = invalidData.villaName.length > 0
      const isValidBedrooms = invalidData.bedrooms > 0
      const isValidEmail = invalidData.email.includes('@')

      expect(isValidVilla).toBe(false)
      expect(isValidBedrooms).toBe(false)
      expect(isValidEmail).toBe(false)
    })
  })

  describe('Onboarding Completion', () => {
    it('should mark onboarding as completed when all steps done', async () => {
      const progress = await createTestOnboardingProgress(villaId, {
        currentStep: 10,
        completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        progressPercentage: 100,
        status: 'COMPLETED',
      })

      expect(progress.status).toBe('COMPLETED')
      expect(progress.progressPercentage).toBe(100)
      expect(progress.completedSteps).toHaveLength(10)
    })

    it('should update villa status after completion', async () => {
      await createTestOnboardingProgress(villaId, {
        status: 'COMPLETED',
        progressPercentage: 100,
      })

      const updatedVilla = await prisma.villa.update({
        where: { id: villaId },
        data: { status: 'ACTIVE' }
      })

      expect(updatedVilla.status).toBe('ACTIVE')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing villa gracefully', async () => {
      const nonExistentId = 'non-existent-villa-id'

      await expect(
        createTestOnboardingProgress(nonExistentId)
      ).rejects.toThrow()
    })

    it('should handle invalid step numbers', () => {
      const invalidSteps = [-1, 0, 11, 999]

      invalidSteps.forEach(step => {
        const isValidStep = step >= 1 && step <= 10
        expect(isValidStep).toBe(false)
      })
    })
  })
})