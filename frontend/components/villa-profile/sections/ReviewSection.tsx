"use client";

import React, { useState } from 'react';
import { clientApi } from '@/lib/api-client';
import { CheckCircle, AlertCircle, XCircle, Eye, FileText, Activity, Clock, User, Home, Globe, Upload, Users, Grid3X3, Camera, Percent } from 'lucide-react';

interface ReviewSectionProps {
  villaProfile: any;
  villaId: string | null;
}

const sectionIcons = {
  villa: Home,
  owner: User,
  contractual: FileText,
  bank: FileText,
  ota: Globe,
  documents: Upload,
  staff: Users,
  facilities: Grid3X3,
  photos: Camera
};

export default function ReviewSection({ villaProfile, villaId }: ReviewSectionProps) {
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submissionMessage, setSubmissionMessage] = useState('');

  const evaluateSection = (sectionName: string, data: any) => {
    if (!data) return { status: 'missing', completion: 0, requiredFields: 0, completedFields: 0 };
    
    let requiredFields = 0;
    let completedFields = 0;
    
    switch (sectionName) {
      case 'villa':
        const villaFields = ['villaName', 'villaAddress', 'villaCity', 'bedrooms', 'bathrooms', 'maxGuests'];
        requiredFields = villaFields.length;
        completedFields = villaFields.filter(field => data[field]).length;
        break;
        
      case 'owner':
        const ownerFields = ['ownerFullName', 'ownerEmail', 'ownerPhone'];
        requiredFields = ownerFields.length;
        completedFields = ownerFields.filter(field => data[field]).length;
        break;
        
      case 'contractual':
        const contractFields = ['contractSignatureDate', 'serviceChargePercentage'];
        requiredFields = contractFields.length;
        completedFields = contractFields.filter(field => data[field]).length;
        break;
        
      case 'bank':
        const bankFields = ['accountName', 'bankName', 'swiftBicCode'];
        requiredFields = bankFields.length;
        completedFields = bankFields.filter(field => data[field]).length;
        break;
        
      case 'ota':
        requiredFields = 7; // 7 OTA platforms
        completedFields = data ? Object.keys(data).filter(key => data[key]?.enabled).length : 0;
        break;
        
      case 'documents':
        requiredFields = 8; // 8 document categories
        completedFields = Array.isArray(data) ? data.length : 0;
        break;
        
      case 'staff':
        requiredFields = 3; // Minimum staff positions
        completedFields = Array.isArray(data) ? data.length : 0;
        break;
        
      case 'facilities':
        requiredFields = 50; // Minimum expected facilities
        completedFields = Array.isArray(data) ? data.filter((f: any) => f.available).length : 0;
        break;
        
      case 'photos':
        requiredFields = 20; // Minimum photos across categories
        completedFields = Array.isArray(data) ? data.length : 0;
        break;
        
      default:
        return { status: 'unknown', completion: 0, requiredFields: 0, completedFields: 0 };
    }
    
    const completion = Math.min(100, Math.round((completedFields / requiredFields) * 100));
    
    let status: 'complete' | 'partial' | 'missing';
    if (completion >= 90) status = 'complete';
    else if (completion >= 50) status = 'partial';
    else status = 'missing';
    
    return { status, completion, requiredFields, completedFields };
  };

  const sections = [
    { key: 'villa', name: 'Villa Information', data: villaProfile.villa },
    { key: 'owner', name: 'Owner Details', data: villaProfile.ownerDetails },
    { key: 'contractual', name: 'Contractual Details', data: villaProfile.contractualDetails },
    { key: 'bank', name: 'Bank Details', data: villaProfile.bankDetails },
    { key: 'ota', name: 'OTA Credentials', data: villaProfile.otaDetails },
    { key: 'documents', name: 'Documents', data: villaProfile.documents },
    { key: 'staff', name: 'Staff Configuration', data: villaProfile.staff },
    { key: 'facilities', name: 'Facilities', data: villaProfile.facilities },
    { key: 'photos', name: 'Photos & Videos', data: villaProfile.photos }
  ];

  const sectionEvaluations = sections.map(section => ({
    ...section,
    evaluation: evaluateSection(section.key, section.data)
  }));

  const overallCompletion = Math.round(
    sectionEvaluations.reduce((sum, section) => sum + section.evaluation.completion, 0) / sections.length
  );

  const completeSections = sectionEvaluations.filter(s => s.evaluation.status === 'complete').length;
  const partialSections = sectionEvaluations.filter(s => s.evaluation.status === 'partial').length;
  const missingSections = sectionEvaluations.filter(s => s.evaluation.status === 'missing').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'partial': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'missing': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-900 bg-green-50 border-green-200';
      case 'partial': return 'text-yellow-900 bg-yellow-50 border-yellow-200';
      case 'missing': return 'text-red-900 bg-red-50 border-red-200';
      default: return 'text-gray-900 bg-slate-50 border-slate-200';
    }
  };

  const handleSubmitForReview = async () => {
    if (!villaId) return;
    
    setSubmissionStatus('submitting');
    setSubmissionMessage('');
    
    try {
      const response = await clientApi.submitVillaForReview(villaId);
      if (response.success) {
        setSubmissionStatus('success');
        setSubmissionMessage('Villa profile submitted successfully for review!');
      } else {
        setSubmissionStatus('error');
        setSubmissionMessage(response.error || 'Failed to submit villa for review');
      }
    } catch (error) {
      setSubmissionStatus('error');
      setSubmissionMessage('An error occurred while submitting for review');
    }
  };

  const canSubmit = overallCompletion >= 80 && completeSections >= 6;

  return (
    <div className="glass-card-white-teal rounded-2xl">
      {/* Section Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-6 h-6 text-teal-600" />
          <div>
            <h2 className="text-xl font-medium text-gray-900">Review & Submit</h2>
            <p className="text-sm text-gray-600">Final validation and submission for approval</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-gray-600">{overallCompletion}% Complete</span>
        </div>
      </div>

      <div className="p-6">
        {/* Overall Progress */}
        <div className="mb-8 p-6 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Overall Progress</h3>
            <span className="text-2xl font-bold text-teal-600">{overallCompletion}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${overallCompletion}%` }}
            />
          </div>
          
          {/* Progress Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-semibold text-green-600">{completeSections}</div>
              <div className="text-sm text-green-700">Complete</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl font-semibold text-yellow-600">{partialSections}</div>
              <div className="text-sm text-yellow-700">Partial</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="text-xl font-semibold text-red-600">{missingSections}</div>
              <div className="text-sm text-red-700">Missing</div>
            </div>
          </div>
        </div>

        {/* Section Details */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Section Status</h3>
          <div className="space-y-3">
            {sectionEvaluations.map((section) => {
              const IconComponent = sectionIcons[section.key as keyof typeof sectionIcons] || FileText;
              
              return (
                <div
                  key={section.key}
                  className={`flex items-center justify-between p-4 rounded-lg border ${getStatusColor(section.evaluation.status)}`}
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(section.evaluation.status)}
                    <IconComponent className="w-5 h-5 text-gray-600" />
                    <div>
                      <h4 className="text-sm font-medium">{section.name}</h4>
                      <p className="text-xs text-gray-600">
                        {section.evaluation.completedFields} of {section.evaluation.requiredFields} fields completed
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-lg font-semibold">{section.evaluation.completion}%</div>
                      <div className="text-xs text-gray-600 capitalize">{section.evaluation.status}</div>
                    </div>
                    
                    <div className="w-16 bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          section.evaluation.status === 'complete' ? 'bg-green-500' :
                          section.evaluation.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${section.evaluation.completion}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submission Requirements */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Submission Requirements</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li className="flex items-center space-x-2">
              {overallCompletion >= 80 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span>Overall completion must be at least 80% (Currently {overallCompletion}%)</span>
            </li>
            <li className="flex items-center space-x-2">
              {completeSections >= 6 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span>At least 6 sections must be complete (Currently {completeSections})</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>All required legal documents uploaded</span>
            </li>
          </ul>
        </div>

        {/* Submission Status */}
        {submissionStatus !== 'idle' && (
          <div className={`mb-6 p-4 rounded-lg border ${
            submissionStatus === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            submissionStatus === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center space-x-2">
              {submissionStatus === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : submissionStatus === 'error' ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5 animate-spin" />
              )}
              <span className="font-medium">
                {submissionStatus === 'submitting' && 'Submitting for review...'}
                {submissionStatus === 'success' && 'Submission Successful'}
                {submissionStatus === 'error' && 'Submission Failed'}
              </span>
            </div>
            {submissionMessage && (
              <p className="mt-2 text-sm">{submissionMessage}</p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-center">
          <button
            onClick={handleSubmitForReview}
            disabled={!canSubmit || submissionStatus === 'submitting'}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-300 ${
              canSubmit && submissionStatus !== 'submitting'
                ? 'bg-gradient-to-r from-[#009990] to-[#007a6b] text-white shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submissionStatus === 'submitting' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>Submit for Review</span>
              </>
            )}
          </button>
        </div>

        {!canSubmit && submissionStatus === 'idle' && (
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Complete more sections to enable submission for review
            </p>
          </div>
        )}

        {/* Data Summary */}
        <div className="mt-8 p-4 bg-slate-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Data Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {sectionEvaluations.reduce((sum, s) => sum + s.evaluation.completedFields, 0)}
              </div>
              <div className="text-xs text-gray-600">Fields Completed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {villaProfile.documents?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Documents</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {villaProfile.photos?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Photos/Videos</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {villaProfile.staff?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Staff Members</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}