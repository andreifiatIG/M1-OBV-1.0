"use client";

import React from 'react';
import { AlertCircle, Info } from 'lucide-react';

interface SectionWrapperProps {
  children: React.ReactNode;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  isLoading?: boolean;
  error?: string | null;
  hasData?: boolean;
  emptyMessage?: string;
  className?: string;
}

export default function SectionWrapper({
  children,
  title,
  icon: Icon,
  description,
  isLoading = false,
  error,
  hasData = true,
  emptyMessage = "No data available",
  className = ""
}: SectionWrapperProps) {
  return (
    <div className={`glass-card-white-teal rounded-2xl ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Icon className="w-6 h-6 text-teal-600" />
          <div>
            <h2 className="text-xl font-medium text-slate-900">{title}</h2>
            {description && (
              <p className="text-sm text-slate-600">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span className="ml-3 text-slate-600">Loading...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <div className="text-red-600 font-medium mb-1">Error Loading Data</div>
              <div className="text-red-500 text-sm">{error}</div>
            </div>
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Info className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <div className="text-slate-600 font-medium mb-1">No Data Available</div>
              <div className="text-slate-500 text-sm">{emptyMessage}</div>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}