"use client";

import React from 'react';
import { Bath, Plus, Minus, Droplets } from 'lucide-react';

export interface BathroomConfiguration {
  id: string;
  name: string;
  quantity: number;
  available: boolean;
}

export const BATHROOM_TYPES: Omit<BathroomConfiguration, 'quantity' | 'available'>[] = [
  // Bathroom Configuration
  { id: 'ensuite-bathrooms', name: 'Ensuite Bathrooms' },
  { id: 'guest-bathrooms', name: 'Guest/Shared Bathrooms' },
  { id: 'powder-rooms', name: 'Powder Rooms/Half Baths' },
  { id: 'outdoor-bathrooms', name: 'Outdoor/Semi-Outdoor Bathrooms' },
];

export const BATHING_FEATURES: Omit<BathroomConfiguration, 'quantity' | 'available'>[] = [
  // Bathing Features  
  { id: 'freestanding-tub', name: 'Freestanding Bathtubs' },
  { id: 'built-in-tub', name: 'Built-in Bathtubs' },
  { id: 'jacuzzi-tub', name: 'Jacuzzi/Jet Tubs' },
  { id: 'stone-tub', name: 'Natural Stone Bathtubs' },
  { id: 'infinity-tub', name: 'Infinity-Edge Bathtubs' },
];

export const SHOWER_FEATURES: Omit<BathroomConfiguration, 'quantity' | 'available'>[] = [
  // Shower Features
  { id: 'rain-shower', name: 'Rain Showers' },
  { id: 'walk-in-shower', name: 'Walk-in Showers' },
  { id: 'steam-shower', name: 'Steam Showers' },
  { id: 'his-her-shower', name: 'His & Her Double Showers' },
  { id: 'outdoor-shower', name: 'Outdoor Showers' },
  { id: 'waterfall-shower', name: 'Waterfall Showers' },
];

export const BATHROOM_FIXTURES: Omit<BathroomConfiguration, 'quantity' | 'available'>[] = [
  // Fixtures & Features
  { id: 'double-vanity', name: 'Double Vanity/Sinks' },
  { id: 'floating-vanity', name: 'Floating Vanities' },
  { id: 'separate-toilet', name: 'Separate Toilet Rooms' },
  { id: 'bidet', name: 'Bidets' },
  { id: 'smart-toilet', name: 'Smart/Electronic Toilets' },
  { id: 'skylight-bathroom', name: 'Bathrooms with Skylights' },
];

interface BathroomConfiguratorProps {
  bathroomConfigurations: BathroomConfiguration[];
  onUpdate: (configurations: BathroomConfiguration[]) => void;
  maxTotalBathrooms?: number;
}

export default function BathroomConfigurator({
  bathroomConfigurations,
  onUpdate,
  maxTotalBathrooms = 20,
}: BathroomConfiguratorProps) {
  
  const getTotalBathrooms = () => {
    return bathroomConfigurations
      .filter(config => BATHROOM_TYPES.some(bt => bt.id === config.id))
      .reduce((total, config) => total + config.quantity, 0);
  };

  const updateBathroomQuantity = (bathroomId: string, quantity: number) => {
    const updated = bathroomConfigurations.map(config => {
      if (config.id === bathroomId) {
        return {
          ...config,
          quantity: Math.max(0, quantity),
          available: quantity > 0
        };
      }
      return config;
    });

    // Add new bathroom type if it doesn't exist
    if (!bathroomConfigurations.find(b => b.id === bathroomId)) {
      const allTypes = [...BATHROOM_TYPES, ...BATHING_FEATURES, ...SHOWER_FEATURES, ...BATHROOM_FIXTURES];
      const bathroomType = allTypes.find(bt => bt.id === bathroomId);
      if (bathroomType && quantity > 0) {
        updated.push({
          ...bathroomType,
          quantity,
          available: true
        });
      }
    }

    onUpdate(updated.filter(config => config.quantity > 0));
  };

  const getConfiguredQuantity = (bathroomId: string): number => {
    return bathroomConfigurations.find(config => config.id === bathroomId)?.quantity || 0;
  };

  const renderConfiguratorSection = (
    title: string, 
    items: typeof BATHROOM_TYPES, 
    icon: React.ReactNode
  ) => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        {icon}
        <h4 className="font-medium text-slate-700">{title}</h4>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(item => {
          const quantity = getConfiguredQuantity(item.id);
          return (
            <div
              key={item.id}
              className={`glass-card-white-teal rounded-lg p-3 border transition-all duration-200 ${
                quantity > 0 
                  ? 'border-teal-300/50 bg-teal-50/30' 
                  : 'border-slate-200/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{item.name}</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => updateBathroomQuantity(item.id, quantity - 1)}
                    disabled={quantity <= 0}
                    className="w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  
                  <span className="w-6 text-center text-sm font-medium text-slate-800">
                    {quantity}
                  </span>
                  
                  <button
                    onClick={() => updateBathroomQuantity(item.id, quantity + 1)}
                    className="w-6 h-6 rounded-full bg-teal-200 hover:bg-teal-300 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {/* Quick Add Buttons */}
              <div className="flex space-x-1">
                {[1, 2, 3].map(num => (
                  <button
                    key={num}
                    onClick={() => updateBathroomQuantity(item.id, quantity + num)}
                    className="px-1 py-0.5 text-xs bg-white/60 hover:bg-white/80 rounded border border-slate-300/50 transition-colors"
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Bath className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Bathroom Configuration</h3>
          <p className="text-sm text-slate-600">
            Configure bathroom types, fixtures, and luxury features
          </p>
        </div>
      </div>

      {/* Total Bathrooms Counter */}
      <div className="glass-card-white-teal rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-700">Total Bathrooms:</span>
          <span className={`font-bold text-lg ${
            getTotalBathrooms() > maxTotalBathrooms ? 'text-red-600' : 'text-blue-600'
          }`}>
            {getTotalBathrooms()} / {maxTotalBathrooms}
          </span>
        </div>
        {getTotalBathrooms() > maxTotalBathrooms && (
          <p className="text-red-600 text-sm mt-2">
            Maximum bathroom limit exceeded. Please reduce quantities.
          </p>
        )}
      </div>

      {/* Bathroom Types */}
      {renderConfiguratorSection(
        "Bathroom Types", 
        BATHROOM_TYPES,
        <Bath className="w-4 h-4 text-blue-600" />
      )}

      {/* Bathing Features */}
      {renderConfiguratorSection(
        "Bathing Features", 
        BATHING_FEATURES,
        <div className="w-4 h-4 bg-blue-600 rounded-full" />
      )}

      {/* Shower Features */}
      {renderConfiguratorSection(
        "Shower Features", 
        SHOWER_FEATURES,
        <Droplets className="w-4 h-4 text-blue-600" />
      )}

      {/* Bathroom Fixtures */}
      {renderConfiguratorSection(
        "Fixtures & Features", 
        BATHROOM_FIXTURES,
        <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-teal-500 rounded" />
      )}

      {/* Configured Summary */}
      {bathroomConfigurations.length > 0 && (
        <div className="glass-card-white-teal rounded-lg p-4 mt-6">
          <h4 className="font-medium text-slate-700 mb-3">Bathroom Configuration Summary:</h4>
          <div className="space-y-4">
            
            {/* Bathroom Types Summary */}
            <div>
              <h5 className="text-sm font-medium text-slate-600 mb-2">Bathroom Types:</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {bathroomConfigurations
                  .filter(config => BATHROOM_TYPES.some(bt => bt.id === config.id) && config.quantity > 0)
                  .map(config => (
                    <div key={config.id} className="flex justify-between">
                      <span className="text-slate-600">{config.name}:</span>
                      <span className="font-medium text-blue-700">{config.quantity}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Features Summary */}
            {bathroomConfigurations.filter(config => 
              !BATHROOM_TYPES.some(bt => bt.id === config.id) && config.quantity > 0
            ).length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-slate-600 mb-2">Features & Fixtures:</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {bathroomConfigurations
                    .filter(config => !BATHROOM_TYPES.some(bt => bt.id === config.id) && config.quantity > 0)
                    .map(config => (
                      <div key={config.id} className="flex justify-between">
                        <span className="text-slate-600">{config.name}:</span>
                        <span className="font-medium text-teal-700">{config.quantity}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}