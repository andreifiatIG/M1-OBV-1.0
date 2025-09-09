"use client";

import React from 'react';
import { Bed, Plus, Minus } from 'lucide-react';

export interface BedConfiguration {
  id: string;
  name: string;
  quantity: number;
  available: boolean;
}

export const BED_TYPES: Omit<BedConfiguration, 'quantity' | 'available'>[] = [
  { id: 'king-bed', name: 'King Size Beds' },
  { id: 'super-king-bed', name: 'Super King Size Beds' },
  { id: 'queen-bed', name: 'Queen Size Beds' },
  { id: 'double-bed', name: 'Double Beds' },
  { id: 'twin-bed', name: 'Twin Beds' },
  { id: 'single-bed', name: 'Single Beds' },
  { id: 'day-bed', name: 'Day Beds' },
  { id: 'sofa-bed', name: 'Sofa Beds' },
  { id: 'bunk-bed', name: 'Bunk Beds' },
  { id: 'thai-style-bed', name: 'Thai-Style Platform Beds' },
  { id: 'four-poster-bed', name: 'Four-Poster Beds' },
  { id: 'murphy-bed', name: 'Murphy/Wall Beds' },
  { id: 'extra-bed', name: 'Extra Beds Available' },
  { id: 'rollaway-bed', name: 'Rollaway Beds' },
  { id: 'toddler-bed', name: 'Toddler Beds' },
];

interface BedTypeConfiguratorProps {
  bedConfigurations: BedConfiguration[];
  onUpdate: (configurations: BedConfiguration[]) => void;
  maxTotalBeds?: number;
}

export default function BedTypeConfigurator({
  bedConfigurations,
  onUpdate,
  maxTotalBeds = 50,
}: BedTypeConfiguratorProps) {
  
  const getTotalBeds = () => {
    return bedConfigurations.reduce((total, config) => total + config.quantity, 0);
  };

  const updateBedQuantity = (bedId: string, quantity: number) => {
    const totalBeds = getTotalBeds();
    const currentBed = bedConfigurations.find(b => b.id === bedId);
    const currentQuantity = currentBed?.quantity || 0;
    
    // Check if new quantity would exceed max total
    if (totalBeds - currentQuantity + quantity > maxTotalBeds) {
      return;
    }

    const updated = bedConfigurations.map(config => {
      if (config.id === bedId) {
        return {
          ...config,
          quantity: Math.max(0, quantity),
          available: quantity > 0
        };
      }
      return config;
    });

    // Add new bed type if it doesn't exist
    if (!bedConfigurations.find(b => b.id === bedId)) {
      const bedType = BED_TYPES.find(bt => bt.id === bedId);
      if (bedType && quantity > 0) {
        updated.push({
          ...bedType,
          quantity,
          available: true
        });
      }
    }

    onUpdate(updated.filter(config => config.quantity > 0));
  };

  const getConfiguredQuantity = (bedId: string): number => {
    return bedConfigurations.find(config => config.id === bedId)?.quantity || 0;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-teal-100 rounded-lg">
          <Bed className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Bed Configuration</h3>
          <p className="text-sm text-slate-600">
            Configure the types and quantities of beds available
          </p>
        </div>
      </div>

      {/* Total Beds Counter */}
      <div className="glass-card-white-teal rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-700">Total Beds:</span>
          <span className={`font-bold text-lg ${
            getTotalBeds() > maxTotalBeds ? 'text-red-600' : 'text-teal-600'
          }`}>
            {getTotalBeds()} / {maxTotalBeds}
          </span>
        </div>
        {getTotalBeds() > maxTotalBeds && (
          <p className="text-red-600 text-sm mt-2">
            Maximum bed limit exceeded. Please reduce quantities.
          </p>
        )}
      </div>

      {/* Bed Type Configurations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BED_TYPES.map(bedType => {
          const quantity = getConfiguredQuantity(bedType.id);
          return (
            <div
              key={bedType.id}
              className={`glass-card-white-teal rounded-lg p-4 border transition-all duration-200 ${
                quantity > 0 
                  ? 'border-teal-300/50 bg-teal-50/30' 
                  : 'border-slate-200/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-700">{bedType.name}</h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateBedQuantity(bedType.id, quantity - 1)}
                    disabled={quantity <= 0}
                    className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  
                  <span className="w-8 text-center font-medium text-slate-800">
                    {quantity}
                  </span>
                  
                  <button
                    onClick={() => updateBedQuantity(bedType.id, quantity + 1)}
                    disabled={getTotalBeds() >= maxTotalBeds}
                    className="w-8 h-8 rounded-full bg-teal-200 hover:bg-teal-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Quick Add Buttons */}
              <div className="flex space-x-1">
                {[1, 2, 5, 10].map(num => (
                  <button
                    key={num}
                    onClick={() => updateBedQuantity(bedType.id, quantity + num)}
                    disabled={getTotalBeds() + num > maxTotalBeds}
                    className="px-2 py-1 text-xs bg-white/60 hover:bg-white/80 rounded border border-slate-300/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configured Summary */}
      {bedConfigurations.length > 0 && (
        <div className="glass-card-white-teal rounded-lg p-4 mt-6">
          <h4 className="font-medium text-slate-700 mb-3">Configured Beds Summary:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {bedConfigurations
              .filter(config => config.quantity > 0)
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
  );
}