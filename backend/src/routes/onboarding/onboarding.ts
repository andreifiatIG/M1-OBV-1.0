
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import onboardingService, { VersionConflictError } from "../../services/core/onboardingService";
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { onboardingRateLimit, onboardingReadRateLimit, onboardingCompleteRateLimit, autoSaveRateLimit} from '../../middleware/rateLimiting';
import villaService from "../../services/core/villaService";
import { createSanitizationMiddleware, createValidationMiddleware, sanitizers, validators } from '../../middleware/sanitization';
import { cacheMiddleware, CacheDuration, invalidateCache } from '../../middleware/cache';
import { logger } from '../../utils/logger';
import {
  canonicalizeStepData,
  ONBOARDING_STEPS,
  safeValidateStepPayload,
  type OnboardingStep,
} from '../../shared/onboardingContract';

const router = Router();
const SANITIZER_DEBUG_ENABLED = process.env.ENABLE_SANITIZER_DEBUG === 'true';

// Sanitization middleware configurations
const onboardingStepSanitization = createSanitizationMiddleware({
  params: {
    villaId: sanitizers.text,
  },
  body: {
    step: sanitizers.integer,
    data: (data: any) => {
      if (typeof data !== 'object' || data === null) return {};
      
      // Deep sanitize object while preserving structure
      const sanitized: any = {};
      
      // =================================================================
      // STEP 1 – VILLA INFORMATION
      // =================================================================
      
      // Villa basic information
      if (data.villaName) sanitized.villaName = sanitizers.text(data.villaName);
      if (data.address) sanitized.address = sanitizers.text(data.address);
      if (data.villaAddress) sanitized.address = sanitizers.text(data.villaAddress); // Map villaAddress -> address
      if (data.city) sanitized.city = sanitizers.text(data.city);
      if (data.villaCity) sanitized.city = sanitizers.text(data.villaCity); // Map villaCity -> city
      if (data.country) sanitized.country = sanitizers.text(data.country);
      if (data.villaCountry) sanitized.country = sanitizers.text(data.villaCountry); // Map villaCountry -> country
      if (data.zipCode) sanitized.zipCode = sanitizers.text(data.zipCode);
      if (data.villaPostalCode) sanitized.zipCode = sanitizers.text(data.villaPostalCode); // Map villaPostalCode -> zipCode
      if (data.description) sanitized.description = sanitizers.richText(data.description, 'moderate');
      if (data.shortDescription) sanitized.shortDescription = sanitizers.richText(data.shortDescription, 'strict');
      
      // Villa contact information
      if (data.propertyEmail) sanitized.propertyEmail = sanitizers.email(data.propertyEmail);
      if (data.propertyWebsite) sanitized.propertyWebsite = sanitizers.url(data.propertyWebsite);
      
      // Property numbers and dimensions
      if (data.bedrooms !== undefined) sanitized.bedrooms = sanitizers.integer(data.bedrooms);
      if (data.bathrooms !== undefined) sanitized.bathrooms = sanitizers.integer(data.bathrooms);
      if (data.maxGuests !== undefined) sanitized.maxGuests = sanitizers.integer(data.maxGuests);
      if (data.propertySize !== undefined) sanitized.propertySize = sanitizers.number(data.propertySize);
      if (data.plotSize !== undefined) sanitized.plotSize = sanitizers.number(data.plotSize);
      // Map frontend aliases: villaArea -> propertySize, landArea -> plotSize
      if (data.villaArea !== undefined) sanitized.propertySize = sanitizers.number(data.villaArea);
      if (data.landArea !== undefined) sanitized.plotSize = sanitizers.number(data.landArea);
      if (data.yearBuilt !== undefined) sanitized.yearBuilt = sanitizers.integer(data.yearBuilt);
      if (data.renovationYear !== undefined) sanitized.renovationYear = sanitizers.integer(data.renovationYear);
      if (data.latitude !== undefined) sanitized.latitude = sanitizers.number(data.latitude);
      if (data.longitude !== undefined) sanitized.longitude = sanitizers.number(data.longitude);
      
      // Villa style and type fields
      if (data.villaStyle) sanitized.villaStyle = sanitizers.text(data.villaStyle);
      if (data.propertyType) sanitized.propertyType = sanitizers.text(data.propertyType);
      if (data.locationType) sanitized.locationType = sanitizers.text(data.locationType);
      
      // Villa website and external links
      if (data.website) sanitized.website = sanitizers.url(data.website);
      if (data.googleMapsLink) sanitized.googleMapsLink = sanitizers.url(data.googleMapsLink);
      if (data.oldRatesCardLink) sanitized.oldRatesCardLink = sanitizers.url(data.oldRatesCardLink);
      if (data.iCalCalendarLink) sanitized.iCalCalendarLink = sanitizers.url(data.iCalCalendarLink);
      if (data.googleCoordinates) sanitized.googleCoordinates = sanitizers.text(data.googleCoordinates);
      
      // =================================================================
      // STEP 2 – OWNER DETAILS
      // =================================================================
            
      // Owner basic personal information
      if (data.firstName) sanitized.firstName = sanitizers.text(data.firstName);
      if (data.lastName) sanitized.lastName = sanitizers.text(data.lastName);
      if (data.email) sanitized.email = sanitizers.email(data.email);
      if (data.phone) sanitized.phone = sanitizers.phone(data.phone);
      if (data.address) sanitized.address = sanitizers.text(data.address);
      if (data.city) sanitized.city = sanitizers.text(data.city);
      if (data.country) sanitized.country = sanitizers.text(data.country);
      if (data.zipCode) sanitized.zipCode = sanitizers.text(data.zipCode);
      
      // Owner extended personal fields
      if (data.alternativePhone) sanitized.alternativePhone = sanitizers.phone(data.alternativePhone);
      if (data.nationality) sanitized.nationality = sanitizers.text(data.nationality);
      if (data.passportNumber) sanitized.passportNumber = sanitizers.text(data.passportNumber);
      if (data.idNumber) sanitized.idNumber = sanitizers.text(data.idNumber);
      if (data.phoneCountryCode) sanitized.phoneCountryCode = sanitizers.text(data.phoneCountryCode);
      if (data.phoneDialCode) sanitized.phoneDialCode = sanitizers.text(data.phoneDialCode);
      if (data.alternativePhoneCountryCode) sanitized.alternativePhoneCountryCode = sanitizers.text(data.alternativePhoneCountryCode);
      if (data.alternativePhoneDialCode) sanitized.alternativePhoneDialCode = sanitizers.text(data.alternativePhoneDialCode);
      if (data.preferredLanguage) sanitized.preferredLanguage = sanitizers.text(data.preferredLanguage);
      if (data.communicationPreference) sanitized.communicationPreference = sanitizers.text(data.communicationPreference);
      if (data.notes) sanitized.notes = sanitizers.text(data.notes);
      
      // Owner company information
      if (data.companyName) sanitized.companyName = sanitizers.text(data.companyName);
      if (data.companyAddress) sanitized.companyAddress = sanitizers.text(data.companyAddress);
      if (data.companyTaxId) sanitized.companyTaxId = sanitizers.text(data.companyTaxId);
      if (data.companyVat) sanitized.companyVat = sanitizers.text(data.companyVat);
      
      // Owner manager information
      if (data.managerName) sanitized.managerName = sanitizers.text(data.managerName);
      if (data.managerEmail) sanitized.managerEmail = sanitizers.email(data.managerEmail);
      if (data.managerPhone) sanitized.managerPhone = sanitizers.phone(data.managerPhone);
      if (data.managerPhoneCountryCode) sanitized.managerPhoneCountryCode = sanitizers.text(data.managerPhoneCountryCode);
      if (data.managerPhoneDialCode) sanitized.managerPhoneDialCode = sanitizers.text(data.managerPhoneDialCode);
      
      // Owner type
      if (data.ownerType) sanitized.ownerType = sanitizers.text(data.ownerType);
      
      // =================================================================
      // STEP 3 – CONTRACTUAL DETAILS
      // =================================================================
      
      // Financial data
      if (data.commissionRate !== undefined) sanitized.commissionRate = sanitizers.number(data.commissionRate);
      if (data.managementFee !== undefined) sanitized.managementFee = sanitizers.number(data.managementFee);
      if (data.marketingFee !== undefined) sanitized.marketingFee = sanitizers.number(data.marketingFee);
      
      // Contract dates
      if (data.contractStartDate) sanitized.contractStartDate = sanitizers.text(data.contractStartDate);
      if (data.contractEndDate) sanitized.contractEndDate = sanitizers.text(data.contractEndDate);
      
      // Payout configuration
      if (data.payoutDay1 !== undefined) sanitized.payoutDay1 = sanitizers.integer(data.payoutDay1);
      if (data.payoutDay2 !== undefined) sanitized.payoutDay2 = sanitizers.integer(data.payoutDay2);
      
      // VAT and legal information
      if (data.vatRegistrationNumber) sanitized.vatRegistrationNumber = sanitizers.text(data.vatRegistrationNumber);
      if (data.dbdNumber) sanitized.dbdNumber = sanitizers.text(data.dbdNumber);
      if (data.vatPaymentTerms) sanitized.vatPaymentTerms = sanitizers.text(data.vatPaymentTerms);
      if (data.paymentTerms) sanitized.paymentTerms = sanitizers.text(data.paymentTerms);
      if (data.specialTerms) sanitized.specialTerms = sanitizers.text(data.specialTerms);
      
      // Insurance information
      if (data.insuranceProvider) sanitized.insuranceProvider = sanitizers.text(data.insuranceProvider);
      if (data.insurancePolicyNumber) sanitized.insurancePolicyNumber = sanitizers.text(data.insurancePolicyNumber);
      if (data.insuranceExpiry) sanitized.insuranceExpiry = sanitizers.text(data.insuranceExpiry);
      
      // Check-in/out configuration
      if (data.checkInTime) sanitized.checkInTime = sanitizers.text(data.checkInTime);
      if (data.checkOutTime) sanitized.checkOutTime = sanitizers.text(data.checkOutTime);
      if (data.minimumStayNights !== undefined) sanitized.minimumStayNights = sanitizers.integer(data.minimumStayNights);
      if (data.paymentThroughIPL !== undefined) sanitized.paymentThroughIPL = sanitizers.boolean(data.paymentThroughIPL);
      
      // Tags array
      if (data.tags) sanitized.tags = sanitizers.array(data.tags, sanitizers.text);

      // =================================================================
      // STEP 4 – BANK DETAILS  
      // =================================================================
      
      // Bank account holder information
      if (data.accountHolderName) sanitized.accountHolderName = sanitizers.text(data.accountHolderName);
      if (data.bankName) sanitized.bankName = sanitizers.text(data.bankName);
      if (data.accountNumber) sanitized.accountNumber = sanitizers.text(data.accountNumber);
      if (data.iban) sanitized.iban = sanitizers.text(data.iban);
      if (data.swiftCode) sanitized.swiftCode = sanitizers.text(data.swiftCode);
      
      // Bank branch information
      if (data.branchName) sanitized.branchName = sanitizers.text(data.branchName);
      if (data.branchCode) sanitized.branchCode = sanitizers.text(data.branchCode);
      if (data.branchAddress) sanitized.branchAddress = sanitizers.text(data.branchAddress);
      if (data.bankCountry) sanitized.bankCountry = sanitizers.text(data.bankCountry);
      
      // Account configuration
      if (data.currency) sanitized.currency = sanitizers.text(data.currency);
      if (data.accountType) sanitized.accountType = sanitizers.text(data.accountType);
      if (data.notes) sanitized.notes = sanitizers.text(data.notes);
      // =================================================================
      // STEP 5 – OTA CREDENTIALS
      // =================================================================
      
      // Online Travel Agency platform credentials
      if (data.platforms && Array.isArray(data.platforms)) {
        sanitized.platforms = data.platforms.map((platform: any) => ({
          platform: sanitizers.text(platform.platform),
          username: platform.username ? sanitizers.text(platform.username) : null,
          password: platform.password ? sanitizers.text(platform.password) : null,
          propertyId: platform.propertyId ? sanitizers.text(platform.propertyId) : null,
          apiKey: platform.apiKey ? sanitizers.text(platform.apiKey) : null,
          apiSecret: platform.apiSecret ? sanitizers.text(platform.apiSecret) : null,
          listingUrl: platform.listingUrl ? sanitizers.url(platform.listingUrl) : null,
          accountUrl: platform.accountUrl ? sanitizers.url(platform.accountUrl) : null,
          propertyUrl: platform.propertyUrl ? sanitizers.url(platform.propertyUrl) : null,
          isActive: platform.isActive !== undefined ? sanitizers.boolean(platform.isActive) : true,
        }));
      }
      
      // Legacy OTA username fields (individual fields for backward compatibility)
      if (data.bookingComUsername) sanitized.bookingComUsername = sanitizers.email(data.bookingComUsername);
      if (data.airbnbUsername) sanitized.airbnbUsername = sanitizers.email(data.airbnbUsername);
      if (data.vrboUsername) sanitized.vrboUsername = sanitizers.email(data.vrboUsername);
      
      // =================================================================
      // STEP 6 – DOCUMENTS
      // =================================================================
      
      // Document metadata arrays (uploads handled elsewhere)
      if (data.documents && Array.isArray(data.documents)) {
        try {
          sanitized.documents = sanitizers.json(data.documents);
        } catch {
          sanitized.documents = [];
        }
      }

      // =================================================================
      // STEP 7 – STAFF CONFIGURATION
      // =================================================================
      
      // Staff members array with comprehensive sanitization
      if (data.staff && Array.isArray(data.staff)) {
        sanitized.staff = data.staff.map((staffMember: any) => {
          const sanitizedStaff: any = {};
          
          // Personal Information
          if (staffMember.firstName) sanitizedStaff.firstName = sanitizers.text(staffMember.firstName);
          if (staffMember.lastName) sanitizedStaff.lastName = sanitizers.text(staffMember.lastName);
          if (staffMember.nickname) sanitizedStaff.nickname = sanitizers.text(staffMember.nickname);
          if (staffMember.email) sanitizedStaff.email = sanitizers.email(staffMember.email);
          if (staffMember.phone) sanitizedStaff.phone = sanitizers.phone(staffMember.phone);
          
          // ID Documents - Handle both frontend and backend field names
          if (staffMember.idNumber) sanitizedStaff.idNumber = sanitizers.text(staffMember.idNumber);
          if (staffMember.idCard) sanitizedStaff.idNumber = sanitizers.text(staffMember.idCard); // Map idCard -> idNumber
          if (staffMember.passportNumber) sanitizedStaff.passportNumber = sanitizers.text(staffMember.passportNumber);
          if (staffMember.nationality) sanitizedStaff.nationality = sanitizers.text(staffMember.nationality);
          if (staffMember.dateOfBirth) sanitizedStaff.dateOfBirth = sanitizers.text(staffMember.dateOfBirth);
          
          // Phone country codes
          if (staffMember.phoneCountryCode) sanitizedStaff.phoneCountryCode = sanitizers.text(staffMember.phoneCountryCode);
          if (staffMember.phoneDialCode) sanitizedStaff.phoneDialCode = sanitizers.text(staffMember.phoneDialCode);
          
          // Employment Information
          if (staffMember.position) sanitizedStaff.position = sanitizers.text(staffMember.position);
          if (staffMember.department) sanitizedStaff.department = sanitizers.text(staffMember.department);
          if (staffMember.employmentType) sanitizedStaff.employmentType = sanitizers.text(staffMember.employmentType);
          if (staffMember.startDate) sanitizedStaff.startDate = sanitizers.text(staffMember.startDate);
          if (staffMember.endDate) sanitizedStaff.endDate = sanitizers.text(staffMember.endDate);
          
          // Salary and Financial - Handle field mapping
          if (staffMember.salary !== undefined) sanitizedStaff.salary = sanitizers.number(staffMember.salary);
          if (staffMember.baseSalary !== undefined) sanitizedStaff.salary = sanitizers.number(staffMember.baseSalary); // Map baseSalary -> salary
          if (staffMember.salaryFrequency) sanitizedStaff.salaryFrequency = sanitizers.text(staffMember.salaryFrequency);
          if (staffMember.currency) sanitizedStaff.currency = sanitizers.text(staffMember.currency);
          if (staffMember.numberOfDaySalary !== undefined) sanitizedStaff.numberOfDaySalary = sanitizers.integer(staffMember.numberOfDaySalary);
          if (staffMember.serviceCharge !== undefined) sanitizedStaff.serviceCharge = sanitizers.number(staffMember.serviceCharge);
          if (staffMember.totalIncome !== undefined) sanitizedStaff.totalIncome = sanitizers.number(staffMember.totalIncome);
          if (staffMember.totalNetIncome !== undefined) sanitizedStaff.totalNetIncome = sanitizers.number(staffMember.totalNetIncome);
          
          // Handle both otherDeduct and otherDeductions field names
          if (staffMember.otherDeductions !== undefined) sanitizedStaff.otherDeductions = sanitizers.number(staffMember.otherDeductions);
          if (staffMember.otherDeduct !== undefined) sanitizedStaff.otherDeductions = sanitizers.number(staffMember.otherDeduct); // Map otherDeduct -> otherDeductions
          
          // Benefits and Allowances
          if (staffMember.hasAccommodation !== undefined) sanitizedStaff.hasAccommodation = sanitizers.boolean(staffMember.hasAccommodation);
          if (staffMember.hasTransport !== undefined) sanitizedStaff.hasTransport = sanitizers.boolean(staffMember.hasTransport);
          if (staffMember.hasHealthInsurance !== undefined) sanitizedStaff.hasHealthInsurance = sanitizers.boolean(staffMember.hasHealthInsurance);
          if (staffMember.hasWorkInsurance !== undefined) sanitizedStaff.hasWorkInsurance = sanitizers.boolean(staffMember.hasWorkInsurance);
          if (staffMember.foodAllowance !== undefined) sanitizedStaff.foodAllowance = sanitizers.boolean(staffMember.foodAllowance);
          if (staffMember.transportation) sanitizedStaff.transportation = sanitizers.text(staffMember.transportation);
          
          // Personal Details
          if (staffMember.maritalStatus !== undefined) sanitizedStaff.maritalStatus = sanitizers.boolean(staffMember.maritalStatus);
          
          // Emergency Contacts - Handle array with proper sanitization
          if (staffMember.emergencyContacts && Array.isArray(staffMember.emergencyContacts)) {
            sanitizedStaff.emergencyContacts = staffMember.emergencyContacts
              .filter((contact: any) => contact.firstName || contact.lastName || contact.phone) // Only keep meaningful contacts
              .map((contact: any) => ({
                firstName: contact.firstName ? sanitizers.text(contact.firstName) : '',
                lastName: contact.lastName ? sanitizers.text(contact.lastName) : '',
                phone: contact.phone ? sanitizers.phone(contact.phone) : '',
                phoneCountryCode: contact.phoneCountryCode ? sanitizers.text(contact.phoneCountryCode) : '',
                phoneDialCode: contact.phoneDialCode ? sanitizers.text(contact.phoneDialCode) : '',
                email: contact.email ? sanitizers.email(contact.email) : '',
                relationship: contact.relationship ? sanitizers.text(contact.relationship) : 'OTHER'
              }));
          }
          
          // Status
          if (staffMember.isActive !== undefined) sanitizedStaff.isActive = sanitizers.boolean(staffMember.isActive);
          
          return sanitizedStaff;
        }).filter((staff: any) => staff.firstName || staff.lastName); // Only keep staff with at least a name
      }

      // =================================================================
      // STEP 8 – FACILITIES CHECKLIST
      // =================================================================
      
      // Enhanced facilities sanitization with validation and logging
      if (data.facilities && Array.isArray(data.facilities)) {
        if (SANITIZER_DEBUG_ENABLED) {
          console.log(`[SANITIZER] Processing ${data.facilities.length} facilities`);
        }
        
        const validCategories = [
          'property_layout_spaces', 'occupancy_sleeping', 'bathrooms', 'kitchen_dining',
          'service_staff', 'living_spaces', 'outdoor_facilities', 'home_office',
          'entertainment_gaming', 'technology', 'wellness_spa', 'accessibility',
          'safety_security', 'child_friendly',
          // Legacy categories
          'KITCHEN_EQUIPMENT', 'BATHROOM_AMENITIES', 'BEDROOM_AMENITIES',
          'LIVING_ROOM', 'OUTDOOR_FACILITIES', 'POOL_AREA', 'ENTERTAINMENT', 'SAFETY_SECURITY'
        ];
        
        sanitized.facilities = data.facilities
          .map((item: any, index: number) => {
            // Enhanced validation with detailed logging
            if (!item.category || !item.itemName) {
              if (SANITIZER_DEBUG_ENABLED) {
                console.warn(`[SANITIZER] Skipping facility ${index + 1}: missing category or itemName`, {
                  category: item.category,
                  itemName: item.itemName
                });
              }
              return null;
            }
            
            // Validate category
            if (!validCategories.includes(item.category) && SANITIZER_DEBUG_ENABLED) {
              console.warn(`[SANITIZER] Invalid category "${item.category}" for facility "${item.itemName}"`);
            }
            
            const sanitizedItem = {
              category: sanitizers.text(item.category),
              subcategory: item.subcategory ? sanitizers.text(item.subcategory).substring(0, 100) : '',
              itemName: sanitizers.text(item.itemName).substring(0, 200),
              // Handle both 'available' and 'isAvailable' field names
              isAvailable: item.isAvailable !== undefined 
                ? sanitizers.boolean(item.isAvailable)
                : item.available !== undefined 
                  ? sanitizers.boolean(item.available)
                  : false,
              quantity: item.quantity !== undefined && item.quantity !== null 
                ? Math.max(0, sanitizers.integer(item.quantity) || 0)
                : null,
              condition: item.condition && ['new', 'good', 'fair', 'poor'].includes(item.condition)
                ? sanitizers.text(item.condition)
                : 'good',
              notes: item.notes ? sanitizers.text(item.notes).substring(0, 1000) : '',
              specifications: item.specifications ? sanitizers.text(item.specifications).substring(0, 1000) : '',
              photoUrl: item.photoUrl ? sanitizers.url(item.photoUrl) : null,
              productLink: item.productLink ? sanitizers.url(item.productLink) : null,
              checkedBy: item.checkedBy ? sanitizers.text(item.checkedBy).substring(0, 100) : null,
              lastCheckedAt: item.lastCheckedAt ? sanitizers.text(item.lastCheckedAt) : null,
            };
            
            if (SANITIZER_DEBUG_ENABLED) {
              console.debug(`[SANITIZER] Sanitized facility: ${sanitizedItem.category}/${sanitizedItem.itemName} (available: ${sanitizedItem.isAvailable})`);
            }
            return sanitizedItem;
          })
          .filter(Boolean); // Remove invalid facilities
          
        if (SANITIZER_DEBUG_ENABLED) {
          console.log(`[SANITIZER] Facilities sanitization completed: ${sanitized.facilities.length} valid facilities`);
        }
      }
      
      // =================================================================
      // STEP 9 – PHOTOS/BEDROOMS CONFIGURATION
      // =================================================================
      
      // Bedroom configuration data (stored in field progress for step 9)
      if (data.bedrooms && Array.isArray(data.bedrooms)) {
        try {
          sanitized.bedrooms = sanitizers.json(data.bedrooms);
        } catch {
          sanitized.bedrooms = [];
        }
      }

      // =================================================================
      // STEP 10 – REVIEW & SUBMIT
      // =================================================================
      
      // Final review and submission data
      if (data.reviewNotes) sanitized.reviewNotes = sanitizers.text(data.reviewNotes);
      if (data.agreedToTerms !== undefined) sanitized.agreedToTerms = sanitizers.boolean(data.agreedToTerms);
      if (data.dataAccuracyConfirmed !== undefined) sanitized.dataAccuracyConfirmed = sanitizers.boolean(data.dataAccuracyConfirmed);

      // Pass through safe enum values and booleans
      const safeFields = [
        'propertyType', 'villaStyle', 'locationType', 'contractType', 'paymentSchedule', 
        'cancellationPolicy', 'status', 'isActive', 'completed'
      ];
      
      safeFields.forEach(field => {
        if (data[field] !== undefined) {
          if (typeof data[field] === 'boolean') {
            sanitized[field] = sanitizers.boolean(data[field]);
          } else {
            sanitized[field] = sanitizers.text(data[field]);
          }
        }
      });
      
      return sanitized;
    },
    completed: sanitizers.boolean,
    isAutoSave: sanitizers.boolean,
    clientTimestamp: sanitizers.text,
    operationId: sanitizers.integer,
    version: sanitizers.integer,
  },
});

const onboardingStepValidation = createValidationMiddleware({
  params: {
    villaId: [validators.required, validators.uuid],
  },
  body: {
    step: [validators.required, validators.integer, (v) => validators.range(v, 1, 10)],
    completed: [validators.required],
    isAutoSave: [],
  },
});

// Validation schemas
const updateStepSchema = z.object({
  body: z.object({
    step: z.number().int().min(1).max(10),
    data: z.any(),
    completed: z.boolean(),
    isAutoSave: z.boolean().optional(),
    clientTimestamp: z.string().optional(),
    operationId: z.number().int().optional(),
    version: z.number().int().optional(),
  }),
});

const submitReviewSchema = z.object({
  params: z.object({
    villaId: z.string().uuid(),
  }),
});

const startOnboardingSchema = z.object({
  body: z.object({
    villaName: z.string().optional().default('New Villa'),
  }),
});

const approveRejectSchema = z.object({
  params: z.object({
    villaId: z.string().uuid(),
  }),
  body: z.object({
    notes: z.string().optional(),
    reason: z.string().optional(),
  }),
});

// Smart rate limiting middleware that detects auto-save requests
const smartOnboardingRateLimit = (req: any, res: any, next: any) => {
  // Check if this is an auto-save request (could be header or body flag)
  const isAutoSave = req.headers['x-auto-save'] === 'true' || req.body?.isAutoSave === true;
  
  if (isAutoSave) {
    return autoSaveRateLimit(req, res, next);
  } else {
    return onboardingRateLimit(req, res, next);
  }
};

// Start onboarding (creates villa and initializes progress)
router.post('/start', 
  onboardingRateLimit, 
  authenticate, 
  validateRequest(startOnboardingSchema),
  async (req: Request, res: Response) => {
  try {
    const { villaName } = req.body;
    const userId = req.user?.id || 'system';
    
    // Create villa for onboarding - no default name
    const villa = await villaService.createVillaForOnboarding({
      name: villaName || '',
      owner_id: userId
    });
    
    // Initialize enhanced progress tracking
    await onboardingService.initializeEnhancedProgress(villa.id, userId);
    
    // Get the complete progress data
    const progress = await onboardingService.getOnboardingProgress(villa.id, userId);
    
    res.json({
      success: true,
      data: {
        villaId: villa.id,
        villaCode: villa.villaCode,
        villaName: villa.villaName,
        progress
      },
      message: 'Onboarding started successfully',
    });
  } catch (error) {
    console.error('Error starting onboarding:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start onboarding',
    });
  }
});

// Get onboarding progress for a villa (with caching) - BOTH routes for compatibility
router.get('/:villaId/progress',
  onboardingReadRateLimit,
  authenticate,
  cacheMiddleware(CacheDuration.SHORT),
  async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const userId = req.user?.id;

    const progress = await onboardingService.getOnboardingProgress(villaId, userId);

    logger.debug('[VILLA] API Response - Villa data summary:', {
      villaId: progress.villa?.id,
      villaFields: Object.keys(progress.villa || {}),
      staffCount: progress.villa?.staff?.length || 0,
      documentCount: progress.villa?.documents?.length || 0,
      photoCount: progress.villa?.photos?.length || 0,
    });
    // 🔍 STAFF DEBUG: Log staff data specifically (without full payload)
    if (progress.villa?.staff?.length) {
      logger.info('🔍 [STAFF-DEBUG] Staff data in API response:', {
        villaId: progress.villa?.id,
        hasVilla: true,
        staffCount: progress.villa.staff.length,
        staffSample: progress.villa.staff.slice(0, 3).map((s: any) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          position: s.position,
        })),
      });
    } else {
      logger.info('🔍 [STAFF-DEBUG] No active staff linked to villa.', {
        villaId: progress.villa?.id,
      });
    }

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('Error getting onboarding progress:', error);
    const message = error instanceof Error ? error.message : 'Failed to get onboarding progress';
    const status = typeof message === 'string' && message.toLowerCase().includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      message,
    });
  }
});

// Get onboarding progress for a villa (with caching) - Legacy route for backward compatibility
router.get('/:villaId',
  onboardingReadRateLimit,
  authenticate,
  cacheMiddleware(CacheDuration.SHORT),
  async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const userId = req.user?.id;
    
    const progress = await onboardingService.getOnboardingProgress(villaId, userId);
    
    logger.debug('[VILLA] API Response - Villa data summary:', {
      villaId: progress.villa?.id,
      villaFields: Object.keys(progress.villa || {}),
      staffCount: progress.villa?.staff?.length || 0,
      documentCount: progress.villa?.documents?.length || 0,
      photoCount: progress.villa?.photos?.length || 0,
    });

    // 🔍 STAFF DEBUG: Log staff data specifically (without full payload)
    if (progress.villa?.staff?.length) {
      logger.info('🔍 [STAFF-DEBUG] Staff data in API response:', {
        villaId: progress.villa?.id,
        hasVilla: true,
        staffCount: progress.villa.staff.length,
        staffSample: progress.villa.staff.slice(0, 3).map((s: any) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          position: s.position,
        })),
      });
    } else {
      logger.info('🔍 [STAFF-DEBUG] No active staff linked to villa.', {
        villaId: progress.villa?.id,
      });
    }
    
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('Error getting onboarding progress:', error);
    const message = error instanceof Error ? error.message : 'Failed to get onboarding progress';
    const status = typeof message === 'string' && message.toLowerCase().includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      message,
    });
  }
});

// Auto-save onboarding step (compatible with frontend AutoSaveQueue)
router.post('/:villaId/autosave',
  autoSaveRateLimit,
  authenticate,
  createSanitizationMiddleware({
    params: {
      villaId: sanitizers.text,
    },
    body: {
      step: sanitizers.integer,
      data: (data: any) => {
        if (typeof data !== 'object' || data === null) return {};

        // Use the same sanitization as the main step route
        const sanitized: any = {};

        // Villa basic information
        if (data.villaName) sanitized.villaName = sanitizers.text(data.villaName);
        if (data.address) sanitized.address = sanitizers.text(data.address);
        if (data.villaAddress) sanitized.address = sanitizers.text(data.villaAddress);
        if (data.city) sanitized.city = sanitizers.text(data.city);
        if (data.villaCity) sanitized.city = sanitizers.text(data.villaCity);
        if (data.country) sanitized.country = sanitizers.text(data.country);
        if (data.villaCountry) sanitized.country = sanitizers.text(data.villaCountry);
        if (data.zipCode) sanitized.zipCode = sanitizers.text(data.zipCode);
        if (data.villaPostalCode) sanitized.zipCode = sanitizers.text(data.villaPostalCode);
        if (data.description) sanitized.description = sanitizers.richText(data.description, 'moderate');
        if (data.shortDescription) sanitized.shortDescription = sanitizers.richText(data.shortDescription, 'strict');

        // Property details
        if (data.bedrooms !== undefined) sanitized.bedrooms = sanitizers.integer(data.bedrooms);
        if (data.bathrooms !== undefined) sanitized.bathrooms = sanitizers.integer(data.bathrooms);
        if (data.maxGuests !== undefined) sanitized.maxGuests = sanitizers.integer(data.maxGuests);
        if (data.propertySize !== undefined) sanitized.propertySize = sanitizers.number(data.propertySize);
        if (data.plotSize !== undefined) sanitized.plotSize = sanitizers.number(data.plotSize);
        if (data.villaArea !== undefined) sanitized.propertySize = sanitizers.number(data.villaArea);
        if (data.landArea !== undefined) sanitized.plotSize = sanitizers.number(data.landArea);

        // Villa contact and links
        if (data.propertyEmail) sanitized.propertyEmail = sanitizers.email(data.propertyEmail);
        if (data.propertyWebsite) sanitized.propertyWebsite = sanitizers.url(data.propertyWebsite);
        if (data.googleMapsLink) sanitized.googleMapsLink = sanitizers.url(data.googleMapsLink);
        if (data.oldRatesCardLink) sanitized.oldRatesCardLink = sanitizers.url(data.oldRatesCardLink);
        if (data.iCalCalendarLink) sanitized.iCalCalendarLink = sanitizers.url(data.iCalCalendarLink);

        return sanitized;
      },
      version: sanitizers.integer,
      clientTimestamp: sanitizers.text,
      operationId: (val: any) => val ? sanitizers.text(val) : undefined,
    },
  }),
  async (req: Request, res: Response) => {
    try {
      const { villaId } = req.params;
      const { step, data: stepData, version, clientTimestamp, operationId } = req.body;
      const userId = req.user?.id;

      if (!ONBOARDING_STEPS.includes(step)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid step number',
        });
      }

      const typedStep = step as OnboardingStep;

      // Validate and canonicalize step data
      const validationResult = safeValidateStepPayload(typedStep, stepData, false);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid step payload',
          errors: validationResult.errors,
        });
      }

      const normalizedStepData = {
        step: typedStep,
        data: validationResult.data,
        completed: false,
        isAutoSave: true,
        clientTimestamp,
        operationId,
        version,
      };

      const { progress, version: nextVersion } = await onboardingService.updateStep(villaId, normalizedStepData, userId);

      res.json({
        success: true,
        data: progress,
        version: nextVersion,
        message: `Step ${step} auto-saved successfully`,
      });
    } catch (error) {
      console.error('Error auto-saving onboarding step:', error);

      if (error instanceof VersionConflictError) {
        return res.status(409).json({
          success: false,
          message: 'Version conflict - data was updated by another process',
          code: 'VERSION_CONFLICT',
          retryAfter: 1,
        });
      }

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Auto-save failed',
      });
    }
  }
);

// Lightweight onboarding progress summary (optimized for dashboard)
router.get('/:villaId/summary',
  onboardingReadRateLimit,
  authenticate,
  cacheMiddleware(CacheDuration.SHORT),
  async (req: Request, res: Response) => {
    try {
      const { villaId } = req.params;
      const userId = req.user?.id;

      const summary = await onboardingService.getOnboardingProgressSummary(villaId, userId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error getting onboarding summary:', error);
      const message = error instanceof Error ? error.message : 'Failed to get onboarding summary';
      const status = typeof message === 'string' && message.toLowerCase().includes('not found') ? 404 : 500;
      res.status(status).json({
        success: false,
        message,
      });
    }
  });

// Update onboarding step (with cache invalidation and smart rate limiting)
router.put('/:villaId/step', 
  smartOnboardingRateLimit, 
  onboardingStepSanitization, 
  onboardingStepValidation, 
  authenticate, 
  validateRequest(updateStepSchema),
  invalidateCache(['onboarding']), // Invalidate cache on update
  async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const stepData = req.body;
    const userId = req.user?.id || 'system';

    const numericStep = Number(stepData.step);
    if (!ONBOARDING_STEPS.includes(numericStep as OnboardingStep)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported step number: ${stepData.step}`,
      });
    }

    const typedStep = numericStep as OnboardingStep;
    const isAutoSave = stepData.isAutoSave === true;
    const requestVersion = typeof stepData.version === 'number' ? stepData.version : undefined;
    const shouldEnforceRequired = Boolean(stepData.completed) && !isAutoSave && !(stepData.data?.skipped === true);
    const validationResult = safeValidateStepPayload(typedStep, stepData.data, shouldEnforceRequired);

    if (!validationResult.success) {
      return res.status(422).json({
        success: false,
        message: 'Invalid step payload',
        errors: validationResult.errors,
      });
    }

    const normalizedStepData = {
      step: typedStep,
      data: validationResult.data,
      completed: shouldEnforceRequired,
      isAutoSave,
      clientTimestamp: stepData.clientTimestamp,
      operationId: stepData.operationId,
      version: requestVersion,
    };

    const { progress, version: nextVersion } = await onboardingService.updateStep(villaId, normalizedStepData, userId);

    res.json({
      success: true,
      data: progress,
      version: nextVersion,
      message: `Step ${stepData.step} updated successfully`,
    });
  } catch (error) {
    console.error('Error updating onboarding step:', error);
    if (error instanceof VersionConflictError) {
      return res.status(409).json({
        success: false,
        message: error instanceof Error ? error.message : 'Version conflict',
      });
    }
    const message = error instanceof Error ? error.message : 'Failed to update onboarding step';
    const lower = typeof message === 'string' ? message.toLowerCase() : '';
    const status = lower.includes('not found') ? 404 : 400;
    res.status(status).json({
      success: false,
      message,
    });
  }
});

// Idempotent auto-save endpoint supporting partial payloads via PATCH
router.patch('/:villaId/step/:step',
  autoSaveRateLimit,
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { villaId, step } = req.params;
      const userId = req.user?.id || 'system';
      const stepNumber = parseInt(step, 10);

      if (isNaN(stepNumber) || !ONBOARDING_STEPS.includes(stepNumber as OnboardingStep)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid step number',
        });
      }

      const typedStep = stepNumber as OnboardingStep;
      const payload = req.body?.data ?? req.body?.payload ?? req.body?.stepData ?? req.body;
      const version = typeof req.body?.version === 'number' ? req.body.version : undefined;

      if (version === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Version is required for auto-save operations',
        });
      }

      const validationResult = safeValidateStepPayload(typedStep, payload, false);

      if (!validationResult.success) {
        return res.status(422).json({
          success: false,
          message: 'Invalid step payload',
          errors: validationResult.errors,
        });
      }

      const { progress, version: nextVersion } = await onboardingService.updateStep(villaId, {
        step: typedStep,
        data: validationResult.data,
        completed: false,
        isAutoSave: true,
        clientTimestamp: req.body?.clientTimestamp,
        operationId: req.body?.operationId,
        version,
      }, userId);

      res.json({
        success: true,
        data: progress,
        version: nextVersion,
        message: `Step ${stepNumber} auto-saved successfully`,
      });
    } catch (error) {
      console.error('Error auto-saving onboarding step:', error);
      if (error instanceof VersionConflictError) {
        return res.status(409).json({
          success: false,
          message: error instanceof Error ? error.message : 'Version conflict',
        });
      }

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Auto-save failed',
      });
    }
  });

// Validate specific step
router.get('/:villaId/validate/:step', onboardingReadRateLimit, authenticate, async (req: Request, res: Response) => {
  try {
    const { villaId, step } = req.params;
    const stepNumber = parseInt(step, 10);
    
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid step number',
      });
    }
    
    const validation = await onboardingService.validateStep(villaId, stepNumber);
    
    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error('Error validating step:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to validate step',
    });
  }
});

// Complete onboarding (mark as fully complete)
router.post('/:villaId/complete', onboardingCompleteRateLimit, authenticate, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    
    // Mark onboarding as complete and villa as active
    const progress = await onboardingService.completeOnboarding(villaId);
    
    res.json({
      success: true,
      data: progress,
      message: 'Onboarding completed successfully',
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to complete onboarding',
    });
  }
});

// Submit for review
router.post('/:villaId/submit-review', onboardingCompleteRateLimit, authenticate, async (_req: Request, res: Response) => {
  return res.status(410).json({ success: false, message: 'Admin approval system has been removed' });
});

// Approve onboarding (Admin only)
router.post('/:villaId/approve', authenticate, async (_req: Request, res: Response) => {
  return res.status(410).json({ success: false, message: 'Admin approval system has been removed' });
});

// Reject onboarding (Admin only)
router.post('/:villaId/reject', authenticate, async (_req: Request, res: Response) => {
  return res.status(410).json({ success: false, message: 'Admin approval system has been removed' });
});

// Auto-save field progress endpoint
router.put('/:villaId/field-progress/:step/:field', 
  autoSaveRateLimit,
  authenticate,
  async (req: Request, res: Response) => {
  try {
    const { villaId, step, field } = req.params;
    const { value } = req.body;
    const stepNumber = parseInt(step, 10);
    const userId = req.user?.id || 'system';
    
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid step number',
      });
    }
    
    // Auto-save field progress
    await onboardingService.saveFieldProgress(villaId, stepNumber, field, value, userId);
    
    res.json({
      success: true,
      message: 'Field progress auto-saved successfully',
    });
  } catch (error) {
    console.error('Error auto-saving field progress:', error);
    res.status(500).json({
      success: false,
      message: 'Auto-save failed',
    });
  }
});

// Get field progress for a specific step (for auto-save restoration)
router.get('/:villaId/field-progress/:step', 
  onboardingReadRateLimit,
  authenticate,
  cacheMiddleware(CacheDuration.SHORT),
  async (req: Request, res: Response) => {
  try {
    const { villaId, step } = req.params;
    const stepNumber = parseInt(step, 10);
    
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid step number',
      });
    }
    
    const fieldProgress = await onboardingService.getFieldProgress(villaId, stepNumber);
    
    res.json({
      success: true,
      data: fieldProgress,
    });
  } catch (error) {
    console.error('Error getting field progress:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get field progress',
    });
  }
});

export default router;
