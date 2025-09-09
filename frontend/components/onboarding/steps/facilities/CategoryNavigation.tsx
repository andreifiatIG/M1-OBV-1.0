"use client";

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { FacilityCategory } from './facilityCategories';

interface CategoryNavigationProps {
  categories: Record<string, FacilityCategory>;
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function CategoryNavigation({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryNavigationProps) {
  return (
    <div className="glass-card-white-teal p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Facility Categories</h3>
        <p className="text-sm text-slate-600">
          Click on a category to view and manage its facilities
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Object.values(categories).map((category) => {
          const progress = category.total > 0 ? (category.completed / category.total) * 100 : 0;
          const isComplete = category.completed === category.total && category.total > 0;
          
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategoryChange(category.id)}
              className={`p-4 rounded-lg border transition-all duration-200 text-left relative overflow-hidden ${
                activeCategory === category.id
                  ? 'border-teal-400 bg-teal-50/80 text-teal-700 shadow-md'
                  : 'border-slate-300/50 bg-white/60 text-slate-700 hover:bg-white/80 hover:border-teal-300/50 hover:shadow-sm'
              }`}
            >
              {/* Complete Badge */}
              {isComplete && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
              )}
              
              <div className="flex items-start space-x-3 mb-3">
                <div className={`flex-shrink-0 p-2 rounded-lg ${
                  activeCategory === category.id
                    ? 'bg-teal-100/80'
                    : 'bg-slate-100/80'
                }`}>
                  <category.icon className={`w-5 h-5 ${
                    activeCategory === category.id ? 'text-teal-600' : 'text-slate-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm leading-tight mb-1 truncate">
                    {category.name}
                  </h4>
                  <div className={`text-xs ${
                    activeCategory === category.id ? 'text-teal-600' : 'text-slate-500'
                  }`}>
                    {category.completed} / {category.total} items
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${
                    activeCategory === category.id ? 'text-teal-600' : 'text-slate-500'
                  }`}>
                    Progress
                  </span>
                  <span className={`font-medium ${
                    isComplete ? 'text-emerald-600' : 
                    activeCategory === category.id ? 'text-teal-600' : 'text-slate-500'
                  }`}>
                    {progress.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isComplete ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                      activeCategory === category.id ? 'bg-gradient-to-r from-teal-500 to-teal-600' :
                      'bg-gradient-to-r from-slate-400 to-slate-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
