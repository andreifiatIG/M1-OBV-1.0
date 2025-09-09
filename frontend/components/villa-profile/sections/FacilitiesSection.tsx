"use client";

import React, { useState } from 'react';
import { clientApi } from '@/lib/api-client';
import { Grid3X3, Check, X, Edit2, Save, ChevronDown, ChevronRight } from 'lucide-react';

interface FacilitiesSectionProps {
  facilities: any[];
  villaId: string | null;
}

const facilitiesCategories = [
  {
    id: 'basic_property',
    name: 'Basic Property',
    count: 12,
    items: [
      'Air Conditioning', 'Heating', 'Free WiFi', 'Parking', 'Garden', 'Terrace',
      'Balcony', 'Patio', 'Outdoor Furniture', 'BBQ Area', 'Storage Space', 'Laundry Room'
    ]
  },
  {
    id: 'occupancy_sleeping',
    name: 'Occupancy & Sleeping',
    count: 25,
    items: [
      'King Size Bed', 'Queen Size Bed', 'Double Bed', 'Single Bed', 'Sofa Bed',
      'Bunk Bed', 'Baby Crib', 'Extra Bedding', 'Pillows', 'Blankets',
      'Mosquito Net', 'Blackout Curtains', 'Reading Lights', 'Bedside Tables', 'Wardrobe',
      'Hangers', 'Safe Box', 'Mirror', 'Desk', 'Chair',
      'Ceiling Fan', 'Humidifier', 'Air Purifier', 'Electric Blanket', 'Memory Foam Mattress'
    ]
  },
  {
    id: 'bathrooms',
    name: 'Bathrooms',
    count: 15,
    items: [
      'Private Bathroom', 'Shared Bathroom', 'Hot Water', 'Shower', 'Bathtub',
      'Hair Dryer', 'Towels', 'Shampoo', 'Body Wash', 'Toilet Paper',
      'Bidet', 'Magnifying Mirror', 'Bathroom Scale', 'First Aid Kit', 'Bathrobe'
    ]
  },
  {
    id: 'kitchen_dining',
    name: 'Kitchen & Dining',
    count: 35,
    items: [
      'Full Kitchen', 'Kitchenette', 'Refrigerator', 'Freezer', 'Microwave',
      'Oven', 'Stovetop', 'Dishwasher', 'Coffee Machine', 'Kettle',
      'Toaster', 'Blender', 'Food Processor', 'Rice Cooker', 'Slow Cooker',
      'Pressure Cooker', 'Grill Pan', 'Wok', 'Cooking Utensils', 'Cutlery',
      'Plates', 'Bowls', 'Glasses', 'Mugs', 'Wine Glasses',
      'Serving Dishes', 'Cutting Board', 'Dining Table', 'Dining Chairs', 'Bar Stools',
      'High Chair', 'Spices', 'Cooking Oil', 'Salt & Pepper', 'Cleaning Supplies'
    ]
  },
  {
    id: 'service_staff',
    name: 'Service & Staff',
    count: 18,
    items: [
      'Housekeeping', 'Daily Cleaning', 'Weekly Cleaning', 'Concierge Service', 'Butler Service',
      'Chef Service', 'Babysitting', 'Pet Sitting', 'Laundry Service', 'Dry Cleaning',
      'Grocery Shopping', 'Airport Transfer', 'Car Rental', 'Bicycle Rental', 'Tour Guide',
      'Spa Services', 'Massage Service', 'Personal Trainer'
    ]
  },
  {
    id: 'living_spaces',
    name: 'Living Spaces',
    count: 14,
    items: [
      'Living Room', 'Separate Seating Area', 'Sofa', 'Armchairs', 'Coffee Table',
      'Side Tables', 'TV', 'Cable TV', 'Streaming Services', 'Sound System',
      'Books', 'Board Games', 'Fireplace', 'Piano'
    ]
  },
  {
    id: 'outdoor_facilities',
    name: 'Outdoor Facilities',
    count: 22,
    items: [
      'Private Pool', 'Shared Pool', 'Hot Tub', 'Jacuzzi', 'Pool Towels',
      'Pool Toys', 'Sun Loungers', 'Umbrellas', 'Outdoor Shower', 'Beach Access',
      'Beach Chairs', 'Beach Umbrella', 'Kayaks', 'Snorkeling Gear', 'Fishing Equipment',
      'Outdoor Kitchen', 'Fire Pit', 'Hammock', 'Swing', 'Gazebo',
      'Outdoor Dining Area', 'Garden Maintenance'
    ]
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    count: 25,
    items: [
      'Smart TV', '4K TV', 'Netflix', 'Amazon Prime', 'Disney+', 'YouTube',
      'Cable Channels', 'DVD Player', 'Gaming Console', 'PlayStation', 'Xbox',
      'Nintendo Switch', 'VR Headset', 'Projector', 'Surround Sound', 'Bluetooth Speaker',
      'Record Player', 'Musical Instruments', 'Table Tennis', 'Pool Table',
      'Foosball Table', 'Arcade Games', 'Karaoke Machine', 'DJ Equipment', 'Dance Floor'
    ]
  },
  {
    id: 'technology',
    name: 'Technology',
    count: 12,
    items: [
      'High-Speed Internet', 'WiFi 6', 'Smart Home System', 'Voice Assistant', 'Smart Lights',
      'Smart Thermostat', 'Security Cameras', 'Smart TV', 'Charging Stations', 'USB Outlets',
      'Laptop-Friendly Workspace', 'Printer'
    ]
  },
  {
    id: 'wellness_spa',
    name: 'Wellness & Spa',
    count: 10,
    items: [
      'Spa Room', 'Massage Table', 'Sauna', 'Steam Room', 'Yoga Mats',
      'Exercise Equipment', 'Meditation Space', 'Essential Oils', 'Aromatherapy', 'Wellness Library'
    ]
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    count: 19,
    items: [
      'Wheelchair Accessible', 'Accessible Bathroom', 'Grab Rails', 'Step-Free Access', 'Wide Doorways',
      'Accessible Parking', 'Elevator', 'Ramp Access', 'Lowered Light Switches', 'Lowered Countertops',
      'Accessible Shower', 'Shower Chair', 'Raised Toilet Seat', 'Visual Alarms', 'Hearing Loop',
      'Braille Signage', 'Service Animal Friendly', 'Accessible Pool Entry', 'Emergency Accessible Route'
    ]
  },
  {
    id: 'safety_security',
    name: 'Safety & Security',
    count: 14,
    items: [
      'Smoke Detectors', 'Carbon Monoxide Detector', 'Fire Extinguisher', 'First Aid Kit', 'Security System',
      'CCTV', 'Motion Sensors', 'Safe', 'Deadbolt Locks', 'Window Locks',
      'Emergency Exit', 'Emergency Lighting', 'Security Guard', '24/7 Monitoring'
    ]
  },
  {
    id: 'child_friendly',
    name: 'Child-Friendly',
    count: 28,
    items: [
      'Baby Crib', 'High Chair', 'Baby Gate', 'Child Safety Locks', 'Pool Fence',
      'Playground', 'Toys', 'Games', 'Coloring Books', 'Baby Monitor',
      'Changing Table', 'Baby Bath', 'Bottle Sterilizer', 'Baby Food', 'Diapers',
      'Wipes', 'Stroller', 'Car Seat', 'Booster Seat', 'Child-Proof Outlets',
      'Corner Guards', 'Drawer Locks', 'Cabinet Locks', 'Non-Slip Mats', 'Night Light',
      'Kids TV Channels', 'Educational Games', 'Babysitting Service'
    ]
  }
];

export default function FacilitiesSection({ facilities, villaId }: FacilitiesSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [facilityStates, setFacilityStates] = useState<Record<string, boolean>>(() => {
    const states: Record<string, boolean> = {};
    facilitiesCategories.forEach(category => {
      category.items.forEach(item => {
        const facilityKey = `${category.id}_${item.toLowerCase().replace(/\s+/g, '_')}`;
        states[facilityKey] = facilities?.some(f => f.category === category.id && f.name === item && f.available) || false;
      });
    });
    return states;
  });

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleFacility = (categoryId: string, itemName: string) => {
    if (!isEditing) return;
    
    const facilityKey = `${categoryId}_${itemName.toLowerCase().replace(/\s+/g, '_')}`;
    setFacilityStates(prev => ({
      ...prev,
      [facilityKey]: !prev[facilityKey]
    }));
  };

  const handleSave = async () => {
    if (!villaId) return;
    
    const facilitiesToUpdate: any[] = [];
    
    facilitiesCategories.forEach(category => {
      category.items.forEach(item => {
        const facilityKey = `${category.id}_${item.toLowerCase().replace(/\s+/g, '_')}`;
        facilitiesToUpdate.push({
          category: category.id,
          name: item,
          available: facilityStates[facilityKey] || false
        });
      });
    });
    
    try {
      const response = await clientApi.updateFacilities(villaId, facilitiesToUpdate);
      if (response.success) {
        setIsEditing(false);
        window.location.reload();
      } else {
        console.error('Failed to update facilities:', response.error);
      }
    } catch (error) {
      console.error('Failed to update facilities:', error);
    }
  };

  const handleCancel = () => {
    // Reset to original states
    const states: Record<string, boolean> = {};
    facilitiesCategories.forEach(category => {
      category.items.forEach(item => {
        const facilityKey = `${category.id}_${item.toLowerCase().replace(/\s+/g, '_')}`;
        states[facilityKey] = facilities?.some(f => f.category === category.id && f.name === item && f.available) || false;
      });
    });
    setFacilityStates(states);
    setIsEditing(false);
  };

  const getCategoryStats = (categoryId: string) => {
    const categoryItems = facilitiesCategories.find(c => c.id === categoryId)?.items || [];
    const availableCount = categoryItems.filter(item => {
      const facilityKey = `${categoryId}_${item.toLowerCase().replace(/\s+/g, '_')}`;
      return facilityStates[facilityKey];
    }).length;
    return { available: availableCount, total: categoryItems.length };
  };

  const totalFacilities = facilitiesCategories.reduce((sum, cat) => sum + cat.count, 0);
  const availableFacilities = Object.values(facilityStates).filter(Boolean).length;

  return (
    <div className="glass-card-white-teal rounded-2xl">
      {/* Section Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Grid3X3 className="w-6 h-6 text-teal-600" />
          <div>
            <h2 className="text-xl font-medium text-gray-900">Facilities Checklist</h2>
            <p className="text-sm text-gray-600">{availableFacilities} of {totalFacilities} facilities available</p>
          </div>
        </div>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Categories */}
        <div className="space-y-4">
          {facilitiesCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const stats = getCategoryStats(category.id);
            const completionPercentage = Math.round((stats.available / stats.total) * 100);
            
            return (
              <div key={category.id} className="border border-slate-200 rounded-lg">
                {/* Category Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                    <div>
                      <h3 className="text-base font-medium text-gray-900">{category.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{stats.available} of {stats.total} items</span>
                        <span>•</span>
                        <span>{completionPercentage}% complete</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 w-10">
                      {completionPercentage}%
                    </span>
                  </div>
                </div>

                {/* Category Items */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {category.items.map((item) => {
                        const facilityKey = `${category.id}_${item.toLowerCase().replace(/\s+/g, '_')}`;
                        const isAvailable = facilityStates[facilityKey];
                        
                        return (
                          <div
                            key={item}
                            className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                              isEditing 
                                ? 'cursor-pointer hover:bg-slate-50' 
                                : ''
                            } ${
                              isAvailable 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-slate-50 border border-slate-200'
                            }`}
                            onClick={() => toggleFacility(category.id, item)}
                          >
                            <div className={`flex-shrink-0 w-4 h-4 rounded-sm flex items-center justify-center ${
                              isAvailable 
                                ? 'bg-green-600 text-white' 
                                : 'bg-slate-300'
                            }`}>
                              {isAvailable && <Check className="w-3 h-3" />}
                            </div>
                            <span className={`text-sm ${
                              isAvailable 
                                ? 'text-green-900 font-medium' 
                                : 'text-slate-700'
                            }`}>
                              {item}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Statistics */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Facilities Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">{availableFacilities}</div>
              <div className="text-xs text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalFacilities}</div>
              <div className="text-xs text-gray-600">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {facilitiesCategories.length}
              </div>
              <div className="text-xs text-gray-600">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((availableFacilities / totalFacilities) * 100)}%
              </div>
              <div className="text-xs text-gray-600">Complete</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}