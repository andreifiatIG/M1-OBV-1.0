import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ClientApiClient } from './api-client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock Clerk
const mockGetToken = vi.fn()
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
}))

describe('ClientApiClient', () => {
  let apiClient: ClientApiClient

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    mockGetToken.mockResolvedValue('mock-token')

    // Create fresh instance
    apiClient = new ClientApiClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should include auth token in requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      })

      await apiClient.getVillas()

      expect(mockGetToken).toHaveBeenCalled()
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/villas'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      )
    })

    it('should handle missing auth token', async () => {
      mockGetToken.mockResolvedValue(null)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      })

      await apiClient.getVillas()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/villas'),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      )
    })
  })

  describe('Villa Operations', () => {
    it('should fetch villas successfully', async () => {
      const mockVillas = [
        { id: '1', villaName: 'Test Villa 1' },
        { id: '2', villaName: 'Test Villa 2' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockVillas }),
      })

      const result = await apiClient.getVillas()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockVillas)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/villas'),
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should fetch single villa successfully', async () => {
      const mockVilla = { id: '1', villaName: 'Test Villa' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockVilla }),
      })

      const result = await apiClient.getVilla('1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockVilla)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/villas/1'),
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should create villa successfully', async () => {
      const villaData = {
        villaName: 'New Villa',
        location: 'Test Location',
        bedrooms: 3,
        bathrooms: 2,
      }

      const mockResponse = { id: '1', ...villaData }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockResponse }),
      })

      const result = await apiClient.createVilla(villaData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/villas'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(villaData),
        })
      )
    })

    it('should update villa successfully', async () => {
      const villaId = '1'
      const updateData = { villaName: 'Updated Villa' }
      const mockResponse = { id: villaId, ...updateData }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockResponse }),
      })

      const result = await apiClient.updateVilla(villaId, updateData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/villas/${villaId}`),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      )
    })
  })

  describe('Onboarding Operations', () => {
    it('should fetch onboarding progress successfully', async () => {
      const villaId = 'villa-1'
      const mockProgress = {
        currentStep: 3,
        totalSteps: 10,
        completedSteps: [1, 2],
        stepData: { step1: { data: 'test' } },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockProgress }),
      })

      const result = await apiClient.getOnboardingProgress(villaId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockProgress)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/onboarding/progress/${villaId}`),
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should save onboarding step successfully', async () => {
      const villaId = 'villa-1'
      const stepNumber = 2
      const stepData = { ownerDetails: { firstName: 'John' } }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { saved: true } }),
      })

      const result = await apiClient.saveOnboardingStep(villaId, stepNumber, stepData)

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/onboarding/step/${villaId}/${stepNumber}`),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(stepData),
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await apiClient.getVillas()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Villa not found' }),
      })

      const result = await apiClient.getVilla('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('HTTP 404')
    })

    it('should handle invalid JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      const result = await apiClient.getVillas()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid JSON')
    })

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Validation failed',
        }),
      })

      const result = await apiClient.getVillas()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation failed')
    })
  })

  describe('File Upload Operations', () => {
    it('should upload file successfully', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const villaId = 'villa-1'
      const mockResponse = {
        success: true,
        data: { url: 'https://example.com/uploads/test.pdf', id: 'file-1' },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await apiClient.uploadDocument(villaId, 'propertyTitle', file)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse.data)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/media/documents/${villaId}`),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })
})