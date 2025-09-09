"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  MapPin, 
  Bed, 
  User, 
  Eye, 
  Filter,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { clientApi } from '@/lib/api-client';

// TypeScript interfaces
interface Villa {
  id: string;
  villaCode: string;
  villaName: string;
  destination: string;
  bedrooms: number;
  owner: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  propertyType: string;
  status: 'active' | 'inactive' | 'pending_review' | 'draft' | 'approved' | 'archived';
  progress: number;
  createdAt: string;
  lastUpdated: string;
}

interface FilterState {
  destination: string;
  bedrooms: string;
  search: string;
}


export function VillaManagement() {
  const [filteredVillas, setFilteredVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    destination: '',
    bedrooms: '',
    search: ''
  });
  const [destinations, setDestinations] = useState<string[]>([]);
  const [bedroomCounts, setBedroomCounts] = useState<number[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const router = useRouter();


  // Load villas data
  useEffect(() => {
    const loadVillas = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await clientApi.getVillaManagementData(
          {
            destination: filters.destination || undefined,
            bedrooms: filters.bedrooms ? parseInt(filters.bedrooms) : undefined,
            search: filters.search || undefined
          },
          {
            page: currentPage,
            limit: 10
          }
        );
        
        if (response.success && response.data) {
          const { villas, total, totalPages, currentPage } = response.data;
          
          // Ensure we have valid data before setting state
          setFilteredVillas(Array.isArray(villas) ? villas : []);
          setTotalCount(typeof total === 'number' ? total : 0);
          setTotalPages(typeof totalPages === 'number' ? totalPages : 1);
          setCurrentPage(typeof currentPage === 'number' ? currentPage : 1);
          
          // Extract unique destinations and bedroom counts for filters
          if (villas && Array.isArray(villas) && villas.length > 0) {
            const uniqueDestinations = Array.from(new Set(villas.map((villa: Villa) => villa.destination).filter(Boolean))).sort();
            const uniqueBedroomCounts = Array.from(new Set(villas.map((villa: Villa) => villa.bedrooms).filter(bedrooms => typeof bedrooms === 'number'))).sort((a: number, b: number) => a - b);
            setDestinations(uniqueDestinations);
            setBedroomCounts(uniqueBedroomCounts);
          } else {
            // Set empty arrays if no data
            setDestinations([]);
            setBedroomCounts([]);
          }
        } else {
          // Handle API error
          setError(response?.error || 'Failed to load villas');
          setFilteredVillas([]);
          setTotalCount(0);
          setTotalPages(1);
          setCurrentPage(1);
          setDestinations([]);
          setBedroomCounts([]);
        }
      } catch (err) {
        setError('Failed to load villas');
        setFilteredVillas([]);
        setTotalCount(0);
        setTotalPages(1);
        setCurrentPage(1);
        setDestinations([]);
        setBedroomCounts([]);
        console.error('Error loading villas:', err);
      } finally {
        setLoading(false);
      }
    };

    loadVillas();
  }, [filters, currentPage]);


  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      destination: '',
      bedrooms: '',
      search: ''
    });
    setCurrentPage(1);
  };

  // Navigate to villa details
  const handleViewDetails = (villaId: string) => {
    router.push(`/villa-management/${villaId}/profile`);
  };

  // Get status badge style
  const getStatusBadge = (status: Villa['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'draft':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: Villa['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending_review':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'draft':
        return <AlertTriangle className="w-4 h-4" />;
      case 'inactive':
        return <Activity className="w-4 h-4" />;
      case 'archived':
        return <Activity className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card-white-teal p-6 rounded-2xl">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mr-3" />
            <p className="text-gray-600">Loading villas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="glass-card-white-teal p-6 rounded-2xl">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{typeof error === 'string' ? error : 'An error occurred'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building className="w-6 h-6 text-teal-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Villa Management</h2>
        </div>
        <div className="text-sm text-gray-500">
          {filteredVillas.length} of {totalCount} villas (Page {currentPage} of {totalPages})
        </div>
      </div>

      {/* Filter Island */}
      <div className="glass-card-white-teal p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-teal-600" />
          <span className="font-medium text-gray-700">Filters</span>
          {(filters.destination || filters.bedrooms || filters.search) && (
            <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">
              {Object.values(filters).filter(Boolean).length} active
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* Always visible filter controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search villas..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="form-input-white-teal w-full px-3 py-2 text-sm"
              />
            </div>

            {/* Destination Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
              <select
                value={filters.destination}
                onChange={(e) => handleFilterChange('destination', e.target.value)}
                className="form-input-white-teal w-full px-3 py-2 text-sm"
              >
                <option value="">All destinations</option>
                {destinations.map((destination) => (
                  <option key={destination} value={destination}>
                    {destination}
                  </option>
                ))}
              </select>
            </div>

            {/* Bedrooms Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
              <select
                value={filters.bedrooms}
                onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                className="form-input-white-teal w-full px-3 py-2 text-sm"
              >
                <option value="">Any bedrooms</option>
                {bedroomCounts.map((count) => (
                  <option key={count} value={count.toString()}>
                    {count} bedroom{count !== 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-all duration-300"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Villas Table */}
      <div className="glass-card-white-teal rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-teal-100 bg-teal-50/50">
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Villa Name</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Destination</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Bedrooms</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Owner</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Property Type</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Progress</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVillas.map((villa, index) => (
                <tr
                  key={villa.id}
                  className={`
                    border-b border-gray-100 hover:bg-teal-50/30 transition-colors
                    ${index % 2 === 0 ? 'bg-white/20' : 'bg-white/10'}
                  `}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-teal-600" />
                      <div>
                        <p className="font-medium text-gray-900">{villa.villaName}</p>
                        <p className="text-sm text-gray-500">{villa.villaCode}</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{villa.destination}</span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Bed className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{villa.bedrooms}</span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">
                        {villa.owner ? `${villa.owner.firstName} ${villa.owner.lastName}` : 'No owner assigned'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <span className="text-gray-700">{villa.propertyType}</span>
                  </td>
                  
                  <td className="py-4 px-6">
                    <span className={`
                      inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border
                      ${getStatusBadge(villa.status)}
                    `}>
                      {getStatusIcon(villa.status)}
                      {villa.status}
                    </span>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="w-24">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{villa.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full transition-all"
                          style={{ width: `${villa.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <button
                      onClick={() => handleViewDetails(villa.id)}
                      className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
                    >
                      <Eye className="w-3 h-3" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVillas.length === 0 && (
          <div className="text-center py-12">
            <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No villas found</p>
            <p className="text-sm text-gray-400">
              {totalCount > 0 ? 'Try adjusting your filters' : 'No villas have been added yet'}
            </p>
            {(filters.destination || filters.bedrooms || filters.search) && (
              <button
                onClick={clearFilters}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 p-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalCount)} of {totalCount} villas
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, currentPage - 2) + i;
                  if (page > totalPages) return null;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                        currentPage === page
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VillaManagement;