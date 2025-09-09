"use client";

import React, { useState, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { FileText, Calendar, Shield, AlertCircle, CalendarDays, Clock } from 'lucide-react';
import { StepHandle } from './types';

interface ContractualDetailsStepProps {
  data: any;
  onUpdate: (stepData: any) => void;
}

interface PayoutDateConfiguratorProps {
  payoutDay1: string;
  payoutDay2: string;
  onChange: (day1: string, day2: string) => void;
  error?: string;
}

const PayoutDateConfigurator: React.FC<PayoutDateConfiguratorProps> = ({
  payoutDay1,
  payoutDay2,
  onChange,
  error
}) => {
  const dayOptions = Array.from({ length: 31 }, (_, i) => ({
    value: (i + 1).toString(),
    label: (i + 1).toString()
  }));

  const handleDay1Change = (value: string) => {
    if (value === payoutDay2) {
      // If selecting same day as day2, clear day2
      onChange(value, '');
    } else {
      onChange(value, payoutDay2);
    }
  };

  const handleDay2Change = (value: string) => {
    if (value === payoutDay1) {
      // If selecting same day as day1, clear day1
      onChange('', value);
    } else {
      onChange(payoutDay1, value);
    }
  };

  // Generate preview of upcoming payout dates
  const getUpcomingPayouts = useMemo(() => {
    if (!payoutDay1 && !payoutDay2) return [];
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const upcomingPayouts = [];

    // Generate next 6 months of payouts
    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      const targetMonth = new Date(currentYear, currentMonth + monthOffset, 1);
      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth();
      
      if (payoutDay1) {
        const day1 = parseInt(payoutDay1);
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const payoutDate1 = new Date(year, month, Math.min(day1, lastDayOfMonth));
        upcomingPayouts.push(payoutDate1);
      }
      
      if (payoutDay2) {
        const day2 = parseInt(payoutDay2);
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const payoutDate2 = new Date(year, month, Math.min(day2, lastDayOfMonth));
        upcomingPayouts.push(payoutDate2);
      }
    }

    return upcomingPayouts
      .filter(date => date >= today)
      .sort((a, b) => a.getTime() - b.getTime())
      .slice(0, 6);
  }, [payoutDay1, payoutDay2]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            First Payout Day of Month
          </label>
          <select
            value={payoutDay1}
            onChange={(e) => handleDay1Change(e.target.value)}
            className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
              error ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
            }`}
          >
            <option value="">Select day...</option>
            {dayOptions.map(option => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.value === payoutDay2}
              >
                Day {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Second Payout Day of Month
          </label>
          <select
            value={payoutDay2}
            onChange={(e) => handleDay2Change(e.target.value)}
            className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
              error ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
            }`}
          >
            <option value="">Select day...</option>
            {dayOptions.map(option => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.value === payoutDay1}
              >
                Day {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Validation Notice */}
      {payoutDay1 && payoutDay2 && (
        <div className="flex items-start space-x-2 p-3 bg-green-50/60 backdrop-filter backdrop-blur-10 border border-green-200/40 rounded-lg">
          <CalendarDays className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-700">
            <p className="font-medium">Payout schedule configured:</p>
            <p>Monthly payouts on the {payoutDay1}{getOrdinalSuffix(payoutDay1)} and {payoutDay2}{getOrdinalSuffix(payoutDay2)} of each month</p>
          </div>
        </div>
      )}

      {/* Preview of upcoming payouts */}
      {getUpcomingPayouts.length > 0 && (
        <div className="bg-slate-50/60 backdrop-filter backdrop-blur-10 border border-slate-200/40 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Upcoming Payout Dates
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {getUpcomingPayouts.map((date, index) => (
              <div key={index} className="text-xs text-slate-600 bg-white/50 rounded px-2 py-1">
                {date.toLocaleDateString('en-US', { 
                  weekday: 'short',
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helper text */}
      <div className="text-xs text-slate-500">
        <p>• Configure up to 2 payout dates per month</p>
        <p>• For months with fewer days, payouts will be adjusted to the last day of the month</p>
        <p>• Both dates must be different</p>
      </div>
    </div>
  );
};

// Helper function for ordinal suffixes
const getOrdinalSuffix = (day: string) => {
  const num = parseInt(day);
  if (num >= 11 && num <= 13) return 'th';
  const lastDigit = num % 10;
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

const defaultFormData = {
  // Contract Dates (maps to contractStartDate and contractEndDate in DB)
  contractSignatureDate: '',     // Maps to contractStartDate
  contractRenewalDate: '',       // Maps to contractEndDate
  contractType: 'EXCLUSIVE',     // Maps to contractType enum
  
  // Financial Terms
  serviceCharge: '',             // Maps to commissionRate in DB
  managementFee: '',             // Direct mapping  
  marketingFee: '',              // Direct mapping
  
  // Payment Configuration
  paymentTerms: '',              // Direct mapping
  paymentSchedule: 'MONTHLY',    // Maps to paymentSchedule enum
  minimumStayNights: 1,          // Direct mapping
  payoutDay1: '',                // Direct mapping
  payoutDay2: '',                // Direct mapping
  
  // VAT & Tax Information
  vatRegistrationNumber: '',     // Direct mapping
  dbdNumber: '',                 // Direct mapping  
  vatPaymentTerms: '',           // Direct mapping
  paymentThroughIPL: false,      // Direct mapping
  
  // Guest Policies
  cancellationPolicy: 'MODERATE', // Maps to cancellationPolicy enum
  checkInTime: '15:00',          // Direct mapping
  checkOutTime: '11:00',         // Direct mapping
  
  // Insurance Information
  insuranceProvider: '',         // Direct mapping
  insurancePolicyNumber: '',     // Direct mapping
  insuranceExpiry: '',           // Maps to DateTime in DB
  
  // Additional Terms
  specialTerms: '',              // Direct mapping
};

const ContractualDetailsStep = forwardRef<StepHandle, ContractualDetailsStepProps>((
  { data, onUpdate },
  ref
) => {
  console.log('🏢 ContractualDetailsStep - Received data from parent:', data);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localFormData, setLocalFormData] = useState(() => {
    const initialData = { ...defaultFormData, ...data };
    console.log('🏢 ContractualDetailsStep - Initial local form data:', initialData);
    return initialData;
  });
  
  // Memoize form data to prevent unnecessary recalculations
  const formData = useMemo(() => {
    const merged = { ...defaultFormData, ...data, ...localFormData };
    
    // Convert null values and objects to appropriate types
    const cleanedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(merged)) {
      if (value === null || value === undefined) {
        // Set appropriate defaults based on field type
        if (key === 'minimumStayNights') {
          cleanedData[key] = 1;
        } else if (key === 'paymentThroughIPL') {
          cleanedData[key] = false;
        } else if (key === 'contractType') {
          cleanedData[key] = 'EXCLUSIVE';
        } else if (key === 'paymentSchedule') {
          cleanedData[key] = 'MONTHLY';
        } else if (key === 'cancellationPolicy') {
          cleanedData[key] = 'MODERATE';
        } else if (key === 'checkInTime') {
          cleanedData[key] = '15:00';
        } else if (key === 'checkOutTime') {
          cleanedData[key] = '11:00';
        } else {
          cleanedData[key] = '';
        }
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        cleanedData[key] = '';
      } else {
        cleanedData[key] = value;
      }
    }
    
    console.log('🏢 ContractualDetailsStep - Memoized form data:', cleanedData);
    return cleanedData;
  }, [data, localFormData]);

  // Debounced update to parent component
  const debouncedUpdate = useDebouncedCallback((newData: any) => {
    console.log('🏢 ContractualDetailsStep - Debounced update to parent:', newData);
    onUpdate(newData);
  }, 1000);

  const handleInputChange = useCallback((field: string, value: string | number | boolean) => {
    console.log(`🏢 ContractualDetailsStep - Input change: ${field} = "${value}" (type: ${typeof value})`);
    
    const newFormData = {
      ...formData,
      [field]: value,
    };
    
    console.log('🏢 ContractualDetailsStep - New form data after input change:', {
      field,
      value,
      totalFields: Object.keys(newFormData).length,
      nonEmptyFields: Object.values(newFormData).filter(v => v !== '' && v !== null && v !== undefined).length,
      newFormData
    });
    
    // Immediate local state update for UI responsiveness
    setLocalFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
    
    console.log('🏢 ContractualDetailsStep - Updated local form data:', {
      field,
      previousValue: formData[field],
      newValue: value,
      totalLocalFields: Object.keys(newFormData).length,
      nonEmptyLocalFields: Object.values(newFormData).filter(v => v !== '' && v !== null && v !== undefined).length
    });
    
    // Trigger debounced update to parent
    debouncedUpdate(newFormData);
    
    // Clear field errors
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [formData, errors, debouncedUpdate]);

  const handlePayoutDatesChange = useCallback((day1: string, day2: string) => {
    console.log(`🏢 ContractualDetailsStep - Payout dates change: day1="${day1}", day2="${day2}"`);
    
    const newFormData = {
      ...formData,
      payoutDay1: day1,
      payoutDay2: day2
    };
    
    // Immediate local state update
    setLocalFormData((prev: any) => ({
      ...prev,
      payoutDay1: day1,
      payoutDay2: day2,
    }));
    
    // Trigger debounced update to parent
    debouncedUpdate(newFormData);
    
    // Clear any related errors
    if (errors.payoutDay1 || errors.payoutDay2) {
      setErrors(prev => ({
        ...prev,
        payoutDay1: '',
        payoutDay2: ''
      }));
    }
  }, [formData, errors, debouncedUpdate]);

  const validateForm = () => {
    // Disable validation for development - always return true
    return true;
  };

  useImperativeHandle(ref, () => ({
    validate: validateForm,
    getData: () => ({
      ...formData,
      serviceCharge: parseFloat(formData.serviceCharge) || 0,
    }),
  }));

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#009990]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-[#009990]" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Contractual Details</h2>
        <p className="text-slate-600">Legal agreements and contract information</p>
        <div className="flex items-center justify-center mt-4 p-3 glass-card-white-teal">
          <Shield className="w-5 h-5 text-[#009990] mr-2" />
          <span className="text-slate-700 text-sm">All contract documents are stored securely</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Contract Dates Section */}
        <div className="glass-card-white-teal rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-slate-700" />
            Contract Dates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contract Signature Date
              </label>
              <input
                type="date"
                value={formData.contractSignatureDate}
                onChange={(e) => handleInputChange('contractSignatureDate', e.target.value)}
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                  errors.contractSignatureDate ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.contractSignatureDate && (
                <p className="text-red-400 text-sm mt-1">{errors.contractSignatureDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contract Renewal Date
              </label>
              <input
                type="date"
                value={formData.contractRenewalDate}
                onChange={(e) => handleInputChange('contractRenewalDate', e.target.value)}
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                  errors.contractRenewalDate ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.contractRenewalDate && (
                <p className="text-red-400 text-sm mt-1">{errors.contractRenewalDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contract Type
              </label>
              <select
                value={formData.contractType}
                onChange={(e) => handleInputChange('contractType', e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
              >
                <option value="EXCLUSIVE">Exclusive</option>
                <option value="NON_EXCLUSIVE">Non-Exclusive</option>
                <option value="SEASONAL">Seasonal</option>
                <option value="LONG_TERM">Long-term</option>
              </select>
            </div>

          </div>
        </div>

        {/* Payout Date Configurator Section */}
        <div className="glass-card-white-teal rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <CalendarDays className="w-5 h-5 mr-2 text-slate-700" />
            Monthly Payout Schedule
          </h3>
          <PayoutDateConfigurator
            payoutDay1={formData.payoutDay1}
            payoutDay2={formData.payoutDay2}
            onChange={handlePayoutDatesChange}
            error={errors.payoutDay1 || errors.payoutDay2}
          />
        </div>

        {/* Registration Numbers Section */}
        <div className="glass-card-white-teal rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Registration Numbers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                VAT Registration Number
              </label>
              <input
                type="text"
                value={formData.vatRegistrationNumber}
                onChange={(e) => handleInputChange('vatRegistrationNumber', e.target.value)}
                placeholder="VAT registration number (optional)"
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                DBD Number
              </label>
              <input
                type="text"
                value={formData.dbdNumber}
                onChange={(e) => handleInputChange('dbdNumber', e.target.value)}
                placeholder="Department of Business Development number (optional)"
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Financial Terms Section */}
        <div className="glass-card-white-teal rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Financial Terms</h3>
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Service Charge (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.serviceCharge}
                  onChange={(e) => handleInputChange('serviceCharge', e.target.value)}
                  placeholder="e.g. 15.5"
                  className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                    errors.serviceCharge ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                  }`}
                />
                {errors.serviceCharge && (
                  <p className="text-red-400 text-sm mt-1">{errors.serviceCharge}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Management Fee (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.managementFee}
                  onChange={(e) => handleInputChange('managementFee', e.target.value)}
                  placeholder="e.g. 5.0"
                  className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Marketing Fee (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.marketingFee}
                  onChange={(e) => handleInputChange('marketingFee', e.target.value)}
                  placeholder="e.g. 3.0"
                  className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Schedule
                </label>
                <select
                  value={formData.paymentSchedule}
                  onChange={(e) => handleInputChange('paymentSchedule', e.target.value)}
                  className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Minimum Stay (nights)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.minimumStayNights || ''}
                  onChange={(e) => handleInputChange('minimumStayNights', parseInt(e.target.value) || '')}
                  placeholder="1"
                  className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paymentThroughIPL}
                    onChange={(e) => handleInputChange('paymentThroughIPL', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.paymentThroughIPL ? 'bg-teal-600' : 'bg-slate-400'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      formData.paymentThroughIPL ? 'translate-x-6' : 'translate-x-0'
                    }`}></div>
                  </div>
                  <span className="ml-3 text-sm text-slate-700">
                    Payment Through IPL
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment Terms *
              </label>
              <textarea
                value={formData.paymentTerms}
                onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                placeholder="Describe payment terms and conditions"
                rows={4}
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 resize-none ${
                  errors.paymentTerms ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.paymentTerms && (
                <p className="text-red-400 text-sm mt-1">{errors.paymentTerms}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                VAT Payment Terms
              </label>
              <textarea
                value={formData.vatPaymentTerms}
                onChange={(e) => handleInputChange('vatPaymentTerms', e.target.value)}
                placeholder="VAT payment terms (optional)"
                rows={3}
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Guest Policies Section */}
        <div className="glass-card-white-teal rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Guest Policies</h3>
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cancellation Policy
                </label>
                <select
                  value={formData.cancellationPolicy}
                  onChange={(e) => handleInputChange('cancellationPolicy', e.target.value)}
                  className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                >
                  <option value="FLEXIBLE">Flexible</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="STRICT">Strict</option>
                  <option value="SUPER_STRICT_30">Super Strict 30</option>
                  <option value="SUPER_STRICT_60">Super Strict 60</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Check-in Time
                </label>
                <input
                  type="time"
                  value={formData.checkInTime}
                  onChange={(e) => handleInputChange('checkInTime', e.target.value)}
                  className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Check-out Time
                </label>
                <input
                  type="time"
                  value={formData.checkOutTime}
                  onChange={(e) => handleInputChange('checkOutTime', e.target.value)}
                  className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Insurance Section */}
        <div className="glass-card-white-teal rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-slate-700" />
            Insurance Information
          </h3>
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  value={formData.insuranceProvider}
                  onChange={(e) => handleInputChange('insuranceProvider', e.target.value)}
                  placeholder="Insurance company name"
                  className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Policy Number
                </label>
                <input
                  type="text"
                  value={formData.insurancePolicyNumber}
                  onChange={(e) => handleInputChange('insurancePolicyNumber', e.target.value)}
                  placeholder="Policy number"
                  className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Insurance Expiry Date
              </label>
              <input
                type="date"
                value={formData.insuranceExpiry}
                onChange={(e) => handleInputChange('insuranceExpiry', e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Special Terms Section */}
        <div className="glass-card-white-teal rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-slate-700" />
            Special Terms & Conditions
          </h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Special Terms
            </label>
            <textarea
              value={formData.specialTerms}
              onChange={(e) => handleInputChange('specialTerms', e.target.value)}
              placeholder="Any special terms, conditions, or notes for this contract..."
              rows={5}
              className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 resize-none"
            />
          </div>
        </div>

        {/* Information Box */}
        <div className="glass-card-white-teal p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-[#009990] mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-700">
              <p className="font-medium mb-2">Important Contract Information</p>
              <ul className="space-y-1 text-slate-600">
                <li>• All contract documents are stored securely in SharePoint</li>
                <li>• Contract dates are used for automatic renewal reminders</li>
                <li>• Service charges are calculated based on booking revenue</li>
                <li>• Payment terms define the payout schedule and conditions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ContractualDetailsStep;
