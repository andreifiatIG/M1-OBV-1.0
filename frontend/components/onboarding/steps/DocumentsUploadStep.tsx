"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef, useMemo } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Shield, Folder, ScrollText, ShieldCheck, Package, Zap, Phone, BookOpen, Users, Wrench } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
// Removed Convex dependencies - using direct state management
import { StepHandle } from './types';

interface DocumentsUploadStepProps {
  data: any;
  onUpdate: (stepData: any) => void;
  villaId?: string; // Optional villa ID prop
}

interface DocumentFile {
  id: string;
  name: string;
  file: File;
  uploaded: boolean;
  sharePointUrl?: string;
  uploadedAt?: number;
}

interface DocumentItem {
  id: string;
  name: string; // This will be the enum value for API
  displayName: string; // This will be the user-friendly display name
  type: 'required' | 'optional';
  category: 'legal' | 'financial' | 'operational' | 'contracts' | 'maintenance' | 'media';
  description: string;
  storageLocation: string;
  files: DocumentFile[];
  uploaded: boolean;
  icon: React.ReactNode;
  allowMultiple?: boolean;
}

const DocumentsUploadStep = forwardRef<StepHandle, DocumentsUploadStepProps>((
  { data, onUpdate, villaId },
  ref
) => {
  const { getToken } = useAuth();
  // SharePoint upload function - using actual SharePoint integration
  const uploadFileToSharePoint = async (fileData: any) => {
    try {
      console.log('[UPLOAD] Starting SharePoint upload:', fileData.fileName);
      console.log('[UPLOAD] Folder path:', fileData.folderPath);
      console.log('[UPLOAD] Villa ID:', fileData.villaId);
      
      // Get villa ID from props - passed down from onboarding wizard
      const currentVillaId = villaId || fileData.villaId;
      
      console.log('[UPLOAD] Villa ID check:', {
        fromProps: villaId,
        fromFileData: fileData.villaId,
        finalVillaId: currentVillaId
      });
      
      if (!currentVillaId) {
        throw new Error('Villa ID not found - cannot upload to SharePoint');
      }
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Convert base64 to blob
      const byteCharacters = atob(fileData.fileContent);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileData.mimeType || 'application/octet-stream' });
      
      formData.append('documents', blob, fileData.fileName);
      formData.append('villaId', currentVillaId);
      
      // Use proper document type mapping
      const mappedDocumentType = documentTypeMapping[fileData.metadata?.documentType] || fileData.metadata?.documentType || 'OTHER';
      formData.append('documentType', mappedDocumentType);
      
      // Use proper category mapping
      const mappedCategory = categoryFolderMapping[fileData.metadata?.category] || fileData.metadata?.category || 'other';
      formData.append('category', mappedCategory);
      
      // Get authentication token
      const token = await getToken();
      
      // Use the actual backend API endpoint
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
      const uploadUrl = `${API_URL}/api/documents/upload-sharepoint`;
      
      console.log('🔗 Making API call to:', uploadUrl);
      console.log('[TOKEN] Auth token present:', !!token);
      console.log('[UPLOAD] FormData fields:', {
        villaId: currentVillaId,
        documentType: mappedDocumentType,
        category: mappedCategory,
        fileName: fileData.fileName
      });
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          // Note: Don't set Content-Type for FormData, let browser set it with boundary
        }
      });
      
      if (!response.ok) {
        console.error('[ERROR] Upload response error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        // Read response body once
        const responseText = await response.text();
        console.error('[ERROR] Response body:', responseText.substring(0, 200));
        
        try {
          // Try to parse as JSON
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        } catch (parseError) {
          // If JSON parsing fails, it might be HTML error page
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      const result = await response.json();
      console.log('[SUCCESS] SharePoint upload successful:', result);
      
      return {
        success: true,
        url: result.documents?.[0]?.fileUrl || result.sharePointUrl,
        error: null
      };
    } catch (error) {
      console.error('[ERROR] SharePoint upload error:', error);
      return {
        success: false,
        url: null,
        error: error instanceof Error ? error.message : 'Upload failed. Please try again.'
      };
    }
  };
  
  // Document type mapping - aligns frontend with backend expectations
  const documentTypeMapping: Record<string, string> = {
    'PROPERTY_CONTRACT': 'PROPERTY_CONTRACT',
    'INSURANCE_CERTIFICATE': 'INSURANCE_CERTIFICATE', 
    'UTILITY_BILLS': 'UTILITY_BILLS',
    'INVENTORY_LIST': 'INVENTORY_LIST',
    'EMERGENCY_CONTACTS': 'EMERGENCY_CONTACTS',
    'HOUSE_RULES': 'HOUSE_RULES',
    'STAFF_CONTRACTS': 'STAFF_CONTRACTS',
    'MAINTENANCE_CONTRACTS': 'MAINTENANCE_RECORDS', // Backend expects MAINTENANCE_RECORDS
    'PROPERTY_TITLE': 'PROPERTY_TITLE',
    'TAX_DOCUMENTS': 'TAX_DOCUMENTS',
    'LICENSES_PERMITS': 'LICENSES_PERMITS'
  };

  // Category to folder mapping - matches SharePoint structure
  const categoryFolderMapping: Record<string, string> = {
    'legal': 'legal',
    'contracts': 'contracts', 
    'insurance': 'insurance',
    'financial': 'financial',
    'utilities': 'utilities',
    'operational': 'operational',
    'inventory': 'inventory',
    'emergency': 'emergency',
    'house_rules': 'house_rules',
    'staff_contracts': 'staff_contracts',
    'maintenance_contracts': 'maintenance_contracts',
    'other': 'other'
  };

  const initialDocuments: DocumentItem[] = [
    // Legal Documents
    {
      id: 'contracts',
      name: 'PROPERTY_CONTRACT',
      displayName: 'Property Contracts',
      type: 'required',
      category: 'legal',
      description: 'Property management and rental contracts',
      storageLocation: '01-Legal-Documents/Property-Contracts',
      files: [],
      uploaded: false,
      icon: <ScrollText className="w-5 h-5 text-[#009990]" />
    },
    {
      id: 'property_title',
      name: 'PROPERTY_TITLE',
      displayName: 'Property Title Deeds',
      type: 'optional',
      category: 'legal',
      description: 'Property ownership and title documents',
      storageLocation: '01-Legal-Documents/Property-Title-Deeds',
      files: [],
      uploaded: false,
      icon: <ScrollText className="w-5 h-5 text-[#009990]" />
    },
    {
      id: 'licenses_permits',
      name: 'LICENSES_PERMITS',
      displayName: 'Licenses & Permits',
      type: 'optional',
      category: 'legal',
      description: 'Business licenses and operating permits',
      storageLocation: '01-Legal-Documents/Licenses-Permits',
      files: [],
      uploaded: false,
      allowMultiple: true,
      icon: <ScrollText className="w-5 h-5 text-[#009990]" />
    },
    // Financial Documents
    {
      id: 'insurance',
      name: 'INSURANCE_CERTIFICATE',
      displayName: 'Insurance Certificate',
      type: 'required',
      category: 'financial',
      description: 'Property insurance certificates and policies',
      storageLocation: '02-Financial-Documents/Insurance-Policies',
      files: [],
      uploaded: false,
      icon: <ShieldCheck className="w-5 h-5 text-[#009990]" />
    },
    {
      id: 'tax_documents',
      name: 'TAX_DOCUMENTS',
      displayName: 'Tax Documents',
      type: 'optional',
      category: 'financial',
      description: 'Property tax records and certificates',
      storageLocation: '02-Financial-Documents/Tax-Documents',
      files: [],
      uploaded: false,
      allowMultiple: true,
      icon: <ShieldCheck className="w-5 h-5 text-[#009990]" />
    },
    {
      id: 'utilities',
      name: 'UTILITY_BILLS',
      displayName: 'Utility Bills',
      type: 'optional',
      category: 'financial',
      description: 'Utility accounts and service information',
      storageLocation: '02-Financial-Documents/Utility-Accounts',
      files: [],
      uploaded: false,
      allowMultiple: true,
      icon: <Zap className="w-5 h-5 text-[#009990]" />
    },
    // Operational Documents
    {
      id: 'inventory',
      name: 'INVENTORY_LIST',
      displayName: 'Inventory List',
      type: 'optional',
      category: 'operational',
      description: 'Detailed inventory lists and asset management',
      storageLocation: '03-Operational-Documents/Inventory-Lists',
      files: [],
      uploaded: false,
      allowMultiple: true,
      icon: <Package className="w-5 h-5 text-[#009990]" />
    },
    {
      id: 'emergency_contacts',
      name: 'EMERGENCY_CONTACTS',
      displayName: 'Emergency Contacts',
      type: 'required',
      category: 'operational',
      description: 'Emergency contact information and procedures',
      storageLocation: '03-Operational-Documents/Emergency-Contacts',
      files: [],
      uploaded: false,
      icon: <Phone className="w-5 h-5 text-[#009990]" />
    },
    {
      id: 'house_rules',
      name: 'HOUSE_RULES',
      displayName: 'House Rules',
      type: 'required',
      category: 'operational',
      description: 'Guest house rules and policies',
      storageLocation: '03-Operational-Documents/House-Rules',
      files: [],
      uploaded: false,
      icon: <BookOpen className="w-5 h-5 text-[#009990]" />
    },
    // Contracts & Agreements
    {
      id: 'staff_contracts',
      name: 'STAFF_CONTRACTS',
      displayName: 'Staff Contracts',
      type: 'optional',
      category: 'contracts',
      description: 'Staff employment contracts and agreements',
      storageLocation: '04-Contracts-Agreements/Staff-Contracts',
      files: [],
      uploaded: false,
      allowMultiple: true,
      icon: <Users className="w-5 h-5 text-[#009990]" />
    },
    {
      id: 'maintenance_contracts',
      name: 'MAINTENANCE_RECORDS',
      displayName: 'Maintenance Contracts',
      type: 'optional',
      category: 'contracts',
      description: 'Maintenance and service provider contracts',
      storageLocation: '04-Contracts-Agreements/Maintenance-Contracts',
      files: [],
      uploaded: false,
      allowMultiple: true,
      icon: <Wrench className="w-5 h-5 text-[#009990]" />
    }
  ];

  // Reverse mapping for loading saved documents (backend → frontend)
  const reverseDocumentTypeMapping: Record<string, string> = {
    'PROPERTY_CONTRACT': 'PROPERTY_CONTRACT',
    'INSURANCE_CERTIFICATE': 'INSURANCE_CERTIFICATE',
    'UTILITY_BILLS': 'UTILITY_BILLS', 
    'INVENTORY_LIST': 'INVENTORY_LIST',
    'EMERGENCY_CONTACTS': 'EMERGENCY_CONTACTS',
    'HOUSE_RULES': 'HOUSE_RULES',
    'STAFF_CONTRACTS': 'STAFF_CONTRACTS',
    'MAINTENANCE_RECORDS': 'MAINTENANCE_RECORDS', // Backend stores as MAINTENANCE_RECORDS
    'PROPERTY_TITLE': 'PROPERTY_TITLE',
    'TAX_DOCUMENTS': 'TAX_DOCUMENTS',
    'LICENSES_PERMITS': 'LICENSES_PERMITS',
    'OTHER': 'OTHER'
  };

  // Ref to prevent infinite loops
  const isProcessingData = useRef(false);
  const lastDataRef = useRef<string>('');

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    console.log('[INIT] Initializing documents with data:', data);
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('📄 Found saved documents, processing...', data);
      
      // Group saved documents by document type
      const groupedData: Record<string, any[]> = {};
      data.forEach((doc: any) => {
        const docType = doc.documentType;
        if (!groupedData[docType]) {
          groupedData[docType] = [];
        }
        groupedData[docType].push(doc);
      });

      // Map to frontend document structure
      const mappedDocuments = initialDocuments.map(defaultDoc => {
        // Find saved files for this document type
        const savedFiles = groupedData[defaultDoc.name] || [];
        const files: DocumentFile[] = savedFiles.map((savedFile: any, index: number) => {
          return {
            id: `${defaultDoc.id}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            name: savedFile.fileName || savedFile.originalFileName || `Document_${index + 1}`,
            file: new File([], savedFile.fileName || 'document'),
            uploaded: true,
            sharePointUrl: savedFile.fileUrl || savedFile.sharePointUrl,
            uploadedAt: Date.now()
          };
        });

        return {
          ...defaultDoc,
          files,
          uploaded: files.length > 0
        };
      });
      
      console.log('🎯 Final mapped documents:', mappedDocuments);
      return mappedDocuments;
    }
    
    console.log('📝 No saved documents found, using initial structure');
    return initialDocuments;
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'uploading' | 'processing' | 'success' | 'error'>>({});

  // Effect to handle data changes (when loading from backend)
  useEffect(() => {
    // Prevent infinite loops by checking if we're already processing
    if (isProcessingData.current) {
      return;
    }

    // Create a string representation of data to check if it actually changed
    const dataString = JSON.stringify(data);
    if (dataString === lastDataRef.current) {
      return;
    }

    if (Array.isArray(data) && data.length > 0) {
      console.log('📥 New data received, updating documents:', data);
      
      isProcessingData.current = true;
      lastDataRef.current = dataString;
      
      // Group saved documents by document type
      const groupedData: Record<string, any[]> = {};
      data.forEach((doc: any) => {
        const docType = doc.documentType;
        if (!groupedData[docType]) {
          groupedData[docType] = [];
        }
        groupedData[docType].push(doc);
      });

      // Update documents with saved data
      const updatedDocuments = initialDocuments.map(defaultDoc => {
        const savedFiles = groupedData[defaultDoc.name] || [];
        const files: DocumentFile[] = savedFiles.map((savedFile: any, index: number) => ({
          id: `${defaultDoc.id}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          name: savedFile.fileName || savedFile.originalFileName || `Document_${index + 1}`,
          file: new File([], savedFile.fileName || 'document'),
          uploaded: true,
          sharePointUrl: savedFile.fileUrl || savedFile.sharePointUrl,
          uploadedAt: Date.now()
        }));

        return {
          ...defaultDoc,
          files,
          uploaded: files.length > 0
        };
      });
      
      console.log('[UPDATE] Updated documents from backend data:', updatedDocuments);
      setDocuments(updatedDocuments);
      
      // Reset processing flag after state update
      setTimeout(() => {
        isProcessingData.current = false;
      }, 100);
    }
  }, [data]); // Dependency on data prop

  // Memoize the documents to save to prevent unnecessary re-renders
  const documentsToSave = useMemo(() => {
    return documents
      .filter(doc => doc.files && doc.files.length > 0)
      .flatMap(doc => 
        doc.files.map(file => ({
          documentType: doc.name,
          fileName: file.name,
          fileUrl: file.sharePointUrl || '',
          isRequired: doc.type === 'required',
          storageLocation: doc.storageLocation,
          fileSize: file.file?.size || 0,
          mimeType: file.file?.type || '',
          description: doc.description
        }))
      );
  }, [documents]);

  useEffect(() => {
    // Only call onUpdate if we're not currently processing data to avoid loops
    if (!isProcessingData.current) {
      onUpdate(documentsToSave);
    }
  }, [documentsToSave]); // Use memoized value

  const handleFileUpload = async (documentId: string, file?: File) => {
    console.log('handleFileUpload called with:', { documentId, fileName: file?.name });
    
    if (!file) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = getAcceptedFileTypes(documentId);
      input.multiple = documents.find(doc => doc.id === documentId)?.allowMultiple || false;
      input.onchange = (e) => {
        const selectedFiles = (e.target as HTMLInputElement).files;
        if (selectedFiles && selectedFiles.length > 0) {
          Array.from(selectedFiles).forEach(selectedFile => {
            handleFileUpload(documentId, selectedFile);
          });
        }
      };
      input.click();
      return;
    }

    setUploading(documentId);
    setErrors(prev => ({ ...prev, [documentId]: '' }));
    setUploadProgress(prev => ({ ...prev, [documentId]: 0 }));
    setUploadStatus(prev => ({ ...prev, [documentId]: 'uploading' }));

    try {
      console.log('Processing file:', file.name, 'Size:', file.size);
      setUploadProgress(prev => ({ ...prev, [documentId]: 20 }));
      
      const fileContent = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          console.log('File converted to base64, length:', base64.length);
          setUploadProgress(prev => ({ ...prev, [documentId]: 40 }));
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      const folderPath = documents.find(doc => doc.id === documentId)?.storageLocation || '';
      console.log('Uploading to SharePoint with:', {
        fileName: file.name,
        fileContentLength: fileContent.length,
        folderPath,
        documentType: documents.find(doc => doc.id === documentId)?.name,
        category: documents.find(doc => doc.id === documentId)?.category,
        isRequired: documents.find(doc => doc.id === documentId)?.type === 'required'
      });

      setUploadProgress(prev => ({ ...prev, [documentId]: 60 }));
      setUploadStatus(prev => ({ ...prev, [documentId]: 'processing' }));

      const uploadResult = await uploadFileToSharePoint({
        fileName: file.name,
        fileContent,
        folderPath,
        mimeType: file.type,
        villaId: villaId, // Use the villa ID from props
        metadata: {
          documentType: documents.find(doc => doc.id === documentId)?.name,
          category: documents.find(doc => doc.id === documentId)?.category,
          isRequired: documents.find(doc => doc.id === documentId)?.type === 'required'
        }
      });

      console.log('Upload result:', uploadResult);
      setUploadProgress(prev => ({ ...prev, [documentId]: 90 }));

      if (uploadResult.success) {
        setUploadStatus(prev => ({ ...prev, [documentId]: 'success' }));
        setUploadProgress(prev => ({ ...prev, [documentId]: 100 }));
        const fileId = `${documentId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const newFile: DocumentFile = {
          id: fileId,
          name: file.name,
          file: file,
          uploaded: true,
          sharePointUrl: uploadResult.url || undefined,
          uploadedAt: Date.now()
        };

        console.log('Creating new file object:', newFile);

        setDocuments(prev =>
          prev.map(doc =>
            doc.id === documentId ? { 
              ...doc, 
              files: [...doc.files, newFile],
              uploaded: doc.files.length > 0 || true
            } : doc
          )
        );
        
        console.log('Document state updated successfully');
      } else {
        console.error('Upload failed:', uploadResult.error);
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('File upload error:', error);
      setUploadStatus(prev => ({ ...prev, [documentId]: 'error' }));
      setErrors(prev => ({ ...prev, [documentId]: 'Upload failed. Please try again.' }));
    } finally {
      setUploading(null);
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, [documentId]: 0 }));
        setUploadStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[documentId];
          return newStatus;
        });
      }, 2000);
    }
  };

  const handleRemoveFile = (documentId: string, fileId: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { 
            ...doc, 
            files: doc.files.filter(f => f.id !== fileId),
            uploaded: doc.files.filter(f => f.id !== fileId).length > 0
          }
        : doc
    ));
  };

  const getAcceptedFileTypes = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (!doc) return '*';
    
    switch (doc.category) {
      default:
        return '.pdf,.doc,.docx,.txt';
    }
  };

  const validateForm = () => {
    // Made all documents optional - no validation required
    return true;
  };
  
  useImperativeHandle(ref, () => ({
    validate: validateForm,
    getData: () => {
      return documents
        .filter(doc => doc.files.length > 0)
        .flatMap(doc => 
          doc.files.map(file => ({
            documentType: doc.name,
            fileName: file.name,
            originalFileName: file.name,
            fileSize: file.file.size || 0,
            mimeType: file.file.type || '',
            storageLocation: doc.storageLocation,
            uploadStatus: 'completed',
            category: doc.category,
            description: doc.description,
            tags: [doc.category],
            isRequired: doc.type === 'required',
            sharePointUrl: file.sharePointUrl
          }))
        );
    }
  }));

  const getUploadedCount = (category: string) => {
    return documents.filter(doc => doc.category === category && doc.files.length > 0).length;
  };

  const getTotalCount = (category: string) => {
    return documents.filter(doc => doc.category === category).length;
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'legal': return 'Legal Documents';
      case 'financial': return 'Financial Documents';
      case 'operational': return 'Operational Documents';
      case 'contracts': return 'Contracts & Agreements';
      case 'maintenance': return 'Maintenance Records';
      case 'media': return 'Photos & Media';
      default: return 'Documents';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'legal': return <ScrollText className="w-5 h-5 text-[#009990]" />;
      case 'financial': return <ShieldCheck className="w-5 h-5 text-[#009990]" />;
      case 'operational': return <BookOpen className="w-5 h-5 text-[#009990]" />;
      case 'contracts': return <Users className="w-5 h-5 text-[#009990]" />;
      case 'maintenance': return <Wrench className="w-5 h-5 text-[#009990]" />;
      case 'media': return <FileText className="w-5 h-5 text-[#009990]" />;
      default: return <FileText className="w-5 h-5 text-[#009990]" />;
    }
  };

  const categories = ['legal', 'financial', 'operational', 'contracts'];

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#009990]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Folder className="w-8 h-8 text-[#009990]" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Documents Upload</h2>
        <p className="text-slate-600">Upload all required documents for your villa property</p>
        <div className="flex items-center justify-center mt-4 p-3 glass-card-white-teal">
          <AlertCircle className="w-5 h-5 text-[#009990] mr-2" />
          <span className="text-slate-700 text-sm">All documents are stored securely in SharePoint with automatic organization</span>
        </div>
      </div>

      <div className="space-y-8">
        {categories.map(category => {
          const categoryDocs = documents.filter(doc => doc.category === category);
          const uploadedCount = getUploadedCount(category);
          const totalCount = getTotalCount(category);
          
          return (
            <div key={category} className="glass-card-white-teal p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  {getCategoryIcon(category)}
                  <h3 className="text-lg font-semibold text-slate-800 ml-2">
                    {getCategoryTitle(category)}
                  </h3>
                </div>
                <div className="text-sm text-slate-600">
                  {uploadedCount}/{totalCount} uploaded
                  {categoryDocs.some(doc => doc.allowMultiple && doc.files.length > 0) && (
                    <span className="ml-2 px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 border border-blue-300">
                      {categoryDocs.reduce((total, doc) => total + doc.files.length, 0)} files
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {categoryDocs.map(doc => (
                  <div key={doc.id} className={`border rounded-lg p-4 transition-colors ${
                    errors[doc.id] ? 'border-red-400 bg-red-50/50' : 'border-white/40 bg-white/20 backdrop-blur-sm'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div className="flex items-center mr-4">
                          {doc.icon}
                          <div className="ml-3">
                            <div className="flex items-center">
                              <h4 className="text-slate-800 font-medium">{doc.displayName}</h4>
                            </div>
                            <p className="text-slate-600 text-sm">{doc.description}</p>
                            <p className="text-slate-500 text-xs mt-1">Storage: {doc.storageLocation}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {doc.files.length > 0 ? (
                          <div className="flex flex-col space-y-2">
                            {doc.files.map((file) => (
                              <div key={file.id} className="flex items-center space-x-2">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <span className="text-green-700 text-sm">{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(doc.id, file.id)}
                                  className="text-slate-500 hover:text-red-600 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {doc.allowMultiple && (
                              <button
                                type="button"
                                onClick={() => handleFileUpload(doc.id)}
                                className="text-sm text-[#009990] hover:text-[#007a6b] underline"
                              >
                                + Add another file
                              </button>
                            )}
                          </div>
                        ) : uploading === doc.id ? (
                          <div className="flex flex-col items-end space-y-2 min-w-[200px]">
                            <div className="text-xs text-slate-600 font-medium">
                              {uploadStatus[doc.id] === 'uploading' && '📤 Uploading...'}
                              {uploadStatus[doc.id] === 'processing' && '⚙️ Processing...'}
                              {uploadStatus[doc.id] === 'success' && 'Upload Complete!'}
                              {uploadStatus[doc.id] === 'error' && 'Upload Failed'}
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 shadow-inner">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  uploadStatus[doc.id] === 'error' 
                                    ? 'bg-red-500' 
                                    : uploadStatus[doc.id] === 'success'
                                    ? 'bg-green-500'
                                    : 'bg-gradient-to-r from-[#009990] to-[#007a6b] animate-pulse'
                                }`}
                                style={{ width: `${uploadProgress[doc.id] || 0}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-slate-500">
                              {uploadProgress[doc.id] || 0}%
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleFileUpload(doc.id)}
                            className="px-6 py-3 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50 flex items-center"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {doc.allowMultiple ? 'Upload Files' : 'Upload'}
                          </button>
                        )}
                      </div>
                    </div>
                    
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Summary Section */}
        <div className="glass-card-white-teal p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Upload Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(category => {
              const uploadedCount = getUploadedCount(category);
              const totalCount = getTotalCount(category);
              
              return (
                <div key={category} className="text-center">
                  <div className="text-2xl font-bold text-slate-800">
                    {uploadedCount}/{totalCount}
                  </div>
                  <div className="text-sm text-slate-600 capitalize">{category}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Information Box */}
        <div className="glass-card-white-teal p-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-[#009990] mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-700">
              <p className="font-medium mb-2">Document Management</p>
              <ul className="space-y-1 text-slate-600">
                <li>• All documents are automatically organized in SharePoint</li>
                <li>• Files are scanned for security and compliance</li>
                <li>• Version control and backup are handled automatically</li>
                <li>• You can update documents anytime from the villa dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DocumentsUploadStep;
