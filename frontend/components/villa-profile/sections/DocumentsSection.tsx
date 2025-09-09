"use client";

import React, { useState, useEffect } from 'react';
import { clientApi } from '@/lib/api-client';
import { Upload, FileText, Download, Trash2, Plus, FolderOpen, Cloud, Shield, ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';

interface DocumentsSectionProps {
  documents: any[];
  villaId: string | null;
}

const documentCategories = [
  {
    id: 'contracts',
    name: 'Contracts',
    description: 'Management contracts, rental agreements',
    icon: FileText,
    color: 'bg-blue-500'
  },
  {
    id: 'insurance',
    name: 'Insurance',
    description: 'Property insurance, liability coverage',
    icon: Shield,
    color: 'bg-green-500'
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Property inventory lists, asset documentation',
    icon: FolderOpen,
    color: 'bg-purple-500'
  },
  {
    id: 'utilities',
    name: 'Utilities',
    description: 'Utility bills, service agreements',
    icon: FileText,
    color: 'bg-yellow-500'
  },
  {
    id: 'emergency',
    name: 'Emergency Contacts',
    description: 'Emergency contact lists, procedures',
    icon: FileText,
    color: 'bg-red-500'
  },
  {
    id: 'house_rules',
    name: 'House Rules',
    description: 'Guest guidelines, property rules',
    icon: FileText,
    color: 'bg-indigo-500'
  },
  {
    id: 'staff_contracts',
    name: 'Staff Contracts',
    description: 'Employment contracts, service agreements',
    icon: FileText,
    color: 'bg-teal-500'
  },
  {
    id: 'maintenance',
    name: 'Maintenance Contracts',
    description: 'Service contracts, maintenance agreements',
    icon: FileText,
    color: 'bg-orange-500'
  }
];

export default function DocumentsSection({ documents: initialDocuments, villaId }: DocumentsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [documents, setDocuments] = useState<any[]>(Array.isArray(initialDocuments) ? initialDocuments : []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const itemsPerPage = 5;

  const getDocumentsByCategory = (categoryId: string) => {
    if (!Array.isArray(documents)) {
      console.warn('Documents is not an array:', documents);
      return [];
    }
    return documents.filter(doc => doc.category === categoryId) || [];
  };

  const getPaginatedDocuments = (documents: any[]) => {
    if (!Array.isArray(documents)) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return documents.slice(startIndex, endIndex);
  };

  const getTotalPages = (documents: any[]) => {
    if (!Array.isArray(documents)) return 0;
    return Math.ceil(documents.length / itemsPerPage);
  };

  const refreshSharePointContent = async () => {
    if (!villaId) return;
    
    setIsRefreshing(true);
    try {
      const response = await clientApi.getSharePointDocuments(villaId);
      if (response.success && response.data) {
        setDocuments(response.data);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Failed to refresh SharePoint documents:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (villaId) {
      refreshSharePointContent();
    }
  }, [villaId]);

  // Update documents when initialDocuments changes
  useEffect(() => {
    setDocuments(Array.isArray(initialDocuments) ? initialDocuments : []);
  }, [initialDocuments]);

  const handleViewDocument = (documentUrl: string) => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  const handleSharePointSync = async () => {
    if (!villaId) return;
    
    try {
      const response = await clientApi.syncVillaWithSharePoint(villaId);
      if (response.success) {
        alert(`SharePoint sync completed! Synced ${response.data?.syncedDocuments || 0}/${response.data?.totalDocuments || 0} documents.`);
        await refreshSharePointContent();
      } else {
        alert('Failed to sync with SharePoint: ' + response.error);
      }
    } catch (error) {
      console.error('SharePoint sync failed:', error);
      alert('SharePoint sync failed. Please try again.');
    }
  };

  const handleFileUpload = async (categoryId: string, files: FileList | null) => {
    if (!files || !villaId) return;
    
    setUploadingTo(categoryId);
    
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', categoryId);
        formData.append('villaId', villaId);
        
        const response = await clientApi.uploadDocument(villaId, formData);
        if (!response.success) {
          console.error('Failed to upload document:', response.error);
        }
      }
      
      await refreshSharePointContent();
    } catch (error) {
      console.error('Failed to upload documents:', error);
    } finally {
      setUploadingTo(null);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!villaId || !confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const response = await clientApi.deleteDocument(villaId, documentId);
      if (response.success) {
        await refreshSharePointContent();
      } else {
        console.error('Failed to delete document:', response.error);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const generateDocumentSummaryPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 20;
    let yPosition = 20;

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(0, 153, 144); // Teal color
    pdf.text('Document Summary Report', margin, yPosition);
    yPosition += 10;

    // Date
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
    yPosition += 15;

    // Summary Stats
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Overview', margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    const totalDocuments = Array.isArray(documents) ? documents.length : 0;
    const totalByCategory = documentCategories.map(cat => ({
      name: cat.name,
      count: getDocumentsByCategory(cat.id).length
    }));

    pdf.text(`Total Documents: ${totalDocuments}`, margin, yPosition);
    yPosition += 5;
    pdf.text(`Categories: ${documentCategories.length}`, margin, yPosition);
    yPosition += 5;
    pdf.text(`Last Updated: ${lastRefresh ? lastRefresh.toLocaleDateString() : 'Never'}`, margin, yPosition);
    yPosition += 15;

    // Category Details
    pdf.setFontSize(14);
    pdf.text('Documents by Category', margin, yPosition);
    yPosition += 10;

    documentCategories.forEach((category, index) => {
      const categoryDocs = getDocumentsByCategory(category.id);
      
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${category.name} (${categoryDocs.length} files)`, margin, yPosition);
      yPosition += 5;

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(category.description, margin + 5, yPosition);
      yPosition += 8;

      if (categoryDocs.length > 0) {
        categoryDocs.forEach((doc, docIndex) => {
          if (yPosition > 260) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(8);
          pdf.setTextColor(0, 0, 0);
          const docText = `• ${doc.name || 'Unnamed Document'}`;
          if (doc.size) {
            pdf.text(docText + ` (${formatFileSize(doc.size)})`, margin + 10, yPosition);
          } else {
            pdf.text(docText, margin + 10, yPosition);
          }
          yPosition += 4;
        });
      } else {
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('• No documents uploaded', margin + 10, yPosition);
        yPosition += 4;
      }
      yPosition += 5;
    });

    // Footer
    const finalY = pdf.internal.pageSize.height - 15;
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Generated by M1 Villa Management System', margin, finalY);

    // Save the PDF
    const fileName = `villa-documents-summary-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  return (
    <div className="glass-card-white-teal rounded-2xl">
      {/* Section Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Upload className="w-6 h-6 text-teal-600" />
          <div>
            <h2 className="text-xl font-medium text-slate-900">Documents Upload</h2>
            <p className="text-sm text-slate-600">Property documents with SharePoint integration</p>
            {lastRefresh && (
              <p className="text-xs text-slate-500">
                Last synced: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={generateDocumentSummaryPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download Summary</span>
          </button>
          
          <button
            onClick={refreshSharePointContent}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync SharePoint'}</span>
          </button>
          
          <button
            onClick={handleSharePointSync}
            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <Cloud className="w-4 h-4" />
            <span>Legacy Sync</span>
          </button>
          
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <Cloud className="w-4 h-4" />
            <span>Real-time</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Document Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {documentCategories.map((category) => {
            const Icon = category.icon;
            const categoryDocuments = getDocumentsByCategory(category.id);
            const isUploading = uploadingTo === category.id;
            
            return (
              <div key={category.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-8 h-8 ${category.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-slate-900 truncate">{category.name}</h3>
                    <p className="text-xs text-slate-600">{categoryDocuments.length} files</p>
                  </div>
                </div>
                
                <p className="text-xs text-slate-500 mb-3">{category.description}</p>
                
                {/* Upload Area */}
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                    onChange={(e) => handleFileUpload(category.id, e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <div className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                    isUploading 
                      ? 'border-teal-300 bg-teal-50' 
                      : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'
                  }`}>
                    {isUploading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-600 border-t-transparent"></div>
                        <span className="text-xs text-teal-600">Uploading...</span>
                      </div>
                    ) : (
                      <div>
                        <Plus className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs text-slate-600">Drop files or click</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* View Files Button */}
                {categoryDocuments.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedCategory(selectedCategory === category.id ? null : category.id);
                      setCurrentPage(1); // Reset pagination when changing category
                    }}
                    className="w-full mt-2 text-xs text-teal-600 hover:text-teal-700"
                  >
                    {selectedCategory === category.id ? 'Hide Files' : `View ${categoryDocuments.length} Files`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Document List for Selected Category */}
        {selectedCategory && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">
              {documentCategories.find(c => c.id === selectedCategory)?.name} Documents
              {getDocumentsByCategory(selectedCategory).length > itemsPerPage && (
                <span className="ml-2 text-sm text-slate-500">
                  (Showing {((currentPage - 1) * itemsPerPage) + 1}-
                  {Math.min(currentPage * itemsPerPage, getDocumentsByCategory(selectedCategory).length)} of {getDocumentsByCategory(selectedCategory).length})
                </span>
              )}
            </h3>
            
            <div className="border border-slate-200 rounded-lg">
              <div>
                {getPaginatedDocuments(getDocumentsByCategory(selectedCategory)).map((document, index) => (
                  <div key={document.id} className={`flex items-center justify-between p-4 ${
                    index > 0 ? 'border-t border-slate-100' : ''
                  }`}>
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {document.name || document.filename}
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-slate-500">
                          <span>{formatFileSize(document.size || 0)}</span>
                          <span>
                            {document.uploadedAt 
                              ? new Date(document.uploadedAt).toLocaleDateString()
                              : 'Unknown date'
                            }
                          </span>
                          {document.version && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded-full">
                              v{document.version}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* View Document Button */}
                      <button
                        onClick={() => handleViewDocument(document.fileUrl || document.downloadUrl)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        title="View Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* SharePoint Link */}
                      {document.sharePointUrl && (
                        <a
                          href={document.sharePointUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-green-600 transition-colors"
                          title="View in SharePoint"
                        >
                          <Cloud className="w-4 h-4" />
                        </a>
                      )}
                      
                      {/* Download Button */}
                      <button
                        onClick={() => {
                          const downloadUrl = document.fileUrl || document.downloadUrl;
                          if (downloadUrl) {
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            link.download = document.fileName || document.name || 'document';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-teal-600 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteDocument(document.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {getDocumentsByCategory(selectedCategory).length === 0 && (
                  <div className="p-8 text-center">
                    <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No documents in this category</p>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {getDocumentsByCategory(selectedCategory).length > itemsPerPage && (
                <div className="flex items-center justify-center space-x-2 p-4 border-t border-slate-200">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: getTotalPages(getDocumentsByCategory(selectedCategory)) }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-teal-600 text-white'
                            : 'border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(getTotalPages(getDocumentsByCategory(selectedCategory)), prev + 1))}
                    disabled={currentPage === getTotalPages(getDocumentsByCategory(selectedCategory))}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Guidelines */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-900 mb-2">Upload Guidelines</h4>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>• Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX</li>
            <li>• Maximum file size: 10MB per file</li>
            <li>• Files are automatically synced to SharePoint</li>
            <li>• Version control is maintained for updated documents</li>
            <li>• All uploads are encrypted and secure</li>
          </ul>
        </div>

        {/* Document Summary */}
        <div className="mt-4 p-4 bg-teal-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-slate-900">Document Summary</h4>
              <p className="text-xs text-slate-600">
                {documents?.length || 0} total documents across {documentCategories.length} categories
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-600">
              <Shield className="w-4 h-4" />
              <span>Encrypted & Secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}