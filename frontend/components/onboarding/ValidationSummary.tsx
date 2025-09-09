"use client";

import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { useValidation } from './ValidationProvider';

interface ValidationSummaryProps {
  stepNumber: number;
  showOnlyErrors?: boolean;
  className?: string;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  stepNumber,
  showOnlyErrors = false,
  className = '',
}) => {
  const { getStepErrors, isStepValid, warnings } = useValidation();
  
  const errors = getStepErrors(stepNumber);
  const stepWarnings = warnings[stepNumber] || {};
  const isValid = isStepValid(stepNumber);
  
  const errorEntries = Object.entries(errors);
  const warningEntries = Object.entries(stepWarnings);
  
  if (errorEntries.length === 0 && (showOnlyErrors || warningEntries.length === 0)) {
    if (isValid) {
      return (
        <div className={`flex items-center text-green-600 text-sm ${className}`}>
          <CheckCircle className="w-4 h-4 mr-2" />
          <span>All fields are valid</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`} role="alert" aria-live="polite">
      {/* Errors */}
      {errorEntries.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                {errorEntries.length} Error{errorEntries.length !== 1 ? 's' : ''} Found
              </h4>
              <ul className="space-y-1">
                {errorEntries.map(([field, error]) => (
                  <li key={field} className="text-sm text-red-700">
                    <span className="font-medium">{formatFieldName(field)}:</span> {error.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {!showOnlyErrors && warningEntries.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                {warningEntries.length} Warning{warningEntries.length !== 1 ? 's' : ''}
              </h4>
              <ul className="space-y-1">
                {warningEntries.map(([field, warning]) => (
                  <li key={field} className="text-sm text-yellow-700">
                    <span className="font-medium">{formatFieldName(field)}:</span> {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format field names for display
const formatFieldName = (fieldName: string): string => {
  // Convert camelCase to readable format
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/Id$/, ' ID')
    .replace(/Url$/, ' URL')
    .trim();
};

export default ValidationSummary;