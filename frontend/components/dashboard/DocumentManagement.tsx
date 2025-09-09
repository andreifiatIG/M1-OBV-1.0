"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ClientApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { 
  FileText, 
  Building, 
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Calendar,
  User,
  FileIcon,
  Image,
  FileSpreadsheet,
} from 'lucide-react';

// TypeScript interfaces
interface Document {
  id: string;
  fileName: string;
  documentType: string;
  fileSize?: number;
  villaName?: string;
  villaCode?: string;
  uploadedAt: string;
  validUntil?: string;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED' | 'EXPIRED';
  description?: string;
  fileUrl?: string;
  sharePointUrl?: string;
  villa?: {
    villaName: string;
  };
}

interface FilterState {
  search: string;
  documentType: string;
  villaId: string;
}

interface DocumentApiResponse {
  documents: Document[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export function DocumentManagement() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    documentType: '',
    villaId: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { getToken } = useAuth();

  // Get unique values for filters
  const documentTypes = Array.from(new Set(documents.map(doc => doc.documentType))).sort();
  const villas = Array.from(new Set(documents.map(doc => doc.villa?.villaName).filter(Boolean))).sort();


  // Load documents data from API
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) {
        setError('Please sign in to view documents');
        return;
      }

      const apiClient = new ClientApiClient();
      apiClient.setToken(token);
      const response = await apiClient.getDocumentManagementData(
        filters,
        { page: currentPage, limit: 10 }
      );
      
      if (response.success && response.data) {
        setDocuments(response.data.documents || []);
        setTotal(response.data.total || 0);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(response.data.currentPage || 1);
      } else {
        throw new Error(response.error || 'Failed to load documents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      console.error('Error loading documents:', err);
      toast.error('Failed to load document data');
    } finally {
      setLoading(false);
    }
  };

  // Load documents on mount and when filters/page change
  useEffect(() => {
    loadDocuments();
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
      documentType: '',
      villaId: ''
    });
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get status badge style
  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EXPIRED':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status?: Document['status']) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'REJECTED':
        return <AlertTriangle className="w-4 h-4" />;
      case 'EXPIRED':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Get document type icon
  const getDocumentIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('photo') || lowerType.includes('image')) {
      return <Image className="w-4 h-4 text-purple-500" />;
    } else if (lowerType.includes('invoice') || lowerType.includes('bill')) {
      return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    } else {
      return <FileIcon className="w-4 h-4 text-blue-500" />;
    }
  };

  // Get file icon based on extension
  const getFileIcon = (extension: string) => {
    switch (extension.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="w-5 h-5 text-blue-500" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'zip':
      case 'rar':
        return <FileIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <FileIcon className="w-5 h-5 text-gray-500" />;
    }
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

  // Format document type for display
  const formatDocumentType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Handle view document
  const handleViewDocument = (documentId: string) => {
    console.log('View document:', documentId);
    // Implement document viewing logic
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card-white-teal p-6 rounded-2xl">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mr-3" />
            <p className="text-gray-600">Loading documents...</p>
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
          <FileText className="w-6 h-6 text-teal-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Document Management</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {documents.length} of {total} documents
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card-white-teal p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Documents</p>
              <p className="text-2xl font-bold text-slate-800">{documents.length}</p>
            </div>
            <FileText className="w-6 h-6 text-teal-600 opacity-75" />
          </div>
        </div>
        
        <div className="glass-card-white-teal p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Approved</p>
              <p className="text-2xl font-bold text-slate-800">
                {documents.filter(d => d.status === 'APPROVED').length}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600 opacity-75" />
          </div>
        </div>
        
        <div className="glass-card-white-teal p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Pending</p>
              <p className="text-2xl font-bold text-slate-800">
                {documents.filter(d => d.status === 'PENDING').length}
              </p>
            </div>
            <Clock className="w-6 h-6 text-amber-600 opacity-75" />
          </div>
        </div>
        
        <div className="glass-card-white-teal p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Expired/Rejected</p>
              <p className="text-2xl font-bold text-slate-800">
                {documents.filter(d => d.status === 'EXPIRED' || d.status === 'REJECTED').length}
              </p>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-600 opacity-75" />
          </div>
        </div>
      </div>

      {/* Filter Island */}
      <div className="glass-card-white-teal p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-teal-600" />
          <span className="font-medium text-gray-700">Filters</span>
          {(filters.search || filters.documentType || filters.villaId) && (
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
                placeholder="Search documents..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="form-input-white-teal w-full px-3 py-2 text-sm"
              />
            </div>

            {/* Villa Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Villa</label>
              <select
                value={filters.villaId}
                onChange={(e) => handleFilterChange('villaId', e.target.value)}
                className="form-input-white-teal w-full px-3 py-2 text-sm"
              >
                <option value="">All villas</option>
                {villas.map((villaName) => (
                  <option key={villaName} value={villaName}>
                    {villaName}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
              <select
                value={filters.documentType}
                onChange={(e) => handleFilterChange('documentType', e.target.value)}
                className="form-input-white-teal w-full px-3 py-2 text-sm"
              >
                <option value="">All types</option>
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatDocumentType(type)}
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

      {/* Documents Table */}
      <div className="glass-card-white-teal rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-teal-100 bg-teal-50/50">
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Document Name</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Type</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Villa</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Upload Date</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Uploaded By</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document, index) => (
                <tr
                  key={document.id}
                  className={`
                    border-b border-gray-100 hover:bg-teal-50/30 transition-colors
                    ${index % 2 === 0 ? 'bg-white/20' : 'bg-white/10'}
                  `}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {getDocumentIcon(document.documentType)}
                      <div>
                        <p className="font-medium text-gray-900">{document.fileName || 'Unknown Document'}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{document.fileSize ? `${(document.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}</span>
                          <span>•</span>
                          <span>{document.fileName?.split('.').pop()?.toUpperCase() || 'Unknown'}</span>
                        </div>
                        {document.description && (
                          <p className="text-xs text-gray-400 mt-1">{document.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      {document.documentType}
                    </span>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-700">{document.villa?.villaName || 'Unknown Villa'}</p>
                        <p className="text-xs text-gray-500">{document.villaCode}</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-700">{new Date(document.uploadedAt).toLocaleDateString()}</p>
                        {document.validUntil && (
                          <p className="text-xs text-amber-600">
                            Expires: {new Date(document.validUntil).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">System</span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-6">
                    <span className={`
                      inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border
                      ${getStatusBadge(document.status)}
                    `}>
                      {getStatusIcon(document.status)}
                      {document.status}
                    </span>
                  </td>
                  
                  <td className="py-4 px-6">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleViewDocument(document.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <button
                        onClick={() => console.log('Download', document.id)}
                        className="flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-xl text-slate-600 text-xs hover:bg-slate-50 transition-all duration-300"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {documents.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No documents found</p>
            <p className="text-sm text-gray-400">
              {total > 0 ? 'Try adjusting your filters' : 'No documents have been uploaded yet'}
            </p>
            {(filters.search || filters.documentType || filters.villaId) && (
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
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, total)} of {total} documents
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

export default DocumentManagement;