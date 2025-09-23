"use client";

import React, { useState, useImperativeHandle, forwardRef, useCallback, useMemo, useEffect, useId } from 'react';
import { useResponsiveDebouncedCallback } from '@/hooks/useResponsiveDebouncedCallback';
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
  // Contact information
  propertyEmail: '',
  propertyWebsite: '',
};

type FormFieldKey = keyof typeof defaultFormData;

const VillaInformationStepEnhanced = React.memo(forwardRef<StepHandle, VillaInformationStepProps>((
  { data, onUpdate },
  ref
) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState(() => {
    // 🔧 FIXED: Ensure truly blank form for new onboarding sessions
    return { ...defaultFormData };
  });
  const [isTyping, setIsTyping] = useState(false);

  const baseId = useId();
  const getFieldId = useCallback((field: FormFieldKey) => `${baseId}-${field}`, [baseId]);
  const getErrorId = useCallback((field: FormFieldKey) => `${baseId}-${field}-error`, [baseId]);
  const getHelperId = useCallback((field: FormFieldKey) => `${baseId}-${field}-helper`, [baseId]);
  
  // 🔧 FIXED: Optimize data merging to prevent unnecessary re-renders
  // For new onboarding sessions, start with truly blank forms
  const { mergedFormData, hasRealContent } = useMemo(() => {
    const sanitizeValue = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return '';
    };

    if (!data || Object.keys(data).length === 0) {
      return {
        mergedFormData: { ...defaultFormData },
        hasRealContent: false,
      };
    }

    const sanitizedEntries = Object.entries(data).reduce<Partial<Record<FormFieldKey, string>>>((acc, [key, value]) => {
      if (key in defaultFormData) {
        acc[key as FormFieldKey] = sanitizeValue(value);
      }
      return acc;
    }, {});

    const hasOnlyEmptyValues = Object.values(sanitizedEntries).every(value => value === '' || value === undefined);

    if (hasOnlyEmptyValues) {
      return {
        mergedFormData: { ...defaultFormData },
        hasRealContent: false,
      };
    }

    return {
      mergedFormData: { ...defaultFormData, ...sanitizedEntries },
      hasRealContent: true,
    };
  }, [data]);

  // 🔧 FIXED: Only update form data on initial load, not during auto-save operations
  // This prevents user input from being overridden by auto-save responses
  const [hasInitializedFromData, setHasInitializedFromData] = useState(false);

  useEffect(() => {
    if (isTyping) {
      return;
    }

    // Only update form data if we haven't initialized yet AND we have meaningful data from backend
    if (!hasInitializedFromData) {
      if (hasRealContent) {
        setFormData(mergedFormData);
      }
      setHasInitializedFromData(true);
    }
  }, [hasRealContent, isTyping, mergedFormData, hasInitializedFromData]);

  // Debounced update to parent component
  const safeOnUpdate = useCallback((newFormData: typeof defaultFormData) => {
    if (typeof onUpdate === 'function') {
      onUpdate(newFormData);
    }
  }, [onUpdate]);

  const debouncedUpdate = useResponsiveDebouncedCallback(
    (newFormData: typeof defaultFormData) => {
      safeOnUpdate(newFormData);
    },
    600,
    (typing) => setIsTyping(typing)
  );

  const handleInputChange = useCallback((field: FormFieldKey, value: string | number) => {
    const normalizedValue = typeof value === 'number' ? String(value) : value;
    // Immediate local state update for UI responsiveness
    setFormData(prev => {
      const updated = { ...prev, [field]: normalizedValue };
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

  const fieldValidators = useMemo<Partial<Record<FormFieldKey, (value: string) => string | null>>>(() => ({
    villaName: (value: string) => (value.trim() ? null : 'Villa name is required'),
    villaAddress: (value: string) => (value.trim() ? null : 'Villa address is required'),
    villaCity: (value: string) => (value.trim() ? null : 'City is required'),
    villaCountry: (value: string) => (value.trim() ? null : 'Country is required'),
    propertyType: (value: string) => (value ? null : 'Property type is required'),
    bedrooms: (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'At least 1 bedroom is required';
      }

      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return 'Must be a valid number';
      }

      if (!Number.isInteger(parsed)) {
        return 'Must be a valid number';
      }

      if (parsed < 1) {
        return 'Must be at least 1';
      }

      if (parsed > 20) {
        return 'Must be no more than 20';
      }

      return null;
    },
    bathrooms: (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'At least 1 bathroom is required';
      }

      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return 'Must be a valid number';
      }

      if (parsed < 1) {
        return 'Must be at least 1';
      }

      return null;
    },
    maxGuests: (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'Maximum guests must be at least 1';
      }

      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return 'Must be a valid number';
      }

      if (!Number.isInteger(parsed)) {
        return 'Must be a valid number';
      }

      if (parsed < 1) {
        return 'Must be at least 1';
      }

      if (parsed > 50) {
        return 'Must be no more than 50';
      }

      return null;
    },
  }), []);

  const handleBlur = useCallback((field: FormFieldKey) => {
    const validator = fieldValidators[field];
    if (!validator) {
      return;
    }

    const rawValue = formData[field] ?? '';
    const message = validator(rawValue);

    setErrors(prev => {
      if (message) {
        if (prev[field] === message) {
          return prev;
        }
        return { ...prev, [field]: message };
      }

      if (!(field in prev)) {
        return prev;
      }

      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  }, [fieldValidators, formData]);

  // 🔧 FIXED: Memoize validation function to prevent unnecessary re-computation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    for (const field of Object.keys(fieldValidators) as FormFieldKey[]) {
      const validator = fieldValidators[field];
      if (!validator) {
        continue;
      }

      const rawValue = formData[field] ?? '';
      const message = validator(rawValue);
      if (message) {
        newErrors[field] = message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fieldValidators, formData]);

  const processedData = useMemo(() => {
    const numOrUndef = (v: any) => {
      if (v === '' || v === null || v === undefined) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      ...formData,
      bedrooms: numOrUndef(formData.bedrooms),
      bathrooms: numOrUndef(formData.bathrooms),
      maxGuests: numOrUndef(formData.maxGuests),
      landArea: numOrUndef(formData.landArea),
      villaArea: numOrUndef(formData.villaArea),
    };
  }, [formData]);

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
              <label htmlFor={getFieldId('villaName')} className="block text-sm font-medium text-slate-700 mb-2">
                Villa Name *
              </label>
              <input
                id={getFieldId('villaName')}
                type="text"
                value={formData.villaName}
                onChange={(e) => handleInputChange('villaName', e.target.value)}
                onBlur={() => handleBlur('villaName')}
                placeholder="Enter villa name"
                aria-invalid={Boolean(errors.villaName)}
                aria-describedby={errors.villaName ? getErrorId('villaName') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.villaName ? 'error' : ''
                }`}
              />
              {errors.villaName && (
                <p id={getErrorId('villaName')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.villaName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={getFieldId('propertyType')} className="block text-sm font-medium text-slate-700 mb-2">
                Property Type *
              </label>
              <select
                id={getFieldId('propertyType')}
                value={formData.propertyType}
                onChange={(e) => handleInputChange('propertyType', e.target.value)}
                onBlur={() => handleBlur('propertyType')}
                tabIndex={-1}
                aria-invalid={Boolean(errors.propertyType)}
                aria-describedby={errors.propertyType ? getErrorId('propertyType') : undefined}
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
                <p id={getErrorId('propertyType')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.propertyType}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor={getFieldId('villaAddress')} className="block text-sm font-medium text-slate-700 mb-2">
                Address *
              </label>
              <textarea
                id={getFieldId('villaAddress')}
                value={formData.villaAddress}
                onChange={(e) => handleInputChange('villaAddress', e.target.value)}
                onBlur={() => handleBlur('villaAddress')}
                placeholder="Enter full property address"
                rows={3}
                aria-invalid={Boolean(errors.villaAddress)}
                aria-describedby={errors.villaAddress ? getErrorId('villaAddress') : undefined}
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${errors.villaAddress ? 'border-red-400' : ''}`}
              />
              {errors.villaAddress && (
                <p id={getErrorId('villaAddress')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.villaAddress}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={getFieldId('villaCity')} className="block text-sm font-medium text-slate-700 mb-2">
                City *
              </label>
              <input
                id={getFieldId('villaCity')}
                type="text"
                value={formData.villaCity}
                onChange={(e) => handleInputChange('villaCity', e.target.value)}
                onBlur={() => handleBlur('villaCity')}
                placeholder="Enter city"
                aria-invalid={Boolean(errors.villaCity)}
                aria-describedby={errors.villaCity ? getErrorId('villaCity') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.villaCity ? 'error' : ''
                }`}
              />
              {errors.villaCity && (
                <p id={getErrorId('villaCity')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.villaCity}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={getFieldId('villaCountry')} className="block text-sm font-medium text-slate-700 mb-2">
                Country *
              </label>
              <select
                id={getFieldId('villaCountry')}
                value={formData.villaCountry}
                onChange={(e) => handleInputChange('villaCountry', e.target.value)}
                onBlur={() => handleBlur('villaCountry')}
                aria-invalid={Boolean(errors.villaCountry)}
                aria-describedby={errors.villaCountry ? getErrorId('villaCountry') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.villaCountry ? 'error' : ''
                }`}
              >
                <option value="">Select Country</option>
                {countries.map((country) => {
                  const optionValue = country.code === 'US' ? 'USA' : country.name;
                  return (
                    <option key={country.code} value={optionValue}>
                      {country.name}
                    </option>
                  );
                })}
              </select>
              {errors.villaCountry && (
                <p id={getErrorId('villaCountry')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.villaCountry}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor={getFieldId('villaPostalCode')} className="block text-sm font-medium text-slate-700 mb-2">
                Postal Code
              </label>
              <input
                id={getFieldId('villaPostalCode')}
                type="text"
                value={formData.villaPostalCode}
                onChange={(e) => handleInputChange('villaPostalCode', e.target.value)}
                placeholder="Enter postal code"
                aria-invalid={Boolean(errors.villaPostalCode)}
                aria-describedby={errors.villaPostalCode ? getErrorId('villaPostalCode') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.villaPostalCode ? 'error' : ''
                }`}
              />
              {errors.villaPostalCode && (
                <p id={getErrorId('villaPostalCode')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.villaPostalCode}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Property Details Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Property Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor={getFieldId('bedrooms')} className="block text-sm font-medium text-slate-700 mb-2">
                Bedrooms *
              </label>
              <input
                id={getFieldId('bedrooms')}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.bedrooms}
                onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                onBlur={() => handleBlur('bedrooms')}
                placeholder="e.g. 3"
                aria-invalid={Boolean(errors.bedrooms)}
                aria-describedby={errors.bedrooms ? getErrorId('bedrooms') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.bedrooms ? 'error' : ''
                }`}
              />
              {errors.bedrooms && (
                <p id={getErrorId('bedrooms')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.bedrooms}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={getFieldId('bathrooms')} className="block text-sm font-medium text-slate-700 mb-2">
                Bathrooms *
              </label>
              <input
                id={getFieldId('bathrooms')}
                type="text"
                inputMode="decimal"
                value={formData.bathrooms}
                onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                onBlur={() => handleBlur('bathrooms')}
                placeholder="e.g. 2.5"
                aria-invalid={Boolean(errors.bathrooms)}
                aria-describedby={errors.bathrooms ? getErrorId('bathrooms') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.bathrooms ? 'error' : ''
                }`}
              />
              {errors.bathrooms && (
                <p id={getErrorId('bathrooms')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.bathrooms}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={getFieldId('maxGuests')} className="block text-sm font-medium text-slate-700 mb-2">
                Max Guests *
              </label>
              <input
                id={getFieldId('maxGuests')}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.maxGuests}
                onChange={(e) => handleInputChange('maxGuests', e.target.value)}
                onBlur={() => handleBlur('maxGuests')}
                placeholder="e.g. 6"
                aria-invalid={Boolean(errors.maxGuests)}
                aria-describedby={errors.maxGuests ? getErrorId('maxGuests') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.maxGuests ? 'error' : ''
                }`}
              />
              {errors.maxGuests && (
                <p id={getErrorId('maxGuests')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.maxGuests}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Area Information Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Area Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor={getFieldId('landArea')} className="block text-sm font-medium text-slate-700 mb-2">
                Land Area (sqm) *
              </label>
              <input
                id={getFieldId('landArea')}
                type="text"
                inputMode="decimal"
                value={formData.landArea}
                onChange={(e) => handleInputChange('landArea', e.target.value)}
                placeholder="e.g. 500"
                aria-invalid={Boolean(errors.landArea)}
                aria-describedby={errors.landArea ? getErrorId('landArea') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.landArea ? 'error' : ''
                }`}
              />
              {errors.landArea && (
                <p id={getErrorId('landArea')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.landArea}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={getFieldId('villaArea')} className="block text-sm font-medium text-slate-700 mb-2">
                Property Size (sqm) *
              </label>
              <input
                id={getFieldId('villaArea')}
                type="text"
                inputMode="decimal"
                value={formData.villaArea}
                onChange={(e) => handleInputChange('villaArea', e.target.value)}
                placeholder="e.g. 300"
                aria-invalid={Boolean(errors.villaArea)}
                aria-describedby={errors.villaArea ? getErrorId('villaArea') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.villaArea ? 'error' : ''
                }`}
              />
              {errors.villaArea && (
                <p id={getErrorId('villaArea')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.villaArea}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Villa Details Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Villa Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor={getFieldId('yearBuilt')} className="block text-sm font-medium text-slate-700 mb-2">
                Year Built
              </label>
              <input
                id={getFieldId('yearBuilt')}
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
              <label htmlFor={getFieldId('renovationYear')} className="block text-sm font-medium text-slate-700 mb-2">
                Last Renovation Year
              </label>
              <input
                id={getFieldId('renovationYear')}
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
              <label htmlFor={getFieldId('villaStyle')} className="block text-sm font-medium text-slate-700 mb-2">
                Villa Style
              </label>
              <select
                id={getFieldId('villaStyle')}
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
              <label htmlFor={getFieldId('shortDescription')} className="block text-sm font-medium text-slate-700 mb-2">
                Short Summary
              </label>
              <input
                id={getFieldId('shortDescription')}
                type="text"
                value={formData.shortDescription}
                onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                placeholder="Brief one-line overview for listings"
                maxLength={150}
                aria-label="Listing Summary"
                aria-describedby={getHelperId('shortDescription')}
                className="w-full px-4 py-3 form-input-white-teal"
              />
              <p id={getHelperId('shortDescription')} className="text-xs text-slate-500 mt-1">
                {formData.shortDescription.length}/150 characters
              </p>
            </div>

            <div>
              <label htmlFor={getFieldId('description')} className="block text-sm font-medium text-slate-700 mb-2">
                Property Description
              </label>
              <textarea
                id={getFieldId('description')}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed description of the villa, amenities, and unique features..."
                rows={4}
                aria-label="Property Description"
                aria-describedby={getHelperId('description')}
                className="w-full px-4 py-3 form-input-white-teal"
              />
              <p id={getHelperId('description')} className="text-xs text-slate-500 mt-1">
                Describe the villa's features, location highlights, and what makes it special
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor={getFieldId('propertyEmail')} className="block text-sm font-medium text-slate-700 mb-2">
                Property Email
              </label>
              <input
                id={getFieldId('propertyEmail')}
                type="email"
                value={formData.propertyEmail}
                onChange={(e) => handleInputChange('propertyEmail', e.target.value)}
                placeholder="info@villa-name.com"
                aria-describedby={getHelperId('propertyEmail')}
                className="w-full px-4 py-3 form-input-white-teal"
              />
              <p id={getHelperId('propertyEmail')} className="text-xs text-slate-500 mt-1">
                Primary email for guest inquiries and booking communications
              </p>
            </div>

            <div>
              <label htmlFor={getFieldId('propertyWebsite')} className="block text-sm font-medium text-slate-700 mb-2">
                Property Website
              </label>
              <input
                id={getFieldId('propertyWebsite')}
                type="url"
                value={formData.propertyWebsite}
                onChange={(e) => handleInputChange('propertyWebsite', e.target.value)}
                placeholder="https://www.villa-name.com"
                aria-describedby={getHelperId('propertyWebsite')}
                className="w-full px-4 py-3 form-input-white-teal"
              />
              <p id={getHelperId('propertyWebsite')} className="text-xs text-slate-500 mt-1">
                Official villa website or booking page
              </p>
            </div>
          </div>
        </div>

        {/* Location & Maps Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Location & Maps</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor={getFieldId('latitude')} className="block text-sm font-medium text-slate-700 mb-2">
                Latitude
              </label>
              <input
                id={getFieldId('latitude')}
                type="text"
                inputMode="decimal"
                value={formData.latitude}
                onChange={(e) => handleInputChange('latitude', e.target.value)}
                placeholder="e.g. -8.123456"
                aria-invalid={Boolean(errors.latitude)}
                aria-describedby={errors.latitude ? getErrorId('latitude') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.latitude ? 'error' : ''
                }`}
              />
              {errors.latitude && (
                <p id={getErrorId('latitude')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.latitude}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor={getFieldId('longitude')} className="block text-sm font-medium text-slate-700 mb-2">
                Longitude
              </label>
              <input
                id={getFieldId('longitude')}
                type="text"
                inputMode="decimal"
                value={formData.longitude}
                onChange={(e) => handleInputChange('longitude', e.target.value)}
                placeholder="e.g. 115.123456"
                aria-invalid={Boolean(errors.longitude)}
                aria-describedby={errors.longitude ? getErrorId('longitude') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.longitude ? 'error' : ''
                }`}
              />
              {errors.longitude && (
                <p id={getErrorId('longitude')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.longitude}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={getFieldId('locationType')} className="block text-sm font-medium text-slate-700 mb-2">
                Location Type/View
              </label>
              <select
                id={getFieldId('locationType')}
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
              <label htmlFor={getFieldId('googleMapsLink')} className="block text-sm font-medium text-slate-700 mb-2">
                Google Maps Link
              </label>
              <input
                id={getFieldId('googleMapsLink')}
                type="url"
                value={formData.googleMapsLink}
                onChange={(e) => handleInputChange('googleMapsLink', e.target.value)}
                placeholder="https://maps.google.com/..."
                aria-invalid={Boolean(errors.googleMapsLink)}
                aria-describedby={errors.googleMapsLink ? getErrorId('googleMapsLink') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.googleMapsLink ? 'error' : ''
                }`}
              />
              {errors.googleMapsLink && (
                <p id={getErrorId('googleMapsLink')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.googleMapsLink}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* External Links Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">External Links</h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor={getFieldId('oldRatesCardLink')} className="block text-sm font-medium text-slate-700 mb-2">
                Old Rates Card Link
              </label>
              <input
                id={getFieldId('oldRatesCardLink')}
                type="url"
                value={formData.oldRatesCardLink}
                onChange={(e) => handleInputChange('oldRatesCardLink', e.target.value)}
                placeholder="Link to existing rates card"
                aria-invalid={Boolean(errors.oldRatesCardLink)}
                aria-describedby={errors.oldRatesCardLink ? getErrorId('oldRatesCardLink') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.oldRatesCardLink ? 'error' : ''
                }`}
              />
              {errors.oldRatesCardLink && (
                <p id={getErrorId('oldRatesCardLink')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.oldRatesCardLink}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={getFieldId('iCalCalendarLink')} className="block text-sm font-medium text-slate-700 mb-2">
                iCal Calendar Link
              </label>
              <input
                id={getFieldId('iCalCalendarLink')}
                type="url"
                value={formData.iCalCalendarLink}
                onChange={(e) => handleInputChange('iCalCalendarLink', e.target.value)}
                placeholder="iCal calendar URL"
                aria-invalid={Boolean(errors.iCalCalendarLink)}
                aria-describedby={errors.iCalCalendarLink ? getErrorId('iCalCalendarLink') : undefined}
                className={`w-full px-4 py-3 form-input-white-teal ${
                  errors.iCalCalendarLink ? 'error' : ''
                }`}
              />
              {errors.iCalCalendarLink && (
                <p id={getErrorId('iCalCalendarLink')} role="alert" aria-live="assertive" className="text-red-400 text-sm mt-1">
                  {errors.iCalCalendarLink}
                </p>
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
