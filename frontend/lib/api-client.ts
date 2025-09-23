// API Client for PostgreSQL Backend (Client-side only)
import {
  canonicalizeStepData,
  safeValidateStepPayload,
  validateStepPayload,
  type OnboardingStep,
} from '@contract/onboardingContract';
import { assertOnboardingStep, mapOnboardingDataToBackend, mapOnboardingDataFromBackend } from './data-mapper';
import {
  mapVillaBackendToFrontend,
  mapVillaFrontendToBackend,
  mapOwnerBackendToFrontend,
  mapOwnerFrontendToBackend,
  debugFieldMapping,
  validateFieldMappingCompleteness,
  type BackendVillaFields,
  type BackendOwnerFields,
  type FrontendVillaFields,
  type FrontendOwnerFields,
} from './fieldMappings';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;    // HTTP status code
  offline?: boolean;  // Offline mode indicator
  version?: number;
  retryAfter?: number | null;
  [key: string]: unknown;
}

// Get Clerk token helper
async function getClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    // Server-side: no token available in this context
    return null;
  }

  try {
    // Wait for Clerk to be available
    const waitForClerk = (): Promise<{ loaded: boolean; user?: unknown; session?: { getToken(): Promise<string> } }> => {
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
    // Clerk loaded
    
    // Check if user is signed in
    if (!clerk.user) {
      return null;
    }

    // Get the session token
    const token = await clerk.session?.getToken();
    return token || null;
  } catch (error) {
    // Remove console.error in production, should be handled by error reporting service
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting Clerk token:', error);
    }
    return null;
  }
}

// Client-side API client for use in components
export class ClientApiClient {
  private readonly baseURL: string;
  private token: string | null = null;
  private tokenExpiryTime: number | null = null;
  private isRefreshingToken: boolean = false;
  private tokenRefreshPromise: Promise<string | null> | null = null;
  private readonly progressCache = new Map<string, { timestamp: number; response: ApiResponse }>();
  private readonly progressInFlight = new Map<string, Promise<ApiResponse>>();
  private static readonly PROGRESS_CACHE_TTL = 30 * 1000;

  constructor(token?: string) {
    this.baseURL = API_URL;
    this.token = token || null;
    // Set token expiry to 45 minutes from now (Clerk tokens expire after 1 hour)
    if (token) {
      this.tokenExpiryTime = Date.now() + (45 * 60 * 1000);
    }
  }

  // Set token manually (useful for components with useAuth hook)
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      this.tokenExpiryTime = Date.now() + (45 * 60 * 1000);
    } else {
      this.tokenExpiryTime = null;
    }
  }

  // Check if token needs refresh
  private needsTokenRefresh(): boolean {
    if (!this.token || !this.tokenExpiryTime) return false;
    // Refresh token 5 minutes before expiry
    return Date.now() > (this.tokenExpiryTime - (5 * 60 * 1000));
  }

  // Refresh token if needed
  private async refreshTokenIfNeeded(): Promise<string | null> {
    if (!this.needsTokenRefresh()) {
      return this.token;
    }

    // Prevent multiple concurrent refresh attempts
    if (this.isRefreshingToken && this.tokenRefreshPromise) {
      return await this.tokenRefreshPromise;
    }

    this.isRefreshingToken = true;
    this.tokenRefreshPromise = this.attemptTokenRefresh();

    try {
      const newToken = await this.tokenRefreshPromise;
      this.setToken(newToken);
      return newToken;
    } finally {
      this.isRefreshingToken = false;
      this.tokenRefreshPromise = null;
    }
  }

  // Attempt to refresh the token
  private async attemptTokenRefresh(): Promise<string | null> {
    try {
      return await getClerkToken();
    } catch {
      // Silent token refresh failure - should be handled by error reporting service
      return null;
    }
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

    // Get fresh token - refresh if needed
    let authToken = await this.refreshTokenIfNeeded();
    if (!authToken) {
      authToken = await getClerkToken();
      this.setToken(authToken);
    }

    // Remove logging in production - should use structured logging service
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('API Request:', { endpoint, hasToken: !!authToken, tokenLength: authToken?.length });
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else {
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.warn('No authentication token available for API request to:', endpoint);
      }
    }

    const debugLoggingEnabled =
      process.env.NODE_ENV === 'development' &&
      process.env.NEXT_PUBLIC_DEBUG === 'true';

    try {
      const fullUrl = `${this.baseURL}${endpoint}`;
      
      if (debugLoggingEnabled) {
        console.log('Making request to:', fullUrl);
      }
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      if (debugLoggingEnabled) {
        console.log('Response received:', { 
          status: response.status, 
          statusText: response.statusText,
          ok: response.ok 
        });
      }

      if (!response) {
        throw new Error('Network error');
      }

      const getHeader = (name: string): string | null => {
        const headerSource = (response as unknown as { headers?: unknown }).headers;
        if (headerSource && typeof (headerSource as Headers).get === 'function') {
          return (headerSource as Headers).get(name);
        }
        if (headerSource && typeof headerSource === 'object') {
          const lookup = headerSource as Record<string, string | undefined>;
          const direct = lookup[name];
          if (typeof direct === 'string') {
            return direct;
          }
          const lowerCase = lookup[name.toLowerCase()];
          return typeof lowerCase === 'string' ? lowerCase : null;
        }
        return null;
      };

      const readTextBody = async () => {
        if (typeof (response as Response).text === 'function') {
          return await (response as Response).text();
        }
        return '';
      };

      const readJsonBody = async () => {
        if (typeof (response as Response).json === 'function') {
          return await (response as Response).json();
        }
        const fallbackText = await readTextBody();
        try {
          return fallbackText ? JSON.parse(fallbackText) : {};
        } catch (parseError) {
          if (debugLoggingEnabled) {
            console.error('JSON parsing failed from fallback text:', parseError);
          }
          throw parseError;
        }
      };

      // Check if response is JSON by looking at content-type
      const contentType = getHeader('content-type');
      const isJson =
        (contentType && contentType.includes('application/json')) ||
        typeof (response as Response).json === 'function';
      
      let data: any;
      if (isJson) {
        try {
          data = await readJsonBody();
        } catch (parseError) {
          // If JSON parsing fails, treat as text response
          const textResponse = await readTextBody();
          if (debugLoggingEnabled) {
            console.error('JSON parsing failed:', parseError);
          }
          return {
            success: false,
            error: `Invalid JSON response: ${textResponse.substring(0, 100)}...`,
          };
        }
      } else {
        // Non-JSON response (likely HTML error page or plain text)
        const textResponse = await readTextBody();
        
        // Handle common HTTP error responses
        if (response.status === 429) {
          const retryAfter = getHeader('retry-after') || getHeader('x-ratelimit-reset');
          const errorMessage = retryAfter 
            ? `Rate limit exceeded. Please wait ${retryAfter} seconds and try again.`
            : 'Too many requests. Please wait a moment and try again.';
          
          const retryAfterValue = retryAfter
            ? parseInt(retryAfter, 10)
            : null;
          return {
            success: false,
            error: errorMessage,
            status: 429,
            retryAfter: retryAfterValue,
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
          const retryAfter = getHeader('retry-after') || getHeader('x-ratelimit-reset');
          const errorMessage = retryAfter
            ? `Rate limit exceeded. Please wait ${retryAfter} seconds and try again.`
            : data?.message || 'Too many requests. Please wait a moment and try again.';
          const retryAfterValue = retryAfter
            ? parseInt(retryAfter, 10)
            : typeof (data as { retryAfter?: number })?.retryAfter === 'number'
              ? (data as { retryAfter?: number }).retryAfter
              : null;
          return {
            success: false,
            error: errorMessage,
            status: 429,
            retryAfter: retryAfterValue,
          };
        }
        
        return {
          success: false,
          error: (data && (data.error || data.message)) || `HTTP error! status: ${response.status}`,
          status: response.status,
          ...data,
        };
      }

      if (
        data &&
        typeof data === 'object' &&
        Object.prototype.hasOwnProperty.call(data, 'success')
      ) {
        return data as ApiResponse<T>;
      }

      const payload =
        data && Object.prototype.hasOwnProperty.call(data, 'data')
          ? (data as { data: T }).data
          : data;
      const metadata = { ...((typeof data === 'object' && data) || {}) };
      if (metadata && Object.prototype.hasOwnProperty.call(metadata, 'data')) {
        delete (metadata as Record<string, unknown>).data;
      }

      return {
        success: true,
        data: payload,
        ...metadata,
      };
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : 'Network error';
      const isNetworkError =
        /network error/i.test(message) || /failed to fetch/i.test(message);

      if (isNetworkError) {
        return {
          success: false,
          error: message,
          offline: true,
        };
      }

      console.error('API request failed:', error);

      return {
        success: false,
        error: message,
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

  async createVilla(data: Record<string, unknown>) {
    // Use onboarding endpoint for villa creation during onboarding
    return this.request('/api/villas/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVilla(id: string, data: Record<string, unknown>) {
    return this.request(`/api/villas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUserVilla() {
    try {
      const villasResponse = await this.getVillas();
      if (!villasResponse.success || !villasResponse.data || (villasResponse.data as any[]).length === 0) {
        return {
          success: false,
          error: 'No villas found for current user',
          data: null
        };
      }
      
      // Get the first villa (or the active one)
      const villa = (villasResponse.data as any[])[0];
      return await this.getVillaProfile(villa.id);
    } catch (error) {
      console.error('Error getting current user villa:', error);
      return {
        success: false,
        error: 'Failed to get current user villa',
        data: null
      };
    }
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
      
      const { villa, ownerDetails, contractualDetails, bankDetails, otaCredentials, documents, staff, facilities, photos, agreements, onboarding } = response.data as any;
      
      // Extract nested data from villa object if it exists
      const actualStaff = staff || villa?.staff || [];
      const actualFacilities = facilities || villa?.facilities || [];
      const actualPhotos = photos || villa?.photos || [];
      const actualDocuments = documents || villa?.documents || [];
      
      console.log('[API-CLIENT] Staff data extraction:', {
        staffFromRoot: staff?.length || 0,
        staffFromVilla: villa?.staff?.length || 0,
        actualStaffCount: actualStaff.length,
        villaId: villa?.id
      });
      
      // Ensure we have a villa object at minimum
      if (!villa) {
        console.error('Villa information is missing from profile');
        return {
          success: false,
          error: 'Villa information is missing',
          data: null
        };
      }
      
      // 🔧 FIXED: Using unified field mapping system to eliminate field mapping chaos
      // This replaces the complex fallback logic with single source of truth transformations

      // Use unified field mapping for villa data transformation
      const mappedVillaData = mapVillaBackendToFrontend(villa as BackendVillaFields);

      // Use unified field mapping for owner data transformation
      const mappedOwnerData = ownerDetails ? mapOwnerBackendToFrontend(ownerDetails as BackendOwnerFields) : null;

      const transformedData = {
        villa: {
          // Use mapped data as base
          ...mappedVillaData,

          // Add system fields and defaults that need special handling
          id: villa.id || null,
          villaCode: villa.villaCode || 'N/A',
          villaName: villa.villaName || 'Unnamed Villa',

          // Ensure string defaults for UI consumption
          description: villa.description || '',
          shortDescription: villa.shortDescription || '',
          googleMapsLink: villa.googleMapsLink || '',
          oldRatesCardLink: villa.oldRatesCardLink || '',
          iCalCalendarLink: villa.iCalCalendarLink || '',

          // System fields
          tags: Array.isArray(villa.tags) ? villa.tags : [],
          status: villa.status || 'DRAFT',
          isActive: villa.isActive !== undefined ? villa.isActive : true,
          createdAt: villa.createdAt || null,
          updatedAt: villa.updatedAt || null,

          // Generate combined coordinates for display
          googleCoordinates: villa.latitude && villa.longitude
            ? `${villa.latitude}, ${villa.longitude}`
            : '',
        },
        ownerDetails: mappedOwnerData ? {
          // Use mapped data as base
          ...mappedOwnerData,

          // Add any additional fields that need special handling
          ownerType: ownerDetails.ownerType || 'INDIVIDUAL',

          // Legacy field compatibility (if needed)
          ownerFullName: ownerDetails.ownerFullName ||
            `${ownerDetails.firstName || ''} ${ownerDetails.lastName || ''}`.trim() || '',
          ownerEmail: ownerDetails.ownerEmail || ownerDetails.email || '',
          ownerPhone: ownerDetails.ownerPhone || ownerDetails.phone || '',
          ownerAddress: ownerDetails.ownerAddress || ownerDetails.address || '',
          ownerCity: ownerDetails.ownerCity || ownerDetails.city || '',
          ownerCountry: ownerDetails.ownerCountry || ownerDetails.country || '',
          ownerNationality: ownerDetails.ownerNationality || ownerDetails.nationality || '',
          ownerPassportNumber: ownerDetails.ownerPassportNumber || ownerDetails.passportNumber || '',
          villaManagerName: ownerDetails.villaManagerName || ownerDetails.managerName || '',
          villaManagerEmail: ownerDetails.villaManagerEmail || ownerDetails.managerEmail || '',
          villaManagerPhone: ownerDetails.villaManagerPhone || ownerDetails.managerPhone || '',

          // Include any remaining owner fields
          ...ownerDetails
        } : null,
        contractualDetails: contractualDetails || null,
        bankDetails: bankDetails || null,
        otaCredentials: Array.isArray(otaCredentials) ? otaCredentials : [],
        documents: Array.isArray(actualDocuments) ? actualDocuments : [],
        staff: Array.isArray(actualStaff) ? actualStaff : [],
        facilities: Array.isArray(actualFacilities) ? actualFacilities : [],
        photos: Array.isArray(actualPhotos) ? actualPhotos : [],
        agreements: Array.isArray(agreements) ? agreements : [],
        onboarding: onboarding || null,
        recentBookings: [] // Temporarily empty as booking model is not available
      };

      // Add debug logging for field mapping in development
      debugFieldMapping(villa, transformedData.villa, "API Client Villa Profile Backend → Frontend");
      if (ownerDetails && mappedOwnerData) {
        debugFieldMapping(ownerDetails, mappedOwnerData, "API Client Owner Details Backend → Frontend");
      }

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
      body: JSON.stringify({ villaName: villaName || '' }),
    });
  }

  async getOnboardingProgress(
    villaId: string,
    options: { forceRefresh?: boolean } = {}
  ) {
    const cacheKey = villaId;

    if (!options.forceRefresh) {
      const cached = this.progressCache.get(cacheKey);
      if (
        cached &&
        Date.now() - cached.timestamp < ClientApiClient.PROGRESS_CACHE_TTL
      ) {
        return this.cloneApiResponse(cached.response);
      }
    }

    if (this.progressInFlight.has(cacheKey)) {
      return this.progressInFlight.get(cacheKey)!;
    }

    const fetchPromise = this.fetchOnboardingProgressWithRetry(villaId);
    this.progressInFlight.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      if (result.success) {
        this.progressCache.set(cacheKey, {
          timestamp: Date.now(),
          response: this.cloneApiResponse(result),
        });
      }
      return result;
    } finally {
      this.progressInFlight.delete(cacheKey);
    }
  }

  private cloneApiResponse(response: ApiResponse): ApiResponse {
    const cloned: ApiResponse = { ...response };
    if (response.data !== undefined) {
      cloned.data =
        typeof response.data === 'object' && response.data !== null
          ? JSON.parse(JSON.stringify(response.data))
          : response.data;
    }
    return cloned;
  }

  private async fetchOnboardingProgressWithRetry(
    villaId: string,
    maxAttempts = 3
  ): Promise<ApiResponse> {
    let lastResult: ApiResponse | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await this.request(`/api/onboarding/${villaId}/progress`, {
        method: 'GET',
      });
      const transformed = this.transformProgressData(result);
      if (transformed.success) {
        return transformed;
      }

      lastResult = transformed;

      const status = (transformed as { status?: number }).status;
      const shouldRetryAuth =
        status === 401 && this.token !== null && attempt < maxAttempts;
      const shouldRetry =
        transformed.offline === true ||
        (typeof transformed.error === 'string' &&
          /network error/i.test(transformed.error ?? '')) ||
        shouldRetryAuth;

      if (!shouldRetry || attempt === maxAttempts) {
        return transformed;
      }

      if (shouldRetryAuth) {
        this.setToken(null);
      }

      const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return lastResult ?? { success: false, error: 'Unknown error occurred' };
  }

  private pruneEmptyValues(input: Record<string, unknown>): Record<string, unknown> {
    const pruned: Record<string, unknown> = {};
    Object.entries(input).forEach(([key, val]) => {
      if (val === '' || val === null || val === undefined) {
        return;
      }
      if (Array.isArray(val) && val.length === 0) {
        return;
      }
      pruned[key] = val;
    });
    return pruned;
  }

  private transformProgressData(result: ApiResponse): ApiResponse {
    if (!result.success || !result.data || typeof result.data !== 'object') {
      return result;
    }

    const data = Array.isArray(result.data)
      ? result.data
      : { ...(result.data as Record<string, unknown>) };

    if (
      data &&
      typeof (data as Record<string, unknown>).stepData === 'object' &&
      (data as Record<string, unknown>).stepData !== null
    ) {
      const rawStepData = (data as Record<string, unknown>)
        .stepData as Record<string, unknown>;
      const mappedStepData: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(rawStepData)) {
        const match = key.match(/step(?:_|)?(\d+)/i);
        const fallbackNumeric = /^[0-9]+$/.test(key) ? parseInt(key, 10) : NaN;
        const stepNumber = match
          ? parseInt(match[1], 10)
          : fallbackNumeric;

        if (
          Number.isFinite(stepNumber) &&
          typeof value === 'object' &&
          value !== null
        ) {
          const mapped = mapOnboardingDataFromBackend(
            stepNumber,
            value as Record<string, unknown>
          );
          mappedStepData[key] = this.pruneEmptyValues(
            mapped as Record<string, unknown>
          );
        } else {
          mappedStepData[key] = value;
        }
      }

      (data as Record<string, unknown>).stepData = mappedStepData;
    }

    return {
      ...result,
      data,
    };
  }

  async getOnboardingProgressSummary(villaId: string) {
    return this.request(`/api/onboarding/${villaId}/summary`);
  }

  async updateOnboardingProgress(villaId: string, data: Record<string, unknown>) {
    return this.request(`/api/onboarding/${villaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async saveOnboardingStep(villaId: string, step: number, data: Record<string, unknown>, options: { version?: number } = {}) {
    const typedStep: OnboardingStep = assertOnboardingStep(step);

    const shouldApplyMapping = typedStep === 1;

    let normalizedPayload: Record<string, unknown>;
    if (shouldApplyMapping) {
      try {
        // 🔧 FIXED: Enhanced field transformation for step 1 to handle frontend field names
        // Transform frontend field names to backend format before processing
        const frontendData = data as any;
        const backendTransformed = {
          // Core villa information
          villaName: frontendData.villaName,

          // Address fields - map frontend names to backend names
          address: frontendData.address || frontendData.villaAddress,
          city: frontendData.city || frontendData.villaCity,
          country: frontendData.country || frontendData.villaCountry,
          zipCode: frontendData.zipCode || frontendData.villaPostalCode,

          // Property size fields - map frontend names to backend names
          propertySize: frontendData.propertySize || frontendData.villaArea,
          plotSize: frontendData.plotSize || frontendData.landArea,

          // Numeric fields (ensure proper type conversion)
          bedrooms: frontendData.bedrooms !== undefined ? Number(frontendData.bedrooms) : undefined,
          bathrooms: frontendData.bathrooms !== undefined ? Number(frontendData.bathrooms) : undefined,
          maxGuests: frontendData.maxGuests !== undefined ? Number(frontendData.maxGuests) : undefined,
          yearBuilt: frontendData.yearBuilt !== undefined ? Number(frontendData.yearBuilt) : undefined,
          renovationYear: frontendData.renovationYear !== undefined ? Number(frontendData.renovationYear) : undefined,

          // Coordinate fields
          latitude: frontendData.latitude !== undefined ? Number(frontendData.latitude) : undefined,
          longitude: frontendData.longitude !== undefined ? Number(frontendData.longitude) : undefined,

          // Handle googleCoordinates field
          googleCoordinates: frontendData.googleCoordinates,

          // Text fields
          propertyType: frontendData.propertyType,
          villaStyle: frontendData.villaStyle,
          description: frontendData.description,
          shortDescription: frontendData.shortDescription,
          locationType: frontendData.locationType,

          // URL fields
          googleMapsLink: frontendData.googleMapsLink,
          oldRatesCardLink: frontendData.oldRatesCardLink,
          iCalCalendarLink: frontendData.iCalCalendarLink,
          propertyEmail: frontendData.propertyEmail,
          propertyWebsite: frontendData.propertyWebsite,
        };

        // Remove undefined values to prevent issues
        const cleanedData = Object.fromEntries(
          Object.entries(backendTransformed).filter(([_, value]) => value !== undefined)
        );

        const transformedData = mapOnboardingDataToBackend(step, cleanedData);
        const canonical = canonicalizeStepData(typedStep, transformedData);
        normalizedPayload = validateStepPayload(typedStep, canonical, false);

        if (
          process.env.NODE_ENV === 'development' &&
          process.env.NEXT_PUBLIC_DEBUG === 'true'
        ) {
          console.log('🗺️ API Client Field Transformation:', {
            originalData: data,
            backendTransformed: cleanedData,
            finalPayload: normalizedPayload
          });
          debugFieldMapping(
            data,
            normalizedPayload,
            `API Client Step ${step} Save Transform`
          );
        }
      } catch (error) {
        console.warn(
          'Failed to normalize onboarding payload, sending raw data as fallback',
          {
            step,
            error,
          }
        );
        normalizedPayload = data;
      }

      if (
        normalizedPayload &&
        typeof normalizedPayload === 'object' &&
        Object.keys(normalizedPayload).length === 0
      ) {
        normalizedPayload = data;
      }
    } else {
      normalizedPayload = data;
    }

    const payloadForRequest = shouldApplyMapping
      ? (() => {
          const completionCheck = safeValidateStepPayload(
            typedStep,
            normalizedPayload,
            true
          );
          return completionCheck.success
            ? completionCheck.data
            : normalizedPayload;
        })()
      : normalizedPayload;

    const requestData = payloadForRequest;

    const requestBody: Record<string, unknown> = {
      step: typedStep,
      data: requestData,
    };

    if (typeof options.version === 'number') {
      requestBody.version = options.version;
    }

    this.progressCache.delete(villaId);
    return this.request(`/api/onboarding/${villaId}/step`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async autoSaveOnboardingStep(
    villaId: string,
    step: number,
    data: Record<string, unknown>,
    version?: number,
    metadata: { operationId?: string | number; clientTimestamp?: string } = {}
  ) {
    const typedStep: OnboardingStep = assertOnboardingStep(step);

    const headers: Record<string, string> = {
      'X-Auto-Save': 'true',
    };
    if (typeof version === 'number') {
      headers['If-Match'] = version.toString();
    }

    const requestBody: Record<string, unknown> = {
      step: typedStep,
      data,
    };

    if (typeof version === 'number') {
      requestBody.version = version;
    }

    if (metadata.operationId !== undefined) {
      requestBody.operationId = metadata.operationId;
    }

    if (metadata.clientTimestamp) {
      requestBody.clientTimestamp = metadata.clientTimestamp;
    }

    this.progressCache.delete(villaId);
    return this.request(`/api/onboarding/${villaId}/autosave`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers,
    });
  }

  async batchAutoSave(
    villaId: string,
    operations: Array<{ step: number; data: Record<string, unknown> }>
  ) {
    const normalizedOperations = operations.map((operation) => ({
      step: assertOnboardingStep(operation.step),
      data: operation.data,
    }));

    this.progressCache.delete(villaId);
    return this.request(`/api/onboarding/${villaId}/batch-autosave`, {
      method: 'POST',
      body: JSON.stringify({ operations: normalizedOperations }),
      headers: {
        'X-Auto-Save': 'true',
      },
    });
  }

  // Field-level auto-save methods
  async saveFieldProgress(villaId: string, step: number, field: string, value: unknown) {
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
    this.progressCache.delete(villaId);
    return this.request(`/api/onboarding/${villaId}/complete`, {
      method: 'POST',
    });
  }

  async submitOnboarding(villaId: string, data: Record<string, unknown>) {
    this.progressCache.delete(villaId);
    return this.request(`/api/onboarding/${villaId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async validateOnboardingStep(villaId: string, step: number) {
    return this.request(`/api/onboarding/${villaId}/validate/${step}`);
  }


  // Villa Profile methods (missing from original)
  async updateBankDetails(villaId: string, data: Record<string, unknown>) {
    return this.request(`/api/villas/${villaId}/bank-details`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateContractualDetails(villaId: string, data: Record<string, unknown>) {
    return this.request(`/api/villas/${villaId}/contractual-details`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadDocument(villaId: string, formData: FormData): Promise<ApiResponse<any>>;
  async uploadDocument(villaId: string, documentType: string, file: File): Promise<ApiResponse<any>>;
  async uploadDocument(villaId: string, formDataOrType: FormData | string, file?: File) {
    const formData = formDataOrType instanceof FormData ? formDataOrType : (() => {
      const payload = new FormData();
      payload.append('documentType', formDataOrType);
      if (file) {
        payload.append('file', file);
      }
      return payload;
    })();

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

  async updateFacilities(villaId: string, data: Record<string, unknown>) {
    return this.request(`/api/villas/${villaId}/facilities`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateOTACredentials(villaId: string, data: Record<string, unknown>) {
    return this.request(`/api/villas/${villaId}/ota-credentials`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateOwnerDetails(villaId: string, data: Record<string, unknown>) {
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


  async addStaffMember(villaId: string, data: Record<string, unknown>) {
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

  async getVillaDocuments(villaId: string) {
    return this.request(`/api/documents/villa/${villaId}`);
  }

  // Staff API methods
  async getVillaStaff(villaId: string) {
    return this.request(`/api/staff/villa/${villaId}`);
  }

  async createStaff(staffData: Record<string, unknown>) {
    return this.request('/api/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    });
  }

  async updateStaff(staffId: string, staffData: Record<string, unknown>) {
    return this.request(`/api/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify(staffData),
    });
  }

  async deleteStaff(staffId: string) {
    return this.request(`/api/staff/${staffId}`, {
      method: 'DELETE',
    });
  }

  // Dashboard Onboarding Progress API
  async get(endpoint: string) {
    return this.request(endpoint);
  }
}

export const clientApi = new ClientApiClient();
