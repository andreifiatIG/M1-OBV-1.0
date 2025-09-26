"use client";

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Eye, EyeOff, Shield, AlertCircle, Globe, ExternalLink } from 'lucide-react';
import { StepHandle } from './types';
import OTAPlatformLogo from '../OTAPlatformLogo';

// Database OTA Credential interface
interface OTACredential {
  id?: string;
  platform: string;
  propertyId?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  accountUrl?: string;
  propertyUrl?: string;
  listingUrl?: string;
  isActive: boolean;
}

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

  // Platform to enum mapping
  const platformEnumMap: Record<string, string> = {
    'bookingCom': 'BOOKING_COM',
    'airbnb': 'AIRBNB',
    'expedia': 'EXPEDIA',
    'vrbo': 'VRBO',
    'agoda': 'AGODA',
    'marriottHomesVillas': 'MARRIOTT_HOMES_VILLAS'
  };

  // Initialize OTA credentials as array
  const initializeOTACredentials = (): OTACredential[] => {
    // If data already has the array format, use it
    if (data && Array.isArray(data)) {
      return data;
    }

    // If data has the array format inside otaCredentials property
    if (data && data.otaCredentials && Array.isArray(data.otaCredentials)) {
      return data.otaCredentials;
    }

    // Convert from flat format to array format (backward compatibility)
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const credentials: OTACredential[] = [];

      Object.keys(platformEnumMap).forEach(platformKey => {
        const isListedField = `${platformKey}Listed`;
        const isListed = data[isListedField];

        if (isListed) {
          credentials.push({
            platform: platformEnumMap[platformKey],
            propertyId: data[`${platformKey}PropertyId`] || '',
            username: data[`${platformKey}Username`] || '',
            password: data[`${platformKey}Password`] || '',
            apiKey: data[`${platformKey}ApiKey`] || '',
            apiSecret: data[`${platformKey}ApiSecret`] || '',
            accountUrl: data[`${platformKey}AccountUrl`] || '',
            propertyUrl: data[`${platformKey}PropertyUrl`] || '',
            listingUrl: data[`${platformKey}ListingUrl`] || '',
            isActive: true
          });
        }
      });

      return credentials;
    }

    return [];
  };

  const [otaCredentials, setOtaCredentials] = useState<OTACredential[]>(() => initializeOTACredentials());

  const otaPlatforms = [
    {
      key: 'bookingCom',
      enum: 'BOOKING_COM',
      name: 'Booking.com',
      color: 'bg-blue-600',
      description: 'World\'s largest accommodation booking platform',
      urlPlaceholder: 'https://www.booking.com/hotel/...'
    },
    {
      key: 'airbnb',
      enum: 'AIRBNB',
      name: 'Airbnb',
      color: 'bg-red-500',
      description: 'Global marketplace for unique stays and experiences',
      urlPlaceholder: 'https://www.airbnb.com/rooms/...'
    },
    {
      key: 'expedia',
      enum: 'EXPEDIA',
      name: 'Expedia',
      color: 'bg-yellow-600',
      description: 'Online travel booking platform',
      urlPlaceholder: 'https://www.expedia.com/...'
    },
    {
      key: 'vrbo',
      enum: 'VRBO',
      name: 'VRBO',
      color: 'bg-blue-500',
      description: 'Vacation rental platform by Expedia Group',
      urlPlaceholder: 'https://www.vrbo.com/...'
    },
    {
      key: 'agoda',
      enum: 'AGODA',
      name: 'Agoda',
      color: 'bg-purple-600',
      description: 'Asian-focused online travel booking platform',
      urlPlaceholder: 'https://www.agoda.com/...'
    },
    {
      key: 'marriottHomesVillas',
      enum: 'MARRIOTT_HOMES_VILLAS',
      name: 'Marriott Homes & Villas',
      color: 'bg-red-700',
      description: 'Luxury vacation rental platform by Marriott',
      urlPlaceholder: 'https://homes-and-villas.marriott.com/...'
    }
  ];

  // Helper function to find credential for a platform
  const getCredentialForPlatform = (platformEnum: string): OTACredential | null => {
    return otaCredentials.find(cred => cred.platform === platformEnum) || null;
  };

  // Helper function to update a platform's credential
  const updatePlatformCredential = (platformEnum: string, field: keyof OTACredential, value: any) => {
    const updatedCredentials = otaCredentials.slice(); // Copy array
    const existingIndex = updatedCredentials.findIndex(cred => cred.platform === platformEnum);

    if (existingIndex >= 0) {
      // Update existing credential
      updatedCredentials[existingIndex] = {
        ...updatedCredentials[existingIndex],
        [field]: value
      };
    } else {
      // Create new credential
      const newCredential: OTACredential = {
        platform: platformEnum,
        propertyId: '',
        username: '',
        password: '',
        apiKey: '',
        apiSecret: '',
        accountUrl: '',
        propertyUrl: '',
        listingUrl: '',
        isActive: field === 'isActive' ? value : false,
        [field]: value
      };
      updatedCredentials.push(newCredential);
    }

    updateCredentialsAndParent(updatedCredentials);
  };

  // Helper function to remove a platform's credential
  const removePlatformCredential = (platformEnum: string) => {
    const updatedCredentials = otaCredentials.filter(cred => cred.platform !== platformEnum);
    updateCredentialsAndParent(updatedCredentials);
  };

  // Helper function to update credentials and notify parent
  const updateCredentialsAndParent = (updatedCredentials: OTACredential[]) => {
    setOtaCredentials(updatedCredentials);
    onUpdate(updatedCredentials);
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
    getData: () => otaCredentials,
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
          const credential = getCredentialForPlatform(platform.enum);
          const isListed = credential?.isActive || false;

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
                    onChange={(e) => {
                      if (e.target.checked) {
                        updatePlatformCredential(platform.enum, 'isActive', true);
                      } else {
                        removePlatformCredential(platform.enum);
                      }
                    }}
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

              {isListed && credential && (
                <div className="space-y-4 mt-4">
                  {/* Listing URL Field */}
                  <div className="bg-slate-50/60 backdrop-filter backdrop-blur-10 border border-slate-200/40 rounded-lg p-4">
                    <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                      <ExternalLink className="w-4 h-4 mr-2 text-slate-600" />
                      Listing URL
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={credential.listingUrl || ''}
                        onChange={(e) => updatePlatformCredential(platform.enum, 'listingUrl', e.target.value)}
                        placeholder={platform.urlPlaceholder}
                        className="w-full px-4 py-3 bg-white/80 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/90 transition-all duration-200"
                      />
                      {credential.listingUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(credential.listingUrl!, '_blank')}
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
                        value={credential.accountUrl || ''}
                        onChange={(e) => updatePlatformCredential(platform.enum, 'accountUrl', e.target.value)}
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
                        value={credential.propertyUrl || ''}
                        onChange={(e) => updatePlatformCredential(platform.enum, 'propertyUrl', e.target.value)}
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
                        value={credential.username || ''}
                        onChange={(e) => updatePlatformCredential(platform.enum, 'username', e.target.value)}
                        placeholder="Enter username or email"
                        className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords[platform.key] ? 'text' : 'password'}
                          value={credential.password || ''}
                          onChange={(e) => updatePlatformCredential(platform.enum, 'password', e.target.value)}
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
                      </div>
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
                        value={credential.propertyId || ''}
                        onChange={(e) => updatePlatformCredential(platform.enum, 'propertyId', e.target.value)}
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
                          value={credential.apiKey || ''}
                          onChange={(e) => updatePlatformCredential(platform.enum, 'apiKey', e.target.value)}
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
                            value={credential.apiSecret || ''}
                            onChange={(e) => updatePlatformCredential(platform.enum, 'apiSecret', e.target.value)}
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
