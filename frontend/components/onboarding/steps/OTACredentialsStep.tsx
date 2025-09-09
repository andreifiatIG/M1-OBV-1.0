"use client";

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Eye, EyeOff, Shield, AlertCircle, Globe, ExternalLink } from 'lucide-react';
import { StepHandle } from './types';
import OTAPlatformLogo from '../OTAPlatformLogo';

interface OTACredentialsStepProps {
  data: any;
  onUpdate: (stepData: any) => void;
}

const defaultFormData = {
  bookingComListed: false,
  bookingComUsername: '',
  bookingComPassword: '',
  bookingComPropertyId: '',
  bookingComApiKey: '',
  bookingComApiSecret: '',
  bookingComListingUrl: '',
  bookingComAccountUrl: '',
  bookingComPropertyUrl: '',
  airbnbListed: false,
  airbnbUsername: '',
  airbnbPassword: '',
  airbnbPropertyId: '',
  airbnbApiKey: '',
  airbnbApiSecret: '',
  airbnbListingUrl: '',
  airbnbAccountUrl: '',
  airbnbPropertyUrl: '',
  expediaListed: false,
  expediaUsername: '',
  expediaPassword: '',
  expediaPropertyId: '',
  expediaApiKey: '',
  expediaApiSecret: '',
  expediaListingUrl: '',
  expediaAccountUrl: '',
  expediaPropertyUrl: '',
  vrboListed: false,
  vrboUsername: '',
  vrboPassword: '',
  vrboPropertyId: '',
  vrboApiKey: '',
  vrboApiSecret: '',
  vrboListingUrl: '',
  vrboAccountUrl: '',
  vrboPropertyUrl: '',
  agodaListed: false,
  agodaUsername: '',
  agodaPassword: '',
  agodaPropertyId: '',
  agodaApiKey: '',
  agodaApiSecret: '',
  agodaListingUrl: '',
  agodaAccountUrl: '',
  agodaPropertyUrl: '',
  marriottHomesVillasListed: false,
  marriottHomesVillasUsername: '',
  marriottHomesVillasPassword: '',
  marriottHomesVillasPropertyId: '',
  marriottHomesVillasApiKey: '',
  marriottHomesVillasApiSecret: '',
  marriottHomesVillasListingUrl: '',
  marriottHomesVillasAccountUrl: '',
  marriottHomesVillasPropertyUrl: '',
};

const OTACredentialsStep = forwardRef<StepHandle, OTACredentialsStepProps>((
  { data, onUpdate },
  ref
) => {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formData = { ...defaultFormData, ...data };

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
      key: 'marriottHomesVillas',
      name: 'Marriott Homes & Villas',
      color: 'bg-red-700',
      description: 'Luxury vacation rental platform by Marriott',
      urlPlaceholder: 'https://homes-and-villas.marriott.com/...'
    }
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    onUpdate({
      ...formData,
      [field]: value
    });
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const togglePasswordVisibility = (platform: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  const validateForm = () => {
    // Disable validation for development - always return true
    return true;
  };
  
  useImperativeHandle(ref, () => ({
    validate: validateForm,
    getData: () => formData,
  }));

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#009990]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Globe className="w-8 h-8 text-[#009990]" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">OTA Platform Credentials</h2>
        <p className="text-slate-600">Configure your Online Travel Agency platform access</p>
        <div className="flex items-center justify-center mt-4 p-3 glass-card-white-teal">
          <Shield className="w-5 h-5 text-[#009990] mr-2" />
          <span className="text-slate-700 text-sm">All credentials are encrypted and stored securely</span>
        </div>
      </div>

      <div className="space-y-6">
        {otaPlatforms.map((platform) => {
          const listedField = `${platform.key}Listed`;
          const usernameField = `${platform.key}Username`;
          const passwordField = `${platform.key}Password`;
          const isListed = (formData as any)[listedField];

          return (
            <div key={platform.key} className="glass-card-white-teal rounded-lg p-6">
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
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isListed}
                    onChange={(e) => handleInputChange(listedField, e.target.checked)}
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
              </div>

              {isListed && (
                <div className="space-y-4 mt-4">
                  {/* Listing URL Field */}
                  <div className="bg-slate-50/60 backdrop-filter backdrop-blur-10 border border-slate-200/40 rounded-lg p-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                      <ExternalLink className="w-4 h-4 mr-2 text-slate-600" />
                      Listing URL
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={(formData as any)[`${platform.key}ListingUrl`] as string}
                        onChange={(e) => handleInputChange(`${platform.key}ListingUrl`, e.target.value)}
                        placeholder={platform.urlPlaceholder}
                        className="w-full px-4 py-3 bg-white/80 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/90 transition-all duration-200"
                      />
                      {(formData as any)[`${platform.key}ListingUrl`] && (
                        <button
                          type="button"
                          onClick={() => window.open((formData as any)[`${platform.key}ListingUrl`], '_blank')}
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

                  {/* Management URLs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Account URL
                      </label>
                      <input
                        type="url"
                        value={(formData as any)[`${platform.key}AccountUrl`] as string}
                        onChange={(e) => handleInputChange(`${platform.key}AccountUrl`, e.target.value)}
                        placeholder="Dashboard/Admin URL"
                        className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">URL to your account dashboard</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Property Management URL
                      </label>
                      <input
                        type="url"
                        value={(formData as any)[`${platform.key}PropertyUrl`] as string}
                        onChange={(e) => handleInputChange(`${platform.key}PropertyUrl`, e.target.value)}
                        placeholder="Property management URL"
                        className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">URL to manage this specific property</p>
                    </div>
                  </div>
                  
                  {/* Credentials */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Username/Email
                      </label>
                      <input
                        type="text"
                        value={(formData as any)[usernameField] as string}
                        onChange={(e) => handleInputChange(usernameField, e.target.value)}
                        placeholder="Enter username or email"
                        className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                          errors[usernameField] ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                        }`}
                      />
                      {errors[usernameField] && (
                        <p className="text-red-400 text-sm mt-1">{errors[usernameField]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords[platform.key] ? 'text' : 'password'}
                          value={(formData as any)[passwordField] as string}
                          onChange={(e) => handleInputChange(passwordField, e.target.value)}
                          placeholder="Enter password"
                          className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 pr-12 ${
                            errors[passwordField] ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                          }`}
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
                      </div>
                      {errors[passwordField] && (
                        <p className="text-red-400 text-sm mt-1">{errors[passwordField]}</p>
                      )}
                    </div>
                  </div>

                  {/* Property ID and API Integration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Property ID
                      </label>
                      <input
                        type="text"
                        value={(formData as any)[`${platform.key}PropertyId`] as string}
                        onChange={(e) => handleInputChange(`${platform.key}PropertyId`, e.target.value)}
                        placeholder="Property/Hotel ID on platform"
                        className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">Unique property identifier</p>
                    </div>

                    <div className="col-span-1 md:col-span-1"></div>
                  </div>

                  {/* API Credentials (Optional) */}
                  <div className="bg-slate-50/60 backdrop-filter backdrop-blur-10 border border-slate-200/40 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-slate-600" />
                      API Integration (Optional)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          API Key
                        </label>
                        <input
                          type="text"
                          value={(formData as any)[`${platform.key}ApiKey`] as string}
                          onChange={(e) => handleInputChange(`${platform.key}ApiKey`, e.target.value)}
                          placeholder="API key for integration"
                          className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          API Secret
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords[`${platform.key}ApiSecret`] ? 'text' : 'password'}
                            value={(formData as any)[`${platform.key}ApiSecret`] as string}
                            onChange={(e) => handleInputChange(`${platform.key}ApiSecret`, e.target.value)}
                            placeholder="API secret for integration"
                            className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 pr-12 font-mono text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({
                              ...prev,
                              [`${platform.key}ApiSecret`]: !prev[`${platform.key}ApiSecret`]
                            }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            {showPasswords[`${platform.key}ApiSecret`] ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">For automated synchronization and channel management</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Information Box */}
        <div className="glass-card-white-teal p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-[#009990] mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-700">
              <p className="font-medium mb-2">Why do we need these credentials?</p>
              <ul className="space-y-1 text-slate-600">
                <li>• Automated calendar synchronization</li>
                <li>• Real-time availability updates</li>
                <li>• Centralized booking management</li>
                <li>• Rate and inventory optimization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default OTACredentialsStep;
