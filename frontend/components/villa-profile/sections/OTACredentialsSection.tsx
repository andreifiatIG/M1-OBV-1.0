"use client";

import React, { useState } from 'react';
import { clientApi } from '@/lib/api-client';
import { Globe, ExternalLink, Eye, EyeOff, Edit2, Save, X, Download } from 'lucide-react';
import OTAPlatformLogo from '../../onboarding/OTAPlatformLogo';
import jsPDF from 'jspdf';

interface OTACredentialsSectionProps {
  otaDetails: any;
  villaId: string | null;
}

const otaPlatforms = [
  {
    key: 'bookingCom',
    name: 'Booking.com',
    color: 'bg-blue-600',
    description: 'World\'s largest accommodation booking platform',
    urlPlaceholder: 'https://www.booking.com/hotel/...'
  },
  {
    key: 'airbnb',
    name: 'Airbnb',
    color: 'bg-red-500',
    description: 'Global marketplace for unique stays and experiences',
    urlPlaceholder: 'https://www.airbnb.com/rooms/...'
  },
  {
    key: 'tripadvisor',
    name: 'TripAdvisor',
    color: 'bg-green-600',
    description: 'Travel guidance platform with reviews and bookings',
    urlPlaceholder: 'https://www.tripadvisor.com/Hotel_Review-...'
  },
  {
    key: 'expedia',
    name: 'Expedia',
    color: 'bg-yellow-600',
    description: 'Online travel booking platform',
    urlPlaceholder: 'https://www.expedia.com/...'
  },
  {
    key: 'vrbo',
    name: 'VRBO',
    color: 'bg-blue-500',
    description: 'Vacation rental platform by Expedia Group',
    urlPlaceholder: 'https://www.vrbo.com/...'
  },
  {
    key: 'agoda',
    name: 'Agoda',
    color: 'bg-purple-600',
    description: 'Asian-focused online travel booking platform',
    urlPlaceholder: 'https://www.agoda.com/...'
  },
  {
    key: 'hotelsCom',
    name: 'Hotels.com',
    color: 'bg-orange-600',
    description: 'Hotel booking platform with rewards program',
    urlPlaceholder: 'https://www.hotels.com/...'
  }
];

export default function OTACredentialsSection({ otaDetails, villaId }: OTACredentialsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState(() => {
    const initialData: Record<string, any> = {};
    otaPlatforms.forEach(platform => {
      const listedField = `${platform.key}Listed`;
      const usernameField = `${platform.key}Username`;
      const passwordField = `${platform.key}Password`;
      const urlField = `${platform.key}ListingUrl`;
      
      initialData[listedField] = otaDetails?.[listedField] || false;
      initialData[usernameField] = otaDetails?.[usernameField] || '';
      initialData[passwordField] = otaDetails?.[passwordField] || '';
      initialData[urlField] = otaDetails?.[urlField] || '';
    });
    return initialData;
  });

  const handleSave = async () => {
    if (!villaId) return;
    
    try {
      const response = await clientApi.updateOTACredentials(villaId, formData);
      if (response.success) {
        setIsEditing(false);
        window.location.reload();
      } else {
        console.error('Failed to update OTA credentials:', response.error);
      }
    } catch (error) {
      console.error('Failed to update OTA credentials:', error);
    }
  };

  const handleCancel = () => {
    const resetData: Record<string, any> = {};
    otaPlatforms.forEach(platform => {
      const listedField = `${platform.key}Listed`;
      const usernameField = `${platform.key}Username`;
      const passwordField = `${platform.key}Password`;
      const urlField = `${platform.key}ListingUrl`;
      
      resetData[listedField] = otaDetails?.[listedField] || false;
      resetData[usernameField] = otaDetails?.[usernameField] || '';
      resetData[passwordField] = otaDetails?.[passwordField] || '';
      resetData[urlField] = otaDetails?.[urlField] || '';
    });
    setFormData(resetData);
    setIsEditing(false);
  };

  const togglePasswordVisibility = (platformId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [platformId]: !prev[platformId]
    }));
  };

  const maskPassword = (password: string) => {
    return password ? '*'.repeat(Math.min(password.length, 12)) : '';
  };

  const generateOTACredentialsPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 20;
    let yPosition = 20;

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(0, 153, 144); // Teal color
    pdf.text('OTA Credentials Summary', margin, yPosition);
    yPosition += 10;

    // Date
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
    yPosition += 15;

    // Summary Stats
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Overview', margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    const activePlatforms = otaPlatforms.filter(p => otaDetails?.[`${p.key}Listed`]);
    const totalPlatforms = otaPlatforms.length;

    pdf.text(`Active Platforms: ${activePlatforms.length}/${totalPlatforms}`, margin, yPosition);
    yPosition += 5;
    pdf.text(`Coverage: ${Math.round((activePlatforms.length / totalPlatforms) * 100)}%`, margin, yPosition);
    yPosition += 15;

    // Platform Details
    pdf.setFontSize(14);
    pdf.text('Platform Configuration', margin, yPosition);
    yPosition += 10;

    otaPlatforms.forEach((platform, index) => {
      const listedField = `${platform.key}Listed`;
      const usernameField = `${platform.key}Username`;
      const urlField = `${platform.key}ListingUrl`;
      const isListed = otaDetails?.[listedField];
      
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${platform.name}`, margin, yPosition);
      yPosition += 5;

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(platform.description, margin + 5, yPosition);
      yPosition += 6;

      pdf.setFontSize(10);
      if (isListed) {
        pdf.setTextColor(0, 128, 0); // Green
        pdf.text('✓ Listed', margin + 5, yPosition);
        yPosition += 5;
        
        pdf.setTextColor(0, 0, 0);
        if (otaDetails[usernameField]) {
          pdf.text(`Username: ${otaDetails[usernameField]}`, margin + 5, yPosition);
          yPosition += 4;
        }
        
        if (otaDetails[urlField]) {
          pdf.text(`Listing URL: ${otaDetails[urlField]}`, margin + 5, yPosition);
          yPosition += 4;
        }
        
        pdf.text('Password: [PROTECTED]', margin + 5, yPosition);
        yPosition += 4;
      } else {
        pdf.setTextColor(150, 150, 150);
        pdf.text('✗ Not Listed', margin + 5, yPosition);
        yPosition += 5;
      }
      yPosition += 5;
    });

    // Security Notice
    if (yPosition > 240) {
      pdf.addPage();
      yPosition = 20;
    }
    
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.setTextColor(220, 53, 69); // Red
    pdf.text('SECURITY NOTICE', margin, yPosition);
    yPosition += 8;
    
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    const securityText = [
      'This document contains sensitive credential information.',
      'Please handle with care and store securely.',
      'Passwords are masked for security purposes.',
      'Access to full credentials requires proper authentication.'
    ];
    
    securityText.forEach(line => {
      pdf.text(line, margin, yPosition);
      yPosition += 4;
    });

    // Footer
    const finalY = pdf.internal.pageSize.height - 15;
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Generated by M1 Villa Management System', margin, finalY);

    // Save the PDF
    const fileName = `villa-ota-credentials-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  return (
    <div className="glass-card-white-teal rounded-2xl">
      {/* Section Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Globe className="w-6 h-6 text-teal-600" />
          <div>
            <h2 className="text-xl font-medium text-gray-900">OTA Platform Credentials</h2>
            <p className="text-sm text-gray-600">Online travel agency platform access and listing information</p>
          </div>
        </div>
        
        {!isEditing ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={generateOTACredentialsPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
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
        <div className="space-y-6">
          {otaPlatforms.map((platform) => {
            const listedField = `${platform.key}Listed`;
            const usernameField = `${platform.key}Username`;
            const passwordField = `${platform.key}Password`;
            const urlField = `${platform.key}ListingUrl`;
            const isListed = formData[listedField];
            
            return (
            <div key={platform.key} className="glass-card-white-teal rounded-lg p-6">
              {/* Platform Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <OTAPlatformLogo 
                    platform={platform.key}
                    size={32}
                    className="mr-3"
                    fallbackColor={platform.color}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{platform.name}</h3>
                    <p className="text-sm text-slate-600">{platform.description}</p>
                  </div>
                </div>
                
                {/* Platform Toggle */}
                {isEditing ? (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isListed}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        [listedField]: e.target.checked
                      }))}
                      className="sr-only"
                    />
                    <div className={`relative w-12 h-6 rounded-full transition-colors ${
                      isListed ? 'bg-[#009990]' : 'bg-slate-600'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        isListed ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </div>
                    <span className="ml-3 text-sm text-slate-700">
                      {isListed ? 'Listed' : 'Not Listed'}
                    </span>
                  </label>
                ) : (
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    otaDetails?.[listedField] 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-gray-600'
                  }`}>
                    {otaDetails?.[listedField] ? 'Listed' : 'Not Listed'}
                  </div>
                )}
              </div>

              {/* Platform Fields */}
              {(isListed || otaDetails?.[listedField]) && (
                <div className="space-y-4 mt-4">
                  {/* Listing URL Field */}
                  <div className="bg-slate-50/60 backdrop-filter backdrop-blur-10 border border-slate-200/40 rounded-lg p-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                      <ExternalLink className="w-4 h-4 mr-2 text-slate-600" />
                      Listing URL
                    </label>
                    <div className="relative">
                      {isEditing ? (
                        <input
                          type="url"
                          value={formData[urlField]}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            [urlField]: e.target.value
                          }))}
                          placeholder={platform.urlPlaceholder}
                          className="w-full px-4 py-3 bg-white/80 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/90 transition-all duration-200"
                        />
                      ) : (
                        <p className="text-slate-800">
                          {otaDetails?.[urlField] || 'Not provided'}
                        </p>
                      )}
                      {formData[urlField] && (
                        <button
                          type="button"
                          onClick={() => window.open(formData[urlField], '_blank')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-teal-600 hover:text-teal-700 transition-colors"
                          title="Open listing in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 flex items-center">
                      <span className="inline-block w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                      Direct link to your property listing on {platform.name}
                    </p>
                  </div>
                  
                  {/* Credentials */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Username/Email
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData[usernameField]}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            [usernameField]: e.target.value
                          }))}
                          placeholder="Enter username or email"
                          className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                        />
                      ) : (
                        <p className="text-slate-800">
                          {otaDetails?.[usernameField] || 'Not provided'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        {isEditing ? (
                          <>
                            <input
                              type={showPasswords[platform.key] ? 'text' : 'password'}
                              value={formData[passwordField]}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                [passwordField]: e.target.value
                              }))}
                              placeholder="Enter password"
                              className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 pr-12"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(platform.key)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              {showPasswords[platform.key] ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </>
                        ) : (
                          <p className="text-slate-800 font-mono">
                            {otaDetails?.[passwordField] 
                              ? maskPassword(otaDetails[passwordField])
                              : 'Not provided'
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Inactive State Message */}
              {!isListed && !otaDetails?.[listedField] && (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500">
                    {isEditing ? 'Enable to add credentials' : 'Platform not configured'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 glass-card-white-teal rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Platform Summary</h4>
          <div className="flex flex-wrap gap-2">
            {otaPlatforms.map((platform) => {
              const listedField = `${platform.key}Listed`;
              return (
              <span
                key={platform.key}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  otaDetails?.[listedField]
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-gray-600'
                }`}
              >
                <OTAPlatformLogo platform={platform.key} size={16} className="mr-1" /> {platform.name}
              </span>
              );
            })}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {otaPlatforms.filter(p => otaDetails?.[`${p.key}Listed`]).length} of {otaPlatforms.length} platforms active
          </p>
        </div>
      </div>
    </div>
  );
}