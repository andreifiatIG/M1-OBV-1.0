"use client";

import React from 'react';
import { AlertTriangle, Eye, EyeOff, ChevronRight, CheckCircle } from 'lucide-react';

interface SkippedField {
  fieldName: string;
  label: string;
  required: boolean;
}

interface SkippedPhase {
  stepNumber: number;
  stepTitle: string;
  skippedFields: SkippedField[];
  totalFields: number;
  isCompletelySkipped: boolean;
  completedFields: number;
}

interface SkippedFieldsVisualizerProps {
  villaId: string;
  skippedPhases: SkippedPhase[];
  onViewPhase?: (stepNumber: number) => void;
  onEditPhase?: (stepNumber: number) => void;
  className?: string;
}

export const SkippedFieldsVisualizer: React.FC<SkippedFieldsVisualizerProps> = ({
  villaId,
  skippedPhases,
  onViewPhase,
  onEditPhase,
  className = ''
}) => {
  const totalSkippedFields = skippedPhases.reduce((total, phase) => 
    total + phase.skippedFields.length, 0
  );

  const totalSkippedSteps = skippedPhases.filter(phase => 
    phase.isCompletelySkipped
  ).length;

  const criticalSkippedFields = skippedPhases.reduce((total, phase) => 
    total + phase.skippedFields.filter(field => field.required).length, 0
  );

  const getPhaseCompletionPercentage = (phase: SkippedPhase) => {
    if (phase.isCompletelySkipped) return 0;
    return Math.round((phase.completedFields / phase.totalFields) * 100);
  };

  const getPhaseStatusColor = (phase: SkippedPhase) => {
    if (phase.isCompletelySkipped) return 'bg-red-100 border-red-300';
    if (phase.skippedFields.some(f => f.required)) return 'bg-amber-100 border-amber-300';
    if (phase.skippedFields.length > 0) return 'bg-blue-100 border-blue-300';
    return 'bg-green-100 border-green-300';
  };

  const getPhaseStatusIcon = (phase: SkippedPhase) => {
    if (phase.isCompletelySkipped) return <EyeOff className="w-4 h-4 text-red-600" />;
    if (phase.skippedFields.some(f => f.required)) return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    if (phase.skippedFields.length > 0) return <Eye className="w-4 h-4 text-blue-600" />;
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  const getPhaseStatusText = (phase: SkippedPhase) => {
    if (phase.isCompletelySkipped) return 'Completely Skipped';
    if (phase.skippedFields.some(f => f.required)) return 'Missing Required Fields';
    if (phase.skippedFields.length > 0) return 'Some Fields Skipped';
    return 'Complete';
  };

  if (skippedPhases.length === 0) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-green-900">
              Onboarding Complete
            </h3>
            <p className="text-green-700">
              All onboarding phases have been completed with no skipped fields.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-900">{totalSkippedFields}</p>
              <p className="text-sm text-blue-700">Skipped Fields</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-amber-900">{criticalSkippedFields}</p>
              <p className="text-sm text-amber-700">Critical Fields</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <EyeOff className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-900">{totalSkippedSteps}</p>
              <p className="text-sm text-red-700">Skipped Steps</p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Onboarding Phase Status
        </h3>
        
        <div className="space-y-3">
          {skippedPhases.map((phase) => (
            <div
              key={phase.stepNumber}
              className={`border rounded-lg p-4 ${getPhaseStatusColor(phase)}`}
            >
              {/* Phase Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getPhaseStatusIcon(phase)}
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Step {phase.stepNumber}: {phase.stepTitle}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {getPhaseStatusText(phase)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!phase.isCompletelySkipped && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {getPhaseCompletionPercentage(phase)}% Complete
                      </p>
                      <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                        <div
                          className="h-2 bg-blue-600 rounded-full transition-all"
                          style={{ width: `${getPhaseCompletionPercentage(phase)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => onEditPhase?.(phase.stepNumber)}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Edit
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Skipped Fields List */}
              {phase.skippedFields.length > 0 && !phase.isCompletelySkipped && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Skipped Fields ({phase.skippedFields.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {phase.skippedFields.map((field, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${
                          field.required
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {field.required && <AlertTriangle className="w-3 h-3" />}
                        {field.label}
                        {field.required && <span className="ml-1 text-red-600">*</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Bar for Non-Skipped Steps */}
              {!phase.isCompletelySkipped && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>
                      {phase.completedFields} of {phase.totalFields} fields completed
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-blue-600 rounded-full transition-all"
                      style={{ width: `${getPhaseCompletionPercentage(phase)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={() => onViewPhase?.(0)} // Overview
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Review All Phases
        </button>
        
        {criticalSkippedFields > 0 && (
          <button
            onClick={() => {
              const criticalPhase = skippedPhases.find(p => 
                p.skippedFields.some(f => f.required)
              );
              if (criticalPhase) {
                onEditPhase?.(criticalPhase.stepNumber);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Complete Critical Fields
          </button>
        )}
      </div>
    </div>
  );
};

export default SkippedFieldsVisualizer;