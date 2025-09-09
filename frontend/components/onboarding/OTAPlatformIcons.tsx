import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

// Custom SVG icons for platforms not available in Simple Icons
export const AgodaIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#FF6B35"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">A</text>
  </svg>
);

export const VRBOIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#0070F3"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">VRBO</text>
  </svg>
);

// Generic platform icon for unknown platforms
export const GenericPlatformIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#6B7280"/>
    <path
      d="M8 9a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zM8 13a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zM9 15a1 1 0 100 2h2a1 1 0 100-2H9z"
      fill="white"
    />
  </svg>
);