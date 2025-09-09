"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Search
} from 'lucide-react';
import { clientApi } from '@/lib/api-client';

// TypeScript interfaces
interface Owner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string | null;
  villaName: string;
  villaCode: string;
  communicationPreference: string;
  createdAt: string;
}

export function OwnerManagement() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle search
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Load owners data
  useEffect(() => {
    const loadOwners = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await clientApi.getOwnerManagementData(
          {
            search: searchTerm || undefined,
          },
          {
            page: currentPage,
            limit: 10
          }
        );
        
        if (response.success && response.data) {
          const { owners, total, totalPages } = response.data;
          setOwners(owners);
          setTotalCount(total);
          setTotalPages(totalPages);
        } else {
          setError(response.error || 'Failed to load owners');
        }
      } catch (err) {
        setError('Failed to load owners');
        console.error('Error loading owners:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOwners();
  }, [searchTerm, currentPage]);



  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    return phone;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card-white-teal p-6 rounded-2xl">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mr-3" />
            <p className="text-gray-600">Loading owners...</p>
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
          <Users className="w-6 h-6 text-teal-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Owner Management</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {owners.length} of {totalCount} owners (Page {currentPage} of {totalPages})
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card-white-teal p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-teal-600" />
          <input
            type="text"
            placeholder="Search owners by name, email..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card-white-teal p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Owners</p>
              <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
            </div>
            <Users className="w-6 h-6 text-teal-600 opacity-75" />
          </div>
        </div>
        
        <div className="glass-card-white-teal p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Showing</p>
              <p className="text-2xl font-bold text-slate-800">
                {owners.length}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600 opacity-75" />
          </div>
        </div>
        
        <div className="glass-card-white-teal p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Properties</p>
              <p className="text-2xl font-bold text-slate-800">
                {owners.length}
              </p>
            </div>
            <Building className="w-6 h-6 text-purple-600 opacity-75" />
          </div>
        </div>
      </div>

      {/* Owners Table */}
      <div className="glass-card-white-teal rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-teal-100 bg-teal-50/50">
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Owner Name</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Email</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Phone</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Nationality</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Villa Owned</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Communication</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Joined Date</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((owner, index) => (
                <tr
                  key={owner.id}
                  className={`
                    border-b border-gray-100 hover:bg-teal-50/30 transition-colors
                    ${index % 2 === 0 ? 'bg-white/20' : 'bg-white/10'}
                  `}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center font-medium">
                        {(owner.firstName || '').charAt(0)}{(owner.lastName || '').charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {owner.firstName || ''} {owner.lastName || ''}
                        </p>
                        <p className="text-sm text-gray-500">{owner.id || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <a 
                        href={`mailto:${owner.email}`}
                        className="text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                      >
                        {owner.email || 'No email'}
                      </a>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <a 
                        href={`tel:${owner.phone}`}
                        className="text-gray-700 hover:text-teal-600 transition-colors"
                      >
                        {owner.phone ? formatPhoneNumber(owner.phone) : 'No phone'}
                      </a>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="text-gray-700">
                      {owner.nationality || 'Not specified'}
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{owner.villaName}</span>
                      </div>
                      <div className="text-sm text-gray-500 ml-6">
                        {owner.villaCode}
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border bg-blue-100 text-blue-800 border-blue-200">
                      <Mail className="w-3 h-3" />
                      {owner.communicationPreference?.toLowerCase().replace('_', ' ') || 'email'}
                    </span>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{formatDate(owner.createdAt)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {owners.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No owners found</p>
            <p className="text-sm text-gray-400">
              {searchTerm ? 'Try adjusting your search terms' : 'No villa owners have been registered yet'}
            </p>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 p-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalCount)} of {totalCount} owners
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

export default OwnerManagement;