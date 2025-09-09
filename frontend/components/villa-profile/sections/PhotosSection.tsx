"use client";

import React, { useState, useEffect } from 'react';
import { clientApi } from '@/lib/api-client';
import { Camera, Upload, Eye, Play, Search, Plus, X, RefreshCw, Image, Film, Grid3X3 } from 'lucide-react';

interface PhotosSectionProps {
  photos: any[];
  villaId: string | null;
}

// Organized category structure for better user experience
const categoryGroups = {
  overview: {
    name: 'Overview',
    categories: [
      { id: 'logo', name: 'Villa Logo', icon: Image, type: 'image', path: '/Villas/villa-{id}/Photos/Logo' },
      { id: 'floor_plan', name: 'Floor Plans', icon: Grid3X3, type: 'image', path: '/Villas/villa-{id}/Photos/FloorPlan' },
    ]
  },
  exterior: {
    name: 'Exterior',
    categories: [
      { id: 'exterior_views', name: 'Exterior Views', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/ExteriorViews' },
      { id: 'pool_outdoor', name: 'Pool & Outdoor', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/PoolOutdoor' },
      { id: 'garden', name: 'Garden & Landscape', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/Garden' },
      { id: 'views_surroundings', name: 'Views & Surroundings', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/ViewsSurroundings' },
    ]
  },
  interior: {
    name: 'Interior',
    categories: [
      { id: 'interior_living', name: 'Living Areas', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/InteriorLiving' },
      { id: 'bedrooms', name: 'Bedrooms', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/Bedrooms' },
      { id: 'bathrooms', name: 'Bathrooms', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/Bathrooms' },
      { id: 'kitchen', name: 'Kitchen', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/Kitchen' },
      { id: 'dining_areas', name: 'Dining Areas', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/DiningAreas' },
    ]
  },
  amenities: {
    name: 'Amenities',
    categories: [
      { id: 'amenities', name: 'Special Features', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/Amenities' },
      { id: 'entertainment', name: 'Entertainment', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/Entertainment' },
      { id: 'spa_wellness', name: 'Spa & Wellness', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/SpaWellness' },
      { id: 'gym_fitness', name: 'Gym & Fitness', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/GymFitness' },
    ]
  },
  operational: {
    name: 'Operational',
    categories: [
      { id: 'staff_areas', name: 'Staff Areas', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/StaffAreas' },
      { id: 'utility_areas', name: 'Utility Areas', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/UtilityAreas' },
      { id: 'storage', name: 'Storage Areas', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/Storage' },
      { id: 'maintenance', name: 'Maintenance Areas', icon: Camera, type: 'image', path: '/Villas/villa-{id}/Photos/Maintenance' },
    ]
  },
  media: {
    name: 'Video & Media',
    categories: [
      { id: 'videos', name: 'Property Videos', icon: Film, type: 'video', path: '/Villas/villa-{id}/Videos/PropertyTours' },
      { id: 'drone_shots', name: 'Drone Footage', icon: Camera, type: 'mixed', path: '/Villas/villa-{id}/Videos/DroneShots' },
      { id: 'virtual_tours', name: 'Virtual Tours', icon: Film, type: 'video', path: '/Villas/villa-{id}/Videos/VirtualTours' },
      { id: 'promotional', name: 'Promotional Media', icon: Film, type: 'mixed', path: '/Villas/villa-{id}/Videos/Promotional' },
    ]
  }
};

// Flatten categories for easier access
const photoCategories = Object.values(categoryGroups).flatMap(group => group.categories);

export default function PhotosSection({ photos: initialPhotos, villaId }: PhotosSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewingMedia, setViewingMedia] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>(Array.isArray(initialPhotos) ? initialPhotos : []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const refreshSharePointContent = async () => {
    if (!villaId) return;
    setIsRefreshing(true);
    try {
      const response = await clientApi.getSharePointPhotos(villaId);
      if (response.success && response.data) {
        setPhotos(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh SharePoint photos:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (villaId) {
      refreshSharePointContent();
    }
  }, [villaId]);

  // Update photos when initialPhotos changes
  useEffect(() => {
    setPhotos(Array.isArray(initialPhotos) ? initialPhotos : []);
  }, [initialPhotos]);

  // Helper function to ensure photos is always an array
  const safePhotos = Array.isArray(photos) ? photos : [];

  const getFilteredPhotos = () => {
    if (!Array.isArray(photos)) {
      console.warn('Photos is not an array:', photos);
      return [];
    }
    
    let filtered = safePhotos;
    
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'images') {
        filtered = safePhotos.filter(p => !p.mimetype?.startsWith('video/'));
      } else if (selectedCategory === 'videos') {
        filtered = safePhotos.filter(p => p.mimetype?.startsWith('video/'));
      } else {
        filtered = safePhotos.filter(p => p.category === selectedCategory);
      }
    }
    
    if (searchTerm && Array.isArray(filtered)) {
      filtered = filtered.filter(photo => 
        photo.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const handleFileUpload = async (files: FileList | null, uploadCategory?: string) => {
    if (!files || !villaId) return;
    
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', uploadCategory || selectedCategory === 'all' ? 'general' : selectedCategory);
        formData.append('villaId', villaId);
        
        await clientApi.uploadPhoto(villaId, formData);
      }
      
      await refreshSharePointContent();
      setShowUploadModal(false);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const isVideo = (photo: any) => {
    return photo.mimetype?.startsWith('video/') || photo.type === 'video';
  };

  const MediaViewer = ({ media, onClose }: { media: any; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center">
        {isVideo(media) ? (
          <video
            src={media.url || media.sharePointUrl}
            controls
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            autoPlay
          />
        ) : (
          <img
            src={media.url || media.sharePointUrl || '/placeholder.svg'}
            alt={media.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>
      
      <div className="absolute bottom-6 left-6 bg-black/60 text-white p-4 rounded-xl">
        <p className="font-medium text-lg">{media.name || 'Untitled'}</p>
        <p className="text-sm opacity-80">{photoCategories.find(c => c.id === media.category)?.name}</p>
      </div>
    </div>
  );

  const UploadModal = () => {
    const [selectedUploadCategory, setSelectedUploadCategory] = useState('general');
    
    return (
      <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-lg max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-slate-800">Upload Media</h3>
            <button
              onClick={() => setShowUploadModal(false)}
              className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">Select Category</label>
            <div className="space-y-3">
              {Object.entries(categoryGroups).map(([groupKey, group]) => (
                <div key={groupKey} className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {group.name}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.categories.map((category) => {
                      const Icon = category.icon;
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedUploadCategory(category.id)}
                          className={`p-2 rounded-lg text-left transition-all flex items-center gap-2 text-sm ${
                            selectedUploadCategory === category.id
                              ? 'bg-teal-100 text-teal-700 border border-teal-300'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-teal-400 transition-colors relative">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => {
                handleFileUpload(e.target.files, selectedUploadCategory);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">Drop files here or click to browse</p>
            <p className="text-sm text-slate-500">
              Uploading to: <span className="font-medium text-teal-600">
                {photoCategories.find(c => c.id === selectedUploadCategory)?.name || 'General'}
              </span>
            </p>
            <p className="text-xs text-slate-400 mt-2">Supports images and videos</p>
          </div>
        </div>
      </div>
    );
  };

  const filteredPhotos = getFilteredPhotos();
  const totalPhotos = safePhotos.length;
  const totalImages = safePhotos.filter(p => !isVideo(p)).length;
  const totalVideos = safePhotos.filter(p => isVideo(p)).length;

  return (
    <div className="glass-card-white-teal rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-slate-200/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Media Gallery</h2>
            <p className="text-slate-600">{totalPhotos} files • {totalImages} images • {totalVideos} videos</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={refreshSharePointContent}
              disabled={isRefreshing}
              className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              Upload
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="mt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search media..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/60 border border-slate-200 rounded-full text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Category Filter - Organized by Groups */}
      <div className="p-6 border-b border-slate-200/20">
        <div className="space-y-4">
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
            >
              All Media ({totalPhotos})
            </button>
            
            <button
              onClick={() => setSelectedCategory('images')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                selectedCategory === 'images'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
            >
              <Image className="w-4 h-4" />
              All Images ({totalImages})
            </button>
            
            <button
              onClick={() => setSelectedCategory('videos')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                selectedCategory === 'videos'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
            >
              <Film className="w-4 h-4" />
              All Videos ({totalVideos})
            </button>
          </div>

          {/* Organized Category Groups */}
          {Object.entries(categoryGroups).map(([groupKey, group]) => {
            const groupCategories = group.categories.filter(cat => {
              const count = safePhotos.filter(p => p.category === cat.id).length;
              return count > 0;
            });
            
            if (groupCategories.length === 0) return null;
            
            return (
              <div key={groupKey} className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                  {group.name}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {groupCategories.map((category) => {
                    const count = safePhotos.filter(p => p.category === category.id).length;
                    const Icon = category.icon;
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          selectedCategory === category.id
                            ? 'bg-teal-100 text-teal-700 border border-teal-300'
                            : 'bg-white/40 text-slate-600 hover:bg-white/60 border border-transparent'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {category.name}
                        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-xs font-semibold ml-1">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Media Grid */}
      <div className="p-6">
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-16">
            <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600 mb-2">No media found</h3>
            <p className="text-slate-500 mb-6">
              {searchTerm ? 'Try adjusting your search terms' : 'Upload some photos and videos to get started'}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-300 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Upload Media
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredPhotos.map((photo, index) => (
              <div
                key={index}
                className="group cursor-pointer"
                onClick={() => setViewingMedia(photo)}
              >
                <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative">
                  <img
                    src={photo.fileUrl && photo.fileUrl.includes('/api/files/') 
                      ? `${photo.fileUrl}?t=${Date.now()}`
                      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/photos/serve/${photo.id}`}
                    alt={photo.name || 'Media'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      // Try database endpoint first, then old serve endpoint
                      const databaseUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/files/photos/${photo.id}?t=${Date.now()}`;
                      const legacyUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/photos/serve/${photo.id}?v=${Date.now()}`;
                      
                      if (img.src.includes('/api/files/')) {
                        // Database URL failed, try legacy URL
                        img.src = legacyUrl;
                      } else if (!img.src.includes('?v=')) {
                        // First error, try database URL
                        img.src = databaseUrl;
                      }
                      // If both fail, we've exhausted our options
                    }}
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                    {isVideo(photo) ? (
                      <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2" />
                    ) : (
                      <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2" />
                    )}
                  </div>
                  
                  {/* Video indicator */}
                  {isVideo(photo) && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-md">
                      <Film className="w-3 h-3" />
                    </div>
                  )}
                </div>
                
                {/* Title */}
                <p className="mt-2 text-sm text-slate-600 truncate font-medium">
                  {photo.name || 'Untitled'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {viewingMedia && (
        <MediaViewer 
          media={viewingMedia} 
          onClose={() => setViewingMedia(null)} 
        />
      )}
      
      {showUploadModal && <UploadModal />}
    </div>
  );
}