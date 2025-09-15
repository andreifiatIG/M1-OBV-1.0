"use client";

import React, { useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { 
  CheckCircle, Check, X, Building2, FileText, 
  Users, ClipboardList, Globe, Camera, CreditCard, Calendar,
  MapPin, Home, Phone, Mail, Hash, Clock, Percent, Shield,
  Briefcase, User, ChevronDown, ChevronUp
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { StepHandle } from './types';

// Enhanced detail item with better styling for onboarding wizard
const DetailItem = React.memo(({ 
  label, 
  value, 
  icon: Icon,
  className = "" 
}: { 
  label: string; 
  value: React.ReactNode; 
  icon?: any;
  className?: string;
}) => (
  <div className={`flex items-start gap-2 ${className}`}>
    {Icon && <Icon className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />}
    <div className="flex-1 min-w-0">
      <span className="text-xs font-medium text-slate-500 block">{label}</span>
      <span className="text-sm text-slate-700 break-words">
        {value || <span className="italic text-slate-400">Not specified</span>}
      </span>
    </div>
  </div>
));
DetailItem.displayName = 'DetailItem';

// Collapsible section wrapper with glassmorphism effect
const SectionWrapper = React.memo(({ 
  title, 
  icon: Icon,
  isComplete, 
  children,
  stepNumber 
}: { 
  title: string; 
  icon: any;
  isComplete: boolean; 
  children: React.ReactNode;
  stepNumber: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="relative">
      
      {/* Section content */}
      <div className="relative">

        {/* Content card */}
        <div className="mb-6">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-4 glass-card-white-teal transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isComplete ? 'bg-teal-100/50' : 'bg-slate-100/50'
              }`}>
                <Icon className={`w-5 h-5 ${
                  isComplete ? 'text-teal-600' : 'text-slate-400'
                }`} />
              </div>
              <h3 className={`font-semibold text-base ${
                isComplete ? 'text-slate-800' : 'text-slate-500'
              }`}>
                {title}
              </h3>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
          
          {isExpanded && (
            <div className="p-4 glass-card-white-teal mt-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
SectionWrapper.displayName = 'SectionWrapper';

interface ReviewSubmitStepEnhancedProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

const ReviewSubmitStepEnhanced = React.memo(forwardRef<StepHandle, ReviewSubmitStepEnhancedProps>((
  { data, onUpdate, onNext, onPrevious },
  ref
) => {
  const { user } = useUser();
  
  // Process and organize all data
  const processedData = useMemo(() => {
    const villaInfo = data.step1 || {};
    const ownerDetails = data.step2 || {};
    const contractual = data.step3 || {};
    const bankDetails = data.step4 || {};
    const otaCredentials = data.step5 || {};
    const documents = Array.isArray(data.step6) ? data.step6 : [];
    const staff = Array.isArray(data.step7) ? data.step7 : [];
    const facilities = data.step8 || {};
    const photos = data.step9?.photos || [];
    
    return {
      villaInfo,
      ownerDetails,
      contractual,
      bankDetails,
      otaCredentials,
      documents,
      staff,
      facilities,
      photos
    };
  }, [data]);
  
  // Calculate completion status
  const completionStatus = useMemo(() => {
    const { villaInfo, ownerDetails, contractual, bankDetails, otaCredentials, documents, staff, facilities, photos } = processedData;
    
    return {
      isVillaInfoComplete: !!(villaInfo.villaName && villaInfo.villaAddress && villaInfo.bedrooms && villaInfo.bathrooms),
      isOwnerDetailsComplete: !!(ownerDetails.firstName || ownerDetails.lastName || ownerDetails.email),
      isContractualComplete: !!(contractual.contractStartDate || contractual.commissionRate),
      isBankDetailsComplete: !!(bankDetails.bankName || bankDetails.accountNumber),
      isOtaComplete: Object.keys(otaCredentials).length > 0,
      isDocumentsComplete: documents.length > 0,
      isStaffComplete: staff.length > 0,
      isFacilitiesComplete: Object.keys(facilities).length > 0,
      isPhotosComplete: photos.length >= 3
    };
  }, [processedData]);


  const validateForm = () => {
    return true; // Always valid since it's just a review
  };

  useImperativeHandle(ref, () => ({
    validate: validateForm,
    getData: () => ({ finalConfirmation: true }),
  }), []);

  const { 
    villaInfo, ownerDetails, contractual, bankDetails, 
    otaCredentials, documents, staff, facilities, photos 
  } = processedData;

  const {
    isVillaInfoComplete, isOwnerDetailsComplete, isContractualComplete,
    isBankDetailsComplete, isOtaComplete, isDocumentsComplete,
    isStaffComplete, isFacilitiesComplete, isPhotosComplete
  } = completionStatus;

  // Calculate overall progress
  const completedSteps = Object.values(completionStatus).filter(Boolean).length;
  const totalSteps = Object.keys(completionStatus).length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-teal-400/20 to-teal-600/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <CheckCircle className="w-10 h-10 text-teal-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Review & Submit</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          You're almost there! Review all the information you've provided and submit your villa for approval.
        </p>
        
        {/* Progress Overview */}
        <div className="mt-6 p-4 glass-card-white-teal">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Overall Progress</span>
            <span className="text-sm font-bold text-teal-600">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200/50 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Data Summary Sections */}
      <div className="space-y-0">
        {/* Villa Information */}
        <SectionWrapper 
          title="Villa Information" 
          icon={Home}
          isComplete={isVillaInfoComplete}
          stepNumber={1}
        >
          {isVillaInfoComplete ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DetailItem icon={Building2} label="Villa Name" value={villaInfo.villaName} />
              <DetailItem icon={MapPin} label="Address" value={villaInfo.villaAddress} />
              <DetailItem icon={MapPin} label="City" value={villaInfo.villaCity} />
              <DetailItem icon={Globe} label="Country" value={villaInfo.villaCountry} />
              <DetailItem icon={Hash} label="Postal Code" value={villaInfo.villaPostalCode} />
              <DetailItem icon={Home} label="Property Type" value={villaInfo.propertyType} />
              <DetailItem label="Bedrooms" value={villaInfo.bedrooms} />
              <DetailItem label="Bathrooms" value={villaInfo.bathrooms} />
              <DetailItem label="Max Guests" value={villaInfo.maxGuests} />
              {villaInfo.villaArea && <DetailItem label="Villa Area" value={`${villaInfo.villaArea} sqm`} />}
              {villaInfo.landArea && <DetailItem label="Land Area" value={`${villaInfo.landArea} sqm`} />}
              {villaInfo.yearBuilt && <DetailItem label="Year Built" value={villaInfo.yearBuilt} />}
              {villaInfo.description && (
                <DetailItem 
                  label="Description" 
                  value={villaInfo.description} 
                  className="md:col-span-2 lg:col-span-3"
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic text-center py-4">
              Villa information not completed
            </p>
          )}
        </SectionWrapper>

        {/* Owner Details */}
        <SectionWrapper 
          title="Owner Details" 
          icon={User}
          isComplete={isOwnerDetailsComplete}
          stepNumber={2}
        >
          {isOwnerDetailsComplete ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DetailItem icon={User} label="Owner Type" value={ownerDetails.ownerType} />
              <DetailItem label="First Name" value={ownerDetails.firstName} />
              <DetailItem label="Last Name" value={ownerDetails.lastName} />
              <DetailItem icon={Mail} label="Email" value={ownerDetails.email} />
              <DetailItem icon={Phone} label="Phone" value={ownerDetails.phone} />
              <DetailItem label="Nationality" value={ownerDetails.nationality} />
              {ownerDetails.companyName && (
                <>
                  <DetailItem icon={Briefcase} label="Company Name" value={ownerDetails.companyName} />
                  <DetailItem label="Company Tax ID" value={ownerDetails.companyTaxId} />
                  <DetailItem label="Company VAT" value={ownerDetails.companyVat} />
                </>
              )}
              {ownerDetails.managerName && (
                <>
                  <DetailItem label="Manager Name" value={ownerDetails.managerName} />
                  <DetailItem label="Manager Email" value={ownerDetails.managerEmail} />
                  <DetailItem label="Manager Phone" value={ownerDetails.managerPhone} />
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic text-center py-4">
              Owner details not completed
            </p>
          )}
        </SectionWrapper>

        {/* Contractual Details */}
        <SectionWrapper 
          title="Contractual Details" 
          icon={FileText}
          isComplete={isContractualComplete}
          stepNumber={3}
        >
          {isContractualComplete ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DetailItem icon={Calendar} label="Contract Start" value={
                contractual.contractStartDate ? new Date(contractual.contractStartDate).toLocaleDateString() : null
              } />
              <DetailItem icon={Calendar} label="Contract End" value={
                contractual.contractEndDate ? new Date(contractual.contractEndDate).toLocaleDateString() : null
              } />
              <DetailItem label="Contract Type" value={contractual.contractType} />
              <DetailItem icon={Percent} label="Commission Rate" value={
                contractual.commissionRate ? `${contractual.commissionRate}%` : null
              } />
              <DetailItem icon={Percent} label="Management Fee" value={
                contractual.managementFee ? `${contractual.managementFee}%` : null
              } />
              <DetailItem icon={Percent} label="Marketing Fee" value={
                contractual.marketingFee ? `${contractual.marketingFee}%` : null
              } />
              <DetailItem label="Payment Schedule" value={contractual.paymentSchedule} />
              <DetailItem label="Payout Day 1" value={contractual.payoutDay1} />
              <DetailItem label="Payout Day 2" value={contractual.payoutDay2} />
              <DetailItem icon={Clock} label="Check-in Time" value={contractual.checkInTime} />
              <DetailItem icon={Clock} label="Check-out Time" value={contractual.checkOutTime} />
              <DetailItem label="Cancellation Policy" value={contractual.cancellationPolicy} />
              {contractual.insuranceProvider && (
                <>
                  <DetailItem icon={Shield} label="Insurance Provider" value={contractual.insuranceProvider} />
                  <DetailItem label="Policy Number" value={contractual.insurancePolicyNumber} />
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic text-center py-4">
              Contractual details not completed
            </p>
          )}
        </SectionWrapper>

        {/* Bank Details */}
        <SectionWrapper 
          title="Bank Details" 
          icon={CreditCard}
          isComplete={isBankDetailsComplete}
          stepNumber={4}
        >
          {isBankDetailsComplete ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DetailItem label="Account Holder" value={bankDetails.accountHolderName} />
              <DetailItem label="Bank Name" value={bankDetails.bankName} />
              <DetailItem label="Account Number" value={
                bankDetails.accountNumber ? `****${bankDetails.accountNumber.slice(-4)}` : null
              } />
              <DetailItem label="SWIFT Code" value={bankDetails.swiftCode} />
              <DetailItem label="IBAN" value={bankDetails.iban} />
              <DetailItem label="Currency" value={bankDetails.currency} />
              <DetailItem label="Branch Name" value={bankDetails.branchName} />
              <DetailItem label="Bank Country" value={bankDetails.bankCountry} />
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic text-center py-4">
              Bank details not completed
            </p>
          )}
        </SectionWrapper>

        {/* OTA Credentials */}
        <SectionWrapper 
          title="OTA Platform Connections" 
          icon={Globe}
          isComplete={isOtaComplete}
          stepNumber={5}
        >
          {isOtaComplete ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(otaCredentials).map(([platform, data]: [string, any]) => (
                data?.listed && (
                  <div key={platform} className="flex items-center gap-2 p-2 bg-white/40 rounded-lg">
                    <div className="w-2 h-2 bg-teal-500 rounded-full" />
                    <span className="text-sm font-medium capitalize">
                      {platform.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                )
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic text-center py-4">
              No OTA platforms configured
            </p>
          )}
        </SectionWrapper>

        {/* Documents */}
        <SectionWrapper 
          title="Documents" 
          icon={FileText}
          isComplete={isDocumentsComplete}
          stepNumber={6}
        >
          {isDocumentsComplete ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                {documents.length} document(s) uploaded
              </p>
              <div className="flex flex-wrap gap-2">
                {documents.slice(0, 5).map((doc: any, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-white/40 text-xs rounded-full">
                    {doc.documentType || doc.name || `Document ${idx + 1}`}
                  </span>
                ))}
                {documents.length > 5 && (
                  <span className="px-3 py-1 bg-white/40 text-xs rounded-full">
                    +{documents.length - 5} more
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic text-center py-4">
              No documents uploaded
            </p>
          )}
        </SectionWrapper>

        {/* Staff Configuration */}
        <SectionWrapper 
          title="Staff Configuration" 
          icon={Users}
          isComplete={isStaffComplete}
          stepNumber={7}
        >
          {isStaffComplete ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {staff.map((member: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white/30 rounded-lg">
                  <div className="w-10 h-10 bg-slate-200/50 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{member.position}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic text-center py-4">
              No staff configured
            </p>
          )}
        </SectionWrapper>

        {/* Facilities */}
        <SectionWrapper 
          title="Facilities Checklist" 
          icon={ClipboardList}
          isComplete={isFacilitiesComplete}
          stepNumber={8}
        >
          {isFacilitiesComplete ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                Facilities configured across multiple categories
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(facilities).slice(0, 6).map(([category, items]: [string, any]) => (
                  <div key={category} className="px-3 py-2 bg-white/30 rounded-lg">
                    <p className="text-xs font-medium text-slate-700">{category}</p>
                    <p className="text-xs text-slate-500">
                      {Array.isArray(items) ? items.length : Object.keys(items).length} items
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic text-center py-4">
              Facilities not configured
            </p>
          )}
        </SectionWrapper>

        {/* Photos */}
        <SectionWrapper 
          title="Photo Gallery" 
          icon={Camera}
          isComplete={isPhotosComplete}
          stepNumber={9}
        >
          {isPhotosComplete ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                {photos.length} photo(s) uploaded
              </p>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {photos.slice(0, 12).map((photo: any, idx: number) => (
                  <div key={idx} className="aspect-square bg-slate-200/50 rounded-lg overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-slate-300/50 to-slate-400/50" />
                  </div>
                ))}
                {photos.length > 12 && (
                  <div className="aspect-square bg-white/40 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-medium text-slate-600">
                      +{photos.length - 12}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic text-center py-4">
              Less than 3 photos uploaded (minimum required: 3)
            </p>
          )}
        </SectionWrapper>
      </div>

      {/* Final Summary */}
      <div className="mt-8 glass-card-white-teal p-6">
        <div className="text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-teal-600 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-800">
            Review Complete
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            You've successfully reviewed all your villa information. The data has been automatically saved 
            and is ready for the next steps in your onboarding process.
          </p>
          <div className="text-xs text-slate-500 mt-4">
            <p>Progress: {completedSteps} of {totalSteps} sections completed</p>
            <p>Overall completion: {progressPercentage}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}));

ReviewSubmitStepEnhanced.displayName = 'ReviewSubmitStepEnhanced';

export default ReviewSubmitStepEnhanced;