"use client";

import React, { useState } from 'react';
import { clientApi } from '@/lib/api-client';
import { Home, MapPin, ExternalLink, Edit2, Save, X, Bed, Bath, Users, Square, Globe } from 'lucide-react';

interface VillaInformationSectionProps {
  villa: any;
  villaId: string | null;
}

export default function VillaInformationSection({ villa, villaId }: VillaInformationSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    // Match exact fields from VillaInformationStepEnhanced.tsx
    villaName: villa?.villaName || '',
    villaAddress: villa?.villaAddress || '',
    villaCity: villa?.villaCity || '',
    villaPostalCode: villa?.villaPostalCode || '',
    bedrooms: villa?.bedrooms || 0,
    bathrooms: villa?.bathrooms || 0,
    maxGuests: villa?.maxGuests || 0,
    propertyType: villa?.propertyType || '',
    landArea: villa?.landArea || 0,
    villaArea: villa?.villaArea || 0,
    googleCoordinates: villa?.googleCoordinates || '',
    locationType: villa?.locationType || '',
    googleMapsLink: villa?.googleMapsLink || '',
    oldRatesCardLink: villa?.oldRatesCardLink || '',
    iCalCalendarLink: villa?.iCalCalendarLink || ''
  });

  const handleSave = async () => {
    if (!villaId) return;
    
    try {
      const response = await clientApi.updateVilla(villaId, formData);
      if (response.success) {
        setIsEditing(false);
        window.location.reload();
      } else {
        console.error('Failed to update villa:', response.error);
      }
    } catch (error) {
      console.error('Failed to update villa:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      villaName: villa?.villaName || '',
      villaAddress: villa?.villaAddress || '',
      villaCity: villa?.villaCity || '',
      villaPostalCode: villa?.villaPostalCode || '',
      bedrooms: villa?.bedrooms || 0,
      bathrooms: villa?.bathrooms || 0,
      maxGuests: villa?.maxGuests || 0,
      propertyType: villa?.propertyType || '',
      landArea: villa?.landArea || 0,
      villaArea: villa?.villaArea || 0,
      googleCoordinates: villa?.googleCoordinates || '',
      locationType: villa?.locationType || '',
      googleMapsLink: villa?.googleMapsLink || '',
      oldRatesCardLink: villa?.oldRatesCardLink || '',
      iCalCalendarLink: villa?.iCalCalendarLink || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="glass-card-white-teal rounded-2xl">
      {/* Section Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Home className="w-6 h-6 text-teal-600" />
          <div>
            <h2 className="text-xl font-medium text-slate-900">Villa Information</h2>
            <p className="text-sm text-slate-600">Basic property details, location, and external links</p>
          </div>
        </div>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
              <Home className="w-5 h-5 text-slate-600 mr-2" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Villa Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.villaName}
                    onChange={(e) => setFormData({ ...formData, villaName: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-slate-900">{villa?.villaName || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Property Type</label>
                {isEditing ? (
                  <select
                    value={formData.propertyType}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  >
                    <option value="">Select type</option>
                    <option value="Villa">Villa</option>
                    <option value="House">House</option>
                    <option value="Apartment">Apartment</option>
                  </select>
                ) : (
                  <p className="text-slate-900">{villa?.propertyType || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.villaAddress}
                    onChange={(e) => setFormData({ ...formData, villaAddress: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-slate-900 flex items-center">
                    <MapPin className="w-4 h-4 text-slate-500 mr-2" />
                    {villa?.villaAddress || 'Not provided'}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.villaCity}
                    onChange={(e) => setFormData({ ...formData, villaCity: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-slate-900">{villa?.villaCity || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Postal Code</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.villaPostalCode}
                    onChange={(e) => setFormData({ ...formData, villaPostalCode: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-slate-900">{villa?.villaPostalCode || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
              <Square className="w-5 h-5 text-slate-600 mr-2" />
              Property Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bedrooms</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-slate-900 flex items-center">
                    <Bed className="w-4 h-4 text-slate-500 mr-2" />
                    {villa?.bedrooms || 0}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bathrooms</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 0 })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-slate-900 flex items-center">
                    <Bath className="w-4 h-4 text-slate-500 mr-2" />
                    {villa?.bathrooms || 0}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Max Guests</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={formData.maxGuests}
                    onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) || 0 })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-slate-900 flex items-center">
                    <Users className="w-4 h-4 text-slate-500 mr-2" />
                    {villa?.maxGuests || 0}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Land Area (sqm)</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={formData.landArea}
                    onChange={(e) => setFormData({ ...formData, landArea: parseInt(e.target.value) || 0 })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-slate-900">{villa?.landArea ? `${villa.landArea} sqm` : 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Villa Area (sqm)</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={formData.villaArea}
                    onChange={(e) => setFormData({ ...formData, villaArea: parseInt(e.target.value) || 0 })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-slate-900">{villa?.villaArea ? `${villa.villaArea} sqm` : 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Area Information */}
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 text-slate-600 mr-2" />
              Area Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Google Coordinates</label>
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="e.g., -8.6481, 115.1372"
                    value={formData.googleCoordinates}
                    onChange={(e) => setFormData({ ...formData, googleCoordinates: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-slate-900">{villa?.googleCoordinates || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Location Type</label>
                {isEditing ? (
                  <select
                    value={formData.locationType}
                    onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  >
                    <option value="">Select location type</option>
                    <option value="Seaview">Seaview</option>
                    <option value="Beachfront">Beachfront</option>
                    <option value="Garden">Garden</option>
                    <option value="Mountain">Mountain</option>
                    <option value="City">City</option>
                    <option value="Countryside">Countryside</option>
                  </select>
                ) : (
                  <p className="text-slate-900">{villa?.locationType || 'Not provided'}</p>
                )}
              </div>
              
            </div>
          </div>

          {/* External Links */}
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
              <Globe className="w-5 h-5 text-slate-600 mr-2" />
              External Links
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Google Maps Link</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.googleMapsLink}
                    onChange={(e) => setFormData({ ...formData, googleMapsLink: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                    placeholder="https://maps.google.com/..."
                  />
                ) : (
                  <div className="flex items-center">
                    {villa?.googleMapsLink ? (
                      <a
                        href={villa.googleMapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on Google Maps
                      </a>
                    ) : (
                      <p className="text-slate-900">Not provided</p>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Old Rates Card Link</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.oldRatesCardLink}
                    onChange={(e) => setFormData({ ...formData, oldRatesCardLink: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                    placeholder="Link to existing rates card"
                  />
                ) : (
                  <div className="flex items-center">
                    {villa?.oldRatesCardLink ? (
                      <a
                        href={villa.oldRatesCardLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Rates Card
                      </a>
                    ) : (
                      <p className="text-slate-900">Not provided</p>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">iCal Calendar Link</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.iCalCalendarLink}
                    onChange={(e) => setFormData({ ...formData, iCalCalendarLink: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                    placeholder="iCal calendar URL"
                  />
                ) : (
                  <div className="flex items-center">
                    {villa?.iCalCalendarLink ? (
                      <a
                        href={villa.iCalCalendarLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        iCal Calendar
                      </a>
                    ) : (
                      <p className="text-slate-900">Not provided</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}