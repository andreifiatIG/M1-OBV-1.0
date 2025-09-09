"use client";

import React, { useState, useImperativeHandle, forwardRef, useCallback, useMemo, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { AlertCircle, Home } from 'lucide-react';
import { StepHandle } from './types';
import { countries } from '@/lib/countries';

interface VillaInformationStepProps {
  data: any;
  onUpdate: (stepData: any) => void;
}

const defaultFormData = {
  villaName: '',
  villaAddress: '',
  villaCity: '',
  villaCountry: '',  // No default country - will be loaded from backend
  villaPostalCode: '',
  bedrooms: '',
  bathrooms: '',
  maxGuests: '',
  propertyType: '',
  landArea: '',
  villaArea: '',
  latitude: '',
  longitude: '',
  locationType: '',
  googleMapsLink: '',
  oldRatesCardLink: '',
  iCalCalendarLink: '',
  // New fields from database schema
  yearBuilt: '',
  renovationYear: '',
  villaStyle: '',
  description: '',
  shortDescription: '',
};

const VillaInformationStepEnhanced = React.memo(forwardRef<StepHandle, VillaInformationStepProps>((
  { data, onUpdate },
  ref
) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState(() => ({ ...defaultFormData }));
  const [isTyping, setIsTyping] = useState(false);
  
  // Update form data when data prop changes (when loading from backend)
  useEffect(() => {
    if (data && Object.keys(data).length > 0 && !isTyping) {
      console.log('[UPDATE] VillaInformationStep: Data prop changed, updating form data:', data);
      setFormData(() => {
        // Merge default data with incoming backend data
        const merged = { ...defaultFormData, ...data };
        console.log('[UPDATE] Merged form data:', {
          villaName: merged.villaName,
          villaAddress: merged.villaAddress,
          villaCity: merged.villaCity,
          villaCountry: merged.villaCountry,
          bedrooms: merged.bedrooms,
          bathrooms: merged.bathrooms,
          maxGuests: merged.maxGuests,
          propertyType: merged.propertyType
        });
        return merged;
      });
    }
  }, [data, isTyping]);

  // Debounced update to parent component
  const debouncedUpdate = useDebouncedCallback(
    (newFormData: any) => {
      console.log('[UPDATE] Updating parent with:', newFormData);
      onUpdate(newFormData);
      // Clear typing flag after update
      setTimeout(() => setIsTyping(false), 1000);
    },
    800 // Longer debounce to reduce API calls
  );

  const handleInputChange = useCallback((field: string, value: string | number) => {
    console.log(`[UPDATE] Input changed: ${field} = ${value}`);
    
    // Set typing flag to prevent backend updates
    setIsTyping(true);
    
    // Immediate local state update for UI responsiveness
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Trigger debounced parent update
      debouncedUpdate(updated);
      return updated;
    });
    
    // Clear errors immediately for better UX
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors, debouncedUpdate]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    // Required field validations
    if (!formData.villaName?.trim()) {
      newErrors.villaName = 'Villa name is required';
    }
    
    if (!formData.villaAddress?.trim()) {
      newErrors.villaAddress = 'Villa address is required';
    }
    
    if (!formData.villaCity?.trim()) {
      newErrors.villaCity = 'City is required';
    }
    
    if (!formData.villaCountry?.trim()) {
      newErrors.villaCountry = 'Country is required';
    }
    
    const bedrooms = parseInt(formData.bedrooms);
    if (!bedrooms || bedrooms < 1) {
      newErrors.bedrooms = 'At least 1 bedroom is required';
    }
    
    const bathrooms = parseInt(formData.bathrooms);
    if (!bathrooms || bathrooms < 1) {
      newErrors.bathrooms = 'At least 1 bathroom is required';
    }
    
    const maxGuests = parseInt(formData.maxGuests);
    if (!maxGuests || maxGuests < 1) {
      newErrors.maxGuests = 'Maximum guests must be at least 1';
    }
    
    if (!formData.propertyType) {
      newErrors.propertyType = 'Property type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const processedData = useMemo(() => ({
    ...formData,
    bedrooms: Number(formData.bedrooms) || 0,
    bathrooms: Number(formData.bathrooms) || 0,
    maxGuests: Number(formData.maxGuests) || 0,
    landArea: Number(formData.landArea) || 0,
    villaArea: Number(formData.villaArea) || 0,
  }), [formData]);

  useImperativeHandle(ref, () => ({
    validate: validateForm,
    getData: () => processedData
  }), [validateForm, processedData]);
  
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#009990]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Home className="w-8 h-8 text-[#009990]" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Villa Information</h2>
        <p className="text-slate-600">Tell us about your property in detail</p>
        <div className="flex items-center justify-center mt-4 p-3 glass-card-white-teal">
          <AlertCircle className="w-5 h-5 text-[#009990] mr-2" />
          <span className="text-slate-700 text-sm">All property information is stored securely with automatic validation</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information Section */}
        <div className="glass-card-white-teal p-6">
          
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Villa Name *
              </label>
              <input
                type="text"
                value={formData.villaName}
                onChange={(e) => handleInputChange('villaName', e.target.value)}
                placeholder="Enter villa name"
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.villaName ? 'error' : ''
                }`}
              />
              {errors.villaName && (
                <p className="text-red-400 text-sm mt-1">{errors.villaName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Property Type *
              </label>
              <select
                value={formData.propertyType}
                onChange={(e) => handleInputChange('propertyType', e.target.value)}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.propertyType ? 'error' : ''
                }`}
              >
                <option value="">Select type</option>
                <option value="VILLA">Villa</option>
                <option value="HOUSE">House</option>
                <option value="APARTMENT">Apartment</option>
                <option value="PENTHOUSE">Penthouse</option>
                <option value="TOWNHOUSE">Townhouse</option>
                <option value="CHALET">Chalet</option>
                <option value="BUNGALOW">Bungalow</option>
                <option value="ESTATE">Estate</option>
              </select>
              {errors.propertyType && (
                <p className="text-red-400 text-sm mt-1">{errors.propertyType}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Address *
              </label>
              <textarea
                value={formData.villaAddress}
                onChange={(e) => handleInputChange('villaAddress', e.target.value)}
                placeholder="Enter full property address"
                rows={3}
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${errors.villaAddress ? 'border-red-400' : ''}`}
              />
              {errors.villaAddress && (
                <p className="text-red-400 text-sm mt-1">{errors.villaAddress}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                City *
              </label>
              <input
                type="text"
                value={formData.villaCity}
                onChange={(e) => handleInputChange('villaCity', e.target.value)}
                placeholder="Enter city"
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.villaCity ? 'error' : ''
                }`}
              />
              {errors.villaCity && (
                <p className="text-red-400 text-sm mt-1">{errors.villaCity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Country *
              </label>
              <select
                value={formData.villaCountry}
                onChange={(e) => handleInputChange('villaCountry', e.target.value)}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.villaCountry ? 'error' : ''
                }`}
              >
                <option value="">Select Country</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.villaCountry && (
                <p className="text-red-400 text-sm mt-1">{errors.villaCountry}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.villaPostalCode}
                onChange={(e) => handleInputChange('villaPostalCode', e.target.value)}
                placeholder="Enter postal code"
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.villaPostalCode ? 'error' : ''
                }`}
              />
              {errors.villaPostalCode && (
                <p className="text-red-400 text-sm mt-1">{errors.villaPostalCode}</p>
              )}
            </div>
          </div>
        </div>

        {/* Property Details Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Property Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bedrooms *
              </label>
              <input
                type="number"
                min="1"
                value={formData.bedrooms}
                onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                placeholder="e.g. 3"
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.bedrooms ? 'error' : ''
                }`}
              />
              {errors.bedrooms && (
                <p className="text-red-400 text-sm mt-1">{errors.bedrooms}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bathrooms *
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                placeholder="e.g. 2.5"
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.bathrooms ? 'error' : ''
                }`}
              />
              {errors.bathrooms && (
                <p className="text-red-400 text-sm mt-1">{errors.bathrooms}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Max Guests *
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxGuests}
                onChange={(e) => handleInputChange('maxGuests', e.target.value)}
                placeholder="e.g. 6"
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.maxGuests ? 'error' : ''
                }`}
              />
              {errors.maxGuests && (
                <p className="text-red-400 text-sm mt-1">{errors.maxGuests}</p>
              )}
            </div>
          </div>
        </div>

        {/* Area Information Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Area Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Land Area (sqm) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.landArea}
                onChange={(e) => handleInputChange('landArea', e.target.value)}
                placeholder="e.g. 500"
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.landArea ? 'error' : ''
                }`}
              />
              {errors.landArea && (
                <p className="text-red-400 text-sm mt-1">{errors.landArea}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Villa Area (sqm) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.villaArea}
                onChange={(e) => handleInputChange('villaArea', e.target.value)}
                placeholder="e.g. 300"
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.villaArea ? 'error' : ''
                }`}
              />
              {errors.villaArea && (
                <p className="text-red-400 text-sm mt-1">{errors.villaArea}</p>
              )}
            </div>
          </div>
        </div>

        {/* Villa Details Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Villa Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Year Built
              </label>
              <input
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                value={formData.yearBuilt}
                onChange={(e) => handleInputChange('yearBuilt', e.target.value)}
                placeholder="e.g. 2010"
                className="w-full px-4 py-3 form-input-white-teal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Last Renovation Year
              </label>
              <input
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                value={formData.renovationYear}
                onChange={(e) => handleInputChange('renovationYear', e.target.value)}
                placeholder="e.g. 2020"
                className="w-full px-4 py-3 form-input-white-teal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Villa Style
              </label>
              <select
                value={formData.villaStyle}
                onChange={(e) => handleInputChange('villaStyle', e.target.value)}
                className="w-full px-4 py-3 form-input-white-teal"
              >
                <option value="">Select Style</option>
                <option value="MODERN">Modern</option>
                <option value="TRADITIONAL">Traditional</option>
                <option value="MEDITERRANEAN">Mediterranean</option>
                <option value="CONTEMPORARY">Contemporary</option>
                <option value="BALINESE">Balinese</option>
                <option value="MINIMALIST">Minimalist</option>
                <option value="LUXURY">Luxury</option>
                <option value="RUSTIC">Rustic</option>
              </select>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Property Description</h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Short Description
              </label>
              <input
                type="text"
                value={formData.shortDescription}
                onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                placeholder="Brief one-line description for listings"
                maxLength={150}
                className="w-full px-4 py-3 form-input-white-teal"
              />
              <p className="text-xs text-slate-500 mt-1">
                {formData.shortDescription.length}/150 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed description of the villa, amenities, and unique features..."
                rows={4}
                className="w-full px-4 py-3 form-input-white-teal"
              />
              <p className="text-xs text-slate-500 mt-1">
                Describe the villa's features, location highlights, and what makes it special
              </p>
            </div>
          </div>
        </div>

        {/* Location & Maps Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Location & Maps</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => handleInputChange('latitude', e.target.value)}
                placeholder="e.g. -8.123456"
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.latitude ? 'error' : ''
                }`}
              />
              {errors.latitude && (
                <p className="text-red-400 text-sm mt-1">{errors.latitude}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => handleInputChange('longitude', e.target.value)}
                placeholder="e.g. 115.123456"
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.longitude ? 'error' : ''
                }`}
              />
              {errors.longitude && (
                <p className="text-red-400 text-sm mt-1">{errors.longitude}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Location Type/View
              </label>
              <select
                value={formData.locationType}
                onChange={(e) => handleInputChange('locationType', e.target.value)}
                className="w-full px-4 py-3 form-input-white-teal"
              >
                <option value="">Select location type</option>
                <option value="Seaview">Seaview</option>
                <option value="Beachfront">Beachfront</option>
                <option value="Garden">Garden</option>
                <option value="Mountain">Mountain</option>
                <option value="City">City</option>
                <option value="Countryside">Countryside</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Google Maps Link
              </label>
              <input
                type="url"
                value={formData.googleMapsLink}
                onChange={(e) => handleInputChange('googleMapsLink', e.target.value)}
                placeholder="https://maps.google.com/..."
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.googleMapsLink ? 'error' : ''
                }`}
              />
              {errors.googleMapsLink && (
                <p className="text-red-400 text-sm mt-1">{errors.googleMapsLink}</p>
              )}
            </div>
          </div>
        </div>

        {/* External Links Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">External Links</h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Old Rates Card Link
              </label>
              <input
                type="url"
                value={formData.oldRatesCardLink}
                onChange={(e) => handleInputChange('oldRatesCardLink', e.target.value)}
                placeholder="Link to existing rates card"
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.oldRatesCardLink ? 'error' : ''
                }`}
              />
              {errors.oldRatesCardLink && (
                <p className="text-red-400 text-sm mt-1">{errors.oldRatesCardLink}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                iCal Calendar Link
              </label>
              <input
                type="url"
                value={formData.iCalCalendarLink}
                onChange={(e) => handleInputChange('iCalCalendarLink', e.target.value)}
                placeholder="iCal calendar URL"
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.iCalCalendarLink ? 'error' : ''
                }`}
              />
              {errors.iCalCalendarLink && (
                <p className="text-red-400 text-sm mt-1">{errors.iCalCalendarLink}</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}));

VillaInformationStepEnhanced.displayName = 'VillaInformationStepEnhanced';

export default VillaInformationStepEnhanced;
