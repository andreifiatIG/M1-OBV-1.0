"use client";

import React, { useState } from 'react';

interface FacilitiesStepProps {
  data: any;
  onComplete: (stepData: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export default function FacilitiesStep({
  data,
  onComplete,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep,
}: FacilitiesStepProps) {
  const [facilities, setFacilities] = useState(data.facilities || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      facilities,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🏊</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Facilities & Amenities</h2>
        <p className="text-slate-400">
          Configure the facilities and amenities available at your villa
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-900/30 rounded-lg p-6">
          <p className="text-slate-300 text-center">
            Facilities configuration will be implemented in the next iteration.
            <br />
            This includes bedroom configurator, amenities checklist, and more.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            Continue to Staff
          </button>
        </div>
      </form>
    </div>
  );
}
