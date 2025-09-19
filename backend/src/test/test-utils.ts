import request from 'supertest'
import { Express } from 'express'
import { vi } from 'vitest'

// Mock authentication middleware
export const mockAuthMiddleware = (userId = 'test-user-id') => {
  return vi.fn((req: any, res: any, next: any) => {
    req.user = {
      id: userId,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    }
    next()
  })
}

// Test request helpers
export class TestAgent {
  private app: Express
  private authToken: string

  constructor(app: Express, authToken = 'mock-auth-token') {
    this.app = app
    this.authToken = authToken
  }

  get(url: string) {
    return request(this.app)
      .get(url)
      .set('Authorization', `Bearer ${this.authToken}`)
  }

  post(url: string) {
    return request(this.app)
      .post(url)
      .set('Authorization', `Bearer ${this.authToken}`)
      .set('Content-Type', 'application/json')
  }

  put(url: string) {
    return request(this.app)
      .put(url)
      .set('Authorization', `Bearer ${this.authToken}`)
      .set('Content-Type', 'application/json')
  }

  delete(url: string) {
    return request(this.app)
      .delete(url)
      .set('Authorization', `Bearer ${this.authToken}`)
  }

  patch(url: string) {
    return request(this.app)
      .patch(url)
      .set('Authorization', `Bearer ${this.authToken}`)
      .set('Content-Type', 'application/json')
  }
}

// Mock data generators
export const generateMockVillaData = (overrides: Partial<any> = {}) => ({
  villaName: 'Test Villa',
  location: 'Test Location',
  description: 'A beautiful test villa',
  bedrooms: 3,
  bathrooms: 2,
  maxGuests: 6,
  pricePerNight: 200,
  currency: 'USD',
  amenities: ['WiFi', 'Pool', 'Kitchen'],
  houseRules: ['No smoking', 'No pets'],
  checkInTime: '15:00',
  checkOutTime: '11:00',
  ...overrides,
})

export const generateMockOwnerData = (overrides: Partial<any> = {}) => ({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  nationality: 'US',
  dateOfBirth: '1990-01-01',
  address: {
    street: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    country: 'US',
  },
  ...overrides,
})

export const generateMockOnboardingData = (step: number, overrides: Partial<any> = {}) => {
  const baseData = {
    currentStep: step,
    totalSteps: 10,
    completedSteps: Array.from({ length: step - 1 }, (_, i) => i + 1),
    progressPercentage: Math.round(((step - 1) / 10) * 100),
    status: step === 10 ? 'COMPLETED' : 'IN_PROGRESS',
  }

  const stepData: Record<number, any> = {
    1: { villaInfo: generateMockVillaData() },
    2: { ownerDetails: generateMockOwnerData() },
    3: {
      contractualDetails: {
        contractType: 'MANAGEMENT',
        commissionRate: 20,
        contractDuration: '12 months',
        terms: 'Standard terms and conditions',
      },
    },
    4: {
      bankDetails: {
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        routingNumber: '987654321',
        accountHolderName: 'John Doe',
        currency: 'USD',
      },
    },
    5: {
      otaCredentials: {
        airbnb: { username: 'test@airbnb.com', connected: true },
        booking: { username: 'test@booking.com', connected: false },
        vrbo: { username: 'test@vrbo.com', connected: true },
      },
    },
    6: {
      documents: {
        propertyTitle: { uploaded: true, url: 'https://example.com/title.pdf' },
        businessLicense: { uploaded: false, url: null },
        taxCertificate: { uploaded: true, url: 'https://example.com/tax.pdf' },
      },
    },
    7: {
      staffConfiguration: {
        villaManager: { name: 'Manager Name', phone: '+1234567890', email: 'manager@test.com' },
        housekeeper: { name: 'Housekeeper Name', phone: '+1234567891', email: 'housekeeper@test.com' },
      },
    },
    8: {
      facilities: [
        { name: 'Swimming Pool', category: 'Recreation', available: true },
        { name: 'WiFi', category: 'Technology', available: true },
        { name: 'Kitchen', category: 'Amenities', available: true },
      ],
    },
    9: {
      photos: {
        exterior: [{ url: 'https://example.com/exterior1.jpg', caption: 'Front view' }],
        interior: [{ url: 'https://example.com/interior1.jpg', caption: 'Living room' }],
        bedrooms: [{ url: 'https://example.com/bedroom1.jpg', caption: 'Master bedroom' }],
      },
    },
    10: {
      review: {
        completed: true,
        reviewedAt: new Date().toISOString(),
        notes: 'All information verified and approved',
      },
    },
  }

  return {
    ...baseData,
    stepData: stepData[step] || {},
    ...overrides,
  }
}

// API response matchers
export const expectSuccessResponse = (response: any, expectedData?: any) => {
  expect(response.status).toBe(200)
  expect(response.body).toHaveProperty('success', true)
  if (expectedData) {
    expect(response.body.data).toMatchObject(expectedData)
  }
}

export const expectErrorResponse = (response: any, expectedStatus: number, expectedMessage?: string) => {
  expect(response.status).toBe(expectedStatus)
  expect(response.body).toHaveProperty('success', false)
  if (expectedMessage) {
    expect(response.body.error).toContain(expectedMessage)
  }
}

// Database helpers
export const waitForDatabase = async (maxAttempts = 10, delay = 1000) => {
  const { prisma } = await import('./setup')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Database not ready after ${maxAttempts} attempts`)
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}