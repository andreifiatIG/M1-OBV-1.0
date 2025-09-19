import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OnboardingPersistence } from './onboarding-persistence'

// Mock dependencies
vi.mock('./api-client', () => ({
  clientApi: {
    getOnboardingProgress: vi.fn(),
    saveOnboardingStep: vi.fn(),
    updateFacilities: vi.fn(),
  },
}))

vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    startGroup: vi.fn(),
    endGroup: vi.fn(),
    startTimer: vi.fn(() => vi.fn()),
    databaseOperation: vi.fn(),
  },
  LogCategory: {
    ONBOARDING: 'ONBOARDING',
    DATABASE: 'DATABASE',
    AUTOSAVE: 'AUTOSAVE',
  },
}))

describe('OnboardingPersistence', () => {
  let persistence: OnboardingPersistence
  const mockConfig = {
    villaId: 'test-villa-id',
    userId: 'test-user-id',
    autoSave: true,
    debounceMs: 100,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    persistence = new OnboardingPersistence(mockConfig)
  })

  afterEach(() => {
    persistence.destroy()
    vi.clearAllTimers()
  })

  describe('Initialization', () => {
    it('should initialize with correct config', () => {
      expect(persistence).toBeDefined()
      expect(persistence.getLoadedData).toBeDefined()
    })

    it('should load all data on initialization', async () => {
      const { clientApi } = await import('./api-client')
      const mockData = {
        documents: { propertyTitle: { uploaded: true } },
        staff: [{ name: 'John', role: 'manager' }],
      }

      ;(clientApi.getOnboardingProgress as any).mockResolvedValue({
        success: true,
        data: mockData,
      })

      const result = await persistence.loadAllData()

      expect(clientApi.getOnboardingProgress).toHaveBeenCalledWith('test-villa-id')
      expect(result).toEqual(mockData)
    })

    it('should handle load errors gracefully', async () => {
      const { clientApi } = await import('./api-client')
      ;(clientApi.getOnboardingProgress as any).mockRejectedValue(
        new Error('Network error')
      )

      await expect(persistence.loadAllData()).rejects.toThrow('Network error')
    })
  })

  describe('Documents Persistence', () => {
    it('should save documents when data changes', async () => {
      const { clientApi } = await import('./api-client')
      const documentsData = {
        propertyTitle: { uploaded: true, url: 'https://example.com/title.pdf' },
        businessLicense: { uploaded: false, url: null },
      }

      ;(clientApi.saveOnboardingStep as any).mockResolvedValue({
        success: true,
        data: { saved: true },
      })

      await persistence.saveDocuments(documentsData)

      // Wait for debounced save
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(clientApi.saveOnboardingStep).toHaveBeenCalledWith(
        'test-villa-id',
        6, // Documents is step 6
        documentsData
      )
    })

    it('should skip save when documents data unchanged', async () => {
      const { clientApi } = await import('./api-client')
      const documentsData = {
        propertyTitle: { uploaded: true },
      }

      // Save once
      await persistence.saveDocuments(documentsData)
      await new Promise(resolve => setTimeout(resolve, 150))

      vi.clearAllMocks()

      // Save same data again
      await persistence.saveDocuments(documentsData)
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(clientApi.saveOnboardingStep).not.toHaveBeenCalled()
    })
  })

  describe('Staff Persistence', () => {
    it('should save staff data with proper logging', async () => {
      const { clientApi } = await import('./api-client')
      const { logger } = await import('./logger')
      const staffData = [
        { name: 'John Doe', role: 'manager', phone: '+1234567890' },
        { name: 'Jane Smith', role: 'housekeeper', phone: '+1234567891' },
      ]

      ;(clientApi.saveOnboardingStep as any).mockResolvedValue({
        success: true,
        data: { saved: true },
      })

      await persistence.saveStaff(staffData)

      expect(logger.info).toHaveBeenCalledWith(
        'ONBOARDING',
        'Saving staff members',
        {
          count: 2,
          villaId: 'test-villa-id',
        }
      )
    })

    it('should handle staff save errors', async () => {
      const { clientApi } = await import('./api-client')
      const staffData = [{ name: 'John', role: 'manager' }]

      ;(clientApi.saveOnboardingStep as any).mockRejectedValue(
        new Error('Save failed')
      )

      await expect(persistence.saveStaff(staffData)).rejects.toThrow('Save failed')
    })
  })

  describe('Facilities Persistence', () => {
    it('should save facilities with category counts', async () => {
      const { clientApi } = await import('./api-client')
      const { logger } = await import('./logger')
      const facilitiesData = [
        { name: 'Pool', category: 'recreation', available: true },
        { name: 'WiFi', category: 'technology', available: true },
        { name: 'Kitchen', category: 'amenities', available: true },
        { name: 'Gym', category: 'recreation', available: false },
      ]

      ;(clientApi.updateFacilities as any).mockResolvedValue({
        success: true,
        data: { saved: true },
      })

      await persistence.saveFacilities(facilitiesData)

      expect(logger.info).toHaveBeenCalledWith(
        'ONBOARDING',
        'Saving facilities checklist',
        {
          totalCount: 4,
          byCategory: {
            recreation: 2,
            technology: 1,
            amenities: 1,
          },
          villaId: 'test-villa-id',
        }
      )
    })
  })

  describe('Photos Persistence', () => {
    it('should save photos with category counts', async () => {
      const { clientApi } = await import('./api-client')
      const { logger } = await import('./logger')
      const photosData = {
        exterior: [
          { url: 'https://example.com/ext1.jpg', caption: 'Front' },
          { url: 'https://example.com/ext2.jpg', caption: 'Back' },
        ],
        interior: [
          { url: 'https://example.com/int1.jpg', caption: 'Living room' },
        ],
        bedrooms: [],
      }

      ;(clientApi.saveOnboardingStep as any).mockResolvedValue({
        success: true,
        data: { saved: true },
      })

      await persistence.savePhotos(photosData)

      expect(logger.info).toHaveBeenCalledWith(
        'ONBOARDING',
        'Saving photos metadata',
        {
          categories: ['exterior', 'interior', 'bedrooms'],
          photoCounts: {
            exterior: 2,
            interior: 1,
            bedrooms: 0,
          },
          villaId: 'test-villa-id',
        }
      )
    })
  })

  describe('Auto-save and Debouncing', () => {
    it('should debounce rapid saves', async () => {
      const { clientApi } = await import('./api-client')
      const documentsData = { propertyTitle: { uploaded: true } }

      ;(clientApi.saveOnboardingStep as any).mockResolvedValue({
        success: true,
        data: { saved: true },
      })

      // Trigger multiple saves rapidly
      await persistence.saveDocuments(documentsData)
      await persistence.saveDocuments(documentsData)
      await persistence.saveDocuments(documentsData)

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should only call API once due to debouncing
      expect(clientApi.saveOnboardingStep).toHaveBeenCalledTimes(1)
    })

    it('should save all pending data when requested', async () => {
      const { clientApi } = await import('./api-client')

      ;(clientApi.saveOnboardingStep as any).mockResolvedValue({
        success: true,
        data: { saved: true },
      })

      // Queue up some saves
      await persistence.saveDocuments({ propertyTitle: { uploaded: true } })
      await persistence.saveStaff([{ name: 'John', role: 'manager' }])

      // Force save all pending
      await persistence.saveAllPending()

      expect(clientApi.saveOnboardingStep).toHaveBeenCalledTimes(2)
    })
  })

  describe('Change Detection', () => {
    it('should detect changes correctly', () => {
      const data1 = { test: 'value1' }
      const data2 = { test: 'value2' }

      expect(persistence.hasChanges('test-stage', data1)).toBe(true)

      // Simulate saving data1
      persistence['lastSavedData'].set('test-stage', JSON.stringify(data1))

      expect(persistence.hasChanges('test-stage', data1)).toBe(false)
      expect(persistence.hasChanges('test-stage', data2)).toBe(true)
    })
  })

  describe('Step Number Mapping', () => {
    it('should map stage names to correct step numbers', () => {
      const getStepNumber = persistence['getStepNumber'].bind(persistence)

      expect(getStepNumber('villa-info')).toBe(1)
      expect(getStepNumber('owner-details')).toBe(2)
      expect(getStepNumber('documents')).toBe(6)
      expect(getStepNumber('staff')).toBe(7)
      expect(getStepNumber('facilities')).toBe(8)
      expect(getStepNumber('photos')).toBe(9)
      expect(getStepNumber('unknown-stage')).toBe(1)
    })
  })

  describe('Cleanup', () => {
    it('should clean up timers on destroy', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      // Create some pending saves
      persistence.saveDocuments({ test: 'data' })

      persistence.destroy()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })
})