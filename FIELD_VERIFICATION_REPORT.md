# Field Verification Report - Database Schema vs Frontend Forms

## 🔍 Complete Field Mapping Verification

### ✅ Step 1: Villa Information

**Database Table:** `Villa`

| Database Field | Frontend Field | Status | Notes |
|----------------|----------------|--------|-------|
| villaCode | ❌ MISSING | ⚠️ | Required unique field - needs to be added |
| villaName | villaName | ✅ | Correct |
| address | address | ✅ | Correct |
| city | city | ✅ | Correct |
| country | country | ✅ | Correct |
| zipCode | zipCode | ✅ | Correct |
| latitude | latitude | ✅ | Correct |
| longitude | longitude | ✅ | Correct |
| bedrooms | bedrooms | ✅ | Correct |
| bathrooms | bathrooms | ✅ | Correct |
| maxGuests | maxGuests | ✅ | Correct |
| propertySize | propertySize | ✅ | Correct |
| plotSize | plotSize | ✅ | Correct |
| yearBuilt | yearBuilt | ✅ | Correct |
| renovationYear | renovationYear | ✅ | Correct |
| propertyType | propertyType | ✅ | Correct |
| villaStyle | villaStyle | ✅ | Correct |
| locationType | locationType | ✅ | Correct |
| description | description | ✅ | Correct |
| shortDescription | shortDescription | ✅ | Correct |
| googleMapsLink | googleMapsLink | ✅ | Correct |
| iCalCalendarLink | iCalCalendarLink | ✅ | Correct |
| oldRatesCardLink | oldRatesCardLink | ✅ | Correct |
| propertyEmail | propertyEmail | ✅ | Correct |
| propertyWebsite | propertyWebsite | ✅ | Correct |

**Issue Found:** `villaCode` is missing from frontend form!

---

### ✅ Step 2: Owner Details

**Database Table:** `Owner`

| Database Field | Frontend Field | Status | Notes |
|----------------|----------------|--------|-------|
| ownerType | ownerType | ✅ | Correct |
| firstName | firstName | ✅ | Correct |
| lastName | lastName | ✅ | Correct |
| email | email | ✅ | Correct |
| phone | phone | ✅ | Correct |
| phoneCountryCode | phoneCountryCode | ✅ | Correct |
| phoneDialCode | phoneDialCode | ✅ | Correct |
| alternativePhone | alternativePhone | ✅ | Correct |
| alternativePhoneCountryCode | alternativePhoneCountryCode | ✅ | Correct |
| alternativePhoneDialCode | alternativePhoneDialCode | ✅ | Correct |
| nationality | nationality | ✅ | Correct |
| passportNumber | passportNumber | ✅ | Correct |
| idNumber | idNumber | ✅ | Correct |
| address | address | ✅ | Correct |
| city | city | ✅ | Correct |
| country | country | ✅ | Correct |
| zipCode | zipCode | ✅ | Correct |
| preferredLanguage | preferredLanguage | ✅ | Correct |
| communicationPreference | communicationPreference | ✅ | Correct |
| companyName | companyName | ✅ | Correct |
| companyAddress | companyAddress | ✅ | Correct |
| companyTaxId | companyTaxId | ✅ | Correct |
| companyVat | companyVat | ✅ | Correct |
| managerName | managerName | ✅ | Correct |
| managerEmail | managerEmail | ✅ | Correct |
| managerPhone | managerPhone | ✅ | Correct |
| managerPhoneCountryCode | managerPhoneCountryCode | ✅ | Correct |
| managerPhoneDialCode | managerPhoneDialCode | ✅ | Correct |
| propertyEmail | propertyEmail | ✅ | Correct |
| propertyWebsite | propertyWebsite | ✅ | Correct |
| notes | notes | ✅ | Correct |

---

### ✅ Step 3: Contractual Details

**Database Table:** `ContractualDetails`

| Database Field | Frontend Field | Status | Notes |
|----------------|----------------|--------|-------|
| contractStartDate | contractStartDate | ✅ | Correct |
| contractEndDate | contractEndDate | ✅ | Correct |
| contractType | contractType | ✅ | Correct |
| commissionRate | commissionRate | ✅ | Correct |
| managementFee | managementFee | ✅ | Correct |
| marketingFee | marketingFee | ✅ | Correct |
| paymentTerms | paymentTerms | ✅ | Correct |
| paymentSchedule | paymentSchedule | ✅ | Correct |
| paymentThroughIPL | paymentThroughIPL | ✅ | Correct |
| payoutDay1 | payoutDay1 | ✅ | Correct |
| payoutDay2 | payoutDay2 | ✅ | Correct |
| minimumStayNights | minimumStayNights | ✅ | Correct |
| cancellationPolicy | cancellationPolicy | ✅ | Correct |
| checkInTime | checkInTime | ✅ | Correct |
| checkOutTime | checkOutTime | ✅ | Correct |
| insuranceProvider | insuranceProvider | ✅ | Correct |
| insurancePolicyNumber | insurancePolicyNumber | ✅ | Correct |
| insuranceExpiry | insuranceExpiry | ✅ | Correct |
| vatRegistrationNumber | vatRegistrationNumber | ✅ | Correct |
| vatPaymentTerms | vatPaymentTerms | ✅ | Correct |
| dbdNumber | dbdNumber | ✅ | Correct |
| specialTerms | specialTerms | ✅ | Correct |

---

### ✅ Step 4: Bank Details

**Database Table:** `BankDetails`

| Database Field | Frontend Field | Status | Notes |
|----------------|----------------|--------|-------|
| accountHolderName | accountHolderName | ✅ | Correct |
| bankName | bankName | ✅ | Correct |
| accountNumber | accountNumber | ✅ | Correct |
| iban | iban | ✅ | Correct |
| swiftCode | swiftCode | ✅ | Correct |
| branchCode | branchCode | ✅ | Correct |
| branchName | branchName | ✅ | Correct |
| branchAddress | branchAddress | ✅ | Correct |
| currency | currency | ✅ | Correct |
| accountType | accountType | ✅ | Correct |
| bankAddress | bankAddress | ✅ | Correct |
| bankCountry | bankCountry | ✅ | Correct |
| notes | notes | ✅ | Correct |

---

### ⚠️ Step 5: OTA Credentials

**Database Table:** `OTACredentials` (Multiple records per villa)

**STRUCTURAL MISMATCH:** Frontend uses flat structure, database expects array of platform objects

Current Frontend Structure:
```javascript
{
  bookingComListed: false,
  bookingComUsername: '',
  bookingComPassword: '',
  bookingComPropertyId: '',
  // ... repeated for each platform
}
```

Expected Database Structure:
```javascript
[
  {
    platform: 'BOOKING_COM',
    username: '',
    password: '',
    propertyId: '',
    apiKey: '',
    apiSecret: '',
    accountUrl: '',
    propertyUrl: '',
    listingUrl: '',
    isActive: true
  },
  // ... one object per platform
]
```

---

### ✅ Step 6: Documents Upload

**Database Table:** `Document` (Multiple records per villa)

| Database Field | Frontend Field | Status | Notes |
|----------------|----------------|--------|-------|
| documentType | documentType | ✅ | Correct |
| fileName | fileName | ✅ | Correct |
| fileUrl | fileUrl | ✅ | Correct |
| fileSize | fileSize | ✅ | Correct |
| mimeType | mimeType | ✅ | Correct |
| description | description | ✅ | Correct |
| validFrom | validFrom | ✅ | Correct |
| validUntil | validUntil | ✅ | Correct |
| sharePointFileId | sharePointFileId | ✅ | Correct |
| sharePointPath | sharePointPath | ✅ | Correct |
| sharePointUrl | sharePointUrl | ✅ | Correct |
| storageLocation | storageLocation | ✅ | Correct |

---

### ✅ Step 7: Staff Configuration

**Database Table:** `Staff` (Multiple records per villa)

| Database Field | Frontend Field | Status | Notes |
|----------------|----------------|--------|-------|
| firstName | firstName | ✅ | Correct |
| lastName | lastName | ✅ | Correct |
| nickname | nickname | ✅ | Correct |
| email | email | ✅ | Correct |
| phone | phone | ✅ | Correct |
| dateOfBirth | dateOfBirth | ✅ | Correct |
| nationality | nationality | ✅ | Correct |
| idNumber | idCard | ⚠️ | Field name mismatch |
| passportNumber | passportNumber | ✅ | Correct |
| position | position | ✅ | Correct (with enum mapping) |
| department | ❌ MISSING | ⚠️ | Required field missing |
| employmentType | employmentType | ✅ | Correct |
| startDate | startDate | ✅ | Correct |
| endDate | ❌ MISSING | ℹ️ | Optional field missing |
| salary | baseSalary | ⚠️ | Field name mismatch |
| salaryFrequency | ❌ MISSING | ⚠️ | Required field missing |
| currency | currency | ✅ | Correct |
| numberOfDaySalary | numberOfDaySalary | ✅ | Correct |
| totalIncome | totalIncome | ✅ | Correct |
| serviceCharge | serviceCharge | ✅ | Correct |
| otherDeductions | otherDeduct | ⚠️ | Field name mismatch |
| totalNetIncome | totalNetIncome | ✅ | Correct |
| hasAccommodation | hasAccommodation | ✅ | Correct |
| hasTransport | ❌ MISSING | ⚠️ | Field missing |
| transportation | transportation | ✅ | Correct |
| hasHealthInsurance | healthInsurance | ⚠️ | Field name mismatch |
| hasWorkInsurance | workInsurance | ⚠️ | Field name mismatch |
| foodAllowance | foodAllowance | ✅ | Correct |
| maritalStatus | maritalStatus | ✅ | Correct |
| emergencyContacts | emergencyContacts | ✅ | Correct (JSON field) |

---

### ✅ Step 8: Facilities Checklist

**Database Table:** `FacilityChecklist` (Multiple records per villa)

| Database Field | Frontend Field | Status | Notes |
|----------------|----------------|--------|-------|
| category | category | ✅ | Correct |
| subcategory | subcategory | ✅ | Correct |
| itemName | itemName | ✅ | Correct |
| isAvailable | isAvailable | ✅ | Correct |
| quantity | quantity | ✅ | Correct |
| condition | condition | ✅ | Correct |
| notes | notes | ✅ | Correct |
| specifications | specifications | ✅ | Correct |
| photoUrl | photoUrl | ✅ | Correct |
| productLink | productLink | ✅ | Correct |
| lastCheckedAt | lastCheckedAt | ✅ | Correct |
| checkedBy | checkedBy | ✅ | Correct |

---

### ✅ Step 9: Photo Upload

**Database Table:** `Photo` (Multiple records per villa)

| Database Field | Frontend Field | Status | Notes |
|----------------|----------------|--------|-------|
| category | category | ✅ | Correct |
| subfolder | subfolder | ✅ | Correct |
| fileName | fileName | ✅ | Correct |
| fileUrl | fileUrl | ✅ | Correct |
| thumbnailUrl | thumbnailUrl | ✅ | Correct |
| fileSize | fileSize | ✅ | Correct |
| mimeType | mimeType | ✅ | Correct |
| width | width | ✅ | Correct |
| height | height | ✅ | Correct |
| caption | caption | ✅ | Correct |
| altText | altText | ✅ | Correct |
| tags | tags | ✅ | Correct |
| isMain | isMain | ✅ | Correct |
| sortOrder | sortOrder | ✅ | Correct |
| sharePointFileId | sharePointFileId | ✅ | Correct |
| sharePointPath | sharePointPath | ✅ | Correct |
| sharePointUrl | sharePointUrl | ✅ | Correct |
| storageLocation | storageLocation | ✅ | Correct |

---

## 🔴 Critical Issues Found

1. **Step 1:** Missing `villaCode` field (REQUIRED unique identifier)
2. **Step 5:** Structural mismatch - flat vs array structure
3. **Step 7:** Multiple field name mismatches:
   - `idCard` → should be `idNumber`
   - `baseSalary` → should be `salary`
   - `otherDeduct` → should be `otherDeductions`
   - `healthInsurance` → should be `hasHealthInsurance`
   - `workInsurance` → should be `hasWorkInsurance`
   - Missing: `department`, `salaryFrequency`, `hasTransport`, `endDate`

---

## 🛠️ Required Fixes

### Priority 1: Add villaCode to Step 1
- Add `villaCode` field to VillaInformationStepEnhanced
- Make it a required field with validation
- Ensure it's unique

### Priority 2: Fix Staff Configuration field names
- Rename fields to match database exactly
- Add missing required fields
- Update field mappings

### Priority 3: Restructure OTA Credentials
- Convert from flat structure to array of platform objects
- Update data transformation logic

---

## 📊 Data Flow Dependencies

### Backend Field Normalizer
Location: `backend/src/middleware/fieldNormalizer.ts`
- Currently maps old frontend names to database names
- Should be simplified/removed once frontend uses correct names

### API Client
Location: `frontend/lib/api-client.ts`
- Field transformations have been simplified
- Still needs verification for all steps

### Data Mapper
Location: `frontend/lib/data-mapper.ts`
- Maps between backend and frontend formats
- Needs update for unified field names

### Onboarding Service
Location: `backend/src/services/core/onboardingService.ts`
- Saves data to database
- Expects exact database field names