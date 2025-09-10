"use client";

import React, { useState, useCallback, useEffect, useImperativeHandle, forwardRef, useMemo, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { 
  ClipboardList, Save, SkipForward, AlertCircle, 
  CheckCircle, Filter, Search, ArrowLeft
} from 'lucide-react';
import { FACILITY_CATEGORIES, FacilityCategory, FacilityItem as FacilityItemType } from './facilities/facilityCategories';
import CategoryNavigation from './facilities/CategoryNavigation';
import FacilityItem from './facilities/FacilityItem';
import { StepHandle } from './types';
import { clientApi } from '@/lib/api-client';
import { mapFacilityCategoryToFrontend } from '@/lib/data-mapper';
import { useAuth } from '@clerk/nextjs';

interface FacilitiesChecklistStepProps {
  data: any;
  onUpdate: (data: any) => void;
  villaId?: string;
}

const FacilitiesChecklistStep = React.memo(forwardRef<StepHandle, FacilitiesChecklistStepProps>((
  { data, onUpdate, villaId },
  ref
) => {
  const [activeCategory, setActiveCategory] = useState<string>(Object.keys(FACILITY_CATEGORIES)[0]);
  const { getToken } = useAuth();
  const overlayAppliedRef = useRef(false);
  const overlayRetryRef = useRef<NodeJS.Timeout | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'available' | 'missing'>('all');

  const [facilitiesData, setFacilitiesData] = useState<Record<string, Omit<FacilityCategory, 'icon'>>> (() => {
    console.log('🏭 [FACILITIES-UI] Initializing facilities data state');
    console.log('🏭 [FACILITIES-UI] Input data structure:', { 
      dataType: typeof data, 
      isArray: Array.isArray(data),
      hasFacilities: !!data?.facilities,
      facilitiesCount: Array.isArray(data?.facilities) ? data.facilities.length : 0
    });

    const initialData: Record<string, Omit<FacilityCategory, 'icon'>> = {};

    // Initialize with base facility categories (performance optimized)
    for (const key in FACILITY_CATEGORIES) {
      const { icon, ...rest } = FACILITY_CATEGORIES[key];
      initialData[key] = {
        ...rest,
        items: rest.items.map(item => ({ ...item })) // Deep clone items for safety
      };
    }

    // Handle multiple data format inputs with enhanced logging
    const facilitiesInput = Array.isArray(data) ? data : 
                          (data && Array.isArray(data.facilities)) ? data.facilities : [];
    
    console.log(`🏭 [FACILITIES-UI] Processing ${facilitiesInput.length} facilities from backend`);
    
    if (facilitiesInput.length > 0) {
      const performanceStart = Date.now();
      const categoryStats: Record<string, number> = {};
      let processedCount = 0;
      let matchedCount = 0;
      let unmatchedCount = 0;
      
      // Group facilities by category for efficient processing
      const groupedData: Record<string, any[]> = {};
      facilitiesInput.forEach((facility: any) => {
        const category = facility.category;
        processedCount++;
        
        if (category) {
          if (!groupedData[category]) {
            groupedData[category] = [];
            categoryStats[category] = 0;
          }
          groupedData[category].push(facility);
          categoryStats[category]++;
        }
      });

      console.log('🏭 [FACILITIES-UI] Facilities by category:', categoryStats);

      // Process each category to match with predefined facility items
      for (const categoryId in groupedData) {
        if (initialData[categoryId]) {
          const savedFacilities = groupedData[categoryId];
          const categoryItems = initialData[categoryId].items;
          
          // Performance-optimized string normalization
          const canon = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Process facilities for this category with detailed logging
          console.log(`🏭 [FACILITIES-UI] Processing category "${categoryId}" with ${savedFacilities.length} facilities`);
          
          savedFacilities.forEach((savedFacility: any, facilityIndex: number) => {
            const itemIndex = categoryItems.findIndex(item => canon(item.name) === canon(savedFacility.itemName));
            
            if (itemIndex !== -1) {
              categoryItems[itemIndex] = {
                ...categoryItems[itemIndex],
                available: savedFacility.available,
                quantity: savedFacility.quantity || 1,
                condition: savedFacility.condition || 'good',
                itemNotes: savedFacility.notes || savedFacility.itemNotes || '',
                photoUrl: savedFacility.photoUrl || '',
                specifications: savedFacility.specifications || '',
                productLink: savedFacility.productLink || ''
              };
              matchedCount++;
              console.debug(`🏭 [FACILITIES-UI] Matched facility: "${savedFacility.itemName}" in ${categoryId}`);
            } else {
              unmatchedCount++;
              console.warn(`🏭 [FACILITIES-UI] Unmatched facility: "${savedFacility.itemName}" in category "${categoryId}" - facility exists in database but not in predefined categories`);
              
              // Gracefully handle unmatched facilities by creating a temporary item
              // This prevents crashes when database has facilities not in the predefined list
              const temporaryItem = facilitiesData[categoryId as keyof typeof facilitiesData]?.items.find(item => 
                item.name.toLowerCase().includes(savedFacility.itemName.toLowerCase().split(' ')[0])
              );
              
              if (temporaryItem) {
                // Update a similar existing item instead of creating orphans
                temporaryItem.available = savedFacility.isAvailable;
                temporaryItem.notes = savedFacility.notes || '';
                temporaryItem.specifications = savedFacility.specifications || '';
                temporaryItem.quantity = savedFacility.quantity || 1;
                temporaryItem.condition = savedFacility.condition || 'good';
                temporaryItem.photoUrl = savedFacility.photoUrl || '';
                temporaryItem.productLink = savedFacility.productLink || '';
                console.info(`🏭 [FACILITIES-UI] Mapped unmatched facility "${savedFacility.itemName}" to similar item "${temporaryItem.name}"`);
              }
            }
          });

          const categoryCompleted = categoryItems.filter(item => item.available).length;
          initialData[categoryId].completed = categoryCompleted;
          initialData[categoryId].total = categoryItems.length;
          
          console.log(`🏭 [FACILITIES-UI] Category "${categoryId}" processed: ${categoryCompleted}/${categoryItems.length} available`);
        } else {
          console.warn(`🏭 [FACILITIES-UI] Unknown category "${categoryId}" with ${groupedData[categoryId].length} facilities`);
        }
      }
      
      const performanceEnd = Date.now();
      const processingTime = performanceEnd - performanceStart;
      
      console.log('[FACILITIES-UI] Processing completed:', {
        totalFacilities: facilitiesInput.length,
        processed: processedCount,
        matched: matchedCount,
        unmatched: unmatchedCount,
        categories: Object.keys(categoryStats).length,
        processingTime: `${processingTime}ms`
      });
      
      if (processingTime > 100) {
        console.warn(`[FACILITIES-UI] Slow processing detected: ${processingTime}ms for ${facilitiesInput.length} facilities`);
      }
    } else {
      console.log('[FACILITIES-UI] No facilities data to process, using base categories');
    }

    console.log('[FACILITIES-UI] State initialization completed');
    return initialData;
  });

  // Memoize expensive calculations
  const { totalItems, completedItems, overallProgress } = useMemo(() => {
    const total = Object.values(facilitiesData).reduce((sum, cat) => sum + cat.total, 0);
    const completed = Object.values(facilitiesData).reduce((sum, cat) => sum + cat.completed, 0);
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { totalItems: total, completedItems: completed, overallProgress: progress };
  }, [facilitiesData]);

  // Debounced update to reduce frequent re-renders and API calls
  const debouncedOnUpdate = useDebouncedCallback(
    (facilitiesArray: any[]) => {
      onUpdate(facilitiesArray);
    },
    1000 // 1 second debounce
  );

  // Memoize facilities array transformation
  const facilitiesArray = useMemo(() => {
    return Object.entries(facilitiesData).flatMap(([categoryId, category]) =>
      category.items.map(item => ({
        category: categoryId,
        itemName: item.name,
        available: item.available,
        quantity: item.quantity || 1,
        condition: item.condition || 'good',
        notes: item.itemNotes || '',
        photoUrl: item.photoUrl || '',
        specifications: item.specifications || '',
        productLink: item.productLink || ''
      }))
    );
  }, [facilitiesData]);

  // Avoid spamming updates when nothing meaningful changed
  const lastSentHashRef = React.useRef<string>('');
  useEffect(() => {
    // Wrap facilities array in an object for backend compatibility
    const currentHash = JSON.stringify(facilitiesArray.map(i => ({n: i.itemName, a: i.available, q: i.quantity, c: i.condition})));
    if (currentHash === lastSentHashRef.current) return;
    lastSentHashRef.current = currentHash;
    debouncedOnUpdate({ facilities: facilitiesArray });
  }, [facilitiesArray]); // Remove debouncedOnUpdate from dependencies to prevent infinite loop

  // Fallback: if no facilities came from props but villa has saved facilities, fetch from backend and merge
  useEffect(() => {
    if (!villaId || overlayAppliedRef.current) return;

    (async () => {
      try {
        const token = await getToken();
        if (token) clientApi.setToken(token);
        const resp = await clientApi.get(`/api/facilities/villa/${villaId}`);

        if (!resp.success) {
          // If backend is offline, silently skip
          if ((resp as any).offline) {
            return;
          }
          
          // Handle rate limiting once with a single delayed retry
          if ((resp.error || '').toLowerCase().includes('too many requests') && !overlayAppliedRef.current && !overlayRetryRef.current) {
            overlayRetryRef.current = setTimeout(() => {
              overlayAppliedRef.current = false; // allow one more attempt
              overlayRetryRef.current = null;
            }, 1500);
          }
          return;
        }

        const facilitiesFromDb = Array.isArray(resp.data) ? (resp.data as Array<any>) : [];

        let matched = 0;
        setFacilitiesData(prev => {
          const newData = { ...prev };
          for (const f of facilitiesFromDb) {
            const mappedCategoryId = mapFacilityCategoryToFrontend(String(f.category));
            const category = newData[mappedCategoryId];
            if (!category) continue;

            const canon = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const idx = category.items.findIndex((it) => canon(it.name) === canon(f.itemName));
            if (idx !== -1) {
              matched++;
              category.items = [...category.items];
              category.items[idx] = {
                ...category.items[idx],
                available: !!f.isAvailable,
                quantity: f.quantity || 1,
                condition: f.condition || 'good',
                itemNotes: f.notes || '',
                photoUrl: f.photoUrl || '',
                specifications: f.specifications || '',
                productLink: f.productLink || '',
              };
              category.completed = category.items.filter(item => item.available).length;
              category.total = category.items.length;
              newData[mappedCategoryId] = category;
            }
          }
          return newData;
        });
        // Mark overlay applied to prevent repeated fetches on step data updates
        overlayAppliedRef.current = true;
        // Optional: Debug count
        // console.log(`Facilities overlay: fetched=${facilitiesFromDb.length}, matched=${matched}`);
      } catch (e) {
        // Silently handle errors - the app can work without backend data
      }
    })();

    return () => {
      if (overlayRetryRef.current) {
        clearTimeout(overlayRetryRef.current);
        overlayRetryRef.current = null;
      }
    };
  }, [villaId]);

  const updateFacilityItem = useCallback((categoryId: string, itemId: string, updates: Partial<FacilityItemType>) => {
    setFacilitiesData(prev => {
      const newData = { ...prev };
      const category = { ...newData[categoryId] };
      const itemIndex = category.items.findIndex(item => item.id === itemId);
      
      if (itemIndex !== -1) {
        category.items = [...category.items];
        category.items[itemIndex] = { ...category.items[itemIndex], ...updates };
        
        category.completed = category.items.filter(item => item.available).length;
        category.total = category.items.length;
        newData[categoryId] = category;
      }
      
      return newData;
    });
  }, []);

  const toggleItemExpansion = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const handlePhotoUpload = useCallback((categoryId: string, itemId: string, file: File) => {
    const photoUrl = URL.createObjectURL(file);
    updateFacilityItem(categoryId, itemId, { photoUrl });
  }, [updateFacilityItem]);
  
  const validateForm = () => {
    // For this step, we can consider it always valid as it's a checklist
    return true;
  };
  
  // Memoize imperative handle to prevent unnecessary re-creation
  useImperativeHandle(ref, () => ({
    validate: validateForm,
    getData: () => ({ facilities: facilitiesArray })
  }), [facilitiesArray]);

  // Memoize search and filter functionality
  const filteredAndSearchedData = useMemo(() => {
    const activeData = facilitiesData[activeCategory];
    if (!activeData) return { items: [], category: null };

    let filteredItems = activeData.items;

    // Apply search filter
    if (searchTerm) {
      filteredItems = filteredItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.itemNotes && item.itemNotes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply availability filter
    if (filterMode !== 'all') {
      filteredItems = filteredItems.filter(item => {
        if (filterMode === 'available') return item.available;
        if (filterMode === 'missing') return !item.available;
        return true;
      });
    }

    return { items: filteredItems, category: activeData };
  }, [facilitiesData, activeCategory, searchTerm, filterMode]);

  const categoriesWithProgress = Object.keys(FACILITY_CATEGORIES).reduce((acc, categoryId) => {
    const stateCategory = facilitiesData[categoryId];
    if (stateCategory) {
      const completed = Object.values(stateCategory.items).filter(item => item.available).length;
      const total = Object.values(stateCategory.items).length;
      acc[categoryId] = {
        ...FACILITY_CATEGORIES[categoryId],
        completed,
        total,
      };
    }
    return acc;
  }, {} as Record<string, FacilityCategory>);

  const getFilteredItems = (items: FacilityItemType[]) => {
    let filtered = items;
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    switch (filterMode) {
      case 'available':
        filtered = filtered.filter(item => item.available);
        break;
      case 'missing':
        filtered = filtered.filter(item => !item.available);
        break;
      default:
        break;
    }
    
    return filtered;
  };

  const currentCategory = facilitiesData[activeCategory];
  const filteredItems = currentCategory ? getFilteredItems(currentCategory.items) : [];
  const categoryProgress = currentCategory ? (currentCategory.completed / currentCategory.total) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-[#009990]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-8 h-8 text-[#009990]" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Facilities Checklist</h2>
        <p className="text-slate-600 mb-6">
          Complete comprehensive villa facilities and amenities checklist
        </p>
        
        <div className="glass-card-white-teal p-4 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Overall Progress</span>
            <span className="text-sm text-teal-600 font-medium">{completedItems} / {totalItems} items</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="text-xs text-slate-600 mt-1">{Math.round(overallProgress)}% complete</div>
        </div>
      </div>

      <div className="space-y-6">
        <CategoryNavigation 
          categories={categoriesWithProgress}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {currentCategory && (
          <div className="glass-card-white-teal overflow-hidden">
            <div className="bg-gradient-to-r from-teal-50/80 to-teal-100/60 px-6 py-4 border-b border-teal-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-teal-100/80 p-2 rounded-lg">
                    {React.createElement(FACILITY_CATEGORIES[currentCategory.id].icon, { className: 'w-5 h-5 text-teal-600' })}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{currentCategory.name}</h3>
                    <p className="text-slate-600 text-sm">
                      {currentCategory.completed} of {currentCategory.total} items completed
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-600">
                    {Math.round(categoryProgress)}%
                  </div>
                  <div className="text-xs text-slate-600">Complete</div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${categoryProgress}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search facilities..."
                      className="form-input-white-teal w-full pl-10 pr-4 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <select
                    value={filterMode}
                    onChange={(e) => setFilterMode(e.target.value as any)}
                    className="form-input-white-teal text-sm px-3 py-2"
                  >
                    <option value="all">All Items</option>
                    <option value="available">Available Only</option>
                    <option value="missing">Missing Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6">
              {filteredAndSearchedData.items.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">
                    {searchTerm || filterMode !== 'all' 
                      ? 'No items match your current search or filter criteria.'
                      : 'No items found in this category.'
                    }
                  </p>
                  {(searchTerm || filterMode !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterMode('all');
                      }}
                      className="mt-2 text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAndSearchedData.items.map((item) => (
                    <FacilityItem
                      key={item.id}
                      item={item}
                      isExpanded={expandedItems.has(item.id)}
                      onToggle={() => toggleItemExpansion(item.id)}
                      onUpdate={(updates) => updateFacilityItem(activeCategory, item.id, updates)}
                      onPhotoUpload={(file) => handlePhotoUpload(activeCategory, item.id, file)}
                      villaId={villaId}
                      categoryId={activeCategory}
                      categoryPhotoLimit={20}
                      categoryPhotoCount={0}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}));

FacilitiesChecklistStep.displayName = 'FacilitiesChecklistStep';

export default FacilitiesChecklistStep;
