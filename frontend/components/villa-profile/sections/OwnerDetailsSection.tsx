"use client";

import React, { useState } from 'react';
import { clientApi } from '@/lib/api-client';
import { User, Building, UserCheck, Edit2, Save, X, Mail, Phone, MapPin } from 'lucide-react';

interface OwnerDetailsSectionProps {
  ownerDetails: any;
  villaId: string | null;
}

export default function OwnerDetailsSection({ ownerDetails, villaId }: OwnerDetailsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    // Owner Type (1 field)
    ownerType: ownerDetails?.ownerType || 'Individual',
    
    // Company Information (4 fields)
    companyName: ownerDetails?.companyName || '',
    companyAddress: ownerDetails?.companyAddress || '',
    companyTaxId: ownerDetails?.companyTaxId || '',
    companyVat: ownerDetails?.companyVat || '',
    
    // Owner Information (8 fields)
    ownerFullName: ownerDetails?.ownerFullName || '',
    ownerEmail: ownerDetails?.ownerEmail || '',
    ownerPhone: ownerDetails?.ownerPhone || '',
    ownerAddress: ownerDetails?.ownerAddress || '',
    ownerCity: ownerDetails?.ownerCity || '',
    ownerCountry: ownerDetails?.ownerCountry || '',
    ownerNationality: ownerDetails?.ownerNationality || '',
    ownerPassportNumber: ownerDetails?.ownerPassportNumber || '',
    
    // Property Manager (5 fields)
    villaManagerName: ownerDetails?.villaManagerName || '',
    villaManagerEmail: ownerDetails?.villaManagerEmail || '',
    villaManagerPhone: ownerDetails?.villaManagerPhone || '',
    propertyEmail: ownerDetails?.propertyEmail || '',
    propertyWebsite: ownerDetails?.propertyWebsite || ''
  });

  const handleSave = async () => {
    if (!villaId) return;
    
    try {
      const response = await clientApi.updateOwnerDetails(villaId, formData);
      if (response.success) {
        setIsEditing(false);
        window.location.reload();
      } else {
        console.error('Failed to update owner details:', response.error);
      }
    } catch (error) {
      console.error('Failed to update owner details:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      ownerType: ownerDetails?.ownerType || 'Individual',
      companyName: ownerDetails?.companyName || '',
      companyAddress: ownerDetails?.companyAddress || '',
      companyTaxId: ownerDetails?.companyTaxId || '',
      companyVat: ownerDetails?.companyVat || '',
      ownerFullName: ownerDetails?.ownerFullName || '',
      ownerEmail: ownerDetails?.ownerEmail || '',
      ownerPhone: ownerDetails?.ownerPhone || '',
      ownerAddress: ownerDetails?.ownerAddress || '',
      ownerCity: ownerDetails?.ownerCity || '',
      ownerCountry: ownerDetails?.ownerCountry || '',
      ownerNationality: ownerDetails?.ownerNationality || '',
      ownerPassportNumber: ownerDetails?.ownerPassportNumber || '',
      villaManagerName: ownerDetails?.villaManagerName || '',
      villaManagerEmail: ownerDetails?.villaManagerEmail || '',
      villaManagerPhone: ownerDetails?.villaManagerPhone || '',
      propertyEmail: ownerDetails?.propertyEmail || '',
      propertyWebsite: ownerDetails?.propertyWebsite || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="glass-card-white-teal rounded-2xl">
      {/* Section Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <User className="w-6 h-6 text-teal-600" />
          <div>
            <h2 className="text-xl font-medium text-gray-900">Owner Details</h2>
            <p className="text-sm text-gray-600">Property ownership and contact information</p>
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
          {/* Owner Type */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 text-gray-600 mr-2" />
              Owner Type
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Owner Type</label>
                {isEditing ? (
                  <select
                    value={formData.ownerType}
                    onChange={(e) => setFormData({ ...formData, ownerType: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  >
                    <option value="Individual">Individual</option>
                    <option value="Company">Company</option>
                    <option value="Trust">Trust</option>
                    <option value="Partnership">Partnership</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{ownerDetails?.ownerType || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Company Information - Show only if owner type is Company */}
          {(formData.ownerType === 'Company' || (!isEditing && ownerDetails?.ownerType === 'Company')) && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 text-gray-600 mr-2" />
                Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="form-input-white-teal w-full px-3 py-2"
                    />
                  ) : (
                    <p className="text-gray-900">{ownerDetails?.companyName || 'Not provided'}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tax ID</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.companyTaxId}
                      onChange={(e) => setFormData({ ...formData, companyTaxId: e.target.value })}
                      className="form-input-white-teal w-full px-3 py-2"
                    />
                  ) : (
                    <p className="text-gray-900">{ownerDetails?.companyTaxId || 'Not provided'}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">VAT Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.companyVat}
                      onChange={(e) => setFormData({ ...formData, companyVat: e.target.value })}
                      className="form-input-white-teal w-full px-3 py-2"
                    />
                  ) : (
                    <p className="text-gray-900">{ownerDetails?.companyVat || 'Not provided'}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company Address</label>
                  {isEditing ? (
                    <textarea
                      value={formData.companyAddress}
                      onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                      rows={3}
                      className="form-input-white-teal w-full px-3 py-2"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-start">
                      <MapPin className="w-4 h-4 text-slate-500 mr-2 mt-0.5" />
                      {ownerDetails?.companyAddress || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Owner Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 text-gray-600 mr-2" />
              Owner Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.ownerFullName}
                    onChange={(e) => setFormData({ ...formData, ownerFullName: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{ownerDetails?.ownerFullName || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <Mail className="w-4 h-4 text-slate-500 mr-2" />
                    {ownerDetails?.ownerEmail || 'Not provided'}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <Phone className="w-4 h-4 text-slate-500 mr-2" />
                    {ownerDetails?.ownerPhone || 'Not provided'}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nationality</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.ownerNationality}
                    onChange={(e) => setFormData({ ...formData, ownerNationality: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{ownerDetails?.ownerNationality || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.ownerCity}
                    onChange={(e) => setFormData({ ...formData, ownerCity: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{ownerDetails?.ownerCity || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.ownerCountry}
                    onChange={(e) => setFormData({ ...formData, ownerCountry: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{ownerDetails?.ownerCountry || 'Not provided'}</p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                {isEditing ? (
                  <textarea
                    value={formData.ownerAddress}
                    onChange={(e) => setFormData({ ...formData, ownerAddress: e.target.value })}
                    rows={3}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900 flex items-start">
                    <MapPin className="w-4 h-4 text-slate-500 mr-2 mt-0.5" />
                    {ownerDetails?.ownerAddress || 'Not provided'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Property Manager */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <UserCheck className="w-5 h-5 text-gray-600 mr-2" />
              Property Manager
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Villa Manager Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.villaManagerName}
                    onChange={(e) => setFormData({ ...formData, villaManagerName: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{ownerDetails?.villaManagerName || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Manager Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.villaManagerEmail}
                    onChange={(e) => setFormData({ ...formData, villaManagerEmail: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <Mail className="w-4 h-4 text-slate-500 mr-2" />
                    {ownerDetails?.villaManagerEmail || 'Not provided'}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Manager Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.villaManagerPhone}
                    onChange={(e) => setFormData({ ...formData, villaManagerPhone: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <Phone className="w-4 h-4 text-slate-500 mr-2" />
                    {ownerDetails?.villaManagerPhone || 'Not provided'}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Property Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.propertyEmail}
                    onChange={(e) => setFormData({ ...formData, propertyEmail: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <Mail className="w-4 h-4 text-slate-500 mr-2" />
                    {ownerDetails?.propertyEmail || 'Not provided'}
                  </p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Property Website</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.propertyWebsite}
                    onChange={(e) => setFormData({ ...formData, propertyWebsite: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                    placeholder="https://..."
                  />
                ) : (
                  <p className="text-gray-900">{ownerDetails?.propertyWebsite || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}