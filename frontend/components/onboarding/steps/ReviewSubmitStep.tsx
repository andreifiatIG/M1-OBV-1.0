"use client";

import React, { useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { CheckCircle, Loader2, XCircle, Check, X, Building2, FileText, Folder, Camera, Users, ClipboardList, Globe } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { clientApi } from '@/lib/api-client';
import { StepHandle } from './types';

// Memoized Helper Components for better performance
const DetailItem = React.memo(({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <span className="font-semibold text-slate-600">{label}:</span>
    <span className="text-slate-800 ml-2">{value || 'Not specified'}</span>
  </div>
));
DetailItem.displayName = 'DetailItem';

const StageWrapper = React.memo(({ title, isComplete, children }: { title: string; isComplete: boolean; children: React.ReactNode }) => (
  <div className={`pl-8 relative border-l-2 ${isComplete ? 'border-teal-500' : 'border-slate-300'}`}>
    <div className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full flex items-center justify-center ${isComplete ? 'bg-teal-500' : 'bg-slate-300'}`}>
      {isComplete ? <Check className="w-4 h-4 text-white" /> : <div className="w-2 h-2 bg-slate-400 rounded-full"></div>}
    </div>
    <div className="mb-8 -mt-1">
      <h4 className={`font-semibold mb-3 text-lg ${isComplete ? 'text-slate-800' : 'text-slate-500'}`}>{title}</h4>
      <div className="glass-card-white-teal p-4 rounded-lg">
        {children}
      </div>
    </div>
  </div>
));
StageWrapper.displayName = 'StageWrapper';

const NotCompletedMessage = React.memo(({ message }: { message: string }) => (
  <div className="text-sm text-slate-500 italic py-4 text-center">{message}</div>
));
NotCompletedMessage.displayName = 'NotCompletedMessage';

interface DocumentItem {
  fileName?: string;
  documentType?: string;
  fileUrl?: string;
  name?: string;
  files?: Array<{
    id: string;
    name: string;
    file: File;
    uploaded: boolean;
    sharePointUrl?: string;
    uploadedAt?: number;
  }>;
}

interface PhotoItem {
  fileName: string;
  category: string;
  fileUrl: string;
}

interface StaffItem {
  name?: string;
  role?: string;
  fullName?: string;
  position?: string;
}

interface FacilityCategory {
  name: string;
  completed: number;
  total: number;
  items: { [key: string]: boolean };
}

interface ReviewSubmitStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

const ReviewSubmitStep = React.memo(forwardRef<StepHandle, ReviewSubmitStepProps>((
  { data, onUpdate },
  ref
) => {
  const { user } = useUser();
  const [isChecked, setIsChecked] = useState(false);
  
  // Memoize data extraction and processing for better performance
  const processedData = useMemo(() => {
    const villaInfo = data.step1 || {};
    const ownerDetails = data.step2 || {};
    const contractual = data.step3 || {};
    const bankDetails = data.step4 || {};
    const otaCredentials = data.step5 || {};
    const documents: any[] = Array.isArray(data.step6) ? data.step6 : [];
    const staff: StaffItem[] = Array.isArray(data.step7) ? data.step7 : [];
    const photos: PhotoItem[] = data.step9?.photos || [];
    
    let facilities: FacilityCategory[] = [];
    if (data.step8 && Array.isArray(data.step8)) {
      const facilitiesByCategory: Record<string, any[]> = {};
      data.step8.forEach((facility: any) => {
        if (!facilitiesByCategory[facility.category]) {
          facilitiesByCategory[facility.category] = [];
        }
        facilitiesByCategory[facility.category].push(facility);
      });
      
      facilities = Object.entries(facilitiesByCategory).map(([categoryId, items]) => ({
        name: categoryId,
        completed: items.filter((item: any) => item.available).length,
        total: items.length,
        items: items.reduce((acc: any, item: any) => {
          acc[item.itemName] = item;
          return acc;
        }, {})
      }));
    }
    
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
  
  // Memoize completion checks
  const completionStatus = useMemo(() => {
    const { villaInfo, ownerDetails, contractual, bankDetails, otaCredentials, documents, staff, facilities, photos } = processedData;
    
    const isVillaInfoComplete = !!villaInfo.villaName && !!villaInfo.villaAddress && !!villaInfo.bedrooms && !!villaInfo.bathrooms;
    const isOwnerDetailsComplete = !!ownerDetails.firstName && !!ownerDetails.lastName && !!ownerDetails.email && !!ownerDetails.phone;
    const isContractualComplete = !!contractual.contractStartDate || !!contractual.commissionRate !== undefined;
    const isBankDetailsComplete = !!bankDetails.bankName && (!!bankDetails.accountNumber || !!bankDetails.accountHolderName);
    const isOtaComplete = Object.values(otaCredentials).some(val => val === true) || Object.keys(otaCredentials).length > 0;
    const isDocumentsComplete = documents.length > 0;
    const isStaffComplete = staff.length > 0;
    const isFacilitiesComplete = facilities.length > 0;
    const isPhotosComplete = photos.length > 0;
    
    const allSteps = [
      isVillaInfoComplete, isOwnerDetailsComplete, isContractualComplete, 
      isBankDetailsComplete, isOtaComplete, isDocumentsComplete, isStaffComplete, 
      isFacilitiesComplete, isPhotosComplete
    ];
    const isAllStepsComplete = allSteps.every(Boolean);
    
    return {
      isVillaInfoComplete,
      isOwnerDetailsComplete,
      isContractualComplete,
      isBankDetailsComplete,
      isOtaComplete,
      isDocumentsComplete,
      isStaffComplete,
      isFacilitiesComplete,
      isPhotosComplete,
      isAllStepsComplete
    };
  }, [processedData]);

  // Destructure the processed data and completion status for easier access
  const { 
    villaInfo, ownerDetails, contractual, bankDetails, otaCredentials, 
    documents, staff, facilities, photos 
  } = processedData;
  
  const {
    isVillaInfoComplete, isOwnerDetailsComplete, isContractualComplete,
    isBankDetailsComplete, isOtaComplete, isDocumentsComplete,
    isStaffComplete, isFacilitiesComplete, isPhotosComplete
  } = completionStatus;

  const validateForm = useMemo(() => {
    return () => {
      if (!isChecked) {
        alert('You must confirm the information is accurate and agree to the terms before submitting.');
        return false;
      }
      if (!completionStatus.isAllStepsComplete) {
        alert('Please complete all previous steps before submitting.');
        return false;
      }
      return true;
    };
  }, [isChecked, completionStatus.isAllStepsComplete]);
  
  useImperativeHandle(ref, () => ({
    validate: validateForm,
    getData: () => ({ finalConfirmation: true }),
  }), [validateForm]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-teal-100/80 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-teal-200/80">
          <CheckCircle className="w-8 h-8 text-teal-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800">Review & Submit</h2>
        <p className="text-slate-600 mt-2">Final step. Review all information and submit your villa for approval.</p>
      </div>

      <div className="space-y-6">
        <div className="p-6">
          {/* --- TIMELINE START --- */}
          <StageWrapper title="1. Villa Information" isComplete={isVillaInfoComplete}>
            {isVillaInfoComplete ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <DetailItem label="Villa Name" value={villaInfo.villaName} />
                <DetailItem label="Location" value={villaInfo.locationType} />
                <DetailItem label="Address" value={villaInfo.villaAddress} />
                <DetailItem label="City" value={villaInfo.villaCity} />
                <DetailItem label="Country" value={villaInfo.villaCountry} />
                <DetailItem label="Zip Code" value={villaInfo.villaPostalCode} />
                <DetailItem label="Property Type" value={villaInfo.propertyType} />
                <DetailItem label="Villa Style" value={villaInfo.villaStyle} />
                <DetailItem label="Bedrooms" value={villaInfo.bedrooms} />
                <DetailItem label="Bathrooms" value={villaInfo.bathrooms} />
                <DetailItem label="Max Guests" value={villaInfo.maxGuests} />
                <DetailItem label="Villa Area (sqm)" value={villaInfo.villaArea} />
                <DetailItem label="Land Area (sqm)" value={villaInfo.landArea} />
                <DetailItem label="Year Built" value={villaInfo.yearBuilt} />
                <DetailItem label="Renovation Year" value={villaInfo.renovationYear} />
                <DetailItem label="Latitude" value={villaInfo.latitude} />
                <DetailItem label="Longitude" value={villaInfo.longitude} />
                <DetailItem label="Google Maps Link" value={villaInfo.googleMapsLink} />
                <DetailItem label="Old Rates Card Link" value={villaInfo.oldRatesCardLink} />
                <DetailItem label="iCal Calendar Link" value={villaInfo.iCalCalendarLink} />
                <DetailItem label="Description" value={villaInfo.description} />
                <DetailItem label="Short Description" value={villaInfo.shortDescription} />
              </div>
            ) : <NotCompletedMessage message="Villa information not completed." />}
          </StageWrapper>

          <StageWrapper title="2. Owner Details" isComplete={isOwnerDetailsComplete}>
            {isOwnerDetailsComplete ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <DetailItem label="Owner Type" value={ownerDetails.ownerType} />
                <DetailItem label="First Name" value={ownerDetails.firstName} />
                <DetailItem label="Last Name" value={ownerDetails.lastName} />
                <DetailItem label="Email" value={ownerDetails.email} />
                <DetailItem label="Phone" value={ownerDetails.phone} />
                <DetailItem label="Alternative Phone" value={ownerDetails.alternativePhone} />
                <DetailItem label="Nationality" value={ownerDetails.nationality} />
                <DetailItem label="Passport Number" value={ownerDetails.passportNumber} />
                <DetailItem label="ID Number" value={ownerDetails.idNumber} />
                <DetailItem label="Address" value={ownerDetails.address} />
                <DetailItem label="City" value={ownerDetails.city} />
                <DetailItem label="Country" value={ownerDetails.country} />
                <DetailItem label="Zip Code" value={ownerDetails.zipCode} />
                <DetailItem label="Company Name" value={ownerDetails.companyName} />
                <DetailItem label="Company Address" value={ownerDetails.companyAddress} />
                <DetailItem label="Company Tax ID" value={ownerDetails.companyTaxId} />
                <DetailItem label="Company VAT" value={ownerDetails.companyVat} />
                <DetailItem label="Manager Name" value={ownerDetails.managerName} />
                <DetailItem label="Manager Email" value={ownerDetails.managerEmail} />
                <DetailItem label="Manager Phone" value={ownerDetails.managerPhone} />
                <DetailItem label="Property Email" value={ownerDetails.propertyEmail} />
                <DetailItem label="Property Website" value={ownerDetails.propertyWebsite} />
                <DetailItem label="Preferred Language" value={ownerDetails.preferredLanguage} />
                <DetailItem label="Communication Preference" value={ownerDetails.communicationPreference} />  
              </div>
            ) : <NotCompletedMessage message="Owner details not completed." />}
          </StageWrapper>

          <StageWrapper title="3. Contractual Details" isComplete={isContractualComplete}>
             {isContractualComplete ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <DetailItem label="Contract Start Date" value={contractual.contractStartDate ? new Date(contractual.contractStartDate).toLocaleDateString() : 'Not specified'} />
                <DetailItem label="Contract End Date" value={contractual.contractEndDate ? new Date(contractual.contractEndDate).toLocaleDateString() : 'Not specified'} />
                <DetailItem label="Contract Type" value={contractual.contractType} />
                <DetailItem label="Commission Rate (%)" value={contractual.commissionRate !== undefined ? `${contractual.commissionRate}%` : 'Not specified'} />
                <DetailItem label="Management Fee (%)" value={contractual.managementFee !== undefined ? `${contractual.managementFee}%` : 'Not specified'} />
                <DetailItem label="Marketing Fee (%)" value={contractual.marketingFee !== undefined ? `${contractual.marketingFee}%` : 'Not specified'} />
                <DetailItem label="Payment Schedule" value={contractual.paymentSchedule} />
                <DetailItem label="Payout Day 1" value={contractual.payoutDay1} />
                <DetailItem label="Payout Day 2" value={contractual.payoutDay2} />
                <DetailItem label="Minimum Stay Nights" value={contractual.minimumStayNights} />
                <DetailItem label="Cancellation Policy" value={contractual.cancellationPolicy} />
                <DetailItem label="Check-in Time" value={contractual.checkInTime} />
                <DetailItem label="Check-out Time" value={contractual.checkOutTime} />
                <DetailItem label="VAT Registration Number" value={contractual.vatRegistrationNumber} />
                <DetailItem label="DBD Number" value={contractual.dbdNumber} />
                <DetailItem label="Payment through IPL" value={contractual.paymentThroughIPL ? 'Yes' : 'No'} />
                <DetailItem label="Payment Terms" value={contractual.paymentTerms} />
                <DetailItem label="VAT Payment Terms" value={contractual.vatPaymentTerms} />
                <DetailItem label="Insurance Provider" value={contractual.insuranceProvider} />
                <DetailItem label="Insurance Policy Number" value={contractual.insurancePolicyNumber} />
                <DetailItem label="Insurance Expiry" value={contractual.insuranceExpiry ? new Date(contractual.insuranceExpiry).toLocaleDateString() : 'Not specified'} />
                <DetailItem label="Special Terms" value={contractual.specialTerms} />
              </div>
             ) : <NotCompletedMessage message="Contractual details not completed." />}
          </StageWrapper>

          <StageWrapper title="4. Bank Details" isComplete={isBankDetailsComplete}>
            {isBankDetailsComplete ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <DetailItem label="Account Holder Name" value={bankDetails.accountName || bankDetails.accountHolderName} />
                <DetailItem label="Bank Name" value={bankDetails.bankName} />
                <DetailItem label="Account Number" value={bankDetails.bankAccountNumber || bankDetails.accountNumber} />
                <DetailItem label="IBAN" value={bankDetails.iban} />
                <DetailItem label="SWIFT/BIC Code" value={bankDetails.swiftBicCode || bankDetails.swiftCode} />
                <DetailItem label="Branch Name" value={bankDetails.bankBranch || bankDetails.branchName} />
                <DetailItem label="Branch Code" value={bankDetails.branchCode} />
                <DetailItem label="Branch Address" value={bankDetails.bankAddress || bankDetails.branchAddress} />
                <DetailItem label="Bank Country" value={bankDetails.bankCountry} />
                <DetailItem label="Currency" value={bankDetails.currency} />
                <DetailItem label="Account Type" value={bankDetails.accountType} />
                <DetailItem label="Routing Number" value={bankDetails.routingNumber} />
                <DetailItem label="Tax ID" value={bankDetails.taxId} />
                <DetailItem label="Notes" value={bankDetails.bankNotes || bankDetails.notes} />
              </div>
            ) : <NotCompletedMessage message="Bank details not provided." />}
          </StageWrapper>

          <StageWrapper title="5. OTA Credentials" isComplete={isOtaComplete}>
            {isOtaComplete ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {[
                    { key: 'bookingCom', label: 'Booking.com' },
                    { key: 'airbnb', label: 'Airbnb' },
                    { key: 'vrbo', label: 'VRBO' },
                    { key: 'expedia', label: 'Expedia' },
                    { key: 'agoda', label: 'Agoda' },
                    { key: 'hotelsCom', label: 'Hotels.com' },
                    { key: 'tripadvisor', label: 'TripAdvisor' }
                  ].map(({ key, label }) => {
                    const isListed = otaCredentials[`${key}Listed`] === true;
                    const username = otaCredentials[`${key}Username`];
                    const propertyId = otaCredentials[`${key}PropertyId`];
                    const listingUrl = otaCredentials[`${key}ListingUrl`];
                    
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-700 font-medium">{label}:</span>
                          <span className={`font-semibold ${isListed ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isListed ? '✓ Listed' : 'Not Listed'}
                          </span>
                        </div>
                        {isListed && (
                          <div className="pl-4 text-xs text-slate-600">
                            {username && <div>Username: {username}</div>}
                            {propertyId && <div>Property ID: {propertyId}</div>}
                            {listingUrl && <div className="truncate">URL: {listingUrl}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : <NotCompletedMessage message="No OTA credentials provided." />}
          </StageWrapper>

          <StageWrapper title="6. Documents" isComplete={isDocumentsComplete}>
            {isDocumentsComplete ? (
              <div className="space-y-3">
                <DetailItem label="Total Documents Uploaded" value={`${documents.length} document(s)`} />
                <div className="mt-3">
                  <h5 className="font-semibold text-slate-700 mb-2">Document Status:</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { label: "Property Contract", value: "PROPERTY_CONTRACT" },
                      { label: "Insurance Certificate", value: "INSURANCE_CERTIFICATE" },
                      { label: "Property Title", value: "PROPERTY_TITLE" },
                      { label: "Tax Documents", value: "TAX_DOCUMENTS" },
                      { label: "Utility Bills", value: "UTILITY_BILLS" },
                      { label: "Inventory List", value: "INVENTORY_LIST" },
                      { label: "House Rules", value: "HOUSE_RULES" },
                      { label: "Emergency Contacts", value: "EMERGENCY_CONTACTS" },
                      { label: "Staff Contracts", value: "STAFF_CONTRACTS" },
                      { label: "Maintenance Contracts", value: "MAINTENANCE_CONTRACTS" },
                      { label: "Licenses & Permits", value: "LICENSES_PERMITS" },
                      { label: "Floor Plans", value: "FLOOR_PLANS" }
                    ].map((docType) => {
                      const isUploaded = documents.some((doc: any) => 
                        doc.documentType === docType.value
                      );
                      return (
                        <div key={docType.value} className="flex justify-between">
                          <span className="text-slate-600">{docType.label}:</span>
                          <span className={`font-medium ${isUploaded ? 'text-green-600' : 'text-red-600'}`}>
                            {isUploaded ? 'Yes' : 'No'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : <NotCompletedMessage message="No documents uploaded." />}
          </StageWrapper>

          <StageWrapper title="7. Staff Configuration" isComplete={isStaffComplete}>
            {isStaffComplete ? (
              <div className="space-y-3">
                <DetailItem label="Staff Members Added" value={`${staff.length}`} />
                {staff.length > 0 && (
                  <div className="mt-3">
                    <h5 className="font-semibold text-slate-700 mb-2">Staff Details:</h5>
                    <div className="space-y-2 text-sm">
                      {staff.map((member: StaffItem, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-slate-600">{member.fullName || member.name}</span>
                          <span className="font-medium">{member.position || member.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : <NotCompletedMessage message="No staff configured." />}
          </StageWrapper>

          <StageWrapper title="8. Facilities Checklist" isComplete={isFacilitiesComplete}>
            {facilities.length > 0 ? (
              <div className="space-y-3">
                <DetailItem 
                  label="Overall Progress" 
                  value={`${facilities.reduce((acc: number, cat: FacilityCategory) => acc + (cat.completed || 0), 0)} / ${facilities.reduce((acc: number, cat: FacilityCategory) => acc + (cat.total || 0), 0)} items checked`} 
                />
                <div className="mt-3">
                  <h5 className="font-semibold text-slate-700 mb-2">Facilities by Category:</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {facilities.map((category: FacilityCategory) => {
                      // Convert category names to readable format
                      const categoryName = category.name
                        .replace(/_/g, ' ')
                        .toLowerCase()
                        .replace(/\b\w/g, l => l.toUpperCase());
                      return (
                        <div key={category.name} className="flex justify-between">
                          <span className="text-slate-600">{categoryName}:</span>
                          <span className={`font-medium ${category.completed > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {category.completed || 0}/{category.total || 0}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : <NotCompletedMessage message="Facilities checklist not completed." />}
          </StageWrapper>

          <StageWrapper title="9. Photos & Room Configuration" isComplete={isPhotosComplete}>
            {isPhotosComplete ? (
              <div className="space-y-4">
                <DetailItem label="Total Photos Uploaded" value={`${photos.length} image(s)`} />
                
                {/* Bedroom Configuration */}
                {data.step9?.bedrooms && data.step9.bedrooms.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-slate-700 mb-2">Bedroom Configuration:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {data.step9.bedrooms.map((bedroom: any, index: number) => (
                        <div key={bedroom.id || index} className="flex justify-between">
                          <span className="text-slate-600">{bedroom.name || `Bedroom ${index + 1}`}:</span>
                          <span className="font-medium">{bedroom.bedType || 'Not specified'}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2">
                      <span className="text-slate-600 text-sm">Total Bedrooms: </span>
                      <span className="font-medium text-sm">{data.step9.bedrooms.length}</span>
                    </div>
                  </div>
                )}
                
                {/* Photos by Category */}
                {photos.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-slate-700 mb-2">Photos by Category:</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        'LOGO', 'FLOOR_PLAN', 'EXTERIOR_VIEWS', 'INTERIOR_LIVING_SPACES', 'BEDROOMS',
                        'BATHROOMS', 'KITCHEN', 'DINING_AREAS', 'POOL_OUTDOOR_AREAS', 'GARDEN_LANDSCAPING',
                        'AMENITIES_FACILITIES', 'VIEWS_SURROUNDINGS', 'STAFF_AREAS', 'UTILITY_AREAS', 
                        'VIDEOS', 'DRONE_SHOTS', 'ENTERTAINMENT', 'VIRTUAL_TOUR', 'OTHER'
                      ].map(category => {
                        const categoryPhotos = photos.filter((photo: PhotoItem) => photo.category === category);
                        const count = categoryPhotos.length;
                        if (count > 0) {
                          return (
                            <div key={category} className="flex justify-between">
                              <span className="text-slate-600">{category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}:</span>
                              <span className="font-medium">{count} photo{count !== 1 ? 's' : ''}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : <NotCompletedMessage message="No photos uploaded." />}
          </StageWrapper>

          {/* --- TIMELINE END --- */}
        </div>

        {/* Completion Summary */}
        <div className="glass-card-white-teal p-6 mx-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Completion Summary</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">
                {[isVillaInfoComplete, isOwnerDetailsComplete, isContractualComplete, isBankDetailsComplete, isOtaComplete, isDocumentsComplete, isStaffComplete, isFacilitiesComplete, isPhotosComplete].filter(Boolean).length}
              </div>
              <div className="text-sm text-slate-600">Steps Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-600">9</div>
              <div className="text-sm text-slate-600">Total Steps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">
                {Math.round(([isVillaInfoComplete, isOwnerDetailsComplete, isContractualComplete, isBankDetailsComplete, isOtaComplete, isDocumentsComplete, isStaffComplete, isFacilitiesComplete, isPhotosComplete].filter(Boolean).length / 9) * 100)}%
              </div>
              <div className="text-sm text-slate-600">Complete</div>
            </div>
          </div>
          
          {!completionStatus.isAllStepsComplete && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-amber-800 mb-2">Incomplete Steps:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {!isVillaInfoComplete && <li>• Villa Information needs completion</li>}
                {!isOwnerDetailsComplete && <li>• Owner Details need completion</li>}
                {!isContractualComplete && <li>• Contractual Details need completion</li>}
                {!isBankDetailsComplete && <li>• Bank Details need completion</li>}
                {!isOtaComplete && <li>• OTA Credentials need configuration</li>}
                {!isDocumentsComplete && <li>• Documents need to be uploaded</li>}
                {!isStaffComplete && <li>• Staff Configuration needs completion</li>}
                {!isFacilitiesComplete && <li>• Facilities Checklist needs completion</li>}
                {!isPhotosComplete && <li>• Photos need to be uploaded</li>}
              </ul>
            </div>
          )}
        </div>

        <div className="glass-card-white-teal p-6 mx-6">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => setIsChecked(!isChecked)}
              required
              className="mt-1 w-5 h-5 text-teal-600 bg-white/50 border-slate-300 rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-white/80 focus:ring-teal-500 disabled:opacity-50 transition-all"
            />
            <span className="text-sm text-slate-700 select-none">
              I confirm that all information provided is accurate and complete. I understand this action is final and agree to the <strong>Terms and Conditions</strong> of the ILS management system.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}));

ReviewSubmitStep.displayName = 'ReviewSubmitStep';

export default ReviewSubmitStep;
