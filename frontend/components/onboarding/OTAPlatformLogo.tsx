"use client";

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { AgodaIcon, VRBOIcon, GenericPlatformIcon } from './OTAPlatformIcons';

interface OTAPlatformLogoProps {
  platform: string;
  size?: number;
  className?: string;
  fallbackColor?: string;
}

// OTA platform configuration with Simple Icons slugs and fallback colors
const OTA_PLATFORM_CONFIG = {
  bookingCom: {
    slug: 'bookingdotcom',
    name: 'Booking.com',
    fallbackColor: 'bg-blue-600',
    domain: 'booking.com'
  },
  airbnb: {
    slug: 'airbnb',
    name: 'Airbnb',
    fallbackColor: 'bg-red-500',
    domain: 'airbnb.com'
  },
  expedia: {
    slug: 'expedia',
    name: 'Expedia',
    fallbackColor: 'bg-yellow-600',
    domain: 'expedia.com'
  },
  vrbo: {
    slug: null, // Not available in Simple Icons
    name: 'VRBO',
    fallbackColor: 'bg-blue-500',
    domain: 'vrbo.com'
  },
  agoda: {
    slug: null, // Not available in Simple Icons
    name: 'Agoda',
    fallbackColor: 'bg-purple-600',
    domain: 'agoda.com'
  },
  marriottHomesVillas: {
    slug: null, // Not available in Simple Icons
    name: 'Marriott Homes & Villas',
    fallbackColor: 'bg-red-700',
    domain: 'homes-and-villas.marriott.com'
  }
};

const OTAPlatformLogo: React.FC<OTAPlatformLogoProps> = ({ 
  platform, 
  size = 24, 
  className = '',
  fallbackColor
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const config = OTA_PLATFORM_CONFIG[platform as keyof typeof OTA_PLATFORM_CONFIG];

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  if (!config) {
    return (
      <div 
        className={`rounded-full bg-gray-400 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // If no slug available, use custom icons
  if (!config.slug) {
    const CustomIcon = platform === 'agoda' ? AgodaIcon : 
                      platform === 'vrbo' ? VRBOIcon : 
                      GenericPlatformIcon;
    
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        title={config.name}
      >
        <CustomIcon size={size} className="text-white" />
      </div>
    );
  }

  // If error occurred, show fallback dot
  if (hasError) {
    return (
      <div 
        className={`rounded-full ${fallbackColor || config.fallbackColor} ${className}`}
        style={{ width: size, height: size }}
        title={config.name}
      />
    );
  }

  const logoUrl = `https://cdn.simpleicons.org/${config.slug}`;

  return (
    <div 
      className={`flex items-center justify-center relative ${className}`}
      style={{ width: size, height: size }}
      title={config.name}
    >
      {/* Loading state */}
      {isLoading && (
        <div 
          className={`absolute inset-0 rounded-full ${fallbackColor || config.fallbackColor} animate-pulse`}
        />
      )}
      
      {/* Logo */}
      <Image
        src={logoUrl}
        alt={`${config.name} logo`}
        width={size}
        height={size}
        className={`object-contain transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={handleLoad}
        onError={handleError}
        priority={false}
        unoptimized // SVG images work better unoptimized
        aria-label={`${config.name} platform logo`}
      />
    </div>
  );
};

export default OTAPlatformLogo;