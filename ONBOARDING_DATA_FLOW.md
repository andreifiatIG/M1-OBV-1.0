# Onboarding Wizard - Complete Data Flow Guide

**Your First Time View**: Understanding how data flows from UI → Database and back

---

## 🎯 Overview - The Complete Journey

When a user fills out the onboarding wizard, data travels through **7 layers** before reaching the database:

```
┌──────────────────────────────────────────────────────────────────┐
│                    DATA FLOW DIAGRAM                             │
└──────────────────────────────────────────────────────────────────┘

USER FILLS FORM
     ↓
[1] UI Components (Step Components)
     ↓
[2] OnboardingWizardUnified (State Management)
     ↓
[3] AutoSave Queue (Debouncing & Batching)
     ↓
[4] API Client (Field Transformation #1)
     ↓
[5] Backend Route (Field Normalization #2)
     ↓
[6] Onboarding Service (Business Logic)
     ↓
[7] Database (PostgreSQL via Prisma)

THEN REVERSE FOR LOADING:

[7] Database → [6] Service → [5] Route → [4] API Client → [2] Wizard → [1] UI
```

---

## 📊 Layer-by-Layer Breakdown

### **Layer 1: UI Components (Form Fields)**

**Location**: `frontend/components/onboarding/steps/VillaInformationStepEnhanced.tsx`

**What Happens**:
- User types into form fields
- Fields use **frontend naming** (what makes sense to users)

**Example - User Input**:
```typescript
{
  villaName: "Paradise Villa",
  villaAddress: "123 Beach Road",      // ← Frontend field name
  villaCity: "Phuket",                 // ← Frontend field name
  villaCountry: "Thailand",            // ← Frontend field name
  villaArea: 500,                      // ← Frontend field name (m²)
  landArea: 1000,                      // ← Frontend field name (m²)
  bedrooms: 4,
  bathrooms: 3
}
```

**Field Naming Convention**:
- Uses **descriptive names**: `villaAddress`, `villaCity`, `villaCountry`
- Prefixed with `villa` for clarity in UI
- Matches what users see on screen

---

### **Layer 2: OnboardingWizardUnified (State Management)**

**Location**: `frontend/components/onboarding/OnboardingWizardUnified.tsx`

**What Happens**:
1. **Collects data** from current step component
2. **Stores in local state**: `stepData[step1] = { ...formData }`
3. **Triggers autosave** when user stops typing (5-second debounce)
4. **Manages state** for all 10 steps

**State Structure**:
```typescript
const [stepData, setStepData] = useState<{
  step1: VillaInfoData,
  step2: OwnerDetailsData,
  step3: ContractualDetailsData,
  // ... steps 4-10
}>();
```

**Key Functions**:
```typescript
// When user changes field:
handleStepChange(step: number, data: any) {
  setStepData(prev => ({
    ...prev,
    [`step${step}`]: data
  }));
  // Triggers autosave after 5 seconds of no changes
}
```

---

### **Layer 3: AutoSave Queue (Smart Saving)**

**Location**: `frontend/lib/autosaveQueue.ts` + `OnboardingWizardUnified.tsx` lines 200-400

**What Happens**:
1. **Debouncing**: Waits 5 seconds after last change
2. **Batching**: Combines multiple step saves into one request
3. **Deduplication**: Only saves steps that changed
4. **Retry Logic**: Automatically retries failed saves
5. **Version Control**: Tracks versions to prevent conflicts

**Example Flow**:
```typescript
User types "Paradise" → Wait... (user types more)
User types "Paradise Villa" → Wait... (5 seconds)
No more changes → TRIGGER AUTOSAVE

AutoSave Queue:
1. Check what changed: Step 1 data changed
2. Build batch: [{ step: 1, data: {...} }]
3. Send to API Client
4. If success: Update version, clear batch
5. If fail: Retry up to 3 times with exponential backoff
```

**Configuration** (lines 89-100):
```typescript
const AUTO_SAVE_CONFIG = {
  enabled: true,
  debounceTime: 5000,          // Wait 5 seconds after last change
  minTimeBetweenSaves: 2000,   // Min 2 seconds between API calls
  periodicSaveInterval: 35000, // Force save every 35 seconds
  maxRetries: 3,               // Retry failed saves 3 times
  backoffMultiplier: 2,        // Double wait time each retry
};
```

---

### **Layer 4: API Client (First Transformation)**

**Location**: `frontend/lib/api-client.ts` lines 859-990

**What Happens**: **CRITICAL TRANSFORMATION #1**

The API Client transforms frontend field names to backend field names:

**Code** (lines 859-920):
```typescript
async saveOnboardingStep(villaId, step, data) {
  if (step === 1) {  // Villa Information step
    // Transform frontend names → backend names
    const backendTransformed = {
      villaName: data.villaName,

      // ADDRESS TRANSFORMATION
      address: data.address || data.villaAddress,      // ← Maps villaAddress → address
      city: data.city || data.villaCity,              // ← Maps villaCity → city
      country: data.country || data.villaCountry,     // ← Maps villaCountry → country
      zipCode: data.zipCode || data.villaPostalCode,  // ← Maps villaPostalCode → zipCode

      // SIZE TRANSFORMATION
      propertySize: data.propertySize || data.villaArea,  // ← Maps villaArea → propertySize
      plotSize: data.plotSize || data.landArea,           // ← Maps landArea → plotSize

      // Numeric conversions
      bedrooms: Number(data.bedrooms),
      bathrooms: Number(data.bathrooms),
      maxGuests: Number(data.maxGuests),
      // ... etc
    };

    // Send transformed data
    return this.request(`/api/onboarding/${villaId}/step`, {
      method: 'POST',
      body: JSON.stringify({
        step: 1,
        data: backendTransformed,  // ← Transformed data sent to backend
        completed: false,
        isAutoSave: true
      })
    });
  }
}
```

**Transformation Table**:

| Frontend Field | Backend Field | Why? |
|----------------|---------------|------|
| `villaAddress` | `address` | Database schema uses generic `address` |
| `villaCity` | `city` | Database schema uses `city` |
| `villaCountry` | `country` | Database schema uses `country` |
| `villaPostalCode` | `zipCode` | Database schema uses `zipCode` |
| `villaArea` | `propertySize` | Database schema uses `propertySize` |
| `landArea` | `plotSize` | Database schema uses `plotSize` |

**Why This Happens**:
- Frontend: User-friendly names (`villaAddress` is clear)
- Backend/Database: Generic names (`address` works for any entity)

---

### **Layer 5: Backend Route (Second Normalization)**

**Location**: `backend/src/routes/onboarding/onboarding.ts` lines 633-780

**What Happens**: **CRITICAL TRANSFORMATION #2**

Even though API Client transformed the data, the backend applies **field normalization middleware** to ensure consistency:

**Middleware Chain**:
```typescript
router.post('/:villaId/step',
  smartOnboardingRateLimit,        // Prevent spam
  normalizeOnboardingFields,       // ← NORMALIZE FIELD NAMES (NEW!)
  onboardingStepSanitization,      // Clean & validate input
  onboardingStepValidation,        // Check required fields
  authenticate,                    // Verify user
  async (req, res) => {
    // At this point, data has canonical field names
    const { villaId } = req.params;
    const { step, data, completed } = req.body;

    // Call service layer
    await onboardingService.updateStep(villaId, {
      step,
      data,  // ← Data now has normalized field names
      completed
    });
  }
);
```

**Field Normalizer Middleware** (the fix we just implemented):

**Location**: `backend/src/middleware/fieldNormalizer.ts` lines 200-260

```typescript
export function normalizeFields(step: number, data: any): any {
  if (step === 1) {  // Villa step
    const normalized = {};

    // Map ALL possible frontend names → canonical backend names
    for (const [frontendKey, value] of Object.entries(data)) {
      const backendKey = VILLA_FIELD_MAPPINGS[frontendKey];

      if (backendKey) {
        normalized[backendKey] = value;  // Use canonical name
      } else {
        normalized[frontendKey] = value;  // Keep as-is if not in mapping
      }
    }

    return normalized;
  }

  return data;  // Other steps pass through
}
```

**Result After Normalization**:
```typescript
// Input (from API client):
{
  address: "123 Beach Road",      // ← Already transformed by API client
  city: "Phuket",
  propertySize: 500
}

// OR if API client sent old names:
{
  villaAddress: "123 Beach Road", // ← Old frontend name
  villaCity: "Phuket"
}

// Output (after normalizer):
{
  address: "123 Beach Road",      // ← Normalized to canonical name
  city: "Phuket",                 // ← Normalized
  propertySize: 500               // ← Normalized
}
```

**Why Double Transformation?**:
- **Defense in depth**: Even if API client fails, backend normalizes
- **Backward compatibility**: Old API calls still work
- **Single source of truth**: Backend enforces canonical names

---

### **Layer 6: Onboarding Service (Business Logic)**

**Location**: `backend/src/services/core/onboardingService.ts`

**What Happens**: Service layer handles business logic and database operations

**Key Functions**:

#### **6.1: Update Step (Entry Point)**
```typescript
// Line 709-867
async updateStep(villaId: string, stepData: OnboardingStepData, userId?: string) {
  // 1. Ensure step progress record exists
  await this.ensureStepProgressRecord(villaId, stepData.step);

  // 2. Save to primary table (Villa, Owner, etc.)
  await this.saveStepData(villaId, stepData.step, stepData.data, userId);

  // 3. Update step progress tracking
  await this.updateEnhancedProgress(villaId, stepData.step, stepData.data, stepData.completed, false, userId);

  // 4. Update legacy boolean flags
  await this.updateLegacyProgressFlags(villaId, stepData.step, stepData.completed);

  // 5. Update session counters
  await this.updateSessionCounters(villaId, userId);

  return { success: true, version: newVersion };
}
```

#### **6.2: Save Step Data (Database Updates)**
```typescript
// Lines 1075-1206 - Villa Information (Step 1)
private async saveStepData(villaId: string, step: number, data: any, userId?: string) {
  switch (step) {
    case 1:  // Villa Information
      // Build update object with normalized field names
      const updateData = {};

      // Core fields (lines 1136-1140)
      if (data.villaName) updateData.villaName = data.villaName;
      if (data.address) updateData.address = data.address;          // ← Uses normalized name
      if (data.city) updateData.city = data.city;                   // ← Uses normalized name
      if (data.country) updateData.country = data.country;          // ← Uses normalized name
      if (data.zipCode) updateData.zipCode = data.zipCode;          // ← Uses normalized name

      // Size fields (lines 1162-1170)
      if (data.propertySize) updateData.propertySize = parseFloat(data.propertySize);  // ← Normalized
      if (data.plotSize) updateData.plotSize = parseFloat(data.plotSize);              // ← Normalized

      // Numeric fields (lines 1151-1159)
      if (data.bedrooms) updateData.bedrooms = parseInt(data.bedrooms);
      if (data.bathrooms) updateData.bathrooms = parseInt(data.bathrooms);
      if (data.maxGuests) updateData.maxGuests = parseInt(data.maxGuests);

      // Update database
      await prisma.villa.update({
        where: { id: villaId },
        data: updateData
      });

      break;

    case 2:  // Owner Details
      // Similar logic for owner table
      await prisma.owner.upsert({
        where: { villaId },
        update: { ...ownerData },
        create: { villaId, ...ownerData }
      });
      break;

    // Cases 3-10 for other steps...
  }
}
```

#### **6.3: Progress Tracking (Three Systems)**

**System 1: Legacy Boolean Flags** (OnboardingProgress table):
```typescript
// Lines 794-867
await prisma.onboardingProgress.update({
  where: { villaId },
  data: {
    villaInfoCompleted: true,      // Step 1
    ownerDetailsCompleted: true,   // Step 2
    // ... etc
  }
});
```

**System 2: Step Progress Records** (OnboardingStepProgress table):
```typescript
// Lines 896-1015
await prisma.onboardingStepProgress.update({
  where: {
    villaId_stepNumber: { villaId, stepNumber: 1 }
  },
  data: {
    status: 'COMPLETED',
    completedAt: new Date(),
    isValid: true
  }
});
```

**System 3: Field Progress Records** (StepFieldProgress table):
```typescript
// Lines 942-1006
// For each field in the step data:
for (const [fieldName, fieldValue] of Object.entries(data)) {
  await prisma.stepFieldProgress.upsert({
    where: {
      stepProgressId_fieldName: { stepProgressId, fieldName }
    },
    update: {
      value: fieldValue,           // ← Field value stored here
      status: 'COMPLETED',
      completedAt: new Date()
    },
    create: {
      stepProgressId,
      fieldName: fieldName,        // ← Now uses canonical name!
      value: fieldValue,
      status: 'COMPLETED'
    }
  });
}
```

**Why Three Systems?**:
1. **Legacy flags**: Quick boolean checks (`villaInfoCompleted`)
2. **Step progress**: Detailed step tracking (status, timestamps)
3. **Field progress**: Granular field-level tracking (which fields filled)

---

### **Layer 7: Database (PostgreSQL)**

**Tables Updated**:

#### **Primary Data Tables**:
```sql
-- Villa table (main data)
UPDATE Villa SET
  villaName = 'Paradise Villa',
  address = '123 Beach Road',       -- ← Canonical field name
  city = 'Phuket',                  -- ← Canonical field name
  country = 'Thailand',             -- ← Canonical field name
  zipCode = '83000',                -- ← Canonical field name
  propertySize = 500.0,             -- ← Canonical field name
  plotSize = 1000.0,                -- ← Canonical field name
  bedrooms = 4,
  bathrooms = 3,
  maxGuests = 8,
  updatedAt = NOW()
WHERE id = 'villa-uuid-123';
```

#### **Progress Tracking Tables**:
```sql
-- OnboardingProgress (legacy flags)
UPDATE OnboardingProgress SET
  villaInfoCompleted = true,
  completedStepsCount = 1,
  completionPercentage = 10
WHERE villaId = 'villa-uuid-123';

-- OnboardingStepProgress (step tracking)
UPDATE OnboardingStepProgress SET
  status = 'COMPLETED',
  startedAt = '2025-09-25 10:00:00',
  completedAt = '2025-09-25 10:15:00',
  version = version + 1
WHERE villaId = 'villa-uuid-123' AND stepNumber = 1;

-- StepFieldProgress (field tracking)
INSERT INTO StepFieldProgress (stepProgressId, fieldName, value, status) VALUES
  ('step-progress-id', 'address', '123 Beach Road', 'COMPLETED'),      -- ← Canonical name
  ('step-progress-id', 'city', 'Phuket', 'COMPLETED'),                 -- ← Canonical name
  ('step-progress-id', 'propertySize', '500', 'COMPLETED');            -- ← Canonical name
```

---

## 🔄 REVERSE FLOW - Loading Data Back

When the user refreshes or reopens the app, data flows in reverse:

### **Step 1: Frontend Requests Data**

```typescript
// OnboardingWizardUnified.tsx - useEffect on mount
useEffect(() => {
  async function loadProgress() {
    const progress = await apiClient.getOnboardingProgress(villaId);
    // ... set state
  }
  loadProgress();
}, [villaId]);
```

### **Step 2: API Client Fetches**

```typescript
// api-client.ts line 810-850
async getOnboardingProgress(villaId: string) {
  const response = await this.request(`/api/onboarding/${villaId}`);

  // Response contains villa data with database field names
  const { villa, stepData, fieldProgress } = response.data;

  // Transform backend → frontend
  const transformedData = mapBackendProgressToStepData(response.data);

  return transformedData;
}
```

### **Step 3: Backend Service Retrieves**

```typescript
// onboardingService.ts lines 309-581
async getOnboardingProgress(villaId: string) {
  // 1. Fetch all data
  const progress = await prisma.onboardingProgress.findUnique({
    where: { villaId },
    include: {
      villa: true,           // Main villa data
      owner: true,           // Owner details
      stepProgress: {        // Step tracking
        include: {
          fields: true       // Field-level data
        }
      }
    }
  });

  // 2. Build field progress map from StepFieldProgress
  const fieldProgress = {};
  progress.villa.stepProgress.forEach(step => {
    fieldProgress[step.stepNumber] = {};
    step.fields.forEach(field => {
      // field.fieldName is now canonical (address, not villaAddress)
      fieldProgress[step.stepNumber][field.fieldName] = field.value;
    });
  });

  return {
    villa: progress.villa,         // Has database field names
    fieldProgress,                 // Has canonical field names
    completedSteps: [1, 2, 3],    // Which steps are done
    completionPercentage: 30
  };
}
```

### **Step 4: Data Mapper Transforms**

**Location**: `frontend/lib/data-mapper.ts` lines 600-900

```typescript
export function mapBackendProgressToStepData(backendProgress: any) {
  const { villa, owner, stepProgress, fieldProgress } = backendProgress;

  // Transform Step 1 (Villa) data: backend → frontend names
  const step1Data = mapVillaBackendToFrontend(villa);

  // Step 1 transformation
  const villaData = {
    villaName: villa.villaName,

    // REVERSE TRANSFORMATION: database → frontend
    villaAddress: villa.address,           // ← address → villaAddress
    villaCity: villa.city,                 // ← city → villaCity
    villaCountry: villa.country,           // ← country → villaCountry
    villaPostalCode: villa.zipCode,        // ← zipCode → villaPostalCode
    villaArea: villa.propertySize,         // ← propertySize → villaArea
    landArea: villa.plotSize,              // ← plotSize → landArea

    bedrooms: villa.bedrooms,
    bathrooms: villa.bathrooms,
    // ... etc
  };

  return {
    step1: villaData,
    step2: ownerData,
    // ... steps 3-10
  };
}
```

### **Step 5: Wizard Sets State**

```typescript
// OnboardingWizardUnified.tsx
const progress = await apiClient.getOnboardingProgress(villaId);

setStepData({
  step1: progress.step1,  // Has frontend field names now
  step2: progress.step2,
  // ...
});

// Now form fields are populated!
```

---

## 🔑 KEY CONCEPTS

### **1. Field Name Mapping Layers**

Your system has **3 field name domains**:

```
┌─────────────────────────────────────────────────────────┐
│ FRONTEND DOMAIN (UI-friendly names)                     │
├─────────────────────────────────────────────────────────┤
│ villaAddress, villaCity, villaCountry, villaArea        │
│ ↕️ Mapped by: API Client + Data Mapper                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ CANONICAL DOMAIN (Backend/Database names)               │
├─────────────────────────────────────────────────────────┤
│ address, city, country, propertySize                    │
│ ↕️ Enforced by: Field Normalizer Middleware             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ DATABASE DOMAIN (Prisma schema)                         │
├─────────────────────────────────────────────────────────┤
│ Villa.address, Villa.city, Villa.propertySize           │
│ ✅ Final storage location                               │
└─────────────────────────────────────────────────────────┘
```

### **2. The Critical Fix We Implemented**

**Before** (the problem):
```
Frontend → API Client → Backend → Database
villaAddress → address → [NOT NORMALIZED] → StepFieldProgress.fieldName = "address" ✅
                                          OR StepFieldProgress.fieldName = "villaAddress" ❌

Result: Inconsistent field names in StepFieldProgress = data retrieval fails
```

**After** (the fix):
```
Frontend → API Client → Field Normalizer → Database
villaAddress → address → ALWAYS "address" → StepFieldProgress.fieldName = "address" ✅

Result: Consistent canonical field names = data always found
```

### **3. AutoSave Strategy**

**Debounce + Batch + Retry**:
```
User types → Wait 5 sec → Batch changes → Send API → Retry if fail

Example Timeline:
10:00:00 - User types "P"
10:00:01 - User types "Paradise"
10:00:02 - User types "Paradise Villa"
10:00:07 - [5 seconds passed] → SAVE triggered
10:00:08 - API request sent
10:00:09 - Success → Update version
```

**Why This Works**:
- Reduces API calls (not every keystroke)
- Better UX (doesn't spam server)
- Version control prevents conflicts
- Retry handles network issues

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue 1: "Data saves but doesn't reload"

**Cause**: Field name mismatch between save and load
- Saved as: `villaAddress` in StepFieldProgress
- Loaded as: Expects `address`

**Solution**: Field normalizer ensures canonical names always used

### Issue 2: "Progress shows 0% but I filled data"

**Cause**: Three progress systems out of sync
- Data in Villa table ✅
- StepFieldProgress updated ✅
- OnboardingProgress.villaInfoCompleted = false ❌

**Solution**: Consistency checker (we built this!) detects and reports

### Issue 3: "Changes lost after refresh"

**Cause**: AutoSave didn't complete before refresh
- User typed
- AutoSave queued
- User refreshed before 5-second debounce

**Solution**:
- Periodic save (every 35 seconds regardless)
- Browser local storage backup

---

## 📋 SUMMARY - The Complete Picture

**When you fill out Step 1 of the wizard**:

1. ✅ **UI Component**: You type "Phuket" in "City" field
2. ✅ **Wizard State**: Stores as `villaCity: "Phuket"`
3. ✅ **AutoSave Queue**: Waits 5 seconds, then batches
4. ✅ **API Client**: Transforms `villaCity` → `city`
5. ✅ **Backend Route**: Normalizes to canonical `city`
6. ✅ **Service Layer**: Saves to three places:
   - `Villa.city = "Phuket"` (main data)
   - `OnboardingProgress.villaInfoCompleted = true` (legacy)
   - `StepFieldProgress.fieldName = "city"` (tracking)
7. ✅ **Database**: All three tables updated consistently

**When you reload the page**:

1. ✅ **Wizard**: Calls `getOnboardingProgress()`
2. ✅ **API Client**: Fetches from `/api/onboarding/:villaId`
3. ✅ **Backend Service**: Retrieves from three systems
4. ✅ **Data Mapper**: Transforms `city` → `villaCity`
5. ✅ **Wizard State**: Populates `step1.villaCity = "Phuket"`
6. ✅ **UI Component**: "City" field shows "Phuket" ✨

---

**Key Takeaway**: With the field normalizer we implemented, field names are now **always canonical** in the database, eliminating the mapping chaos that caused data loss!