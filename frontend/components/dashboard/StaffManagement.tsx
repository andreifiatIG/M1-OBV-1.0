"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ClientApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { 
  UserCheck, 
  Mail, 
  Phone, 
  Building, 
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Briefcase
} from 'lucide-react';

// TypeScript interfaces
interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  employmentType?: string;
  villaName?: string;
  villaCode?: string;
  salary?: number;
  currency?: string;
  startDate: string;
  isActive: boolean;
  email?: string;
  phone?: string;
  villa?: {
    villaName: string;
  };
}

interface FilterState {
  search: string;
  position: string;
  villaId: string;
}

interface StaffApiResponse {
  staff: Staff[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    position: '',
    villaId: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { getToken } = useAuth();

  // Define standard position values that match database schema
  const standardPositions = [
    'VILLA_MANAGER',
    'HOUSEKEEPER', 
    'GARDENER',
    'POOL_MAINTENANCE',
    'SECURITY',
    'CHEF',
    'DRIVER',
    'CONCIERGE',
    'MAINTENANCE',
    'OTHER'
  ];

  // Convert database enum values to readable format
  const formatPosition = (position: string) => {
    return position
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get unique values for filters - use standard positions if staff data exists, otherwise fallback to database values
  const positions = staff.length > 0 
    ? Array.from(new Set(staff.map(s => s.position))).sort()
    : standardPositions;
  const villas = Array.from(new Set(staff.map(s => s.villa?.villaName).filter(Boolean))).sort();


  // Load staff data from API
  const loadStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) {
        setError('Please sign in to view staff');
        return;
      }

      const apiClient = new ClientApiClient();
      apiClient.setToken(token);
      const response = await apiClient.getStaffManagementData(
        filters,
        { page: currentPage, limit: 10 }
      );
      
      if (response.success && response.data) {
        setStaff(response.data.staff || []);
        setTotal(response.data.total || 0);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(response.data.currentPage || 1);
      } else {
        throw new Error(response.error || 'Failed to load staff');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff');
      console.error('Error loading staff:', err);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  // Load staff on mount and when filters/page change
  useEffect(() => {
    loadStaff();
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
      search: '',
      position: '',
      villaId: ''
    });
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get status badge style
  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  // Get status icon
  const getStatusIcon = (isActive: boolean) => {
    return isActive 
      ? <CheckCircle className="w-4 h-4" />
      : <AlertTriangle className="w-4 h-4" />;
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card-white-teal p-6 rounded-2xl">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mr-3" />
            <p className="text-gray-600">Loading staff...</p>
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
          <UserCheck className="w-6 h-6 text-teal-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Staff Management</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {staff.length} of {total} staff members
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card-white-teal p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Staff</p>
              <p className="text-2xl font-bold text-slate-800">{staff.length}</p>
            </div>
            <UserCheck className="w-6 h-6 text-teal-600 opacity-75" />
          </div>
        </div>
        
        <div className="glass-card-white-teal p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Active</p>
              <p className="text-2xl font-bold text-slate-800">
                {staff.filter(s => s.isActive).length}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600 opacity-75" />
          </div>
        </div>
        
        <div className="glass-card-white-teal p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">On Leave</p>
              <p className="text-2xl font-bold text-slate-800">
                {staff.filter(s => !s.isActive).length}
              </p>
            </div>
            <Clock className="w-6 h-6 text-amber-600 opacity-75" />
          </div>
        </div>
        
        <div className="glass-card-white-teal p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Departments</p>
              <p className="text-2xl font-bold text-slate-800">
                {Array.from(new Set(staff.map(s => s.department))).length}
              </p>
            </div>
            <Briefcase className="w-6 h-6 text-purple-600 opacity-75" />
          </div>
        </div>
      </div>

      {/* Filter Island */}
      <div className="glass-card-white-teal p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-teal-600" />
          <span className="font-medium text-gray-700">Filters</span>
          {(filters.search || filters.position || filters.villaId) && (
            <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">
              Active
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
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Name or email..."
                className="form-input-white-teal w-full px-3 py-2 text-sm"
              />
            </div>

            {/* Position Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
              <select
                value={filters.position}
                onChange={(e) => handleFilterChange('position', e.target.value)}
                className="form-input-white-teal w-full px-3 py-2 text-sm"
              >
                <option value="">All positions</option>
                {positions.map((position) => (
                  <option key={position} value={position}>
                    {formatPosition(position)}
                  </option>
                ))}
              </select>
            </div>

            {/* Villa Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Villa/Listing</label>
              <select
                value={filters.villaId}
                onChange={(e) => handleFilterChange('villaId', e.target.value)}
                className="form-input-white-teal w-full px-3 py-2 text-sm"
              >
                <option value="">All villas</option>
                {villas.map((villa) => (
                  <option key={villa} value={villa}>
                    {villa}
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

      {/* Staff Table */}
      <div className="glass-card-white-teal rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-teal-100 bg-teal-50/50">
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Staff Name</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Role</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Villa Assignment</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Contact Info</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Department</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Salary</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((staffMember, index) => (
                <tr
                  key={staffMember.id}
                  className={`
                    border-b border-gray-100 hover:bg-teal-50/30 transition-colors
                    ${index % 2 === 0 ? 'bg-white/20' : 'bg-white/10'}
                  `}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center font-medium">
                        {staffMember.firstName.charAt(0)}{staffMember.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {staffMember.firstName} {staffMember.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{staffMember.id}</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700 font-medium">{formatPosition(staffMember.position)}</span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-700">{staffMember.villaName || 'Unassigned'}</p>
                        <p className="text-xs text-gray-500">{staffMember.villaCode}</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      {staffMember.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-gray-500" />
                          <a 
                            href={`mailto:${staffMember.email}`}
                            className="text-xs text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                          >
                            {staffMember.email}
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">No email</span>
                        </div>
                      )}
                      {staffMember.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-gray-500" />
                          <a 
                            href={`tel:${staffMember.phone}`}
                            className="text-xs text-gray-600 hover:text-teal-600 transition-colors"
                          >
                            {staffMember.phone}
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">No phone</span>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{staffMember.department}</span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <span className={`
                      inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border
                      ${getStatusBadge(staffMember.isActive)}
                    `}>
                      {getStatusIcon(staffMember.isActive)}
                      {staffMember.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  
                  <td className="py-4 px-6">
                    {staffMember.salary && (
                      <span className="text-sm font-medium text-gray-700">
                        {staffMember.currency || '€'}{staffMember.salary.toLocaleString()}/month
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {staff.length === 0 && (
          <div className="text-center py-12">
            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No staff members found</p>
            <p className="text-sm text-gray-400">
              {total > 0 ? 'Try adjusting your filters' : 'No staff have been added yet'}
            </p>
            {(filters.search || filters.position || filters.villaId) && (
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
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, total)} of {total} staff members
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

export default StaffManagement;