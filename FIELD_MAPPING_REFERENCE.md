# Field Mapping Reference - Database Schema Alignment

## Overview
This document provides the canonical field names from the database schema that MUST be used across the entire application (frontend, backend, API client).

## Principle
**One name, everywhere:** Frontend field names = Backend field names = Database column names

---

## Step 1: Villa Information

**Database Table:** `Villa`

| Field Name (Use Everywhere) | Type | Required | Notes |
|---------------------------|------|----------|-------|
| villaCode | string | ✅ | Unique identifier |
| villaName | string | ✅ | Property name |
| address | string | ✅ | Street address |
| city | string | ✅ | City |
| country | string | ✅ | Country |
| zipCode | string | ❌ | Postal code |
| latitude | float | ❌ | GPS coordinates |
| longitude | float | ❌ | GPS coordinates |
| bedrooms | int | ✅ | Number of bedrooms |
| bathrooms | int | ✅ | Number of bathrooms |
| maxGuests | int | ✅ | Maximum occupancy |
| propertySize | float | ❌ | Size in sqm/sqft |
| plotSize | float | ❌ | Land area |
| yearBuilt | int | ❌ | Construction year |
| renovationYear | int | ❌ | Last renovation |
| propertyType | enum | ✅ | VILLA, APARTMENT, etc. |
| villaStyle | enum | ❌ | MODERN, TRADITIONAL, etc. |
| locationType | string | ❌ | Seaview, Beachfront, etc. |
| description | string | ❌ | Full description |
| shortDescription | string | ❌ | Brief description |
| googleMapsLink | string | ❌ | Google Maps URL |
| propertyEmail | string | ❌ | Property contact email |
| propertyWebsite | string | ❌ | Property website |

---

## Step 2: Owner Details

**Database Table:** `Owner`

| Field Name (Use Everywhere) | Type | Required | Notes |
|---------------------------|------|----------|-------|
| ownerType | enum | ✅ | INDIVIDUAL or COMPANY |
| firstName | string | ✅ | Owner first name |
| lastName | string | ✅ | Owner last name |
| email | string | ✅ | Contact email |
| phone | string | ✅ | Primary phone |
| phoneCountryCode | string | ❌ | Phone country code |
| phoneDialCode | string | ❌ | Phone dial code |
| alternativePhone | string | ❌ | Secondary phone |
| alternativePhoneCountryCode | string | ❌ | Alt phone country |
| alternativePhoneDialCode | string | ❌ | Alt phone dial |
| nationality | string | ❌ | Owner nationality |
| passportNumber | string | ❌ | Passport ID |
| idNumber | string | ❌ | National ID |
| address | string | ✅ | Owner address |
| city | string | ✅ | Owner city |
| country | string | ✅ | Owner country |
| zipCode | string | ❌ | Owner postal code |
| preferredLanguage | string | ❌ | Default: "en" |
| communicationPreference | enum | ❌ | EMAIL, PHONE, WHATSAPP, SMS |
| companyName | string | ❌ | For COMPANY type |
| companyAddress | string | ❌ | Company address |
| companyTaxId | string | ❌ | Tax ID |
| companyVat | string | ❌ | VAT number |
| managerName | string | ❌ | Manager name |
| managerEmail | string | ❌ | Manager email |
| managerPhone | string | ❌ | Manager phone |
| managerPhoneCountryCode | string | ❌ | Manager phone country |
| managerPhoneDialCode | string | ❌ | Manager phone dial |
| propertyEmail | string | ❌ | Property contact |
| propertyWebsite | string | ❌ | Property website |
| notes | string | ❌ | Additional notes |

---

## Step 3: Contractual Details

**Database Table:** `ContractualDetails`

| Field Name (Use Everywhere) | Type | Required | Notes |
|---------------------------|------|----------|-------|
| contractStartDate | DateTime | ✅ | Contract start |
| contractEndDate | DateTime | ❌ | Contract end |
| contractType | enum | ✅ | EXCLUSIVE, NON_EXCLUSIVE, etc. |
| commissionRate | decimal | ✅ | Commission % |
| managementFee | decimal | ❌ | Management fee % |
| marketingFee | decimal | ❌ | Marketing fee % |
| paymentTerms | string | ❌ | Payment terms text |
| paymentSchedule | enum | ✅ | WEEKLY, MONTHLY, etc. |
| paymentThroughIPL | boolean | ❌ | Default: false |
| payoutDay1 | int | ❌ | First payout day |
| payoutDay2 | int | ❌ | Second payout day |
| minimumStayNights | int | ✅ | Min stay (default: 1) |
| cancellationPolicy | enum | ✅ | FLEXIBLE, MODERATE, etc. |
| checkInTime | string | ✅ | Default: "15:00" |
| checkOutTime | string | ✅ | Default: "11:00" |
| insuranceProvider | string | ❌ | Insurance company |
| insurancePolicyNumber | string | ❌ | Policy number |
| insuranceExpiry | DateTime | ❌ | Expiry date |
| vatRegistrationNumber | string | ❌ | VAT registration |
| vatPaymentTerms | string | ❌ | VAT payment terms |
| dbdNumber | string | ❌ | DBD number |
| specialTerms | string | ❌ | Special terms text |

---

## Step 4: Bank Details

**Database Table:** `BankDetails`

| Field Name (Use Everywhere) | Type | Required | Notes |
|---------------------------|------|----------|-------|
| accountHolderName | string | ✅ | Account holder |
| bankName | string | ✅ | Bank name |
| accountNumber | string | ✅ | Account number |
| iban | string | ❌ | IBAN (max 34 chars) |
| swiftCode | string | ❌ | SWIFT/BIC (max 11) |
| branchCode | string | ❌ | Branch code |
| branchName | string | ❌ | Branch name |
| branchAddress | string | ❌ | Branch address |
| currency | string | ✅ | Default: "USD" |
| accountType | string | ❌ | Default: "CHECKING" |
| bankAddress | string | ❌ | Bank address |
| bankCountry | string | ❌ | Bank country |
| notes | string | ❌ | Additional notes |

---

## Step 5: OTA Credentials

**Database Table:** `OTACredentials`

| Field Name (Use Everywhere) | Type | Required | Notes |
|---------------------------|------|----------|-------|
| platform | enum | ✅ | BOOKING_COM, AIRBNB, etc. |
| propertyId | string | ❌ | Platform property ID |
| username | string | ❌ | Login username |
| password | string | ❌ | Login password (encrypted) |
| apiKey | string | ❌ | API key (encrypted) |
| apiSecret | string | ❌ | API secret (encrypted) |
| accountUrl | string | ❌ | Account URL |
| propertyUrl | string | ❌ | Property URL |
| listingUrl | string | ❌ | Public listing URL |
| isActive | boolean | ✅ | Default: true |

**Note:** Multiple OTA credentials per villa - array structure

---

## Step 6: Documents Upload

**Database Table:** `Document`

| Field Name (Use Everywhere) | Type | Required | Notes |
|---------------------------|------|----------|-------|
| documentType | enum | ✅ | PROPERTY_CONTRACT, etc. |
| fileName | string | ✅ | File name |
| fileUrl | string | ✅ | Storage URL |
| fileSize | int | ✅ | Size in bytes |
| mimeType | string | ✅ | File MIME type |
| description | string | ❌ | Document description |
| validFrom | DateTime | ❌ | Validity start |
| validUntil | DateTime | ❌ | Validity end |
| sharePointFileId | string | ❌ | SharePoint ID |
| sharePointPath | string | ❌ | SharePoint path |
| sharePointUrl | string | ❌ | SharePoint URL |
| storageLocation | string | ✅ | "database", "local", "sharepoint" |
| fileContent | Bytes | ❌ | Binary content |

**Note:** Multiple documents per villa - array structure

---

## Step 7: Staff Configuration

**Database Table:** `Staff`

| Field Name (Use Everywhere) | Type | Required | Notes |
|---------------------------|------|----------|-------|
| firstName | string | ✅ | Staff first name |
| lastName | string | ✅ | Staff last name |
| nickname | string | ❌ | Preferred name |
| email | string | ❌ | Email address |
| phone | string | ✅ | Contact phone |
| dateOfBirth | DateTime | ❌ | Birth date |
| nationality | string | ❌ | Nationality |
| idNumber | string | ❌ | National ID |
| passportNumber | string | ❌ | Passport number |
| position | enum | ✅ | VILLA_MANAGER, HOUSEKEEPER, etc. |
| department | enum | ✅ | MANAGEMENT, HOUSEKEEPING, etc. |
| employmentType | enum | ✅ | FULL_TIME, PART_TIME, etc. |
| startDate | DateTime | ✅ | Employment start |
| endDate | DateTime | ❌ | Employment end |
| salary | decimal | ✅ | Base salary |
| salaryFrequency | enum | ✅ | HOURLY, MONTHLY, etc. |
| currency | string | ✅ | Default: "USD" |
| numberOfDaySalary | int | ❌ | Days in salary calc |
| totalIncome | decimal | ❌ | Total income |
| serviceCharge | decimal | ❌ | Service charge |
| otherDeductions | decimal | ❌ | Deductions |
| totalNetIncome | decimal | ❌ | Net income |
| hasAccommodation | boolean | ❌ | Default: false |
| hasTransport | boolean | ❌ | Default: false |
| transportation | string | ❌ | Transport details |
| hasHealthInsurance | boolean | ❌ | Default: false |
| hasWorkInsurance | boolean | ❌ | Default: false |
| foodAllowance | boolean | ❌ | Default: false |
| maritalStatus | boolean | ❌ | Marital status |
| emergencyContacts | Json | ❌ | Emergency contacts JSON |
| isActive | boolean | ✅ | Default: true |

**Note:** Multiple staff members per villa - array structure

---

## Step 8: Facilities Checklist

**Database Table:** `FacilityChecklist`

| Field Name (Use Everywhere) | Type | Required | Notes |
|---------------------------|------|----------|-------|
| category | enum | ✅ | property_layout_spaces, etc. |
| subcategory | string | ✅ | Subcategory name |
| itemName | string | ✅ | Facility item name |
| isAvailable | boolean | ✅ | Default: false |
| quantity | int | ❌ | Default: 1 |
| condition | string | ❌ | Default: "good" |
| notes | string | ❌ | Additional notes |
| specifications | string | ❌ | Specifications |
| photoUrl | string | ❌ | Photo URL |
| photoData | Bytes | ❌ | Photo binary |
| photoMimeType | string | ❌ | Photo MIME |
| photoSize | int | ❌ | Photo size |
| photoWidth | int | ❌ | Photo width |
| photoHeight | int | ❌ | Photo height |
| productLink | string | ❌ | Product URL |
| lastCheckedAt | DateTime | ❌ | Last check date |
| checkedBy | string | ❌ | Checked by user |

**Note:** Multiple facilities per villa - array structure

---

## Step 9: Photo Upload

**Database Table:** `Photo`

| Field Name (Use Everywhere) | Type | Required | Notes |
|---------------------------|------|----------|-------|
| category | enum | ✅ | EXTERIOR_VIEWS, BEDROOMS, etc. |
| subfolder | string | ❌ | Subfolder (e.g., bedroom name) |
| fileName | string | ✅ | File name |
| fileUrl | string | ✅ | Storage URL |
| thumbnailUrl | string | ❌ | Thumbnail URL |
| fileSize | int | ✅ | Size in bytes |
| mimeType | string | ✅ | File MIME type |
| width | int | ❌ | Image width |
| height | int | ❌ | Image height |
| caption | string | ❌ | Photo caption |
| altText | string | ❌ | Alt text for accessibility |
| tags | string[] | ❌ | Photo tags array |
| isMain | boolean | ❌ | Default: false |
| sortOrder | int | ❌ | Default: 0 |
| sharePointFileId | string | ❌ | SharePoint ID |
| sharePointPath | string | ❌ | SharePoint path |
| sharePointUrl | string | ❌ | SharePoint URL |
| storageLocation | string | ✅ | "database", "local", "sharepoint" |
| fileContent | Bytes | ❌ | Binary content |
| thumbnailContent | Bytes | ❌ | Thumbnail binary |
| isCompressed | boolean | ❌ | Default: false |
| originalFileSize | int | ❌ | Pre-compression size |

**Note:** Multiple photos per villa - array structure

---

## Step 10: Review & Submit

**No new fields - aggregates all previous steps**

---

## Migration Notes

### OLD Frontend Names → NEW Unified Names

**Step 1 Changes:**
- `villaAddress` → `address`
- `villaCity` → `city`
- `villaCountry` → `country`
- `villaPostalCode` → `zipCode`
- `villaArea` → `propertySize`
- `landArea` → `plotSize`

All other fields already match database schema.

### Implementation Rules

1. **Frontend Components:** Use database field names in all forms
2. **API Client:** Remove all field transformations - use names as-is
3. **Backend Routes:** Field normalizer middleware removed (not needed)
4. **Database Queries:** Use field names directly from Prisma schema

### localStorage/sessionStorage Keys

Use step-based keys:
```typescript
localStorage.setItem(`onboarding_step_${stepNumber}_${villaId}`, JSON.stringify(data));
```

Data structure matches database exactly - no transformation needed.