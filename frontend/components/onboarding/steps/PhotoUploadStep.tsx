"use client";

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { 
  Upload,
  Video,
  Trash2,
  Building2,
  Grid3X3,
  Building,
  Sofa,
  BedDouble,
  Droplets,
  ChefHat,
  UtensilsCrossed,
  Umbrella,
  TreePine,
  Sparkles,
  Mountain,
  UserCheck,
  Settings,
  VideoIcon,
  Camera,
  Gamepad,
  Pencil,
  PlusCircle
} from 'lucide-react';
import { StepHandle } from './types';
import { clientApi } from '@/lib/api-client';
import { useAuth } from '@clerk/nextjs';

// Props for the main component
interface PhotoUploadStepProps {
  data: any;
  onUpdate: (data: any) => void;
  villaId?: string;
}

// Defines a photo category
interface PhotoCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  sharePointFolder: string;
  maxPhotos?: number;
  hasSubfolders?: boolean;
}

// Represents a single photo item in the state
interface PhotoItem {
  id: string;
  file: File | null;
  category: string;
  subfolder?: string;
  preview: string;
  uploaded: boolean;
  sharePointId?: string;
  sharePointPath?: string;
  fileName?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  isMain?: boolean;
  caption?: string;
  altText?: string;
}

// Represents a configurable bedroom
interface Bedroom {
  id: string;
  name: string;
  bedType: string;
}

// Props for the bedroom configuration modal
interface BedroomConfigModalProps {
  bedroom: Bedroom | null;
  onClose: () => void;
  onSave: (data: { name: string; bedType: string }) => void;
}

// Modal for adding or editing a bedroom
const BedroomConfigModal: React.FC<BedroomConfigModalProps> = ({ bedroom, onClose, onSave }) => {
  const [name, setName] = useState(bedroom?.name || '');
  const [bedType, setBedType] = useState(bedroom?.bedType || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && bedType) {
      onSave({ name, bedType });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/80 border border-white/20 p-8 rounded-2xl shadow-2xl w-full max-w-md m-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">{bedroom ? 'Edit' : 'Add'} Bedroom</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="bedroomName" className="block text-sm font-medium text-slate-700 mb-1">Bedroom Name</label>
            <input
              type="text"
              id="bedroomName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Master Suite, Ocean View Room"
              className="w-full p-3 rounded-lg bg-white/80 border border-white/50 focus:ring-2 focus:ring-[#009990] focus:outline-none transition text-slate-800 placeholder-slate-500"
              required
            />
          </div>
          <div>
            <label htmlFor="bedType" className="block text-sm font-medium text-slate-700 mb-1">Bed Type</label>
            <select
              id="bedType"
              value={bedType}
              onChange={(e) => setBedType(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/80 border border-white/50 focus:ring-2 focus:ring-[#009990] focus:outline-none transition text-slate-800"
              required
            >
              <option value="">Select bed type</option>
              <option value="Single/Twin">Single/Twin</option>
              <option value="Double">Double</option>
              <option value="Queen">Queen</option>
              <option value="King">King</option>
              <option value="Super King">Super King</option>
              <option value="Bunk Bed">Bunk Bed</option>
              <option value="Sofa Bed">Sofa Bed</option>
              <option value="Day Bed">Day Bed</option>
              <option value="Trundle Bed">Trundle Bed</option>
              <option value="Murphy Bed">Murphy Bed</option>
              <option value="Futon">Futon</option>
              <option value="Rollaway/Extra Bed">Rollaway/Extra Bed</option>
            </select>
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-white/40 border border-white/30 text-slate-700 rounded-lg hover:bg-white/60 transition">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-[#009990] text-white rounded-lg hover:bg-[#007a6b] transition">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PhotoUploadStep = forwardRef<StepHandle, PhotoUploadStepProps>((
  { data, onUpdate, villaId },
  ref
) => {
  const [photos, setPhotos] = useState<PhotoItem[]>(data?.photos || []);
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);
  const [bedrooms, setBedrooms] = useState<Bedroom[]>(() => {
    console.log('[ROOMS] PhotoUploadStep: Initializing bedrooms from data:', data?.bedrooms);
    console.log('[ROOMS] PhotoUploadStep: Full data object:', data);
    console.log('[ROOMS] PhotoUploadStep: Data type:', typeof data?.bedrooms);
    
    // Parse bedrooms if they come as JSON string from field progress
    if (typeof data?.bedrooms === 'string') {
      try {
        const parsed = JSON.parse(data.bedrooms);
        console.log('[ROOMS] PhotoUploadStep: Parsed bedrooms from JSON string:', parsed);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn('[ROOMS] PhotoUploadStep: Failed to parse bedrooms JSON:', e);
        return [];
      }
    }
    
    // Return array if already an array, otherwise empty array
    const initialBedrooms = Array.isArray(data?.bedrooms) ? data.bedrooms : [];
    console.log('[ROOMS] PhotoUploadStep: Initial bedrooms state:', initialBedrooms);
    return initialBedrooms;
  });
  const [isBedroomModalOpen, setIsBedroomModalOpen] = useState(false);
  const [editingBedroom, setEditingBedroom] = useState<Bedroom | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('logo');
  const [selectedSubfolder, setSelectedSubfolder] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();

  // Check backend availability
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
        const response = await fetch(`${API_URL}/health`, { method: 'GET' });
        setIsBackendAvailable(response.ok);
      } catch (error) {
        console.warn('Backend health check failed:', error);
        setIsBackendAvailable(false);
      }
    };
    
    checkBackend();
    // Re-check every 30 seconds
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update data when props change - only when data actually changes
  const prevDataRef = useRef(data);
  useEffect(() => {
    // Only update if data has actually changed
    if (prevDataRef.current !== data) {
      console.log('[ROOMS] PhotoUploadStep: Data prop changed, updating bedrooms:', data?.bedrooms);
      console.log('[ROOMS] PhotoUploadStep: Current bedrooms state:', bedrooms);
      
      // Handle bedrooms - parse if JSON string
      if (data?.bedrooms) {
        let bedroomData = data.bedrooms;
        
        // Parse if it's a JSON string (from field progress)
        if (typeof bedroomData === 'string') {
          try {
            bedroomData = JSON.parse(bedroomData);
            console.log('[ROOMS] PhotoUploadStep: Parsed bedrooms from JSON string in useEffect:', bedroomData);
          } catch (e) {
            console.warn('[ROOMS] PhotoUploadStep: Failed to parse bedrooms JSON in useEffect:', e);
            bedroomData = [];
          }
        }
        
        if (Array.isArray(bedroomData) && bedroomData.length > 0) {
          console.log('[ROOMS] PhotoUploadStep: Setting bedrooms to:', bedroomData);
          setBedrooms(bedroomData);
        }
      }
      
      if (data?.photos && Array.isArray(data.photos)) {
        console.log('[ROOMS] PhotoUploadStep: Setting photos to:', data.photos.length, 'photos');
        setPhotos(data.photos);
      }
      
      prevDataRef.current = data;
    }
  });

  // Use useCallback to memoize the update function
  const updateParent = useCallback(() => {
    const sanitizedPhotos = photos.map(p => {
      const { file, preview, ...rest } = p;
      return rest;
    });
    console.log('[ROOMS] PhotoUploadStep: Calling onUpdate with bedrooms:', bedrooms);
    console.log('[ROOMS] PhotoUploadStep: Bedrooms being saved:', JSON.stringify(bedrooms));
    onUpdate({ photos: sanitizedPhotos, bedrooms });
  }, [photos, bedrooms, onUpdate]);

  // Debounce the parent update to prevent infinite loops
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear previous timer if it exists
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    
    // Set a new timer to update parent after a short delay
    updateTimerRef.current = setTimeout(() => {
      console.log('[ROOMS] PhotoUploadStep: Debounced update triggered');
      updateParent();
    }, 500); // 500ms debounce
    
    // Cleanup on unmount
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, [updateParent]); // Include updateParent in deps for proper updates

  const photoCategories: PhotoCategory[] = [
    {
      id: 'logo',
      name: 'Logo',
      description: 'Your company logo',
      icon: <Building2 className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Logo',
      maxPhotos: 5,
    },
    {
      id: 'floor_plan',
      name: 'Floor Plan',
      description: 'Upload floor plan images',
      icon: <Grid3X3 className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Floor Plan',
      maxPhotos: 10,
    },
    {
      id: 'exterior_views',
      name: 'Exterior Views',
      description: 'Photos of the villa exterior',
      icon: <Building className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Exterior Views',
    },
    {
      id: 'interior_living_spaces',
      name: 'Interior Living Spaces',
      description: 'Photos of the interior spaces',
      icon: <Sofa className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Interior Living Spaces',
    },
    {
      id: 'bedrooms',
      name: 'Bedrooms',
      description: 'Photos of each bedroom',
      icon: <BedDouble className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Bedrooms',
      hasSubfolders: true,
    },
    {
      id: 'bathrooms',
      name: 'Bathrooms',
      description: 'Photos of bathrooms',
      icon: <Droplets className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Bathrooms',
    },
    {
      id: 'kitchen',
      name: 'Kitchen',
      description: 'Kitchen photos',
      icon: <ChefHat className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Kitchen',
    },
    {
      id: 'dining_areas',
      name: 'Dining Areas',
      description: 'Dining area photos',
      icon: <UtensilsCrossed className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Dining Areas',
    },
    {
      id: 'pool_outdoor_areas',
      name: 'Pool & Outdoor Areas',
      description: 'Pool and outdoor spaces',
      icon: <Umbrella className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Pool & Outdoor Areas',
    },
    {
      id: 'garden_landscaping',
      name: 'Garden & Landscaping',
      description: 'Garden and landscaping photos',
      icon: <TreePine className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Garden & Landscaping',
    },
    {
      id: 'amenities_facilities',
      name: 'Amenities & Facilities',
      description: 'Amenities and facilities',
      icon: <Sparkles className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Amenities & Facilities',
    },
    {
      id: 'views_surroundings',
      name: 'Views & Surroundings',
      description: 'Views and surroundings',
      icon: <Mountain className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Views & Surroundings',
    },
    {
      id: 'staff_areas',
      name: 'Staff Areas',
      description: 'Staff areas and facilities',
      icon: <UserCheck className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Staff Areas',
    },
    {
      id: 'utility_areas',
      name: 'Utility Areas',
      description: 'Utility and service areas',
      icon: <Settings className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Utility Areas',
    },
    {
      id: 'videos',
      name: 'Videos',
      description: 'Promotional videos',
      icon: <VideoIcon className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Videos',
    },
    {
      id: 'drone_shots',
      name: 'Drone Shots',
      description: 'Professional aerial photos',
      icon: <Camera className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Drone Shots',
      maxPhotos: 20,
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      description: 'Entertainment setup and equipment',
      icon: <Gamepad className="w-8 h-8 text-[#009990]" />,
      sharePointFolder: 'Entertainment',
    },
  ];

  const getCurrentCategory = () => photoCategories.find(cat => cat.id === selectedCategory) || photoCategories[0];
  const getCategoryPhotos = (categoryId: string) => photos.filter(p => p.category === categoryId);

  const handleFiles = async (files: File[]) => {
    const currentCategory = getCurrentCategory();
    if (!selectedCategory || !currentCategory) return;

    if (currentCategory.hasSubfolders && !selectedSubfolder) {
      setError('Please select a bedroom before uploading photos.');
      return;
    }

    const currentPhotos = photos.filter(p => p.category === selectedCategory && (!p.subfolder || p.subfolder === selectedSubfolder));
    const maxPhotos = currentCategory.maxPhotos || 20;

    if (currentPhotos.length + files.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed for ${currentCategory.name}.`);
      return;
    }
    
    // Limit batch size to prevent timeouts
    const MAX_BATCH_SIZE = 5;
    if (files.length > MAX_BATCH_SIZE) {
      setError(`Please upload a maximum of ${MAX_BATCH_SIZE} files at a time to prevent timeouts.`);
      return;
    }
    
    // Check file sizes
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setError(`Some files are too large. Maximum file size is 10MB.`);
      return;
    }

    // If no villa ID or backend unavailable, fallback to local preview mode
    if (!villaId || !isBackendAvailable) {
      const newPhotos: PhotoItem[] = files.map(file => ({
        id: `local-${Date.now()}-${Math.random()}`,
        file,
        category: selectedCategory,
        subfolder: selectedSubfolder || undefined,
        preview: URL.createObjectURL(file),
        uploaded: false, // Mark as not uploaded to SharePoint
      }));

      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      if (!isBackendAvailable) {
        setError('Backend unavailable - photos saved locally only');
        setTimeout(() => setError(null), 5000);
      } else {
        setError(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Get auth token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Create FormData for SharePoint upload
      const formData = new FormData();
      files.forEach(file => {
        formData.append('photos', file);
      });
      
      formData.append('villaId', villaId);
      formData.append('category', selectedCategory);
      if (selectedSubfolder) {
        formData.append('subfolder', selectedSubfolder);
      }

      // Upload to SharePoint via API with error handling and timeout
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
      let response: Response;
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 second timeout
      
      try {
        response = await fetch(`${API_URL}/api/photos/upload-sharepoint`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.error('Network error during photo upload:', fetchError);
        
        // Check if it was a timeout
        if (fetchError.name === 'AbortError') {
          throw new Error('Upload timeout: The server took too long to respond. Please try again with fewer files.');
        }
        
        throw new Error('Network error: Unable to connect to server. Please check your connection.');
      }

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          
          // Check for specific SharePoint errors
          if (errorMessage.includes('Resource not found') || errorMessage.includes('SharePoint')) {
            console.warn('SharePoint folder issue detected, falling back to local mode');
            throw new Error('SharePoint folder not available. Files will be saved locally.');
          }
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Create photo items from successful uploads
      const newPhotos: PhotoItem[] = result.photos.map((photo: any) => ({
        id: photo.id,
        file: null, // File already uploaded, don't store locally
        category: selectedCategory,
        subfolder: selectedSubfolder || undefined,
        preview: photo.fileUrl && photo.fileUrl.includes('/api/files/') 
          ? `${photo.fileUrl}?t=${Date.now()}`
          : `${API_URL}/api/photos/public/${photo.id}?t=${Date.now()}`, // Use database endpoint first, fallback to public
        uploaded: true,
        sharePointId: photo.sharePointFileId,
        sharePointPath: photo.sharePointPath,
        fileName: photo.fileName,
        fileUrl: photo.fileUrl,
        thumbnailUrl: `${API_URL}/api/photos/public/${photo.id}`, // Use public endpoint for thumbnail
      }));

      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Show success message
      console.log(`[OK] ${files.length} photos uploaded to SharePoint successfully in folder: ${result.sharePointFolder}`);

    } catch (error) {
      console.error('SharePoint upload error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for specific error types
        if (error.message.includes('timeout')) {
          errorMessage = 'Upload timed out. Try uploading fewer files at once.';
        } else if (error.message.includes('Network error')) {
          errorMessage = 'Network error. Check your connection and try again.';
          setIsBackendAvailable(false);
        } else if (error.message.includes('SharePoint')) {
          errorMessage = 'SharePoint error. Files saved locally instead.';
        }
      }
      
      setError(errorMessage);
      
      // Fallback to local preview on error
      const newPhotos: PhotoItem[] = files.map(file => ({
        id: `local-${Date.now()}-${Math.random()}`,
        file,
        category: selectedCategory,
        subfolder: selectedSubfolder || undefined,
        preview: URL.createObjectURL(file),
        uploaded: false, // Mark as upload failed
      }));

      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Auto-clear error after 10 seconds
      setTimeout(() => setError(null), 10000);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemovePhoto = async (photoId: string): Promise<void> => {
    try {
      const photoToRemove = photos.find(p => p.id === photoId);
      if (!photoToRemove) return;

    // If this is an uploaded photo (has an id from database), call the delete API
    if (photoToRemove.uploaded && photoToRemove.id) {
      try {
        const token = await getToken();
        if (!token) {
          console.error('No authentication token available');
          // Still remove from local state even if no token
          const updatedPhotos = photos.filter(p => p.id !== photoId);
          setPhotos(updatedPhotos);
          return;
        }

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
        
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for deletion
        
        let response: Response;
        
        try {
          response = await fetch(`${API_URL}/api/photos/${photoToRemove.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          console.error('Network error during photo deletion:', fetchError);
          
          // Check if it was a timeout
          if (fetchError.name === 'AbortError') {
            console.log('Photo deletion timed out, removing locally');
          }
          
          // Still remove from local state on network error
          const updatedPhotos = photos.filter(p => p.id !== photoId);
          setPhotos(updatedPhotos);
          setError('Photo removed locally (server unavailable)');
          setTimeout(() => setError(null), 3000);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete photo');
        }

        const result = await response.json();
        console.log('Photo deleted successfully:', result);
      } catch (error) {
        console.error('Error deleting photo from server:', error);
        // Show error to user but still remove from local state
        setError('Failed to delete photo from server, but removed locally');
        setTimeout(() => setError(null), 5000);
      }
    }

    // Clean up object URL for local files
    if (photoToRemove.preview && photoToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(photoToRemove.preview);
    }

    // Remove from local state
    const updatedPhotos = photos.filter(p => p.id !== photoId);
    setPhotos(updatedPhotos);
    } catch (error) {
      console.error('Error in handleRemovePhoto:', error);
      // Still try to remove from local state even if there was an error
      const updatedPhotos = photos.filter(p => p.id !== photoId);
      setPhotos(updatedPhotos);
      throw error; // Re-throw for the button handler to catch
    }
  };

  const handleSaveBedroom = (bedroomData: { name: string; bedType: string }) => {
    console.log('[ROOMS] PhotoUploadStep: Saving bedroom:', bedroomData);
    if (editingBedroom) {
      const updatedBedrooms = bedrooms.map(b => b.id === editingBedroom.id ? { ...b, ...bedroomData } : b);
      console.log('[ROOMS] PhotoUploadStep: Updated bedrooms after edit:', updatedBedrooms);
      setBedrooms(updatedBedrooms);
    } else {
      const newBedroom = { id: `bedroom-${Date.now()}`, ...bedroomData };
      const updatedBedrooms = [...bedrooms, newBedroom];
      console.log('[ROOMS] PhotoUploadStep: Updated bedrooms after add:', updatedBedrooms);
      setBedrooms(updatedBedrooms);
    }
    setIsBedroomModalOpen(false);
    setEditingBedroom(null);
  };

  const handleDeleteBedroom = async (id: string): Promise<void> => {
    try {
      const bedroomToDelete = bedrooms.find(b => b.id === id);
      if (!bedroomToDelete) return;

    // Find photos associated with this bedroom that need to be deleted from server
    const photosToDelete = photos.filter(p => 
      p.category === 'bedrooms' && p.subfolder === bedroomToDelete.name && p.uploaded && p.id
    );

    // Delete photos from server
    for (const photo of photosToDelete) {
      try {
        const token = await getToken();
        if (!token) continue;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
        
        // Add timeout for deletion
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        let response: Response;
        
        try {
          response = await fetch(`${API_URL}/api/photos/${photo.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          console.error(`Network error deleting photo ${photo.id}:`, fetchError);
          continue; // Skip to next photo on network error
        }

        if (!response.ok) {
          console.error(`Failed to delete photo ${photo.id} from server`);
        } else {
          console.log(`Photo ${photo.id} deleted from server`);
        }
      } catch (error) {
        console.error(`Error deleting photo ${photo.id}:`, error);
      }
    }

    // Update local state
    const updatedBedrooms = bedrooms.filter(b => b.id !== id);
    setBedrooms(updatedBedrooms);
    
    // Remove photos from local state
    const updatedPhotos = photos.filter(p => !(p.category === 'bedrooms' && p.subfolder === bedroomToDelete.name));
    setPhotos(updatedPhotos);
    } catch (error) {
      console.error('Error deleting bedroom:', error);
      setError('Failed to delete bedroom. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const validateForm = () => {
    // Basic validation: ensure at least one photo has been uploaded.
    // More complex validation can be added as needed.
    return photos.length > 0;
  };
  
  useImperativeHandle(ref, () => ({
    validate: validateForm,
    getData: () => {
      const sanitizedPhotos = photos.map(p => {
        const { file, preview, ...rest } = p;
        return rest;
      });
      return { photos: sanitizedPhotos, bedrooms };
    },
  }));

  const renderPhotoUploader = () => {
    const currentCategory = getCurrentCategory();
    const categoryPhotos = photos.filter(p => p.category === currentCategory.id && (!p.subfolder || p.subfolder === selectedSubfolder));

    return (
      <div>
        <div 
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            uploading 
              ? 'border-[#009990] bg-[#009990]/10 cursor-not-allowed' 
              : 'border-slate-400 cursor-pointer hover:border-[#009990] hover:bg-[#009990]/10'
          }`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            onChange={(e) => handleFiles(Array.from(e.target.files || []))} 
            className="hidden" 
            accept="image/*,video/*"
            disabled={uploading}
          />
          <div className="flex flex-col items-center justify-center text-slate-600">
            {uploading ? (
              <>
                <div className="w-12 h-12 mb-4 animate-spin rounded-full border-4 border-slate-200 border-t-[#009990]"></div>
                <p className="font-semibold">Uploading to SharePoint...</p>
                <p className="text-sm">Please wait while files are being uploaded</p>
                {uploadProgress > 0 && (
                  <div className="w-48 mt-2">
                    <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#009990] h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs mt-1">{uploadProgress}%</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 mb-4" />
                <p className="font-semibold">Click to upload or drag and drop</p>
                <p className="text-sm">Max {currentCategory.maxPhotos || '50'} files (5 at a time). {currentCategory.id === 'videos' ? 'Videos and images' : 'Images only'}.</p>
                <p className="text-xs text-slate-500 mt-1">Max file size: 10MB per file</p>
                {villaId && isBackendAvailable && <p className="text-xs text-[#009990] mt-1">[OK] SharePoint integration enabled</p>}
                {villaId && !isBackendAvailable && <p className="text-xs text-orange-600 mt-1">⚠️ Backend unavailable - local mode</p>}
                {!villaId && <p className="text-xs text-amber-600 mt-1">⚠️ Preview mode (no villa ID)</p>}
              </>
            )}
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        </div>

        {categoryPhotos.length > 0 && (
          <div className="mt-8">
            <h4 className="font-semibold text-slate-800 mb-4">Uploaded Files ({categoryPhotos.length})</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {categoryPhotos.map(photo => {
                console.log('📸 Rendering photo:', {
                  id: photo.id,
                  preview: photo.preview,
                  uploaded: photo.uploaded,
                  fileName: photo.fileName,
                  sharePointId: photo.sharePointId
                });
                return (
                <div key={photo.id} className="relative group aspect-square bg-slate-200 rounded-lg overflow-hidden">
                  <img 
                    src={photo.preview || 'data:image/svg+xml,' + encodeURIComponent(`
                      <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
                        <rect width="150" height="150" fill="#f1f5f9"/>
                        <circle cx="75" cy="60" r="15" fill="#cbd5e1"/>
                        <rect x="50" y="85" width="50" height="30" rx="5" fill="#cbd5e1"/>
                        <text x="75" y="130" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#64748b">No Preview</text>
                      </svg>
                    `)} 
                    alt={photo.file?.name || photo.fileName || 'Uploaded image'} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
                      
                      if (!target.src.includes('data:image/svg')) {
                        console.warn('Failed to load image:', target.src);
                        
                        // Try different endpoints in order: database -> public -> serve -> placeholder
                        const databaseUrl = `${API_URL}/api/files/photos/${photo.id}?t=${Date.now()}`;
                        const publicUrl = `${API_URL}/api/photos/public/${photo.id}?t=${Date.now()}`;
                        const serveUrl = `${API_URL}/api/photos/serve/${photo.id}?t=${Date.now()}`;
                        
                        if (target.src.includes('/api/files/')) {
                          // Database URL failed, try public URL
                          console.log('Database URL failed, trying public URL');
                          target.src = publicUrl;
                        } else if (target.src.includes('/api/photos/public/')) {
                          // Public URL failed, try serve URL
                          console.log('Public URL failed, trying serve URL');
                          target.src = serveUrl;
                        } else if (target.src.includes('/api/photos/serve/')) {
                          // Serve URL failed, use placeholder
                          console.log('All URLs failed, using placeholder');
                          const svgPlaceholder = 'data:image/svg+xml,' + encodeURIComponent(`
                            <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
                              <rect width="150" height="150" fill="#f1f5f9"/>
                              <circle cx="75" cy="60" r="15" fill="#cbd5e1"/>
                              <rect x="50" y="85" width="50" height="30" rx="5" fill="#cbd5e1"/>
                              <text x="75" y="130" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#64748b">Image Unavailable</text>
                            </svg>
                          `);
                          target.src = svgPlaceholder;
                        } else {
                          // First failure, try database URL
                          console.log('First failure, trying database URL');
                          target.src = databaseUrl;
                        }
                      }
                    }}
                  />
                  
                  {/* Upload status indicator */}
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    photo.uploaded ? 'bg-green-500' : 'bg-amber-500'
                  }`}>
                    {photo.uploaded ? '✓' : '!'}
                  </div>
                  
                  {/* Photo info overlay */}
                  {photo.fileName && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-white text-xs truncate" title={photo.fileName}>{photo.fileName}</p>
                      {photo.sharePointPath && (
                        <p className="text-white/70 text-xs truncate" title={photo.sharePointPath}>SharePoint: {photo.sharePointPath}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemovePhoto(photo.id).catch(err => {
                          console.error('Failed to remove photo:', err);
                          setError('Failed to remove photo. Please try again.');
                          setTimeout(() => setError(null), 5000);
                        });
                      }} 
                      className="text-white p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    const currentCategory = getCurrentCategory();
    if (!currentCategory) return null;

    if (currentCategory.id === 'bedrooms') {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Configure Bedrooms</h3>
            <div className="space-y-2">
              {bedrooms.filter(Boolean).map(bedroom => (
                <div key={bedroom.id} className="flex items-center justify-between p-3 bg-white/20 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{bedroom.name}</p>
                    <p className="text-sm text-slate-600">{bedroom.bedType}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button type="button" onClick={() => { setEditingBedroom(bedroom); setIsBedroomModalOpen(true); }} className="p-2 hover:bg-white/30 rounded-full"><Pencil className="w-4 h-4 text-slate-600" /></button>
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteBedroom(bedroom.id).catch(err => {
                          console.error('Failed to delete bedroom:', err);
                        });
                      }} 
                      className="p-2 hover:bg-white/30 rounded-full"
                      aria-label="Delete bedroom"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => { setEditingBedroom(null); setIsBedroomModalOpen(true); }} className="mt-3 w-full flex items-center justify-center p-3 rounded-lg border-2 border-dashed border-slate-400 hover:border-[#009990] hover:bg-[#009990]/10 transition-colors">
              <PlusCircle className="w-5 h-5 mr-2 text-slate-600" />
              <span className="font-medium text-slate-700">Add Bedroom</span>
            </button>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Upload Photos to a Bedroom</h3>
            {bedrooms.length > 0 ? (
              <div className="space-y-4">
                <select value={selectedSubfolder} onChange={e => setSelectedSubfolder(e.target.value)} className="w-full p-3 rounded-lg bg-white/80 border border-white/50 focus:ring-2 focus:ring-[#009990] focus:outline-none transition text-slate-800">
                  <option value="" className="text-slate-600">-- Select a Bedroom --</option>
                  {bedrooms.map(b => <option key={b.id} value={b.name} className="text-slate-800">{b.name}</option>)}
                </select>
                {selectedSubfolder && renderPhotoUploader()}
              </div>
            ) : (
              <p className="text-slate-500 text-sm p-4 text-center bg-white/10 rounded-lg">Please add a bedroom first to upload photos.</p>
            )}
          </div>
        </div>
      );
    }

    return renderPhotoUploader();
  };

  return (
    <div className="space-y-8">
      <div className="p-8 bg-gradient-to-br from-white/10 to-white/0 rounded-3xl shadow-2xl backdrop-blur-xl border border-white/20">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Media & Branding</h2>
        <p className="text-slate-600 mb-8">Upload high-quality photos and videos to showcase the villa.</p>

        <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Photo Categories</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {photoCategories.map(category => {
              const categoryPhotos = getCategoryPhotos(category.id);
              const isSelected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => { setSelectedCategory(category.id); setSelectedSubfolder(''); setError(null); }}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center w-36 h-36 ${ 
                    isSelected 
                      ? 'border-[#009990] bg-[#009990]/20 text-slate-800 shadow-lg'
                      : 'border-transparent bg-white/20 text-slate-700 hover:bg-white/30 hover:border-white/50'
                  }`}>
                  <span className={`absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 ${ 
                    categoryPhotos.length > 0 
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-200/80 text-slate-600' 
                  }`}>
                    {categoryPhotos.length}
                  </span>
                  {category.icon}
                  <span className="font-semibold text-sm mt-2">{category.name}</span>
                  <p className="text-xs text-slate-500 mt-1 leading-tight">{category.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-8 bg-gradient-to-br from-white/10 to-white/0 rounded-3xl shadow-2xl backdrop-blur-xl border border-white/20">
        {renderContent()}
      </div>

      {isBedroomModalOpen && 
        <BedroomConfigModal 
          bedroom={editingBedroom}
          onClose={() => setIsBedroomModalOpen(false)}
          onSave={handleSaveBedroom}
        />
      }
    </div>
  );
});

export default PhotoUploadStep;
