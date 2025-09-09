// API Client for PostgreSQL Backend (Client-side only)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Get Clerk token helper
async function getClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    // Server-side: no token available in this context
    return null;
  }

  try {
    console.log('🔐 Getting Clerk token...');
    
    // Wait for Clerk to be available
    const waitForClerk = (): Promise<any> => {
      return new Promise((resolve) => {
        if ((window as any).Clerk?.loaded) {
          resolve((window as any).Clerk);
        } else {
          const checkClerk = () => {
            if ((window as any).Clerk?.loaded) {
              resolve((window as any).Clerk);
            } else {
              setTimeout(checkClerk, 100);
            }
          };
          checkClerk();
        }
      });
    };

    const clerk = await waitForClerk();
    console.log('📋 Clerk loaded:', !!clerk);
    
    // Check if user is signed in
    if (!clerk.user) {
      return null;
    }

    // Get the session token
    const token = await clerk.session?.getToken();
    return token || null;
  } catch (error) {
    console.error('Error getting Clerk token:', error);
    return null;
  }
}

// Client-side API client for use in components
export class ClientApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(token?: string) {
    this.baseURL = API_URL;
    this.token = token || null;
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('🏗️  ClientApiClient created with base URL:', this.baseURL);
    }
  }

  // Set token manually (useful for components with useAuth hook)
  setToken(token: string | null) {
    this.token = token;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type if not FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Use manually set token first, then try to get from Clerk
    let authToken = this.token;
    if (!authToken) {
      authToken = await getClerkToken();
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      const fullUrl = `${this.baseURL}${endpoint}`;
      
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      // Check if response is JSON by looking at content-type
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      let data: any;
      if (isJson) {
        try {
          data = await response.json();
        } catch (parseError) {
          // If JSON parsing fails, treat as text response
          const textResponse = await response.text();
          console.error('JSON parsing failed:', parseError);
          return {
            success: false,
            error: `Invalid JSON response: ${textResponse.substring(0, 100)}...`,
          };
        }
      } else {
        // Non-JSON response (likely HTML error page or plain text)
        const textResponse = await response.text();
        
        // Handle common HTTP error responses
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || response.headers.get('x-ratelimit-reset');
          const errorMessage = retryAfter 
            ? `Rate limit exceeded. Please wait ${retryAfter} seconds and try again.`
            : 'Too many requests. Please wait a moment and try again.';
          
          return {
            success: false,
            error: errorMessage,
            status: 429,
            retryAfter: retryAfter ? parseInt(retryAfter) : null,
          };
        } else if (response.status === 403) {
          return {
            success: false,
            error: 'Access denied. You may not have permission to perform this action.',
          };
        } else if (response.status >= 400) {
          return {
            success: false,
            error: `Server error (${response.status}): ${textResponse.substring(0, 100)}`,
          };
        }
        
        // For non-error responses that aren't JSON
        data = { message: textResponse };
      }

      if (!response.ok) {
        // Special handling for rate limit errors
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || response.headers.get('x-ratelimit-reset');
          const errorMessage = retryAfter 
            ? `Rate limit exceeded. Please wait ${retryAfter} seconds and try again.`
            : data?.message || 'Too many requests. Please wait a moment and try again.';
          
          return {
            success: false,
            error: errorMessage,
            status: 429,
            retryAfter: retryAfter ? parseInt(retryAfter) : null,
          };
        }
        
        return {
          success: false,
          error: (data && data.error) || `HTTP error! status: ${response.status}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      // Handle network errors more gracefully
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // Only log once per 30 seconds to reduce console spam
        const now = Date.now();
        if (!window.__lastBackendErrorTime || now - window.__lastBackendErrorTime > 30000) {
          console.warn(`⚠️ Backend unavailable at ${this.baseURL}. Running in offline mode.`);
          window.__lastBackendErrorTime = now;
        }
        
        return {
          success: false,
          error: 'Backend unavailable',
          offline: true,
        };
      }
      
      // Log other errors normally
      console.error('API request failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Villa Management
  async getVillas() {
    return this.request('/api/villas');
  }

  async getVilla(id: string) {
    return this.request(`/api/villas/${id}`);
  }

  async createVilla(data: any) {
    // Use onboarding endpoint for villa creation during onboarding
    return this.request('/api/villas/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVilla(id: string, data: any) {
    return this.request(`/api/villas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getVillaProfile(id: string) {
    try {
      const response = await this.request(`/api/villas/${id}/profile`);
      
      if (!response.success) {
        console.error('Villa profile fetch failed:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to fetch villa profile',
          data: null
        };
      }
      
      // Validate that we have the expected data structure
      if (!response.data) {
        console.error('Villa profile data is missing');
        return {
          success: false,
          error: 'Villa profile data is missing',
          data: null
        };
      }
      
      const { villa, ownerDetails, contractualDetails, bankDetails, otaCredentials, documents, staff, facilities, photos, agreements, onboarding } = response.data;
      
      // Ensure we have a villa object at minimum
      if (!villa) {
        console.error('Villa information is missing from profile');
        return {
          success: false,
          error: 'Villa information is missing',
          data: null
        };
      }
      
      // Transform and ensure safe access to nested objects
      const transformedData = {
        villa: {
          id: villa.id || null,
          villaCode: villa.villaCode || 'N/A',
          villaName: villa.villaName || 'Unnamed Villa',
          villaAddress: villa.villaAddress || villa.address || '',
          villaCity: villa.villaCity || villa.city || '',
          villaPostalCode: villa.villaPostalCode || villa.zipCode || '',
          location: villa.location || '',
          address: villa.address || '',
          city: villa.city || '',
          country: villa.country || '',
          zipCode: villa.zipCode || '',
          latitude: villa.latitude || null,
          longitude: villa.longitude || null,
          bedrooms: villa.bedrooms || 0,
          bathrooms: villa.bathrooms || 0,
          maxGuests: villa.maxGuests || 0,
          propertySize: villa.propertySize || null,
          plotSize: villa.plotSize || null,
          landArea: villa.landArea || villa.plotSize || 0,
          villaArea: villa.villaArea || villa.propertySize || 0,
          yearBuilt: villa.yearBuilt || null,
          renovationYear: villa.renovationYear || null,
          propertyType: villa.propertyType || 'VILLA',
          villaStyle: villa.villaStyle || null,
          description: villa.description || '',
          shortDescription: villa.shortDescription || '',
          tags: Array.isArray(villa.tags) ? villa.tags : [],
          status: villa.status || 'DRAFT',
          isActive: villa.isActive !== undefined ? villa.isActive : true,
          createdAt: villa.createdAt || null,
          updatedAt: villa.updatedAt || null,
          googleCoordinates: villa.googleCoordinates || '',
          locationType: villa.locationType || '',
          googleMapsLink: villa.googleMapsLink || '',
          oldRatesCardLink: villa.oldRatesCardLink || '',
          iCalCalendarLink: villa.iCalCalendarLink || ''
        },
        ownerDetails: ownerDetails ? {
          ownerType: ownerDetails.ownerType || 'INDIVIDUAL',
          companyName: ownerDetails.companyName || '',
          companyAddress: ownerDetails.companyAddress || '',
          companyTaxId: ownerDetails.companyTaxId || '',
          companyVat: ownerDetails.companyVat || '',
          ownerFullName: ownerDetails.ownerFullName || '',
          ownerEmail: ownerDetails.ownerEmail || '',
          ownerPhone: ownerDetails.ownerPhone || '',
          ownerAddress: ownerDetails.ownerAddress || '',
          ownerCity: ownerDetails.ownerCity || '',
          ownerCountry: ownerDetails.ownerCountry || '',
          ownerNationality: ownerDetails.ownerNationality || '',
          ownerPassportNumber: ownerDetails.ownerPassportNumber || '',
          villaManagerName: ownerDetails.villaManagerName || '',
          villaManagerEmail: ownerDetails.villaManagerEmail || '',
          villaManagerPhone: ownerDetails.villaManagerPhone || '',
          propertyEmail: ownerDetails.propertyEmail || '',
          propertyWebsite: ownerDetails.propertyWebsite || '',
          ...ownerDetails
        } : null,
        contractualDetails: contractualDetails || null,
        bankDetails: bankDetails || null,
        otaCredentials: Array.isArray(otaCredentials) ? otaCredentials : [],
        documents: Array.isArray(documents) ? documents : [],
        staff: Array.isArray(staff) ? staff : [],
        facilities: Array.isArray(facilities) ? facilities : [],
        photos: Array.isArray(photos) ? photos : [],
        agreements: Array.isArray(agreements) ? agreements : [],
        onboarding: onboarding || null,
        recentBookings: [] // Temporarily empty as booking model is not available
      };
      
      console.log('✅ Villa profile loaded successfully:', transformedData.villa.villaName);
      return {
        success: true,
        data: transformedData,
        error: null
      };
      
    } catch (error) {
      console.error('💥 Villa profile fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while fetching villa profile',
        data: null
      };
    }
  }

  // Dashboard
  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }


  async getVillaManagementData(filters: {
    destination?: string;
    bedrooms?: number;
    status?: string;
    search?: string;
  } = {}, pagination: {
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    Object.entries(pagination).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    
    const queryString = params.toString();
    return this.request(`/api/dashboard/villas${queryString ? `?${queryString}` : ''}`);
  }

  async getOwnerManagementData(filters: {
    search?: string;
    nationality?: string;
  } = {}, pagination: {
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    Object.entries(pagination).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    
    const queryString = params.toString();
    return this.request(`/api/dashboard/owners${queryString ? `?${queryString}` : ''}`);
  }

  async getStaffManagementData(filters: {
    search?: string;
    position?: string;
    department?: string;
    villaId?: string;
  } = {}, pagination: {
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    Object.entries(pagination).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    
    const queryString = params.toString();
    return this.request(`/api/dashboard/staff${queryString ? `?${queryString}` : ''}`);
  }

  async getDocumentManagementData(filters: {
    search?: string;
    documentType?: string;
    villaId?: string;
  } = {}, pagination: {
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    Object.entries(pagination).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    
    const queryString = params.toString();
    return this.request(`/api/dashboard/documents${queryString ? `?${queryString}` : ''}`);
  }

  // Onboarding
  async startOnboarding(villaName?: string) {
    return this.request('/api/onboarding/start', {
      method: 'POST',
      body: JSON.stringify({ villaName: villaName || 'New Villa' }),
    });
  }

  async getOnboardingProgress(villaId: string) {
    return this.request(`/api/onboarding/${villaId}`);
  }

  async updateOnboardingProgress(villaId: string, data: any) {
    return this.request(`/api/onboarding/${villaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async saveOnboardingStep(villaId: string, step: number, data: any, isAutoSave?: boolean) {
    const headers: any = {};
    if (isAutoSave) {
      headers['X-Auto-Save'] = 'true';
    }
    
    // Determine if step should be marked as completed based on validation
    let completed = !isAutoSave; // Default behavior for manual saves
    
    if (isAutoSave) {
      // For auto-saves, check if the step data is valid and complete
      try {
        // Import validation function dynamically to avoid circular dependencies
        const { validateStepData } = await import('../components/onboarding/stepConfig');
        const validation = validateStepData(step, data);
        completed = validation.isValid && Object.keys(validation.errors).length === 0;
        console.log(`🏦 Auto-save validation for step ${step}:`, {
          isValid: validation.isValid,
          errorCount: Object.keys(validation.errors).length,
          errors: validation.errors,
          completed,
          data: Object.keys(data)
        });
      } catch (error) {
        console.warn('Could not validate step data for completion check:', error);
        completed = false; // Conservative approach - don't mark as completed if validation fails
      }
    }
    
    return this.request(`/api/onboarding/${villaId}/step`, {
      method: 'PUT',
      body: JSON.stringify({ step, data, completed, isAutoSave }),
      headers,
    });
  }

  // Field-level auto-save methods
  async saveFieldProgress(villaId: string, step: number, field: string, value: any) {
    return this.request(`/api/onboarding/${villaId}/field-progress/${step}/${field}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
      headers: { 'X-Auto-Save': 'true' },
    });
  }

  async getFieldProgress(villaId: string, step: number) {
    return this.request(`/api/onboarding/${villaId}/field-progress/${step}`);
  }

  async completeOnboarding(villaId: string) {
    return this.request(`/api/onboarding/${villaId}/complete`, {
      method: 'POST',
    });
  }

  async validateOnboardingStep(villaId: string, step: number) {
    return this.request(`/api/onboarding/${villaId}/validate/${step}`);
  }


  // Villa Profile methods (missing from original)
  async updateBankDetails(villaId: string, data: any) {
    return this.request(`/api/villas/${villaId}/bank-details`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateContractualDetails(villaId: string, data: any) {
    return this.request(`/api/villas/${villaId}/contractual-details`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadDocument(villaId: string, formData: FormData) {
    return this.request(`/api/villas/${villaId}/documents`, {
      method: 'POST',
      body: formData,
    });
  }

  async deleteDocument(villaId: string, documentId: string) {
    return this.request(`/api/villas/${villaId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  async updateFacilities(villaId: string, data: any) {
    return this.request(`/api/villas/${villaId}/facilities`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateOTACredentials(villaId: string, data: any) {
    return this.request(`/api/villas/${villaId}/ota-credentials`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateOwnerDetails(villaId: string, data: any) {
    return this.request(`/api/villas/${villaId}/owner-details`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadPhoto(villaId: string, formData: FormData) {
    return this.request(`/api/villas/${villaId}/photos`, {
      method: 'POST',
      body: formData,
    });
  }

  // Admin approval methods removed in production

  async deletePhoto(villaId: string, photoId: string) {
    return this.request(`/api/villas/${villaId}/photos/${photoId}`, {
      method: 'DELETE',
    });
  }


  async addStaffMember(villaId: string, data: any) {
    return this.request(`/api/villas/${villaId}/staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteStaffMember(villaId: string, staffId: string) {
    return this.request(`/api/villas/${villaId}/staff/${staffId}`, {
      method: 'DELETE',
    });
  }

  // SharePoint Integration API
  async syncVillaWithSharePoint(villaId: string) {
    return this.request(`/api/sharepoint/sync-villa/${villaId}`, {
      method: 'POST',
    });
  }

  async syncDocumentWithSharePoint(documentId: string) {
    return this.request(`/api/sharepoint/sync-document/${documentId}`, {
      method: 'POST',
    });
  }

  async getSharePointStatus() {
    return this.request('/api/sharepoint/status');
  }

  // SharePoint Content API
  async getSharePointPhotos(villaId: string) {
    return this.request(`/api/photos/sharepoint/${villaId}`);
  }

  async getSharePointDocuments(villaId: string) {
    return this.request(`/api/documents/sharepoint/${villaId}`);
  }

  // Dashboard Onboarding Progress API
  async get(endpoint: string) {
    return this.request(endpoint);
  }
}

export const clientApi = new ClientApiClient();