"use client";

import React from 'react';
import { ExternalLink } from 'lucide-react';

interface OTALinkInputProps {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const OTALinkInput: React.FC<OTALinkInputProps> = ({
  label,
  value = '',
  onChange,
  placeholder = 'https://...',
  className = ''
}) => {
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const showPreview = value && isValidUrl(value);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
        />
        
        {showPreview && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="Open link in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>

      {showPreview && (
        <p className="text-xs text-green-600">
          ✓ Valid URL - link will be saved
        </p>
      )}
    </div>
  );
};

interface OTALinksGroupProps {
  otaPlatforms: Array<{
    key: string;
    name: string;
    value?: string;
  }>;
  onLinkChange: (platform: string, url: string) => void;
  className?: string;
}

export const OTALinksGroup: React.FC<OTALinksGroupProps> = ({
  otaPlatforms,
  onLinkChange,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          OTA Platform Links
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Add the direct links to your property listings on each OTA platform
        </p>
      </div>

      {otaPlatforms.map((platform) => (
        <OTALinkInput
          key={platform.key}
          label={`${platform.name} Property Link`}
          value={platform.value}
          onChange={(value) => onLinkChange(platform.key, value)}
          placeholder={`https://www.${platform.key.toLowerCase()}.com/your-property-listing`}
        />
      ))}
    </div>
  );
};

export default OTALinkInput;