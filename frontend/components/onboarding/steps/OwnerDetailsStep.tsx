"use client";

import React, { useState, useImperativeHandle, forwardRef, useCallback, useMemo, useRef, useEffect } from 'react';
import { useResponsiveDebouncedCallback } from '@/hooks/useResponsiveDebouncedCallback';
import { AlertCircle, User, Building, ChevronDown, Search } from 'lucide-react';
import { StepHandle } from './types';
import InternationalPhoneInput from './InternationalPhoneInputFixed';
import { getAllCountryNames, getAllNationalities, searchCountries } from '../../../lib/countries';
// import SkipButton from '../SkipButton'; // Temporarily disabled

interface OwnerDetailsStepProps {
  data: any;
  onUpdate: (stepData: any) => void;
}

// Helper function to extract country code and dial code from phone number
const parsePhoneNumber = (phone: string) => {
  if (!phone) return { countryCode: "", dialCode: "" };
  
  // Common dial codes mapping (ordered by length descending to match longer codes first)
  const dialCodeMap: { [key: string]: string } = {
    "+1": "US", "+7": "RU", "+20": "EG", "+27": "ZA", "+30": "GR", "+31": "NL",
    "+32": "BE", "+33": "FR", "+34": "ES", "+36": "HU", "+39": "IT", "+40": "RO",
    "+41": "CH", "+43": "AT", "+44": "GB", "+45": "DK", "+46": "SE", "+47": "NO",
    "+48": "PL", "+49": "DE", "+51": "PE", "+52": "MX", "+53": "CU", "+54": "AR",
    "+55": "BR", "+56": "CL", "+57": "CO", "+58": "VE", "+60": "MY", "+61": "AU",
    "+62": "ID", "+63": "PH", "+64": "NZ", "+65": "SG", "+66": "TH", "+81": "JP",
    "+82": "KR", "+84": "VN", "+86": "CN", "+90": "TR", "+91": "IN", "+92": "PK",
    "+93": "AF", "+94": "LK", "+95": "MM", "+98": "IR", "+212": "MA", "+213": "DZ",
    "+216": "TN", "+218": "LY", "+220": "GM", "+221": "SN", "+222": "MR", "+223": "ML",
    "+224": "GN", "+225": "CI", "+226": "BF", "+227": "NE", "+228": "TG", "+229": "BJ",
    "+230": "MU", "+231": "LR", "+232": "SL", "+233": "GH", "+234": "NG", "+235": "TD",
    "+236": "CF", "+237": "CM", "+238": "CV", "+239": "ST", "+240": "GQ", "+241": "GA",
    "+242": "CG", "+243": "CD", "+244": "AO", "+245": "GW", "+246": "IO", "+247": "AC",
    "+248": "SC", "+249": "SD", "+250": "RW", "+251": "ET", "+252": "SO", "+253": "DJ",
    "+254": "KE", "+255": "TZ", "+256": "UG", "+257": "BI", "+258": "MZ", "+260": "ZM",
    "+261": "MG", "+262": "RE", "+263": "ZW", "+264": "NA", "+265": "MW", "+266": "LS",
    "+267": "BW", "+268": "SZ", "+269": "KM", "+290": "SH", "+291": "ER", "+297": "AW",
    "+298": "FO", "+299": "GL", "+350": "GI", "+351": "PT", "+352": "LU", "+353": "IE",
    "+354": "IS", "+355": "AL", "+356": "MT", "+357": "CY", "+358": "FI", "+359": "BG",
    "+370": "LT", "+371": "LV", "+372": "EE", "+373": "MD", "+374": "AM", "+375": "BY",
    "+376": "AD", "+377": "MC", "+378": "SM", "+380": "UA", "+381": "RS", "+382": "ME",
    "+383": "XK", "+385": "HR", "+386": "SI", "+387": "BA", "+389": "MK", "+420": "CZ",
    "+421": "SK", "+423": "LI", "+500": "FK", "+501": "BZ", "+502": "GT", "+503": "SV",
    "+504": "HN", "+505": "NI", "+506": "CR", "+507": "PA", "+508": "PM", "+509": "HT",
    "+590": "GP", "+591": "BO", "+592": "GY", "+593": "EC", "+594": "GF", "+595": "PY",
    "+596": "MQ", "+597": "SR", "+598": "UY", "+599": "CW", "+670": "TL", "+672": "NF",
    "+673": "BN", "+674": "NR", "+675": "PG", "+676": "TO", "+677": "SB", "+678": "VU",
    "+679": "FJ", "+680": "PW", "+681": "WF", "+682": "CK", "+683": "NU", "+684": "AS",
    "+685": "WS", "+686": "KI", "+687": "NC", "+688": "TV", "+689": "PF", "+690": "TK",
    "+691": "FM", "+692": "MH", "+850": "KP", "+852": "HK", "+853": "MO", "+855": "KH",
    "+856": "LA", "+880": "BD", "+886": "TW", "+960": "MV", "+961": "LB", "+962": "JO",
    "+963": "SY", "+964": "IQ", "+965": "KW", "+966": "SA", "+967": "YE", "+968": "OM",
    "+970": "PS", "+971": "AE", "+972": "IL", "+973": "BH", "+974": "QA", "+975": "BT",
    "+976": "MN", "+977": "NP", "+992": "TJ", "+993": "TM", "+994": "AZ", "+995": "GE",
    "+996": "KG", "+998": "UZ"
  };
  
  // Sort dial codes by length (descending) to match longer codes first
  const sortedDialCodes = Object.keys(dialCodeMap).sort((a, b) => b.length - a.length);
  
  // Try to extract dial code from the beginning of the phone number
  for (const dialCode of sortedDialCodes) {
    if (phone.startsWith(dialCode)) {
      return { countryCode: dialCodeMap[dialCode], dialCode };
    }
  }
  
  // Default if no match found
  return { countryCode: "", dialCode: "" };
};

const defaultFormData = {
  // Owner type (maps to DB ownerType enum)
  ownerType: "INDIVIDUAL", // Changed from registeredOwnerType
  
  // Company fields (maps to DB company* fields)
  companyName: "", // Changed from villaCompanyName
  companyAddress: "", // Changed from villaCompanyAddress
  companyTaxId: "", // Changed from villaCompanyTaxId
  companyVat: "", // Changed from villaCompanyVat
  
  // Owner personal info (maps to DB firstName, lastName, etc)
  firstName: "", // Split from ownerFullName
  lastName: "", // Split from ownerFullName
  email: "", // Changed from ownerEmail
  phone: "", // Changed from ownerPhone
  phoneCountryCode: "US", // Changed from ownerPhoneCountryCode
  phoneDialCode: "+1", // Changed from ownerPhoneDialCode
  alternativePhone: "", // NEW - missing from frontend
  alternativePhoneCountryCode: "US", // NEW - missing from frontend
  alternativePhoneDialCode: "+1", // NEW - missing from frontend
  
  // Owner location (maps to DB address, city, country, etc)
  address: "", // Changed from ownerAddress
  city: "", // Changed from ownerCity
  country: "", // Changed from ownerCountry
  zipCode: "", // NEW - missing from frontend
  nationality: "", // NEW - missing from frontend
  
  // Owner documents (NEW - missing from frontend)
  passportNumber: "", // NEW
  idNumber: "", // NEW
  
  // Communication preferences (NEW - missing from frontend)
  preferredLanguage: "en", // NEW
  communicationPreference: "EMAIL", // NEW
  notes: "", // NEW
  
  // Manager info (maps to DB manager* fields)
  managerName: "", // Changed from villaManagerFullName
  managerEmail: "", // Changed from villaManagerEmail
  managerPhone: "", // Changed from villaManagerPhone
  managerPhoneCountryCode: "US", // Changed from villaManagerPhoneCountryCode
  managerPhoneDialCode: "+1", // Changed from villaManagerPhoneDialCode
  
};

const OwnerDetailsStep = React.memo(forwardRef<StepHandle, OwnerDetailsStepProps>((
  { data, onUpdate },
  ref
) => {
  console.log('[OWNER] OwnerDetailsStep - Received data from parent:', data);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  const [nationalitySearchOpen, setNationalitySearchOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [nationalitySearchQuery, setNationalitySearchQuery] = useState('');
  
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const nationalityDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountrySearchOpen(false);
        setCountrySearchQuery('');
      }
      if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target as Node)) {
        setNationalitySearchOpen(false);
        setNationalitySearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation for dropdowns
  const handleKeyDown = (event: React.KeyboardEvent, isCountryDropdown: boolean) => {
    if (event.key === 'Escape') {
      if (isCountryDropdown) {
        setCountrySearchOpen(false);
        setCountrySearchQuery('');
      } else {
        setNationalitySearchOpen(false);
        setNationalitySearchQuery('');
      }
    }
  };

  // Filter countries based on search query
  const filteredCountries = countrySearchQuery.trim() 
    ? searchCountries(countrySearchQuery).map(c => c.name)
    : getAllCountryNames();

  // Filter nationalities based on search query
  const filteredNationalities = nationalitySearchQuery.trim()
    ? getAllNationalities().filter(nationality => 
        nationality.toLowerCase().includes(nationalitySearchQuery.toLowerCase())
      )
    : getAllNationalities();
  const [localFormData, setLocalFormData] = useState(() => {
    // Parse phone numbers if they exist in the data to extract country and dial codes
    let processedData = { ...data };
    
    // Process main phone number
    if (data?.phone && !data?.phoneCountryCode) {
      const parsed = parsePhoneNumber(data.phone);
      if (parsed.countryCode) {
        processedData.phoneCountryCode = parsed.countryCode;
        processedData.phoneDialCode = parsed.dialCode;
      }
    }
    
    // Process alternative phone number
    if (data?.alternativePhone && !data?.alternativePhoneCountryCode) {
      const parsed = parsePhoneNumber(data.alternativePhone);
      if (parsed.countryCode) {
        processedData.alternativePhoneCountryCode = parsed.countryCode;
        processedData.alternativePhoneDialCode = parsed.dialCode;
      }
    }
    
    // Process manager phone number
    if (data?.managerPhone && !data?.managerPhoneCountryCode) {
      const parsed = parsePhoneNumber(data.managerPhone);
      if (parsed.countryCode) {
        processedData.managerPhoneCountryCode = parsed.countryCode;
        processedData.managerPhoneDialCode = parsed.dialCode;
      }
    }
    
    const initialData = { ...defaultFormData, ...processedData };
    console.log('[OWNER] OwnerDetailsStep - Initial local form data:', initialData);
    return initialData;
  });
  
  // Memoize form data to prevent unnecessary recalculations
  const formData = useMemo(() => {
    const merged = { ...defaultFormData, ...data, ...localFormData };
    
    // Convert null values and objects to empty strings to prevent React warnings
    const cleanedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(merged)) {
      if (value === null || value === undefined) {
        cleanedData[key] = '';
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // If it's an object (like {}), convert to empty string
        cleanedData[key] = '';
      } else {
        cleanedData[key] = value;
      }
    }
    
    console.log('[OWNER] OwnerDetailsStep - Memoized form data:', cleanedData);
    return cleanedData;
  }, [data, localFormData]);

  // Debounced update to parent component
  const debouncedUpdate = useResponsiveDebouncedCallback(
    (newFormData: Record<string, unknown>) => {
      console.log('[OWNER] OwnerDetailsStep - Debounced update to parent:', newFormData);
      onUpdate(newFormData);
    },
    600,
    (typing) => setIsTyping(typing)
  );

  const handleInputChange = useCallback((field: string, value: any) => {
    console.log(`[OWNER] OwnerDetailsStep - Input change: ${field} = "${value}" (type: ${typeof value})`);
    
    const newFormData = {
      ...formData,
      [field]: value,
    };
    
    console.log('[OWNER] OwnerDetailsStep - New form data after input change:', {
      field,
      value,
      totalFields: Object.keys(newFormData).length,
      nonEmptyFields: Object.entries(newFormData).filter(([_, v]) => v && v !== '').length,
      newFormData
    });
    
    // Immediate local state update for UI responsiveness
    setLocalFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));

    // Debounced parent update
    debouncedUpdate(newFormData);

    // Clear errors immediately for better UX
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: "",
      }));
    }
  }, [formData, errors, debouncedUpdate]);

  const handlePhoneChange = useCallback((fieldPrefix: string) => (phoneNumber: string, countryCode: string, dialCode: string) => {
    let phoneField: string;
    let countryField: string;
    let dialField: string;
    
    if (fieldPrefix === '') {
      // Primary phone
      phoneField = 'phone';
      countryField = 'phoneCountryCode';
      dialField = 'phoneDialCode';
    } else if (fieldPrefix === 'alternative') {
      // Alternative phone
      phoneField = 'alternativePhone';
      countryField = 'alternativePhoneCountryCode';
      dialField = 'alternativePhoneDialCode';
    } else if (fieldPrefix === 'manager') {
      // Manager phone
      phoneField = 'managerPhone';
      countryField = 'managerPhoneCountryCode';
      dialField = 'managerPhoneDialCode';
    } else {
      // Fallback to old pattern
      phoneField = `${fieldPrefix}Phone`;
      countryField = `${fieldPrefix}PhoneCountryCode`;
      dialField = `${fieldPrefix}PhoneDialCode`;
    }
    
    console.log(`[OWNER] OwnerDetailsStep - Phone change: ${fieldPrefix} -> ${phoneField} = "${phoneNumber}", ${countryField} = "${countryCode}", ${dialField} = "${dialCode}"`);
    
    const newFormData = {
      ...formData,
      [phoneField]: phoneNumber,
      [countryField]: countryCode,
      [dialField]: dialCode,
    };
    
    console.log('[OWNER] OwnerDetailsStep - New form data after phone change:', newFormData);
    
    // Immediate local state update for UI responsiveness
    setLocalFormData((prev: any) => ({
      ...prev,
      [phoneField]: phoneNumber,
      [countryField]: countryCode,
      [dialField]: dialCode,
    }));
    
    // Debounced parent update
    debouncedUpdate(newFormData);

    // Clear errors immediately for better UX
    if (errors[phoneField]) {
      setErrors(prev => ({
        ...prev,
        [phoneField]: "",
      }));
    }
  }, [formData, errors, debouncedUpdate]);

  const validateForm = () => {
    // Disable validation for development - always return true
    return true;
  };

  useImperativeHandle(ref, () => ({
    validate: validateForm,
    getData: () => formData,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#009990]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-[#009990]" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Owner Details</h2>
        <p className="text-slate-600">Provide information about the property owner and management</p>
        <div className="flex items-center justify-center mt-4 p-3 glass-card-white-teal">
          <AlertCircle className="w-5 h-5 text-[#009990] mr-2" />
          <span className="text-slate-700 text-sm">All owner information is stored securely with privacy protection</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Owner Type */}
        <div>
          <label className="block text-lg font-semibold text-slate-800 mb-4">
            Registered Owner Type
          </label>
          <div className="flex space-x-6">
            {[{value: "INDIVIDUAL", label: "Individual"}, {value: "COMPANY", label: "Company"}].map(type => (
              <label key={type.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="ownerType"
                  value={type.value}
                  checked={formData.ownerType === type.value}
                  onChange={(e) => handleInputChange('ownerType', e.target.value)}
                  className="mr-3 w-5 h-5 text-[#009990] focus:ring-[#009990] border-slate-400"
                />
                <span className="text-slate-800 text-lg font-medium">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Company Information */}
        <div className="glass-card-white-teal rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <Building className="w-5 h-5 mr-2 text-slate-700" />
              Company Information
            </h3>
            {/* <SkipButton
              stepNumber={2}
              fieldName="companyInformation"
              type="section"
              size="md"
              variant="prominent"
            /> */}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Company Name
                </label>
                {/* <SkipButton
                  stepNumber={2}
                  fieldName="villaCompanyName"
                  type="field"
                  size="sm"
                /> */}
              </div>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Enter company name"
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                  errors.companyName ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.companyName && (
                <p className="text-red-400 text-sm mt-1">{errors.companyName}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Company Address
              </label>
              <textarea
                value={formData.companyAddress}
                onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                placeholder="Enter company address"
                rows={3}
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                  errors.companyAddress ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.companyAddress && (
                <p className="text-red-400 text-sm mt-1">{errors.companyAddress}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tax ID
              </label>
              <input
                type="text"
                value={formData.companyTaxId}
                onChange={(e) => handleInputChange('companyTaxId', e.target.value)}
                placeholder="Tax identification number"
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                  errors.companyTaxId ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.companyTaxId && (
                <p className="text-red-400 text-sm mt-1">{errors.companyTaxId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                VAT Registration Number
              </label>
              <input
                type="text"
                value={formData.companyVat}
                onChange={(e) => handleInputChange('companyVat', e.target.value)}
                placeholder="VAT number (optional)"
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Owner Information */}
        <div className="glass-card-white-teal rounded-lg p-6 space-y-6">
          <h3 className="text-lg font-semibold text-slate-800">Owner Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                  errors.firstName ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.firstName && (
                <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                  errors.lastName ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.lastName && (
                <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="owner@example.com"
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                  errors.email ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                {/* <SkipButton
                  stepNumber={2}
                  fieldName="phone"
                  type="field"
                  size="sm"
                /> */}
              </div>
              <InternationalPhoneInput
                value={formData.phone}
                onChange={handlePhoneChange('')}
                placeholder="Enter phone number"
                error={errors.phone}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Alternative Phone (Optional)
              </label>
              <InternationalPhoneInput
                value={formData.alternativePhone}
                onChange={handlePhoneChange('alternative')}
                placeholder="Enter alternative phone number"
                error={errors.alternativePhone}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter owner's address"
                rows={3}
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 resize-none ${
                  errors.address ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.address && (
                <p className="text-red-400 text-sm mt-1">{errors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="City"
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                  errors.city ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.city && (
                <p className="text-red-400 text-sm mt-1">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Country
              </label>
              <div className="relative" ref={countryDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setCountrySearchOpen(!countrySearchOpen);
                    setNationalitySearchOpen(false);
                  }}
                  className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 flex items-center justify-between ${
                    errors.country ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                  }`}
                >
                  <span className={formData.country ? 'text-slate-800' : 'text-slate-500/80'}>
                    {formData.country || 'Select country'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${countrySearchOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {countrySearchOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-teal-300/50 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="p-3 border-b border-slate-200">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={countrySearchQuery}
                          onChange={(e) => setCountrySearchQuery(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, true)}
                          placeholder="Search countries..."
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCountries.map((countryName) => (
                        <button
                          key={countryName}
                          type="button"
                          onClick={() => {
                            handleInputChange('country', countryName);
                            setCountrySearchOpen(false);
                            setCountrySearchQuery('');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-teal-50 focus:bg-teal-50 focus:outline-none transition-colors text-slate-800 hover:text-slate-900"
                        >
                          {countryName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {errors.country && (
                <p className="text-red-400 text-sm mt-1">{errors.country}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Zip Code (Optional)
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                placeholder="Postal/Zip code"
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nationality (Optional)
              </label>
              <div className="relative" ref={nationalityDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNationalitySearchOpen(!nationalitySearchOpen);
                    setCountrySearchOpen(false);
                  }}
                  className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 flex items-center justify-between"
                >
                  <span className="text-slate-800">
                    {formData.nationality || 'Select nationality'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${nationalitySearchOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {nationalitySearchOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-teal-300/50 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="p-3 border-b border-slate-200">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={nationalitySearchQuery}
                          onChange={(e) => setNationalitySearchQuery(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, false)}
                          placeholder="Search nationalities..."
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredNationalities.map((nationality) => (
                        <button
                          key={nationality}
                          type="button"
                          onClick={() => {
                            handleInputChange('nationality', nationality);
                            setNationalitySearchOpen(false);
                            setNationalitySearchQuery('');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-teal-50 focus:bg-teal-50 focus:outline-none transition-colors text-slate-800 hover:text-slate-900"
                        >
                          {nationality}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Passport Number (Optional)
              </label>
              <input
                type="text"
                value={formData.passportNumber}
                onChange={(e) => handleInputChange('passportNumber', e.target.value)}
                placeholder="Passport number"
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ID Number (Optional)
              </label>
              <input
                type="text"
                value={formData.idNumber}
                onChange={(e) => handleInputChange('idNumber', e.target.value)}
                placeholder="National ID number"
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Preferred Language
              </label>
              <select
                value={formData.preferredLanguage}
                onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
              >
                <option value="en">English</option>
                <option value="th">Thai (ไทย)</option>
                <option value="zh">Chinese (中文)</option>
                <option value="es">Spanish (Español)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="ar">Arabic (العربية)</option>
                <option value="pt">Portuguese (Português)</option>
                <option value="bn">Bengali (বাংলা)</option>
                <option value="ru">Russian (Русский)</option>
                <option value="ja">Japanese (日本語)</option>
                <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                <option value="de">German (Deutsch)</option>
                <option value="jv">Javanese</option>
                <option value="wu">Wu Chinese</option>
                <option value="ms">Malay (Bahasa Melayu)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="vi">Vietnamese (Tiếng Việt)</option>
                <option value="ko">Korean (한국어)</option>
                <option value="fr">French (Français)</option>
                <option value="mr">Marathi (मराठी)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="ur">Urdu (اردو)</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
                <option value="pl">Polish (Polski)</option>
                <option value="uk">Ukrainian (Українська)</option>
                <option value="fa">Persian (فارسی)</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                <option value="ml">Malayalam (മലയാളം)</option>
                <option value="or">Odia (ଓଡ଼ିଆ)</option>
                <option value="my">Burmese (မြန်မာ)</option>
                <option value="az">Azerbaijani</option>
                <option value="uz">Uzbek</option>
                <option value="sd">Sindhi</option>
                <option value="am">Amharic</option>
                <option value="nl">Dutch (Nederlands)</option>
                <option value="sr">Serbian (Српски)</option>
                <option value="ro">Romanian (Română)</option>
                <option value="rw">Kinyarwanda</option>
                <option value="si">Sinhala (සිංහල)</option>
                <option value="km">Khmer (ភាសាខ្មែរ)</option>
                <option value="tk">Turkmen</option>
                <option value="ne">Nepali (नेपाली)</option>
                <option value="hu">Hungarian (Magyar)</option>
                <option value="be">Belarusian</option>
                <option value="da">Danish (Dansk)</option>
                <option value="fi">Finnish (Suomi)</option>
                <option value="no">Norwegian (Norsk)</option>
                <option value="sk">Slovak (Slovenčina)</option>
                <option value="bg">Bulgarian (Български)</option>
                <option value="hr">Croatian (Hrvatski)</option>
                <option value="cs">Czech (Čeština)</option>
                <option value="he">Hebrew (עברית)</option>
                <option value="el">Greek (Ελληνικά)</option>
                <option value="sv">Swedish (Svenska)</option>
                <option value="ca">Catalan (Català)</option>
                <option value="lt">Lithuanian (Lietuvių)</option>
                <option value="sl">Slovenian (Slovenščina)</option>
                <option value="lv">Latvian (Latviešu)</option>
                <option value="et">Estonian (Eesti)</option>
                <option value="ga">Irish (Gaeilge)</option>
                <option value="mt">Maltese (Malti)</option>
                <option value="is">Icelandic (Íslenska)</option>
                <option value="cy">Welsh (Cymraeg)</option>
                <option value="eu">Basque (Euskera)</option>
                <option value="lb">Luxembourgish</option>
                <option value="fo">Faroese</option>
                <option value="kl">Greenlandic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Communication Preference
              </label>
              <select
                value={formData.communicationPreference}
                onChange={(e) => handleInputChange('communicationPreference', e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
              >
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes or comments"
                rows={3}
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Property Manager Information (Optional) */}
        <div className="glass-card-white-teal rounded-lg p-6 space-y-6">
          <h3 className="text-lg font-semibold text-slate-800">Property Manager (Optional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Manager Full Name
              </label>
              <input
                type="text"
                value={formData.managerName}
                onChange={(e) => handleInputChange('managerName', e.target.value)}
                placeholder="Property manager name"
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Manager Email
              </label>
              <input
                type="email"
                value={formData.managerEmail}
                onChange={(e) => handleInputChange('managerEmail', e.target.value)}
                placeholder="manager@example.com"
                className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Manager Phone
              </label>
              <InternationalPhoneInput
                value={formData.managerPhone}
                onChange={handlePhoneChange('manager')}
                placeholder="Enter phone number"
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}));

OwnerDetailsStep.displayName = 'OwnerDetailsStep';

export default OwnerDetailsStep;
