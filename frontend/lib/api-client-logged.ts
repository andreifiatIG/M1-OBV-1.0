// API Client with integrated clean logging
import { logger, LogCategory } from './logger';
import { ClientApiClient, ApiResponse } from './api-client';

export class LoggedApiClient extends ClientApiClient {
  constructor(token?: string) {
    super(token);
    logger.info(LogCategory.API, 'API Client initialized', { baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001' });
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const method = options.method || 'GET';
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Log request start
    logger.startGroup(requestId, `${method} ${endpoint}`);
    logger.apiRequest(endpoint, method, options.body ? JSON.parse(options.body as string) : undefined);

    try {
      const startTime = performance.now();
      const response = await super.request<T>(endpoint, options);
      const duration = performance.now() - startTime;

      // Log successful response
      if (response.success) {
        logger.apiResponse(endpoint, 200, { duration: `${duration.toFixed(2)}ms`, dataKeys: response.data ? Object.keys(response.data) : [] });
      } else {
        logger.apiResponse(endpoint, 400, { error: response.error, duration: `${duration.toFixed(2)}ms` });
      }

      logger.endGroup(requestId);
      return response;
    } catch (error: any) {
      // Log error
      logger.error(LogCategory.API, `Request failed: ${endpoint}`, { error: error.message }, requestId);
      logger.endGroup(requestId);
      throw error;
    }
  }

  // Onboarding specific methods with logging
  async startOnboarding(userId: string, villaData: any): Promise<ApiResponse> {
    logger.onboardingStep('Start', 'Initializing', { userId });
    return this.request('/api/onboarding/start', {
      method: 'POST',
      body: JSON.stringify({ userId, ...villaData }),
    });
  }

  async saveOnboardingStep(villaId: string, step: string, data: any): Promise<ApiResponse> {
    const timer = logger.startTimer(`Save ${step}`);
    logger.onboardingStep(step, 'Saving', { villaId, dataSize: JSON.stringify(data).length });
    
    const response = await this.request(`/api/onboarding/${villaId}/step`, {
      method: 'PUT',
      body: JSON.stringify({ step, data }),
    });
    
    timer();
    
    if (response.success) {
      logger.onboardingStep(step, 'Saved', { villaId });
    } else {
      logger.error(LogCategory.ONBOARDING, `Failed to save ${step}`, { villaId, error: response.error });
    }
    
    return response;
  }

  async loadOnboardingData(villaId: string): Promise<ApiResponse> {
    logger.onboardingStep('Load', 'Loading all data', { villaId });
    return this.request(`/api/onboarding/${villaId}`);
  }

  async uploadDocument(villaId: string, file: File, documentType: string): Promise<ApiResponse> {
    logger.fileUpload(file.name, file.size, true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('villaId', villaId);

    return this.request('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async uploadPhoto(villaId: string, file: File, category: string, subfolder?: string): Promise<ApiResponse> {
    logger.fileUpload(file.name, file.size, true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('villaId', villaId);
    if (subfolder) {
      formData.append('subfolder', subfolder);
    }

    return this.request('/api/photos/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async saveStaffMembers(villaId: string, staffMembers: any[]): Promise<ApiResponse> {
    logger.onboardingStep('Staff', 'Saving staff members', { villaId, count: staffMembers.length });
    return this.request(`/api/staff/bulk`, {
      method: 'POST',
      body: JSON.stringify({ villaId, staffMembers }),
    });
  }

  async saveFacilities(villaId: string, facilities: any[]): Promise<ApiResponse> {
    logger.onboardingStep('Facilities', 'Saving facilities checklist', { villaId, count: facilities.length });
    return this.request(`/api/facilities/${villaId}`, {
      method: 'PUT',
      body: JSON.stringify({ facilities }),
    });
  }

  // Batch operations with logging
  async batchSave(operations: Array<{endpoint: string; data: any; priority?: number}>): Promise<ApiResponse[]> {
    logger.autoSave('Batch operation', operations.length, true);
    
    const promises = operations.map(op => 
      this.request(op.endpoint, {
        method: 'PUT',
        body: JSON.stringify(op.data),
      })
    );

    try {
      const results = await Promise.allSettled(promises);
      
      const responses = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          logger.error(LogCategory.AUTOSAVE, `Batch operation failed for ${operations[index].endpoint}`, { reason: result.reason });
          return {
            success: false,
            error: result.reason.message || 'Batch operation failed',
          };
        }
      });

      const successCount = responses.filter(r => r.success).length;
      logger.autoSave('Batch completed', operations.length, successCount === operations.length);
      logger.info(LogCategory.AUTOSAVE, `Batch results: ${successCount}/${operations.length} successful`);
      
      return responses;
    } catch (error) {
      logger.error(LogCategory.AUTOSAVE, 'Batch save failed', { error });
      throw error;
    }
  }
}

// Export a singleton instance for consistent usage
export const loggedApiClient = new LoggedApiClient();