"use client";

import React, { useState, useImperativeHandle, forwardRef, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, User, UserPlus, Phone } from 'lucide-react';
import { StepHandle } from './types';
import InternationalPhoneInputFixed from './InternationalPhoneInputFixed';

interface StaffConfiguratorStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  position: string;
  employmentType: string;
  idCard: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  phoneCountryCode?: string;
  phoneDialCode?: string;
  maritalStatus: boolean;
  emergencyContacts: { 
    firstName: string;
    lastName: string; 
    phone: string; 
    phoneCountryCode?: string; 
    phoneDialCode?: string; 
    email?: string; 
    relationship: string; 
  }[];
  baseSalary: string;
  currency: string;
  startDate: string;
  numberOfDaySalary: string;
  serviceCharge: string;
  foodAllowance: boolean;
  hasAccommodation: boolean;
  transportation: string;
  healthInsurance: boolean;
  workInsurance: boolean;
  totalIncome: string;
  totalNetIncome: string;
  otherDeduct: string;
}

const StaffConfiguratorStep = forwardRef<StepHandle, StaffConfiguratorStepProps>((
  { data, onUpdate },
  ref
) => {
  // Position mappings that align with database schema (moved before useState)
  const positionMappings = {
    'Villa Manager': 'VILLA_MANAGER',
    'Housekeeper': 'HOUSEKEEPER',
    'Chef': 'CHEF', 
    'Security': 'SECURITY',
    'Pool Maintenance': 'POOL_MAINTENANCE',
    'Gardener': 'GARDENER',
    'Driver': 'DRIVER',
    'Concierge': 'CONCIERGE',
    'Maintenance': 'MAINTENANCE',
    'Other': 'OTHER'
  };

  // Helper functions (moved before useState)
  const getPositionEnumValue = (displayName: string): string => {
    return positionMappings[displayName as keyof typeof positionMappings] || displayName;
  };

  const getPositionDisplayName = (enumValue: string): string => {
    const entry = Object.entries(positionMappings).find(([_, value]) => value === enumValue);
    return entry ? entry[0] : enumValue;
  };

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    console.log('[UPDATE] StaffConfiguratorStep initializing with data:', data);
    console.log('[UPDATE] Data type:', typeof data, 'isArray:', Array.isArray(data));
    console.log('[UPDATE] Data keys:', data ? Object.keys(data) : 'no data');
    
    // Handle both direct array format and object with staff array
    const staffArray = Array.isArray(data) ? data : 
                      (data && Array.isArray(data.staff)) ? data.staff : [];
    console.log('[UPDATE] Extracted staff array:', staffArray);
    
    if (staffArray.length > 0) {
      console.log('[UPDATE] Found existing staff data:', staffArray);
      return staffArray.map((staffData: any, index: number) => ({
        id: staffData.id || (index + 1).toString(),
        firstName: staffData.firstName || '',
        lastName: staffData.lastName || '',
        nickname: staffData.nickname || '',
        position: (() => {
          const originalPosition = staffData.position || '';
          const displayName = getPositionDisplayName(originalPosition);
          console.log('[POSITION-DEBUG] Position mapping from DB:', {
            originalPosition,
            displayName,
            staffName: `${staffData.firstName} ${staffData.lastName}`
          });
          return displayName;
        })(),
        employmentType: staffData.employmentType || 'FULL_TIME',
        idCard: staffData.idCard || '',
        passportNumber: staffData.passportNumber || '',
        nationality: staffData.nationality || '',
        dateOfBirth: staffData.dateOfBirth || '',
        email: staffData.email || '',
        phone: staffData.phone || '',
        phoneCountryCode: staffData.phoneCountryCode || '',
        phoneDialCode: staffData.phoneDialCode || '',
        maritalStatus: staffData.maritalStatus || false,
        emergencyContacts: staffData.emergencyContacts && staffData.emergencyContacts.length > 0 
          ? staffData.emergencyContacts 
          : [{ firstName: '', lastName: '', phone: '', phoneCountryCode: '', phoneDialCode: '', email: '', relationship: 'OTHER' }],
        baseSalary: staffData.baseSalary || '',
        currency: staffData.currency || 'USD',
        startDate: staffData.startDate || '',
        numberOfDaySalary: staffData.numberOfDaySalary || '',
        serviceCharge: staffData.serviceCharge || '',
        foodAllowance: staffData.foodAllowance || false,
        hasAccommodation: staffData.hasAccommodation || false,
        transportation: staffData.transportation || 'Walking Distance',
        healthInsurance: staffData.healthInsurance || false,
        workInsurance: staffData.workInsurance || false,
        totalIncome: staffData.totalIncome || '',
        totalNetIncome: staffData.totalNetIncome || '',
        otherDeduct: staffData.otherDeduct || ''
      }));
    }
    
    console.log('[UPDATE] No existing staff data, starting with empty array');
    // Don't create a default staff member with empty fields - let user add staff explicitly
    return [];
  });

  // Watch for data updates (e.g., on page refresh when parent loads data)
  useEffect(() => {
    console.log('[UPDATE] StaffConfiguratorStep useEffect triggered. Data:', data);
    console.log('[UPDATE] Data type:', typeof data, 'Is array:', Array.isArray(data));
    
    if (!data) {
      console.log('[UPDATE] No data received, skipping update');
      return;
    }
    
    // Handle incoming staff data - could be direct array or object with staff property
    const incomingStaffArray = Array.isArray(data) ? data : 
                              (data && Array.isArray(data.staff)) ? data.staff : [];
    
    console.log('[UPDATE] Parsed incoming staff array:', incomingStaffArray);
    console.log('[UPDATE] Current local staff members:', staffMembers);
    
    // Always update if we have valid incoming data (be more aggressive about loading saved data)
    if (incomingStaffArray.length > 0) {
      console.log('[UPDATE] [OK] UPDATING: Found staff data from backend, updating local state');
      
      const updatedStaff = incomingStaffArray.map((staffData: any, index: number) => {
        console.log(`[UPDATE] Processing staff member ${index + 1}:`, staffData);
        return {
          id: staffData.id || (index + 1).toString(),
          firstName: staffData.firstName || '',
          lastName: staffData.lastName || '',
          nickname: staffData.nickname || '',
          position: getPositionDisplayName(staffData.position || ''),
          employmentType: staffData.employmentType || 'FULL_TIME',
          idCard: staffData.idCard || '',
          passportNumber: staffData.passportNumber || '',
          nationality: staffData.nationality || '',
          dateOfBirth: staffData.dateOfBirth || '',
          email: staffData.email || '',
          phone: staffData.phone || '',
          phoneCountryCode: staffData.phoneCountryCode || '',
          phoneDialCode: staffData.phoneDialCode || '',
          maritalStatus: staffData.maritalStatus || false,
          emergencyContacts: staffData.emergencyContacts && staffData.emergencyContacts.length > 0 
            ? staffData.emergencyContacts 
            : [{ firstName: '', lastName: '', phone: '', phoneCountryCode: '', phoneDialCode: '', email: '', relationship: 'OTHER' }],
          baseSalary: staffData.baseSalary || '',
          currency: staffData.currency || 'USD',
          startDate: staffData.startDate || '',
          numberOfDaySalary: staffData.numberOfDaySalary || '',
          serviceCharge: staffData.serviceCharge || '',
          foodAllowance: staffData.foodAllowance || false,
          hasAccommodation: staffData.hasAccommodation || false,
          transportation: staffData.transportation || 'Walking Distance',
          healthInsurance: staffData.healthInsurance || false,
          workInsurance: staffData.workInsurance || false,
          totalIncome: staffData.totalIncome || '',
          totalNetIncome: staffData.totalNetIncome || '',
          otherDeduct: staffData.otherDeduct || ''
        };
      });
      
      console.log('[UPDATE] Setting updated staff members:', updatedStaff);
      console.log('🚨 [STATE-UPDATE] About to call setStaffMembers with:', {
        updatedStaffCount: updatedStaff.length,
        updatedStaffData: updatedStaff,
        currentStaffCount: staffMembers.length
      });
      setStaffMembers(updatedStaff);
      console.log('🚨 [STATE-UPDATE] setStaffMembers called successfully');
    } else {
      console.log('[UPDATE] No staff data in incoming data, keeping current state');
    }
  }, [data]); // Only depend on data, not staffMembers to avoid loops

  // Additional useEffect to ensure data loading on component mount
  useEffect(() => {
    console.log('[UPDATE] Component mount effect - checking for initial data load');
    console.log('[UPDATE] Data exists:', !!data);
    console.log('[UPDATE] StaffMembers default state:', staffMembers.length === 1 && !staffMembers[0].firstName);
    
    // If we have data but staff is still in default state, force an update
    if (data && staffMembers.length === 1 && !staffMembers[0].firstName) {
      console.log('[UPDATE] Forcing initial data load from mount effect');
      // This will trigger the previous useEffect
    }
  }, []); // Run once on mount

  // Removed the problematic useEffect that was causing infinite loop
  // Updates are now handled explicitly through user actions

  const positions = Object.keys(positionMappings);

  // Wrapper function to convert positions to enum values before calling onUpdate
  const updateDataWithEnumPositions = useCallback((staffData: StaffMember[]) => {
    console.log('[FILTER-DEBUG] updateDataWithEnumPositions called with:', staffData.length, 'staff members');
    staffData.forEach((staff, index) => {
      console.log(`[FILTER-DEBUG] Staff ${index + 1}:`, {
        firstName: staff.firstName,
        lastName: staff.lastName,
        position: staff.position,
        hasFirstName: !!(staff.firstName && staff.firstName.trim()),
        hasLastName: !!(staff.lastName && staff.lastName.trim()),
        hasPosition: !!(staff.position && staff.position.trim())
      });
    });

    // Only send staff members that have meaningful data (at least firstName, lastName, or position filled)
    // FIXED: Make filtering less aggressive - if staff has firstName AND lastName, keep it even if position is empty
    const meaningfulStaff = staffData.filter(staff => {
      const hasFirstName = staff.firstName && staff.firstName.trim();
      const hasLastName = staff.lastName && staff.lastName.trim();
      const hasPosition = staff.position && staff.position.trim();
      
      // Keep staff if they have both first and last name, OR if they have a position
      const shouldKeep = (hasFirstName && hasLastName) || hasPosition;
      
      console.log('[FILTER-DEBUG] Staff member filter result:', {
        name: `${staff.firstName} ${staff.lastName}`,
        hasFirstName,
        hasLastName,
        hasPosition,
        shouldKeep
      });
      
      return shouldKeep;
    });
    
    console.log('[FILTER-DEBUG] Filtered from', staffData.length, 'to', meaningfulStaff.length, 'meaningful staff members');
    
    // Validate and map meaningful staff data before sending
    const validatedData = meaningfulStaff.map(staff => {
      const mappedStaff = {
        ...staff,
        position: getPositionEnumValue(staff.position)
      };
      
      // Log validation warnings for incomplete staff
      if (!mappedStaff.firstName?.trim()) {
        console.warn('[VALIDATION] Staff member missing firstName:', mappedStaff);
      }
      if (!mappedStaff.lastName?.trim()) {
        console.warn('[VALIDATION] Staff member missing lastName:', mappedStaff);
      }
      if (!mappedStaff.position?.trim()) {
        console.warn('[VALIDATION] Staff member missing position:', mappedStaff);
      }
      
      return mappedStaff;
    });
    
    // Send data in the format expected by the backend: { staff: [...] }
    onUpdate({ staff: validatedData });
    console.log('[UPDATE] StaffConfiguratorStep sending validated data to parent:', { 
      originalStaffCount: staffData.length,
      meaningfulStaffCount: meaningfulStaff.length,
      validStaffCount: validatedData.filter(s => s.firstName && s.lastName && s.position).length,
      finalDataSent: validatedData.length
    });
  }, [onUpdate]);

  const transportationOptions = [
    'Company Vehicle',
    'Personal Vehicle',
    'Motorcycle',
    'Public Transport',
    'Walking Distance'
  ];

  const currencyOptions = [
    { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
    { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
    { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
    { value: 'JPY', label: 'JPY - Japanese Yen', symbol: '¥' },
    { value: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$' },
    { value: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'C$' },
    { value: 'CHF', label: 'CHF - Swiss Franc', symbol: 'CHF' },
    { value: 'CNY', label: 'CNY - Chinese Yuan', symbol: '¥' },
    { value: 'SEK', label: 'SEK - Swedish Krona', symbol: 'kr' },
    { value: 'NZD', label: 'NZD - New Zealand Dollar', symbol: 'NZ$' },
    { value: 'MXN', label: 'MXN - Mexican Peso', symbol: '$' },
    { value: 'SGD', label: 'SGD - Singapore Dollar', symbol: 'S$' },
    { value: 'HKD', label: 'HKD - Hong Kong Dollar', symbol: 'HK$' },
    { value: 'NOK', label: 'NOK - Norwegian Krone', symbol: 'kr' },
    { value: 'KRW', label: 'KRW - South Korean Won', symbol: '₩' },
    { value: 'TRY', label: 'TRY - Turkish Lira', symbol: '₺' },
    { value: 'RUB', label: 'RUB - Russian Ruble', symbol: '₽' },
    { value: 'INR', label: 'INR - Indian Rupee', symbol: '₹' },
    { value: 'BRL', label: 'BRL - Brazilian Real', symbol: 'R$' },
    { value: 'ZAR', label: 'ZAR - South African Rand', symbol: 'R' },
    { value: 'PLN', label: 'PLN - Polish Zloty', symbol: 'zł' },
    { value: 'ILS', label: 'ILS - Israeli Shekel', symbol: '₪' },
    { value: 'CZK', label: 'CZK - Czech Koruna', symbol: 'Kč' },
    { value: 'HUF', label: 'HUF - Hungarian Forint', symbol: 'Ft' },
    { value: 'RON', label: 'RON - Romanian Leu', symbol: 'lei' },
    { value: 'BGN', label: 'BGN - Bulgarian Lev', symbol: 'лв' },
    { value: 'HRK', label: 'HRK - Croatian Kuna', symbol: 'kn' },
    { value: 'UAH', label: 'UAH - Ukrainian Hryvnia', symbol: '₴' },
    { value: 'AED', label: 'AED - UAE Dirham', symbol: 'د.إ' },
    { value: 'SAR', label: 'SAR - Saudi Riyal', symbol: 'ر.س' },
    { value: 'QAR', label: 'QAR - Qatari Riyal', symbol: 'ر.ق' },
    { value: 'EGP', label: 'EGP - Egyptian Pound', symbol: '£' },
    { value: 'MAD', label: 'MAD - Moroccan Dirham', symbol: 'د.م.' },
    { value: 'THB', label: 'THB - Thai Baht', symbol: '฿' },
    { value: 'MYR', label: 'MYR - Malaysian Ringgit', symbol: 'RM' },
    { value: 'IDR', label: 'IDR - Indonesian Rupiah', symbol: 'Rp' },
    { value: 'PHP', label: 'PHP - Philippine Peso', symbol: '₱' },
    { value: 'VND', label: 'VND - Vietnamese Dong', symbol: '₫' }
  ];

  const addStaffMember = () => {
    const newId = staffMembers.length > 0 
      ? (Math.max(...staffMembers.map(s => parseInt(s.id))) + 1).toString()
      : '1';
    const newStaffMembers = [...staffMembers, {
      id: newId,
      firstName: '',
      lastName: '',
      nickname: '',
      position: '',
      employmentType: 'FULL_TIME',
      idCard: '',
      passportNumber: '',
      nationality: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      phoneCountryCode: '',
      phoneDialCode: '',
      maritalStatus: false,
      emergencyContacts: [{ firstName: '', lastName: '', phone: '', phoneCountryCode: '', phoneDialCode: '', email: '', relationship: 'OTHER' }],
      baseSalary: '',
      currency: 'USD',
      startDate: '',
      numberOfDaySalary: '',
      serviceCharge: '',
      foodAllowance: false,
      hasAccommodation: false,
      transportation: 'Walking Distance',
      healthInsurance: false,
      workInsurance: false,
      totalIncome: '',
      totalNetIncome: '',
      otherDeduct: ''
    }];
    setStaffMembers(newStaffMembers);
    updateDataWithEnumPositions(newStaffMembers);
  };

  const removeStaffMember = (id: string) => {
    if (staffMembers.length > 1) {
      const newStaffMembers = staffMembers.filter(member => member.id !== id);
      setStaffMembers(newStaffMembers);
      updateDataWithEnumPositions(newStaffMembers);
    }
  };

  const updateStaffMember = useCallback((id: string, field: keyof StaffMember, value: any) => {
    setStaffMembers(prevMembers => {
      const newStaffMembers = prevMembers.map(member =>
        member.id === id ? { ...member, [field]: value } : member
      );
      
      // Call updateDataWithEnumPositions after state is set
      setTimeout(() => {
        updateDataWithEnumPositions(newStaffMembers);
      }, 0);
      
      return newStaffMembers;
    });
  }, [updateDataWithEnumPositions]);

  const handleStaffPhoneChange = useCallback((staffId: string) => 
    (phoneNumber: string, countryCode: string, dialCode: string) => {
      setStaffMembers(prevMembers => {
        const newStaffMembers = prevMembers.map(member =>
          member.id === staffId
            ? { 
                ...member, 
                phone: phoneNumber,
                phoneCountryCode: countryCode,
                phoneDialCode: dialCode
              }
            : member
        );
        
        // Call updateDataWithEnumPositions after state is set
        setTimeout(() => {
          updateDataWithEnumPositions(newStaffMembers);
        }, 0);
        
        return newStaffMembers;
      });
    }, [updateDataWithEnumPositions]);

  const addEmergencyContact = useCallback((staffId: string) => {
    setStaffMembers(prevMembers => {
      const newStaffMembers = prevMembers.map(member =>
        member.id === staffId
          ? { ...member, emergencyContacts: [...member.emergencyContacts, { firstName: '', lastName: '', phone: '', phoneCountryCode: '', phoneDialCode: '', email: '', relationship: 'OTHER' }] }
          : member
      );
      
      // Call updateDataWithEnumPositions after state is set
      setTimeout(() => {
        updateDataWithEnumPositions(newStaffMembers);
      }, 0);
      
      return newStaffMembers;
    });
  }, [updateDataWithEnumPositions]);

  const removeEmergencyContact = useCallback((staffId: string, contactIndex: number) => {
    setStaffMembers(prevMembers => {
      const newStaffMembers = prevMembers.map(member =>
        member.id === staffId
          ? { ...member, emergencyContacts: member.emergencyContacts.filter((_, index) => index !== contactIndex) }
          : member
      );
      
      // Call updateDataWithEnumPositions after state is set
      setTimeout(() => {
        updateDataWithEnumPositions(newStaffMembers);
      }, 0);
      
      return newStaffMembers;
    });
  }, [updateDataWithEnumPositions]);

  const updateEmergencyContact = useCallback((staffId: string, contactIndex: number, field: string, value: string) => {
    setStaffMembers(prevMembers => {
      const newStaffMembers = prevMembers.map(member =>
        member.id === staffId
          ? {
              ...member,
              emergencyContacts: member.emergencyContacts.map((contact, index) =>
                index === contactIndex ? { ...contact, [field]: value } : contact
              )
            }
          : member
      );
      
      // Call updateDataWithEnumPositions after state is set
      setTimeout(() => {
        updateDataWithEnumPositions(newStaffMembers);
      }, 0);
      
      return newStaffMembers;
    });
  }, []);

  const handleEmergencyContactPhone = useCallback((staffId: string, contactIndex: number) => 
    (phoneNumber: string, countryCode: string, dialCode: string) => {
      setStaffMembers(prevMembers => {
        const newStaffMembers = prevMembers.map(member =>
          member.id === staffId
            ? {
                ...member,
                emergencyContacts: member.emergencyContacts.map((contact, index) =>
                  index === contactIndex ? { 
                    ...contact, 
                    phone: phoneNumber,
                    phoneCountryCode: countryCode,
                    phoneDialCode: dialCode
                  } : contact
                )
              }
            : member
        );
        
        // Call updateDataWithEnumPositions after state is set
        setTimeout(() => {
          updateDataWithEnumPositions(newStaffMembers);
        }, 0);
        
        return newStaffMembers;
      });
    }, [updateDataWithEnumPositions]);

  const validateForm = () => {
    let isValid = true;
    const errors: string[] = [];
    
    // Check if we have at least one staff member with meaningful data
    const meaningfulStaff = staffMembers.filter(member => 
      member.firstName?.trim() || member.lastName?.trim() || member.position?.trim()
    );
    
    if (meaningfulStaff.length === 0) {
      console.log('[VALIDATION] No staff members with data - allowing as optional step');
      return true; // Staff is optional, so no staff is valid
    }
    
    // Validate each staff member that has data
    meaningfulStaff.forEach((member, index) => {
      if (!member.firstName?.trim()) {
        errors.push(`Staff member ${index + 1}: First name is required`);
        isValid = false;
      }
      if (!member.lastName?.trim()) {
        errors.push(`Staff member ${index + 1}: Last name is required`);
        isValid = false;
      }
      if (!member.position?.trim()) {
        errors.push(`Staff member ${index + 1}: Position is required`);
        isValid = false;
      }
    });
    
    if (!isValid) {
      console.error('[VALIDATION] Staff validation failed:', errors);
    } else {
      console.log('[VALIDATION] Staff validation passed:', {
        totalMembers: staffMembers.length,
        meaningfulStaff: meaningfulStaff.length,
        validStaff: meaningfulStaff.filter(m => m.firstName?.trim() && m.lastName?.trim() && m.position?.trim()).length
      });
    }
    
    return isValid;
  };
  
  useImperativeHandle(ref, () => ({
    validate: validateForm,
    getData: () => staffMembers,
  }));

  // 🚨 EMERGENCY DEBUG: Log state at every render
  console.log('🚨 [RENDER-STATE] StaffConfiguratorStep RENDER:', {
    staffMembersCount: staffMembers.length,
    staffMembersState: staffMembers,
    propsData: data,
    timestamp: new Date().toISOString()
  });

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#009990]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-[#009990]" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Staff Configuration</h2>
        <p className="text-slate-600">Configure your villa staff members and their details</p>
        
        {/* Staff Status Indicator */}
        <div className="mt-4 flex justify-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-slate-100 text-slate-700">
            <User className="w-4 h-4 mr-2" />
            {(() => {
              console.log('🚨 [RENDER-DEBUG] Staff render check:', {
                totalStaffMembers: staffMembers.length,
                staffMembersData: staffMembers.map(s => ({
                  id: s.id,
                  firstName: s.firstName,
                  lastName: s.lastName,
                  position: s.position,
                  hasAllThree: !!(s.firstName?.trim() && s.lastName?.trim() && s.position?.trim()),
                  hasFirstAndLast: !!(s.firstName?.trim() && s.lastName?.trim())
                }))
              });

              // FIXED: Use consistent filtering - if staff has first and last name, that's enough
              const validStaff = staffMembers.filter(member => {
                const hasFirstName = member.firstName?.trim();
                const hasLastName = member.lastName?.trim();
                const hasPosition = member.position?.trim();
                
                // Keep if has both names OR has position - SAME LOGIC AS FILTERING
                return (hasFirstName && hasLastName) || hasPosition;
              });
              
              console.log('🚨 [RENDER-DEBUG] Valid staff after filtering:', validStaff.length);
              
              return validStaff.length > 0 
                ? `${validStaff.length} staff member${validStaff.length > 1 ? 's' : ''} configured`
                : 'No staff members configured';
            })()}
          </div>
        </div>
      </div>

      {/* Add Staff Member Button */}
      <div className="flex justify-center mb-6">
        <button
          type="button"
          onClick={addStaffMember}
          className="px-6 py-3 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50 flex items-center space-x-2"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Staff Member</span>
        </button>
      </div>

      <div className="space-y-8">
        {staffMembers.map((member, index) => (
          <div key={member.id} className="glass-card-white-teal p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Staff Member {index + 1}</h3>
              {staffMembers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStaffMember(member.id)}
                  className="text-red-600 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-8">
              {/* Personal Information Section */}
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h4 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
                  <User className="w-5 h-5 mr-3 text-teal-600" />
                  Personal Information
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={member.firstName}
                      onChange={(e) => updateStaffMember(member.id, 'firstName', e.target.value)}
                      className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={member.lastName}
                      onChange={(e) => updateStaffMember(member.id, 'lastName', e.target.value)}
                      className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nickname</label>
                  <input
                    type="text"
                    value={member.nickname}
                    onChange={(e) => updateStaffMember(member.id, 'nickname', e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Position *</label>
                  <select
                    value={member.position}
                    onChange={(e) => updateStaffMember(member.id, 'position', e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                    required
                  >
                    <option value="">Select Position</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ID Card Number</label>
                  <input
                    type="text"
                    value={member.idCard}
                    onChange={(e) => updateStaffMember(member.id, 'idCard', e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Passport Number</label>
                  <input
                    type="text"
                    value={member.passportNumber}
                    onChange={(e) => updateStaffMember(member.id, 'passportNumber', e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nationality</label>
                  <select
                    value={member.nationality}
                    onChange={(e) => updateStaffMember(member.id, 'nationality', e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                  >
                    <option value="">Select Nationality</option>
                    <option value="Afghan">Afghan</option>
                    <option value="Albanian">Albanian</option>
                    <option value="Algerian">Algerian</option>
                    <option value="American">American</option>
                    <option value="Andorran">Andorran</option>
                    <option value="Angolan">Angolan</option>
                    <option value="Argentinian">Argentinian</option>
                    <option value="Armenian">Armenian</option>
                    <option value="Australian">Australian</option>
                    <option value="Austrian">Austrian</option>
                    <option value="Azerbaijani">Azerbaijani</option>
                    <option value="Bahamian">Bahamian</option>
                    <option value="Bahraini">Bahraini</option>
                    <option value="Bangladeshi">Bangladeshi</option>
                    <option value="Barbadian">Barbadian</option>
                    <option value="Belarusian">Belarusian</option>
                    <option value="Belgian">Belgian</option>
                    <option value="Belizean">Belizean</option>
                    <option value="Beninese">Beninese</option>
                    <option value="Bhutanese">Bhutanese</option>
                    <option value="Bolivian">Bolivian</option>
                    <option value="Bosnian">Bosnian</option>
                    <option value="Brazilian">Brazilian</option>
                    <option value="British">British</option>
                    <option value="Bruneian">Bruneian</option>
                    <option value="Bulgarian">Bulgarian</option>
                    <option value="Burkinabe">Burkinabe</option>
                    <option value="Burmese">Burmese</option>
                    <option value="Burundian">Burundian</option>
                    <option value="Cambodian">Cambodian</option>
                    <option value="Cameroonian">Cameroonian</option>
                    <option value="Canadian">Canadian</option>
                    <option value="Cape Verdean">Cape Verdean</option>
                    <option value="Central African">Central African</option>
                    <option value="Chadian">Chadian</option>
                    <option value="Chilean">Chilean</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Colombian">Colombian</option>
                    <option value="Comoran">Comoran</option>
                    <option value="Congolese">Congolese</option>
                    <option value="Costa Rican">Costa Rican</option>
                    <option value="Croatian">Croatian</option>
                    <option value="Cuban">Cuban</option>
                    <option value="Cypriot">Cypriot</option>
                    <option value="Czech">Czech</option>
                    <option value="Danish">Danish</option>
                    <option value="Djiboutian">Djiboutian</option>
                    <option value="Dominican">Dominican</option>
                    <option value="Dutch">Dutch</option>
                    <option value="Ecuadorian">Ecuadorian</option>
                    <option value="Egyptian">Egyptian</option>
                    <option value="Emirati">Emirati</option>
                    <option value="Equatorial Guinean">Equatorial Guinean</option>
                    <option value="Eritrean">Eritrean</option>
                    <option value="Estonian">Estonian</option>
                    <option value="Ethiopian">Ethiopian</option>
                    <option value="Fijian">Fijian</option>
                    <option value="Filipino">Filipino</option>
                    <option value="Finnish">Finnish</option>
                    <option value="French">French</option>
                    <option value="Gabonese">Gabonese</option>
                    <option value="Gambian">Gambian</option>
                    <option value="Georgian">Georgian</option>
                    <option value="German">German</option>
                    <option value="Ghanaian">Ghanaian</option>
                    <option value="Greek">Greek</option>
                    <option value="Grenadian">Grenadian</option>
                    <option value="Guatemalan">Guatemalan</option>
                    <option value="Guinea-Bissauan">Guinea-Bissauan</option>
                    <option value="Guinean">Guinean</option>
                    <option value="Guyanese">Guyanese</option>
                    <option value="Haitian">Haitian</option>
                    <option value="Herzegovinian">Herzegovinian</option>
                    <option value="Honduran">Honduran</option>
                    <option value="Hungarian">Hungarian</option>
                    <option value="I-Kiribati">I-Kiribati</option>
                    <option value="Icelandic">Icelandic</option>
                    <option value="Indian">Indian</option>
                    <option value="Indonesian">Indonesian</option>
                    <option value="Iranian">Iranian</option>
                    <option value="Iraqi">Iraqi</option>
                    <option value="Irish">Irish</option>
                    <option value="Israeli">Israeli</option>
                    <option value="Italian">Italian</option>
                    <option value="Ivorian">Ivorian</option>
                    <option value="Jamaican">Jamaican</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Jordanian">Jordanian</option>
                    <option value="Kazakhstani">Kazakhstani</option>
                    <option value="Kenyan">Kenyan</option>
                    <option value="Kittian and Nevisian">Kittian and Nevisian</option>
                    <option value="Kuwaiti">Kuwaiti</option>
                    <option value="Kyrgyz">Kyrgyz</option>
                    <option value="Laotian">Laotian</option>
                    <option value="Latvian">Latvian</option>
                    <option value="Lebanese">Lebanese</option>
                    <option value="Liberian">Liberian</option>
                    <option value="Libyan">Libyan</option>
                    <option value="Liechtensteiner">Liechtensteiner</option>
                    <option value="Lithuanian">Lithuanian</option>
                    <option value="Luxembourgish">Luxembourgish</option>
                    <option value="Macedonian">Macedonian</option>
                    <option value="Malagasy">Malagasy</option>
                    <option value="Malawian">Malawian</option>
                    <option value="Malaysian">Malaysian</option>
                    <option value="Maldivan">Maldivan</option>
                    <option value="Malian">Malian</option>
                    <option value="Maltese">Maltese</option>
                    <option value="Marshallese">Marshallese</option>
                    <option value="Mauritanian">Mauritanian</option>
                    <option value="Mauritian">Mauritian</option>
                    <option value="Mexican">Mexican</option>
                    <option value="Micronesian">Micronesian</option>
                    <option value="Moldovan">Moldovan</option>
                    <option value="Monacan">Monacan</option>
                    <option value="Mongolian">Mongolian</option>
                    <option value="Moroccan">Moroccan</option>
                    <option value="Mosotho">Mosotho</option>
                    <option value="Motswana">Motswana</option>
                    <option value="Mozambican">Mozambican</option>
                    <option value="Namibian">Namibian</option>
                    <option value="Nauruan">Nauruan</option>
                    <option value="Nepalese">Nepalese</option>
                    <option value="New Zealander">New Zealander</option>
                    <option value="Ni-Vanuatu">Ni-Vanuatu</option>
                    <option value="Nicaraguan">Nicaraguan</option>
                    <option value="Nigerian">Nigerian</option>
                    <option value="Nigerien">Nigerien</option>
                    <option value="North Korean">North Korean</option>
                    <option value="Northern Irish">Northern Irish</option>
                    <option value="Norwegian">Norwegian</option>
                    <option value="Omani">Omani</option>
                    <option value="Pakistani">Pakistani</option>
                    <option value="Palauan">Palauan</option>
                    <option value="Panamanian">Panamanian</option>
                    <option value="Papua New Guinean">Papua New Guinean</option>
                    <option value="Paraguayan">Paraguayan</option>
                    <option value="Peruvian">Peruvian</option>
                    <option value="Polish">Polish</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Qatari">Qatari</option>
                    <option value="Romanian">Romanian</option>
                    <option value="Russian">Russian</option>
                    <option value="Rwandan">Rwandan</option>
                    <option value="Saint Lucian">Saint Lucian</option>
                    <option value="Salvadoran">Salvadoran</option>
                    <option value="Samoan">Samoan</option>
                    <option value="San Marinese">San Marinese</option>
                    <option value="Sao Tomean">Sao Tomean</option>
                    <option value="Saudi">Saudi</option>
                    <option value="Scottish">Scottish</option>
                    <option value="Senegalese">Senegalese</option>
                    <option value="Serbian">Serbian</option>
                    <option value="Seychellois">Seychellois</option>
                    <option value="Sierra Leonean">Sierra Leonean</option>
                    <option value="Singaporean">Singaporean</option>
                    <option value="Slovakian">Slovakian</option>
                    <option value="Slovenian">Slovenian</option>
                    <option value="Solomon Islander">Solomon Islander</option>
                    <option value="Somali">Somali</option>
                    <option value="South African">South African</option>
                    <option value="South Korean">South Korean</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Sri Lankan">Sri Lankan</option>
                    <option value="Sudanese">Sudanese</option>
                    <option value="Surinamer">Surinamer</option>
                    <option value="Swazi">Swazi</option>
                    <option value="Swedish">Swedish</option>
                    <option value="Swiss">Swiss</option>
                    <option value="Syrian">Syrian</option>
                    <option value="Taiwanese">Taiwanese</option>
                    <option value="Tajik">Tajik</option>
                    <option value="Tanzanian">Tanzanian</option>
                    <option value="Thai">Thai</option>
                    <option value="Togolese">Togolese</option>
                    <option value="Tongan">Tongan</option>
                    <option value="Trinidadian or Tobagonian">Trinidadian or Tobagonian</option>
                    <option value="Tunisian">Tunisian</option>
                    <option value="Turkish">Turkish</option>
                    <option value="Tuvaluan">Tuvaluan</option>
                    <option value="Ugandan">Ugandan</option>
                    <option value="Ukrainian">Ukrainian</option>
                    <option value="Uruguayan">Uruguayan</option>
                    <option value="Uzbekistani">Uzbekistani</option>
                    <option value="Venezuelan">Venezuelan</option>
                    <option value="Vietnamese">Vietnamese</option>
                    <option value="Welsh">Welsh</option>
                    <option value="Yemenite">Yemenite</option>
                    <option value="Zambian">Zambian</option>
                    <option value="Zimbabwean">Zimbabwean</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={member.dateOfBirth}
                    onChange={(e) => updateStaffMember(member.id, 'dateOfBirth', e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Marital Status</label>
                  <div className="flex items-center space-x-2 mt-3">
                    <input
                      type="checkbox"
                      id={`marital-${member.id}`}
                      checked={member.maritalStatus}
                      onChange={(e) => updateStaffMember(member.id, 'maritalStatus', e.target.checked)}
                      className="rounded border-teal-400/40 text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor={`marital-${member.id}`} className="text-sm text-slate-700">Married</label>
                  </div>
                </div>
              </div>
              </div>

              {/* Contact Information Section */}
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h4 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
                  <Phone className="w-5 h-5 mr-3 text-teal-600" />
                  Contact Information
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={member.email}
                    onChange={(e) => updateStaffMember(member.id, 'email', e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <InternationalPhoneInputFixed
                    value={member.phone || ''}
                    onChange={handleStaffPhoneChange(member.id)}
                    placeholder="Enter phone number"
                  />
                </div>

              </div>
              </div>

              {/* Emergency Contacts Section */}
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-slate-800 flex items-center">
                    <User className="w-5 h-5 mr-3 text-teal-600" />
                    Emergency Contacts
                  </h4>
                <button
                  type="button"
                  onClick={() => addEmergencyContact(member.id)}
                  className="flex items-center space-x-1 text-teal-600 hover:text-teal-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Contact</span>
                </button>
              </div>

              {member.emergencyContacts.map((contact, contactIndex) => (
                <div key={contactIndex} className="mb-6 p-4 bg-white/20 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First Row: First Name and Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={contact.firstName}
                        onChange={(e) => updateEmergencyContact(member.id, contactIndex, 'firstName', e.target.value)}
                        className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={contact.lastName}
                        onChange={(e) => updateEmergencyContact(member.id, contactIndex, 'lastName', e.target.value)}
                        className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Second Row: Phone and Relationship */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                      <InternationalPhoneInputFixed
                        value={contact.phone || ''}
                        onChange={handleEmergencyContactPhone(member.id, contactIndex)}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Relationship</label>
                      <select
                        value={contact.relationship}
                        onChange={(e) => updateEmergencyContact(member.id, contactIndex, 'relationship', e.target.value)}
                        className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                      >
                        <option value="SPOUSE">Spouse</option>
                        <option value="PARTNER">Partner</option>
                        <option value="PARENT">Parent</option>
                        <option value="CHILD">Child</option>
                        <option value="SIBLING">Sibling</option>
                        <option value="FRIEND">Friend</option>
                        <option value="COLLEAGUE">Colleague</option>
                        <option value="NEIGHBOR">Neighbor</option>
                        <option value="RELATIVE">Relative</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Third Row: Email and Delete Button */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email (Optional)</label>
                      <input
                        type="email"
                        value={contact.email || ''}
                        onChange={(e) => updateEmergencyContact(member.id, contactIndex, 'email', e.target.value)}
                        className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                        placeholder="contact@example.com"
                      />
                    </div>
                    <div className="flex items-end">
                      {member.emergencyContacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEmergencyContact(member.id, contactIndex)}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50/60 rounded-lg border border-red-200/40 transition-all duration-200"
                          title="Remove emergency contact"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove Contact</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              </div>

              {/* Employment Details Section */}
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h4 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
                  <UserPlus className="w-5 h-5 mr-3 text-teal-600" />
                  Employment & Compensation
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Employment Type *</label>
                    <select
                      value={member.employmentType}
                      onChange={(e) => updateStaffMember(member.id, 'employmentType', e.target.value)}
                      className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                      required
                    >
                      <option value="">Select employment type</option>
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="SEASONAL">Seasonal</option>
                      <option value="FREELANCE">Freelance</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={member.startDate}
                      onChange={(e) => updateStaffMember(member.id, 'startDate', e.target.value)}
                      className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Number of Day Salary</label>
                    <input
                      type="number"
                      value={member.numberOfDaySalary}
                      onChange={(e) => updateStaffMember(member.id, 'numberOfDaySalary', e.target.value)}
                      className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                      placeholder="30"
                    />
                  </div>
                </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <h5 className="text-md font-semibold text-slate-800 pb-2 border-b border-slate-200">Salary & Compensation</h5>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Base Salary</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={member.baseSalary}
                        onChange={(e) => updateStaffMember(member.id, 'baseSalary', e.target.value)}
                        className="flex-1 px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                        placeholder="0.00"
                      />
                      <select
                        value={member.currency}
                        onChange={(e) => updateStaffMember(member.id, 'currency', e.target.value)}
                        className="w-24 px-2 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 text-sm"
                      >
                        {currencyOptions.map(currency => (
                          <option key={currency.value} value={currency.value}>
                            {currency.symbol}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>


                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Charge</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500 text-sm">
                          {currencyOptions.find(c => c.value === member.currency)?.symbol || '$'}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={member.serviceCharge}
                        onChange={(e) => updateStaffMember(member.id, 'serviceCharge', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h5 className="text-md font-semibold text-slate-800 pb-2 border-b border-slate-200">Financial Summary</h5>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Income</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500 text-sm">
                          {currencyOptions.find(c => c.value === member.currency)?.symbol || '$'}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={member.totalIncome}
                        onChange={(e) => updateStaffMember(member.id, 'totalIncome', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Net Income</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500 text-sm">
                          {currencyOptions.find(c => c.value === member.currency)?.symbol || '$'}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={member.totalNetIncome}
                        onChange={(e) => updateStaffMember(member.id, 'totalNetIncome', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Other Deductions</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500 text-sm">
                          {currencyOptions.find(c => c.value === member.currency)?.symbol || '$'}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={member.otherDeduct}
                        onChange={(e) => updateStaffMember(member.id, 'otherDeduct', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Benefits & Allowances Section */}
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-6 border border-white/20 mt-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
                  <UserPlus className="w-5 h-5 mr-3 text-teal-600" />
                  Benefits & Allowances
                </h4>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Food Allowance</label>
                      <div className="flex items-center p-4 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg hover:bg-white/80 transition-all duration-200">
                        <input
                          type="checkbox"
                          id={`food-${member.id}`}
                          checked={member.foodAllowance}
                          onChange={(e) => updateStaffMember(member.id, 'foodAllowance', e.target.checked)}
                          className="rounded border-teal-400/40 text-teal-600 focus:ring-teal-500 focus:ring-2"
                        />
                        <label htmlFor={`food-${member.id}`} className="ml-3 text-sm text-slate-700 cursor-pointer">Provided</label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Accommodation</label>
                      <div className="flex items-center p-4 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg hover:bg-white/80 transition-all duration-200">
                        <input
                          type="checkbox"
                          id={`accommodation-${member.id}`}
                          checked={member.hasAccommodation}
                          onChange={(e) => updateStaffMember(member.id, 'hasAccommodation', e.target.checked)}
                          className="rounded border-teal-400/40 text-teal-600 focus:ring-teal-500 focus:ring-2"
                        />
                        <label htmlFor={`accommodation-${member.id}`} className="ml-3 text-sm text-slate-700 cursor-pointer">Provided</label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Health Insurance</label>
                      <div className="flex items-center p-4 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg hover:bg-white/80 transition-all duration-200">
                        <input
                          type="checkbox"
                          id={`health-${member.id}`}
                          checked={member.healthInsurance}
                          onChange={(e) => updateStaffMember(member.id, 'healthInsurance', e.target.checked)}
                          className="rounded border-teal-400/40 text-teal-600 focus:ring-teal-500 focus:ring-2"
                        />
                        <label htmlFor={`health-${member.id}`} className="ml-3 text-sm text-slate-700 cursor-pointer">Covered</label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Work Insurance</label>
                      <div className="flex items-center p-4 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg hover:bg-white/80 transition-all duration-200">
                        <input
                          type="checkbox"
                          id={`work-${member.id}`}
                          checked={member.workInsurance}
                          onChange={(e) => updateStaffMember(member.id, 'workInsurance', e.target.checked)}
                          className="rounded border-teal-400/40 text-teal-600 focus:ring-teal-500 focus:ring-2"
                        />
                        <label htmlFor={`work-${member.id}`} className="ml-3 text-sm text-slate-700 cursor-pointer">Covered</label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Transportation</label>
                      <select
                        value={member.transportation}
                        onChange={(e) => updateStaffMember(member.id, 'transportation', e.target.value)}
                        className="w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border border-teal-400/40 rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200"
                      >
                        <option value="">Select Transportation</option>
                        {transportationOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
});

// Add useImperativeHandle to expose required methods
const StaffConfiguratorStepWithRef = forwardRef<StepHandle, StaffConfiguratorStepProps>((props, ref) => {
  // Get the actual StaffConfiguratorStep's ref to access its validation
  const stepRef = useRef<any>(null);
  
  useImperativeHandle(ref, () => ({
    validate: () => {
      // If no staff data, consider it valid (staff is optional)
      if (!props.data || (Array.isArray(props.data) && props.data.length === 0)) {
        console.log('📋 Staff validation: No staff data - valid');
        return true;
      }
      
      // Get staff array
      const staffArray = Array.isArray(props.data) ? props.data : 
                        (props.data && Array.isArray(props.data.staff)) ? props.data.staff : [];
      
      console.log('📋 Staff validation: Checking', staffArray.length, 'staff members');
      
      // Validate each staff member
      for (let i = 0; i < staffArray.length; i++) {
        const staff = staffArray[i];
        if (!staff.firstName?.trim()) {
          console.log(`📋 Staff validation failed: Member ${i + 1} missing firstName`);
          return false;
        }
        if (!staff.lastName?.trim()) {
          console.log(`📋 Staff validation failed: Member ${i + 1} missing lastName`);
          return false;
        }
        if (!staff.position?.trim()) {
          console.log(`📋 Staff validation failed: Member ${i + 1} missing position`);
          return false;
        }
      }
      
      console.log('📋 Staff validation: All staff members valid');
      return true;
    },
    getData: () => {
      return props.data || {};
    }
  }));
  
  return <StaffConfiguratorStep ref={stepRef} {...props} />;


});

StaffConfiguratorStepWithRef.displayName = 'StaffConfiguratorStep';

export default StaffConfiguratorStepWithRef;
