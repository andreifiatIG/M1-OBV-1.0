/**
 * Helper utilities for photo upload with batch processing and retry logic
 */

export interface UploadOptions {
  maxRetries?: number;
  timeout?: number;
  onProgress?: (progress: number) => void;
}

/**
 * Upload files with retry logic and timeout handling
 */
export async function uploadWithRetry(
  url: string,
  formData: FormData,
  headers: HeadersInit,
  options: UploadOptions = {}
): Promise<Response> {
  const { maxRetries = 3, timeout = 30000, onProgress } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Simulate progress for UX (real progress would need server support)
      if (onProgress && attempt === 1) {
        const progressInterval = setInterval(() => {
          onProgress(Math.min(90, Math.random() * 100));
        }, 500);
        
        setTimeout(() => clearInterval(progressInterval), timeout - 1000);
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        if (onProgress) onProgress(100);
        return response;
      }
      
      // If not OK but not a network error, don't retry
      if (response.status < 500) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      
      // Server error, will retry
      lastError = new Error(`Server error: ${response.status}`);
      
    } catch (error: any) {
      lastError = error;
      
      // Check if it's an abort error (timeout)
      if (error.name === 'AbortError') {
        lastError = new Error(`Upload timeout on attempt ${attempt}`);
      }
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`Upload attempt ${attempt} failed, retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError || new Error('Upload failed after all retries');
}

/**
 * Process files in batches to avoid overwhelming the server
 */
export async function uploadInBatches<T>(
  files: File[],
  batchSize: number,
  uploadFn: (batch: File[]) => Promise<T[]>
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(files.length / batchSize)}`);
    
    try {
      const batchResults = await uploadFn(batch);
      results.push(...batchResults);
    } catch (error) {
      console.error(`Batch upload failed:`, error);
      throw error;
    }
  }
  
  return results;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File, maxSize: number = 10 * 1024 * 1024): string | null {
  // Check file size
  if (file.size > maxSize) {
    return `File "${file.name}" is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`;
  }
  
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mpeg'];
  if (!validTypes.includes(file.type)) {
    return `File "${file.name}" has an invalid type. Only images and videos are allowed.`;
  }
  
  return null;
}

/**
 * Create optimized FormData for upload
 */
export function createUploadFormData(
  files: File[],
  villaId: string,
  category: string,
  subfolder?: string
): FormData {
  const formData = new FormData();
  
  // Add files
  files.forEach(file => {
    formData.append('photos', file);
  });
  
  // Add metadata
  formData.append('villaId', villaId);
  formData.append('category', category);
  if (subfolder) {
    formData.append('subfolder', subfolder);
  }
  
  // Add upload timestamp for tracking
  formData.append('uploadTimestamp', Date.now().toString());
  
  return formData;
}
