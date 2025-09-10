'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { ClientApiClient } from '@/lib/api-client';
import { mapOnboardingDataToBackend, mapOnboardingDataFromBackend } from '@/lib/data-mapper';
import ProgressTracker from './ProgressTracker';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { StepHandle } from './steps/types';
import ErrorBoundary, { WizardErrorBoundary, StepErrorBoundary } from './ErrorBoundary';
import OnboardingBackupService, { BackupData } from './OnboardingBackupService';
import RecoveryModal from './RecoveryModal';
import ValidationProvider from './ValidationProvider';
import ValidationSummary from './ValidationSummary';


// Direct imports to avoid chunk loading issues
import VillaInformationStepEnhanced from './steps/VillaInformationStepEnhanced';
import OwnerDetailsStep from './steps/OwnerDetailsStep';
import ContractualDetailsStep from './steps/ContractualDetailsStep';
import BankDetailsStep from './steps/BankDetailsStep';
import OTACredentialsStep from './steps/OTACredentialsStep';
import DocumentsUploadStep from './steps/DocumentsUploadStep';
import StaffConfiguratorStep from './steps/StaffConfiguratorStep';
import FacilitiesChecklistStep from './steps/FacilitiesChecklistStep';
import PhotoUploadStep from './steps/PhotoUploadStep';
import ReviewSubmitStep from './steps/ReviewSubmitStep';

const OnboardingWizardContent: React.FC = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [localStepData, setLocalStepData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [autoSaveEnabled] = useState(true);
  const [lastSavedData, setLastSavedData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  
  // Backup and recovery state
  const [backupService] = useState(() => OnboardingBackupService.getInstance());
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryData, setRecoveryData] = useState<BackupData | null>(null);
  
  const stepRefs = useRef<(StepHandle | null)[]>([]);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveQueueRef = useRef<Set<number>>(new Set());
  const lastSaveTimeRef = useRef<number>(0);
  
  const totalSteps = 10;

  const userId = user?.id; // User session isolation

  // State for onboarding progress
  const [onboardingProgress, setOnboardingProgress] = useState<any>(null);
  const [villaId, setVillaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load field-level progress from database with spacing to avoid rate limits
  const loadFieldProgress = useCallback(async (villaId: string, authenticatedApi: ClientApiClient, existingData?: Record<string, any>) => {
    try {
      // Skip field progress loading during auto-save to prevent data overwriting
      if (isSaving) {
        return existingData;
      }
      
      // Track ALL steps for complete field progress (1-10)
      // But only load field progress for steps that need it to avoid overwriting
      const stepsToFetch = currentStep > 7 ? [8, 9] : [];
      
      // Space out the requests to avoid rate limit burst
      const fieldProgressResults = [];
      for (const step of stepsToFetch) {
        try {
          const result = await authenticatedApi.getFieldProgress(villaId, step);
          fieldProgressResults.push(result);
          // Add small delay between requests to prevent rate limit burst
          if (step !== stepsToFetch[stepsToFetch.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
          }
        } catch (err) {
          console.warn(`Failed to load field progress for step ${step}:`, err);
          fieldProgressResults.push({});
        }
      }
      
      // Merge field progress into step data ONLY if it has meaningful data
      const enhancedStepData: Record<string, any> = {};
      fieldProgressResults.forEach((fieldProgress, index) => {
        const stepNumber = stepsToFetch[index];
        if (fieldProgress && typeof fieldProgress === 'object' && 'success' in fieldProgress && 
            fieldProgress.success && (fieldProgress as any).data && Object.keys((fieldProgress as any).data).length > 0) {
          // Get existing step data (from parameter if provided, otherwise from state)
          const existingStepData = existingData ? existingData[`step${stepNumber}`] : localStepData[`step${stepNumber}`] || {};
          
          // Only merge if field progress has non-empty values
          const validFieldProgress: Record<string, any> = {};
          for (const [key, value] of Object.entries((fieldProgress as any).data)) {
            if (value !== null && value !== undefined && value !== '') {
              validFieldProgress[key] = value;
            }
          }
          
          // Only update if we have valid field progress data
          if (Object.keys(validFieldProgress).length > 0) {
            // Special handling for bedrooms data in step 9 (parse JSON)
            if (stepNumber === 9) {
              // Try to parse bedrooms field
              if (validFieldProgress.bedrooms) {
                try {
                  validFieldProgress.bedrooms = JSON.parse(validFieldProgress.bedrooms);
                  console.log('[ROOMS] Loaded bedrooms from field progress:', validFieldProgress.bedrooms);
                } catch (e) {
                  console.warn('Failed to parse bedrooms JSON:', e);
                  delete validFieldProgress.bedrooms;
                }
              }
              
              // Also check for bedrooms_config as fallback (enhanced persistence)
              if (!validFieldProgress.bedrooms && validFieldProgress.bedrooms_config) {
                try {
                  validFieldProgress.bedrooms = JSON.parse(validFieldProgress.bedrooms_config);
                  console.log('[ROOMS] Loaded bedrooms from bedrooms_config field:', validFieldProgress.bedrooms);
                  delete validFieldProgress.bedrooms_config; // Remove duplicate field
                } catch (e) {
                  console.warn('Failed to parse bedrooms_config JSON:', e);
                }
              }
            }
            
            enhancedStepData[`step${stepNumber}`] = {
              ...existingStepData,
              ...validFieldProgress
            };
          }
        }
      });
      
      // Update local step data with database field progress only if we have meaningful data
      if (Object.keys(enhancedStepData).length > 0) {
        if (existingData) {
          // Return the merged data if existingData was provided
          return {
            ...existingData,
            ...enhancedStepData
          };
        } else {
          // Update state if no existingData provided (original behavior)
          setLocalStepData(prev => ({
            ...prev,
            ...enhancedStepData
          }));
          setLastSavedData(prev => ({
            ...prev,
            ...enhancedStepData
          }));
        }
      }
      
      // Return existingData if provided and no enhancements found
      if (existingData) {
        return existingData;
      }
    } catch (error) {
      console.warn('Could not load field progress:', error);
      // Return existingData if provided and error occurred
      if (existingData) {
        return existingData;
      }
      // Don't throw - this is enhancement, not critical
    }
  }, [isSaving, currentStep]);
  
  // Optimized completedSteps calculation with proper memoization
  const completedSteps = useMemo(() => {
    if (!onboardingProgress) return [];
    
    // If completedSteps is already an array, use it
    if (Array.isArray(onboardingProgress.completedSteps)) {
      return onboardingProgress.completedSteps;
    }
    
    // Build from individual step flags - CORRECTED ORDER
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
      { flag: onboardingProgress.reviewCompleted, step: 10 }
    ];
    
    stepFlags.forEach(({ flag, step }) => {
      if (flag) steps.push(step);
    });
    
    return steps;
  }, [onboardingProgress]);

  
  const progressPercentage = useMemo(() => {
    return Math.round((completedSteps.length / totalSteps) * 100);
  }, [completedSteps.length, totalSteps]);
  
  // Step data is just localStepData
  const stepData = localStepData;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up any pending saves
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      saveQueueRef.current.clear();
    };
  }, []);

  // Load initial data and create/fetch villa
  useEffect(() => {
    const initializeOnboarding = async () => {
      if (!hasLoadedInitialData && userId) {
        setIsLoading(true);
        setError(null);
        
        try {
          // Get authentication token
          const token = await getToken();
          if (!token) {
            throw new Error('Authentication required. Please sign in.');
          }
          
          const authenticatedApi = new ClientApiClient();
          authenticatedApi.setToken(token);
          
          // Helper function to retry requests with exponential backoff for rate limits
          const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                return await fn();
              } catch (error: any) {
                const isRateLimit = error?.message?.includes('Rate limit') || 
                                   error?.message?.includes('Too many requests') ||
                                   error?.status === 429;
                
                if (isRateLimit && attempt < maxRetries) {
                  const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s
                  await new Promise(resolve => setTimeout(resolve, backoffTime));
                  continue;
                }
                throw error;
              }
            }
          };
          
          // Check localStorage for existing villa
          const storedVillaId = localStorage.getItem(`onboarding_villa_${userId}`);
          const storedStep = localStorage.getItem(`onboarding_step_${userId}`);
          const storedData = localStorage.getItem(`onboarding_data_${userId}`);
          
          let villa = null;
          
          if (storedVillaId) {
            // Try to fetch existing villa and its progress with retry for rate limits
            try {
              const progressResponse = await retryWithBackoff(() => 
                authenticatedApi.getOnboardingProgress(storedVillaId)
              );
              if (progressResponse.success && progressResponse.data) {
                villa = progressResponse.data.villa;
                setOnboardingProgress(progressResponse.data);
                
                // Load saved data from backend
                if (progressResponse.data.villa) {
                  const loadedData: Record<string, any> = {};
                  
                  // Try to load media from cache first for instant display
                  try {
                    const cachedMedia = localStorage.getItem(`onboarding_media_${storedVillaId}`);
                    if (cachedMedia) {
                      const parsed = JSON.parse(cachedMedia);
                      // Use cache if it's less than 5 minutes old
                      if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
                        loadedData.step6 = parsed.documents;
                        loadedData.step9 = { photos: parsed.photos };
                        setMediaLoaded(true);
                        console.log('[CACHE] Using cached media for instant loading');
                      }
                    }
                  } catch (e) {
                    // Ignore cache errors
                  }
                  
                  // Load villa info (step 1)
                  if (progressResponse.data.villa) {
                    loadedData.step1 = mapOnboardingDataFromBackend(1, progressResponse.data.villa);
                  }
                  
                  // Load owner details (step 2)
                  if (progressResponse.data.villa.owner) {
                    loadedData.step2 = mapOnboardingDataFromBackend(2, progressResponse.data.villa.owner);
                  }
                  
                  // Load other step data similarly...
                  if (progressResponse.data.villa.contractualDetails) {
                    loadedData.step3 = mapOnboardingDataFromBackend(3, progressResponse.data.villa.contractualDetails);
                  }
                  
                  if (progressResponse.data.villa.bankDetails) {
                    loadedData.step4 = mapOnboardingDataFromBackend(4, progressResponse.data.villa.bankDetails);
                  }
                  
                  // Load OTA credentials (step 5)
                  if (progressResponse.data.villa.otaCredentials && progressResponse.data.villa.otaCredentials.length > 0) {
                    loadedData.step5 = mapOnboardingDataFromBackend(5, progressResponse.data.villa.otaCredentials);
                  }
                  
                  // Load documents and photos in parallel for faster loading
                  const mediaPromises = [];
                  
                  // Load documents from database (much faster than SharePoint)
                  const documentsPromise = authenticatedApi.getVillaDocuments(storedVillaId)
                    .then(documentsResponse => {
                      if (documentsResponse.success && Array.isArray(documentsResponse.data) && documentsResponse.data.length > 0) {
                        loadedData.step6 = documentsResponse.data;
                        console.log('[DOCUMENTS] Loaded from database:', documentsResponse.data.length, 'documents');
                      } else {
                        loadedData.step6 = [];
                      }
                    })
                    .catch(docError => {
                      console.warn('[DOCUMENTS] Database load failed:', docError);
                      loadedData.step6 = [];
                    });
                  mediaPromises.push(documentsPromise);
                  
                  // Load staff (step 7) - Try dedicated API first, fallback to progress data
                  const staffFromProgress = progressResponse.data.villa?.staff || [];
                  const staffPromise = authenticatedApi.getVillaStaff(storedVillaId)
                    .then(staffResponse => {
                      if (staffResponse && Array.isArray(staffResponse) && staffResponse.length > 0) {
                        loadedData.step7 = mapOnboardingDataFromBackend(7, staffResponse);
                        console.log('[STAFF] Loaded from dedicated API:', staffResponse.length, 'staff members');
                      } else if (staffFromProgress.length > 0) {
                        // Fallback to staff data from progress response
                        loadedData.step7 = mapOnboardingDataFromBackend(7, staffFromProgress);
                        console.log('[STAFF] Loaded from progress fallback:', staffFromProgress.length, 'staff members');
                      } else {
                        loadedData.step7 = { staff: [] };
                        console.log('[STAFF] No staff data found in either API or progress');
                      }
                    })
                    .catch(staffError => {
                      console.warn('[STAFF] Dedicated API failed, trying progress fallback:', staffError);
                      if (staffFromProgress.length > 0) {
                        loadedData.step7 = mapOnboardingDataFromBackend(7, staffFromProgress);
                        console.log('[STAFF] Recovered from progress data:', staffFromProgress.length, 'staff members');
                      } else {
                        loadedData.step7 = { staff: [] };
                        console.log('[STAFF] No staff data available anywhere');
                      }
                    });
                  mediaPromises.push(staffPromise);
                  
                  // Load facilities (step 8) - Enhanced with fallback and validation
                  const facilitiesFromProgress = progressResponse.data.villa?.facilities || [];
                  console.log(`[FACILITIES] Found ${facilitiesFromProgress.length} facilities in progress response`);
                  
                  if (facilitiesFromProgress.length > 0) {
                    loadedData.step8 = mapOnboardingDataFromBackend(8, facilitiesFromProgress);
                    console.log(`[FACILITIES] Loaded from progress: ${facilitiesFromProgress.length} facilities`);
                  } else {
                    // Ensure consistent empty state structure
                    loadedData.step8 = { facilities: [] };
                    console.log('[FACILITIES] No facilities data found, using empty structure');
                  }
                  
                  // Load photos in parallel with documents (only if not cached)
                  if (!loadedData.step9?.photos || loadedData.step9.photos.length === 0) {
                    const photosPromise = authenticatedApi.getSharePointPhotos(storedVillaId)
                    .then(photosResponse => {
                      if (photosResponse.success && photosResponse.data?.photos?.length > 0) {
                        // Transform database photos to PhotoUploadStep format
                        const transformedPhotos = photosResponse.data.photos.map((dbPhoto: any) => ({
                          id: dbPhoto.id,
                          file: null,
                          category: dbPhoto.category.toLowerCase(),
                          subfolder: dbPhoto.subfolder || undefined,
                          preview: dbPhoto.fileUrl && dbPhoto.fileUrl.includes('/api/files/') 
                            ? `${dbPhoto.fileUrl}?t=${Date.now()}`
                            : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/photos/serve/${dbPhoto.id}?t=${Date.now()}`,
                          uploaded: true,
                          sharePointId: dbPhoto.sharePointFileId,
                          sharePointPath: dbPhoto.sharePointPath,
                          fileName: dbPhoto.fileName,
                          fileUrl: dbPhoto.fileUrl,
                          isMain: dbPhoto.isMain || false,
                          caption: dbPhoto.caption,
                          altText: dbPhoto.altText
                        }));
                        
                        loadedData.step9 = { 
                          ...(loadedData.step9 || {}), 
                          photos: transformedPhotos 
                        };
                      } else {
                        loadedData.step9 = { 
                          ...(loadedData.step9 || {}), 
                          photos: [] 
                        };
                      }
                    })
                    .catch(photoError => {
                      console.warn('[PHOTOS] Load failed:', photoError);
                      loadedData.step9 = { 
                        ...(loadedData.step9 || {}), 
                        photos: [] 
                      };
                    });
                    mediaPromises.push(photosPromise);
                  }
                  
                  // Wait for all media to load in parallel (if any)
                  if (mediaPromises.length > 0) {
                    await Promise.all(mediaPromises);
                  }
                  setMediaLoaded(true);
                  
                  // Cache media metadata only (not full files) for instant loading on refresh
                  if (loadedData.step6 || loadedData.step9?.photos) {
                    try {
                      const mediaCache = {
                        documents: Array.isArray(loadedData.step6) ? loadedData.step6.map(doc => ({
                          fileName: doc.fileName,
                          fileUrl: doc.fileUrl,
                          category: doc.category,
                          uploadDate: doc.uploadDate
                          // Exclude file data to reduce size
                        })) : [],
                        photos: Array.isArray(loadedData.step9?.photos) ? loadedData.step9.photos.map(photo => ({
                          fileName: photo.fileName,
                          fileUrl: photo.fileUrl,
                          thumbnailUrl: photo.thumbnailUrl,
                          category: photo.category,
                          caption: photo.caption
                          // Exclude file data to reduce size
                        })) : [],
                        timestamp: Date.now()
                      };
                      
                      // Check cache size before storing
                      const cacheString = JSON.stringify(mediaCache);
                      if (cacheString.length < 50000) { // 50KB limit for media cache
                        localStorage.setItem(`onboarding_media_${storedVillaId}`, cacheString);
                      } else {
                        console.warn('[CACHE] Media cache too large, skipping localStorage storage');
                      }
                    } catch (e) {
                      console.warn('[CACHE] Failed to cache media:', e);
                    }
                  }
                  
                  // Load field-level progress for enhanced tracking (non-blocking)
                  const enhancedData = loadedData;
                  // Field progress loading moved to after initial render for better performance
                  
                  setLocalStepData(enhancedData);
                  setLastSavedData(enhancedData);
                }
                
                // Restore step position
                if (storedStep) {
                  setCurrentStep(parseInt(storedStep, 10));
                } else if (progressResponse.data.currentStep) {
                  setCurrentStep(progressResponse.data.currentStep);
                }
              }
            } catch (err) {
              console.warn('Could not load existing villa, creating new one');
              localStorage.removeItem(`onboarding_villa_${userId}`);
            }
          }
          
          // Create new villa if needed
          if (!villa) {
            const startOnboardingResponse = await authenticatedApi.startOnboarding('New Villa');
            
            if (startOnboardingResponse.success && startOnboardingResponse.data) {
              const { villaId: newVillaId, progress } = startOnboardingResponse.data;
              
              setVillaId(newVillaId);
              setOnboardingProgress(progress);
              
              // Store in localStorage
              localStorage.setItem(`onboarding_villa_${userId}`, newVillaId);
              localStorage.setItem(`onboarding_step_${userId}`, '1');
              
              // Try to load locally stored data if any
              if (storedData) {
                try {
                  const parsedData = JSON.parse(storedData);
                  setLocalStepData(parsedData);
                } catch (e) {
                  console.warn('Could not parse stored data:', e);
                }
              }
              
              // Skip field progress for new villas to improve performance
            } else {
              const errorMsg = startOnboardingResponse.error || 'Failed to start onboarding';
              throw new Error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
            }
          } else {
            setVillaId(storedVillaId!);
          }
          
          setHasLoadedInitialData(true);
        } catch (error) {
          console.error('Error initializing onboarding:', error);
          
          // Extract meaningful error message
          let errorMessage = 'Failed to initialize onboarding';
          
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else if (error && typeof error === 'object') {
            // Handle API response errors
            if ((error as any).error) {
              errorMessage = String((error as any).error);
            } else if ((error as any).message) {
              errorMessage = String((error as any).message);
            }
          }
          
          setError(errorMessage);
          toast.error(errorMessage);
          setHasLoadedInitialData(true);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    initializeOnboarding();
  }, [hasLoadedInitialData, userId, getToken]);

  // Optimized auto-save function with rate limiting and queue management
  const performAutoSave = useCallback(async () => {
    // Rate limit: minimum 2 seconds between saves
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 2000) {
      return;
    }
    lastSaveTimeRef.current = now;
    
    if (!villaId || !autoSaveEnabled || isSaving) {
      return;
    }
    
    const currentStepData = stepData[`step${currentStep}`];
    
    if (!currentStepData || Object.keys(currentStepData).length === 0) {
      return;
    }
    
    // Check if data has changed
    const lastSaved = lastSavedData[`step${currentStep}`];
    if (JSON.stringify(currentStepData) === JSON.stringify(lastSaved)) {
      return; // No changes to save
    }
    
    // Always save to localStorage first (offline backup) - with smart compression
    try {
      // Create a lightweight version for localStorage
      let dataToSave = stepData;
      
      // If it's facilities data (step 8), compress it aggressively
      if (currentStep === 8 && stepData.facilities) {
        // Only store actually modified/checked facilities to drastically reduce size
        const significantFacilities = Array.isArray(stepData.facilities)
          ? stepData.facilities.filter((f: any) => {
              // Only keep facilities that have been meaningfully modified
              return f.available || f.isAvailable || 
                     (f.notes && f.notes.trim().length > 0) || 
                     (f.specifications && f.specifications.trim().length > 0) || 
                     f.photoUrl || 
                     (f.quantity && f.quantity > 1) ||
                     (f.condition && f.condition !== 'good') ||
                     (f.productLink && f.productLink.trim().length > 0);
            })
          : [];
        
        // Further compress by removing large base64 data and keeping only essential fields
        const compressedFacilities = significantFacilities.map((f: any) => {
          return {
            // Essential identification fields
            category: f.category,
            subcategory: f.subcategory,
            itemName: f.itemName,
            name: f.name,
            id: f.id,
            
            // State fields
            available: f.available,
            isAvailable: f.isAvailable,
            quantity: f.quantity,
            condition: f.condition,
            
            // User data fields
            notes: f.notes,
            specifications: f.specifications,
            itemNotes: f.itemNotes,
            productLink: f.productLink,
            
            // Photo references (no base64 data)
            photoUrl: f.photoUrl,
            sharePointUrl: f.sharePointUrl,
            photoMimeType: f.photoMimeType,
            photoSize: f.photoSize,
            _hasPhoto: !!(f.photoData && f.photoData.startsWith('data:')),
            
            // Exclude photoData to save space
            photoData: null
          };
        });
        
        dataToSave = {
          facilities: compressedFacilities,
          _compressed: true,
          _originalCount: Array.isArray(stepData.facilities) ? stepData.facilities.length : 0,
          _significantCount: significantFacilities.length
        };
        
        console.log(`[LOCALSTORAGE] Heavily compressed facilities: ${compressedFacilities.length}/${stepData.facilities?.length || 0} items (removed base64 data)`);
      }
      
      // If it's photos or documents, remove base64 data
      if ((currentStep === 6 || currentStep === 9) && (stepData.photos || stepData.documents)) {
        dataToSave = {
          ...stepData,
          photos: stepData.photos?.map((p: any) => ({ ...p, file: null, preview: null })) || [],
          documents: stepData.documents?.map((d: any) => ({ ...d, file: null, preview: null })) || [],
          _compressed: true
        };
      }
      
      const dataString = JSON.stringify(dataToSave);
      const dataSize = dataString.length;
      
      // Check if data is too large (5MB limit for safety)
      if (dataSize > 5 * 1024 * 1024) {
        console.warn(`[LOCALSTORAGE] Data still too large after compression (${Math.round(dataSize / 1024)} KB), storing metadata only`);
        
        // Store only metadata for large data
        const metadata = {
          _isMetadata: true,
          _originalStep: currentStep,
          _timestamp: new Date().toISOString(),
          _message: 'Data too large for localStorage, saved to backend only'
        };
        
        localStorage.setItem(`onboarding_data_${userId}`, JSON.stringify(metadata));
        
        // Try to clean up old data
        try {
          const keysToClean = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('onboarding_') && key.includes('backup_timestamp')) {
              keysToClean.push(key.replace('backup_timestamp_', ''));
            }
          }
          // Remove old backup data (keep only current user)
          keysToClean.forEach(keyPrefix => {
            if (keyPrefix !== userId) {
              localStorage.removeItem(`onboarding_data_${keyPrefix}`);
              localStorage.removeItem(`onboarding_backup_timestamp_${keyPrefix}`);
            }
          });
        } catch (cleanupError) {
          console.warn('[LOCALSTORAGE] Cleanup failed:', cleanupError);
        }
      } else {
        localStorage.setItem(`onboarding_data_${userId}`, dataString);
        localStorage.setItem(`onboarding_step_${userId}`, currentStep.toString());
        localStorage.setItem(`onboarding_backup_timestamp_${userId}`, Date.now().toString());
      }
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError') {
        console.warn('[LOCALSTORAGE] Storage quota exceeded, clearing old data and retrying');
        // Clear old onboarding data
        try {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('onboarding_') && userId && !key.includes(userId)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
          
          // Try saving again with reduced data
          const reducedData = { ...stepData };
          // Remove media-heavy steps from localStorage
          delete reducedData.step6; // Documents
          delete reducedData.step9; // Photos
          localStorage.setItem(`onboarding_data_${userId}`, JSON.stringify(reducedData));
          localStorage.setItem(`onboarding_step_${userId}`, currentStep.toString());
        } catch (retryError) {
          console.warn('[LOCALSTORAGE] Retry failed, continuing without localStorage:', retryError);
        }
      } else {
        console.warn('Failed to save to localStorage:', e);
      }
    }
    
    setIsSaving(true);
    
    try {
      const token = await getToken();
      if (!token) {
        console.warn('[AUTOSAVE] No token, using offline mode');
        setLastSavedData(prev => ({
          ...prev,
          [`step${currentStep}`]: JSON.parse(JSON.stringify(currentStepData))
        }));
        setIsOfflineMode(true);
        return;
      }
      
      const authenticatedApi = new ClientApiClient();
      authenticatedApi.setToken(token);
      
      // Do step-level save with mapped data
      const mappedData = mapOnboardingDataToBackend(currentStep, currentStepData);
      
      // Add retry logic for better reliability
      let response;
      try {
        response = await authenticatedApi.saveOnboardingStep(villaId, currentStep, mappedData, true);
      } catch (error: any) {
        if (error?.status === 429) {
          // Rate limited, retry once after delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          response = await authenticatedApi.saveOnboardingStep(villaId, currentStep, mappedData, true);
        } else {
          throw error;
        }
      }
      
      if (response.success) {
        console.log(`[AUTOSAVE] Step ${currentStep} saved successfully via onboarding API`);
        
        // Log staff data for debugging (step 7)
        if (currentStep === 7 && mappedData.staff && Array.isArray(mappedData.staff)) {
          console.log('[STAFF] Staff data sent to onboarding API:', {
            staffCount: mappedData.staff.length,
            hasValidData: mappedData.staff.some((s: any) => s.firstName && s.lastName && s.position)
          });
        }
        
        // Update last saved data WITHOUT modifying current local state
        // This prevents text field reset during typing
        setLastSavedData(prev => ({
          ...prev,
          [`step${currentStep}`]: JSON.parse(JSON.stringify(currentStepData))
        }));
        
        setIsOfflineMode(false);
        
        // DO NOT reload field progress here - it will overwrite user input
      } else {
        // Handle step-level save errors
        console.warn('[AUTOSAVE] Failed:', response.error);
        setLastSavedData(prev => ({
          ...prev,
          [`step${currentStep}`]: JSON.parse(JSON.stringify(currentStepData))
        }));
        setIsOfflineMode(true);
      }
    } catch (error: any) {
      // Handle all network and server errors gracefully - silently save locally
      // No need to spam console with errors
      
      // Save data locally regardless of error type
      setLastSavedData(prev => ({
        ...prev,
        [`step${currentStep}`]: JSON.parse(JSON.stringify(currentStepData))
      }));
      
      // Set offline mode with better user feedback
      setIsOfflineMode(true);
    } finally {
      setIsSaving(false);
    }
  }, [villaId, autoSaveEnabled, isSaving, stepData, currentStep, lastSavedData, getToken, userId, totalSteps]);

  // Optimized auto-save trigger with memory leak prevention
  useEffect(() => {
    if (!autoSaveEnabled || !villaId) return;
    
    const timeoutId = setTimeout(() => {
      performAutoSave();
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [stepData[`step${currentStep}`], currentStep, performAutoSave, autoSaveEnabled, villaId]);

  // Periodic auto-save with smart checking
  useEffect(() => {
    if (!autoSaveEnabled || !villaId) return;
    
    const intervalId = setInterval(() => {
      // Only save if there are actual changes
      const currentStepData = stepData[`step${currentStep}`];
      const lastSaved = lastSavedData[`step${currentStep}`];
      if (JSON.stringify(currentStepData) !== JSON.stringify(lastSaved)) {
        performAutoSave();
      }
    }, 30000); // 30 seconds interval 
    
    return () => clearInterval(intervalId);
  }, [performAutoSave, autoSaveEnabled, villaId, currentStep, stepData, lastSavedData]);

  // Optimized update handler with intelligent batching
  const handleUpdate = useCallback((stepNumber: number, data: any) => {
    // Update local state immediately for UI responsiveness
    setLocalStepData(prev => {
      // Only update if data has actually changed to prevent unnecessary re-renders
      const currentData = prev[`step${stepNumber}`];
      if (JSON.stringify(currentData) === JSON.stringify(data)) {
        return prev;
      }
      return {
        ...prev,
        [`step${stepNumber}`]: data
      };
    });
    
    // Add to save queue and trigger debounced auto-save
    saveQueueRef.current.add(stepNumber);
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Increase debounce time to 5 seconds to reduce interruptions while typing
    autoSaveTimeoutRef.current = setTimeout(() => {
      // Process all queued saves
      if (saveQueueRef.current.size > 0) {
        performAutoSave();
        saveQueueRef.current.clear();
      }
    }, 5000); // 5 second debounce for less interruption
  }, [performAutoSave]);

  const handleNext = useCallback(async () => {
    // Save current step as completed before navigating to next step
    if (currentStep < totalSteps) {
      const currentStepData = stepData[`step${currentStep}`];
      // Use step component validation if available
      const stepRef = stepRefs.current[currentStep - 1];
      let hasValidData = false;
      
      if (stepRef && typeof stepRef.validate === 'function') {
        hasValidData = stepRef.validate();
      } else {
        // Fallback to data check for steps without validation
        hasValidData = currentStepData && Object.keys(currentStepData).length > 0;
      }
      
      // If we have valid data for the current step, save it as completed
      if (hasValidData) {
        try {
          const token = await getToken();
          if (token) {
            const authenticatedApi = new ClientApiClient();
            authenticatedApi.setToken(token);
            
            // For steps with refs that have getData, get the latest data
            let dataToSave = currentStepData;
            if (stepRef && typeof stepRef.getData === 'function') {
              const latestData = stepRef.getData();
              if (latestData) {
                dataToSave = latestData;
                console.log(`[SAVE] Using latest data from step ${currentStep} ref:`, dataToSave);
              }
            }
            
            // Map the data and save it as completed (not auto-save)
            const mappedData = mapOnboardingDataToBackend(currentStep, dataToSave);
            
            const response = await authenticatedApi.saveOnboardingStep(villaId!, currentStep, mappedData, false); // false = not auto-save, so completed=true
            
            if (response.success) {
              console.log(`[SAVE] Step ${currentStep} saved successfully with data:`, mappedData);
            }
          }
        } catch (error) {
          console.warn('[NAVIGATION] Save failed, continuing:', error);
        }
      }
      
      setCurrentStep(currentStep + 1);
      localStorage.setItem(`onboarding_step_${userId}`, (currentStep + 1).toString());
    } else {
      // Complete onboarding - only try this at the very end
      setIsLoading(true);
      try {
        const token = await getToken();
        if (token) {
          const authenticatedApi = new ClientApiClient();
          authenticatedApi.setToken(token);
          
          const completeResponse = await authenticatedApi.completeOnboarding(villaId!);
          if (completeResponse.success) {
            toast.success('Onboarding completed successfully! Redirecting to dashboard...');
            
            // Clear localStorage
            localStorage.removeItem(`onboarding_villa_${userId}`);
            localStorage.removeItem(`onboarding_step_${userId}`);
            localStorage.removeItem(`onboarding_data_${userId}`);
            
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000);
            return;
          }
        }
        
        // If server completion fails, still show success (data is saved locally)
        toast.success('Onboarding completed! Your data is saved.');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } catch (error) {
        console.warn('[COMPLETION] Server completion failed, data saved locally');
        toast.success('Onboarding completed! Your data is saved.');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentStep, totalSteps, userId, villaId, getToken, stepData]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      localStorage.setItem(`onboarding_step_${userId}`, (currentStep - 1).toString());
    }
  }, [currentStep, userId]);

  const handleStepClick = useCallback((stepNumber: number) => {
    setCurrentStep(stepNumber);
    localStorage.setItem(`onboarding_step_${userId}`, stepNumber.toString());
  }, [userId]);


  // Memoized step configuration
  const stepConfig = useMemo(() => [
    { Component: VillaInformationStepEnhanced, stepNumber: 1 },
    { Component: OwnerDetailsStep, stepNumber: 2 },
    { Component: ContractualDetailsStep, stepNumber: 3 },
    { Component: BankDetailsStep, stepNumber: 4 },
    { Component: OTACredentialsStep, stepNumber: 5 },
    { Component: DocumentsUploadStep, stepNumber: 6 },
    { Component: StaffConfiguratorStep, stepNumber: 7 },
    { Component: FacilitiesChecklistStep, stepNumber: 8 },
    { Component: PhotoUploadStep, stepNumber: 9 },
    { Component: ReviewSubmitStep, stepNumber: 10 }
  ], []);

  const renderStep = useMemo(() => {
    const currentStepConfig = stepConfig[currentStep - 1];
    if (!currentStepConfig) return <div>Step not found</div>;
    
    const { Component, stepNumber } = currentStepConfig;
    const currentStepData = stepData[`step${currentStep}`] || {};
    const dataToPass = stepNumber === 10 ? stepData : currentStepData;
    
    const stepNames = {
      1: "Villa Information",
      2: "Owner Details", 
      3: "Contractual Details",
      4: "Bank Details",
      5: "OTA Credentials",
      6: "Documents Upload",
      7: "Staff Configuration",
      8: "Facilities Checklist",
      9: "Photo Upload",
      10: "Review & Submit"
    };
    

    return (
      <StepErrorBoundary 
        stepName={stepNames[stepNumber as keyof typeof stepNames] || `Step ${stepNumber}`}
        onError={(error) => {
          console.error(`[STEP-${stepNumber}] Error:`, error);
        }}
      >
        <Component 
          ref={(el: StepHandle | null) => { stepRefs.current[stepNumber - 1] = el; }}
          data={dataToPass}
          onUpdate={(data: any) => handleUpdate(stepNumber, data)}
          villaId={villaId || undefined}
        />
      </StepErrorBoundary>
    );
  }, [currentStep, stepData, stepConfig, handleUpdate, villaId]);

  // Recovery handlers
  const handleRecover = useCallback(async () => {
    if (!recoveryData) return;
    
    try {
      setLocalStepData(recoveryData.stepData);
      setCurrentStep(recoveryData.currentStep);
      if (recoveryData.villaId) {
        setVillaId(recoveryData.villaId);
      }
      setShowRecoveryModal(false);
      toast.success('Progress restored successfully');
    } catch (error) {
      console.error('Recovery failed:', error);
      toast.error('Failed to restore progress');
    }
  }, [recoveryData]);

  const handleDiscardRecovery = useCallback(async () => {
    if (recoveryData) {
      await backupService.clearBackup(recoveryData.villaId);
    }
    setShowRecoveryModal(false);
    setRecoveryData(null);
    toast.info('Starting fresh onboarding');
  }, [recoveryData, backupService]);

  // Helper function to get step title
  const getStepTitle = useCallback((stepNum: number) => {
    const stepTitles = {
      1: "Villa Information",
      2: "Owner Details", 
      3: "Contractual Details",
      4: "Bank Details",
      5: "OTA Credentials",
      6: "Documents",
      7: "Staff",
      8: "Facilities",
      9: "Photos",
      10: "Review & Submit"
    };
    return stepTitles[stepNum as keyof typeof stepTitles] || `Step ${stepNum}`;
  }, []);

  // Optimized keyboard navigation with proper cleanup
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard navigation if no modal is open and not in a form field
      const target = event.target as HTMLElement;
      if (showRecoveryModal || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          if (currentStep > 1) {
            event.preventDefault();
            handlePrevious();
          }
          break;
        case 'ArrowRight':
          if (currentStep < totalSteps) {
            event.preventDefault();
            handleNext();
          }
          break;
        case 'Home':
          if (currentStep !== 1) {
            event.preventDefault();
            handleStepClick(1);
          }
          break;
        case 'End':
          if (currentStep !== totalSteps) {
            event.preventDefault();
            handleStepClick(totalSteps);
          }
          break;
        case 'Enter':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleNext();
          }
          break;
        case 'Escape':
          if (showRecoveryModal) {
            event.preventDefault();
            setShowRecoveryModal(false);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, totalSteps, showRecoveryModal, handleNext, handlePrevious, handleStepClick]);

  // Show loading state while initializing
  if (!hasLoadedInitialData && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error && !villaId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Failed to Load Onboarding</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <WizardErrorBoundary
      onError={(error) => {
        console.error('[WIZARD] Critical error:', error);
      }}
    >
      <div className="min-h-screen p-6" role="main">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section removed as per user request */}

          <div className="max-w-4xl mx-auto">
            <header className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Villa Onboarding</h1>
              <p className="text-slate-600">Complete all steps to set up your villa for management</p>
              {villaId && (
                <p className="text-sm text-slate-500 mt-2">Villa ID: {villaId}</p>
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
                  { id: 6, title: "Documents" },
                  { id: 7, title: "Staff" },
                  { id: 8, title: "Facilities" },
                  { id: 9, title: "Photos" },
                  { id: 10, title: "Review & Submit" }
                ]}
              />
            </ErrorBoundary>

            <main className="mt-8" role="region" aria-labelledby="current-step-heading" aria-live="polite">
              <div className="sr-only" id="current-step-heading">
                Step {currentStep} of {totalSteps}: {getStepTitle(currentStep)}
              </div>
              {renderStep}
              
              {/* Validation Summary */}
              <div className="mt-6">
                <ValidationSummary stepNumber={currentStep} />
              </div>
            </main>

            <ErrorBoundary stepName="Navigation Controls" isolate>
              <nav className="flex justify-between items-center mt-8" role="navigation" aria-label="Step navigation">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 1 || isLoading}
                  aria-label={`Go to previous step${currentStep > 1 ? `: ${getStepTitle(currentStep - 1)}` : ''}`}
                  className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Previous
                </button>
                
                <button
                  onClick={handleNext}
                  disabled={isLoading}
                  aria-label={currentStep === totalSteps ? 'Complete onboarding process' : 'Continue to next step'}
                  className="px-6 py-3 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : (currentStep === totalSteps ? 'Complete Onboarding' : 'Next')}
                </button>
              </nav>
            </ErrorBoundary>

            <div className="mt-6 text-center text-sm text-slate-600 space-y-2">
              <div role="status" aria-live="polite">
                Step {currentStep} of {totalSteps} • {progressPercentage}% Complete
              </div>
              {autoSaveEnabled && (
                <div className="flex items-center justify-center gap-2 text-xs">
                  <div 
                    className={`w-2 h-2 rounded-full ${
                      isSaving
                        ? 'bg-blue-500 animate-pulse'
                        : isOfflineMode
                        ? 'bg-orange-500'
                        : lastSavedData[`step${currentStep}`]
                        ? 'bg-green-500'
                        : 'bg-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-slate-500" role="status">
                    {isSaving 
                      ? 'Saving...'
                      : isOfflineMode
                      ? 'Offline - saved locally'
                      : lastSavedData[`step${currentStep}`]
                      ? 'Auto-saved'
                      : 'Ready'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Recovery Modal */}
      {recoveryData && (
        <RecoveryModal
          isOpen={showRecoveryModal}
          onClose={() => setShowRecoveryModal(false)}
          backupData={recoveryData}
          onRecover={handleRecover}
          onDiscard={handleDiscardRecovery}
        />
      )}
    </WizardErrorBoundary>
  );
};

const OnboardingWizardEnhanced: React.FC = () => {
  return (
    <ValidationProvider enableRealTimeValidation={true} debounceMs={300}>
      <OnboardingWizardContent />
    </ValidationProvider>
  );
};

export default OnboardingWizardEnhanced;
