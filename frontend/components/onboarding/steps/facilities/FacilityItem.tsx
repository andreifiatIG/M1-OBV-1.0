"use client";

import React, { useRef } from 'react';
import { 
  CheckSquare, Square, Camera, FileText, Link, 
  ChevronRight, ChevronDown, Upload, AlertCircle
} from 'lucide-react';
import { FacilityItem as FacilityItemType } from './facilityCategories';
import { clientApi } from '../../../../lib/api-client';
import { useAuth } from '@clerk/nextjs';

interface FacilityItemProps {
  item: FacilityItemType;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<FacilityItemType>) => void;
  onPhotoUpload: (file: File) => void;
  categoryPhotoLimit?: number;
  categoryPhotoCount?: number;
  villaId?: string;
  categoryId?: string;
}

export default function FacilityItem({
  item,
  isExpanded,
  onToggle,
  onUpdate,
  onPhotoUpload,
  categoryPhotoLimit = 20,
  categoryPhotoCount = 0,
  villaId,
  categoryId,
}: FacilityItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    try {
      // Create a local preview immediately for better UX
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target?.result as string;
        
        // Update with local preview and base64 data for saving
        onUpdate({ 
          photoUrl: previewUrl,
          photoData: previewUrl, // Store base64 for backend processing
          photoMimeType: file.type,
          photoSize: file.size
        });
      };
      reader.readAsDataURL(file);

      // For now, store the photo data locally in the facility item
      // The backend will handle photo storage when the facility is saved
      console.log('📷 Photo stored locally for facility item:', item.name);
      
      // Optional: Try to upload to SharePoint for backup
      if (villaId && categoryId) {
        try {
          const token = await getToken();
          clientApi.setToken(token || null);
          
          const sharePointFormData = new FormData();
          sharePointFormData.append('photos', file);
          sharePointFormData.append('villaId', villaId);
          sharePointFormData.append('facilityCategory', categoryId);
          sharePointFormData.append('facilityItemName', item.name);
          sharePointFormData.append('facilityItemId', item.id);
          
          const sharePointResp = await clientApi.request('/api/photos/upload-facility', {
            method: 'POST',
            body: sharePointFormData,
          });
          
          if (sharePointResp.success && sharePointResp.data?.photos?.length > 0) {
            console.log('📷 Photo also backed up to SharePoint');
            // Update item with SharePoint URL as backup
            onUpdate({ 
              photoUrl: previewUrl, // Keep local preview
              sharePointUrl: sharePointResp.data.photos[0].fileUrl // Store SharePoint backup URL
            });
          }
        } catch (error) {
          console.warn('SharePoint backup failed, but local storage succeeded', error);
        }
      }
    } catch (error) {
      console.error('Error processing photo:', error);
      alert('Failed to process photo. Please try again.');
    }
  };

  const renderInputField = () => {
    const isBedRelated = item.id.includes('bed') || item.id.includes('bedroom');
    
    switch (item.dataType) {
      case 'INTEGER':
        return (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {isBedRelated ? 'Quantity' : 'Quantity'}
            </label>
            {isBedRelated ? (
              // Enhanced input for bed-related items
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) => onUpdate({ 
                      quantity: parseInt(e.target.value) || 0 
                    })}
                    className="form-input-white-teal flex-1 px-3 py-2"
                    placeholder="Enter quantity"
                    min="0"
                    max="20"
                  />
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => onUpdate({ 
                        quantity: Math.max(0, (item.quantity || 0) - 1) 
                      })}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-sm transition-colors"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate({ 
                        quantity: (item.quantity || 0) + 1 
                      })}
                      className="px-2 py-1 bg-teal-200 hover:bg-teal-300 rounded text-sm transition-colors"
                    >
                      +1
                    </button>
                  </div>
                </div>
                {item.quantity && item.quantity > 0 && (
                  <div className="text-xs text-teal-700 bg-teal-50 px-2 py-1 rounded">
                    {item.quantity} {item.name.toLowerCase()}
                  </div>
                )}
              </div>
            ) : (
              // Standard number input
              <input
                type="number"
                value={item.quantity || ''}
                onChange={(e) => onUpdate({ 
                  quantity: parseInt(e.target.value) || 0 
                })}
                className="form-input-white-teal w-full px-3 py-2"
                placeholder="Enter quantity"
                min="0"
              />
            )}
          </div>
        );
      
      case 'TEXT':
        return (
          <div className="col-span-full">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Details
            </label>
            <textarea
              value={item.specifications || ''}
              onChange={(e) => onUpdate({ specifications: e.target.value })}
              className="form-input-white-teal w-full px-3 py-2"
              placeholder="Enter details..."
              rows={3}
            />
          </div>
        );
      
      case 'VARCHAR':
        return (
          <div className="col-span-full">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Value
            </label>
            <input
              type="text"
              value={item.specifications || ''}
              onChange={(e) => onUpdate({ specifications: e.target.value })}
              className="form-input-white-teal w-full px-3 py-2"
              placeholder="Enter value..."
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="glass-card-white-teal rounded-lg border border-slate-300/50 transition-all duration-200 hover:border-teal-300/50 hover:shadow-sm">
      {/* Item Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <button
              type="button"
              onClick={() => onUpdate({ available: !item.available })}
              className="flex-shrink-0 transition-colors"
            >
              {item.available ? (
                <CheckSquare className="w-5 h-5 text-emerald-600" />
              ) : (
                <Square className="w-5 h-5 text-slate-500 hover:text-slate-600" />
              )}
            </button>
            <div className="flex-1">
              <h4 className={`font-medium transition-colors ${
                item.available ? 'text-slate-800' : 'text-slate-600'
              }`}>
                {item.name}
              </h4>
              <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                <span>Type: {item.dataType}</span>
                {item.condition && (
                  <span className={`px-2 py-1 rounded-full ${
                    item.condition === 'new' ? 'bg-emerald-100 text-emerald-700' :
                    item.condition === 'good' ? 'bg-teal-100 text-teal-700' :
                    item.condition === 'fair' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {item.condition}
                  </span>
                )}
                {item.quantity && item.quantity > 0 && (
                  <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-full">
                    Qty: {item.quantity}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center space-x-2">
            {item.photoUrl && (
              <div className="w-2 h-2 bg-teal-500 rounded-full" title="Photo uploaded" />
            )}
            {item.specifications && (
              <div className="w-2 h-2 bg-emerald-500 rounded-full" title="Specifications added" />
            )}
            {item.productLink && (
              <div className="w-2 h-2 bg-indigo-500 rounded-full" title="Product link added" />
            )}
            
            <button
              type="button"
              onClick={onToggle}
              className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Item Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-200">
          <div className="bg-slate-50/50 -mx-4 px-4 py-4 mt-4 rounded-b-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Dynamic Input Field */}
            {renderInputField()}

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Condition
              </label>
              <select
                value={item.condition || ''}
                onChange={(e) => onUpdate({ 
                  condition: e.target.value as any 
                })}
                className="form-input-white-teal w-full px-3 py-2"
              >
                <option value="">Select condition</option>
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            {/* Product Link */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Product Link
              </label>
              <input
                type="url"
                value={item.productLink || ''}
                onChange={(e) => onUpdate({ productLink: e.target.value })}
                className="form-input-white-teal w-full px-3 py-2"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={item.itemNotes || ''}
              onChange={(e) => onUpdate({ itemNotes: e.target.value })}
              className="form-input-white-teal w-full px-3 py-2"
              placeholder="Add any additional notes..."
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!item.photoUrl && categoryPhotoCount >= categoryPhotoLimit}
                className={`flex items-center space-x-2 glass-card-white-teal hover:bg-white/80 border px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                  !item.photoUrl && categoryPhotoCount >= categoryPhotoLimit
                    ? 'text-slate-400 border-slate-300/50 cursor-not-allowed'
                    : 'text-teal-700 border-teal-300/50'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{item.photoUrl ? 'Change Photo' : 'Add Photo'}</span>
              </button>

            {item.photoUrl && (
              <button
                type="button"
                onClick={() => window.open(item.photoUrl, '_blank')}
                className="flex items-center space-x-2 glass-card-white-teal hover:bg-white/80 text-emerald-700 border border-emerald-300/50 px-4 py-2 rounded-lg text-sm transition-all duration-200"
              >
                <FileText className="w-4 h-4" />
                <span>View Photo</span>
              </button>
            )}

            {item.productLink && (
              <button
                type="button"
                onClick={() => window.open(item.productLink, '_blank')}
                className="flex items-center space-x-2 glass-card-white-teal hover:bg-white/80 text-indigo-700 border border-indigo-300/50 px-4 py-2 rounded-lg text-sm transition-all duration-200"
              >
                <Link className="w-4 h-4" />
                <span>View Link</span>
              </button>
            )}
            </div>
            
            {/* Photo Limit Indicator */}
            <div className="text-xs text-slate-500">
              Photos: {categoryPhotoCount}/{categoryPhotoLimit}
              {categoryPhotoCount >= categoryPhotoLimit && (
                <span className="text-amber-600 ml-1">(Limit reached)</span>
              )}
            </div>
          </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
