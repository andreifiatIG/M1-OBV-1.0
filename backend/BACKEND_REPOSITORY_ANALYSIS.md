# M1 Villa Management System - Backend Repository Analysis

## 🏗️ Repository Structure Overview

```
backend/
├── src/                          # Source code
│   ├── routes/                   # API route handlers
│   │   ├── onboarding.ts        # Main onboarding API endpoints
│   │   ├── onboarding-backup.ts # Backup/restore functionality
│   │   ├── villas.ts           # Villa management endpoints
│   │   ├── documents.ts        # Document management
│   │   ├── documents-enhanced.ts # Enhanced document handling
│   │   ├── photos.ts           # Photo management
│   │   ├── photos-enhanced.ts  # Enhanced photo handling
│   │   ├── staff.ts            # Staff management
│   │   └── test.ts             # API testing endpoints
│   ├── services/               # Business logic services
│   │   ├── onboardingService.ts # Core onboarding logic
│   │   ├── villaService.ts     # Villa operations
│   │   ├── sharePointService.ts # SharePoint integration
│   │   ├── microsoftGraphService.ts # MS Graph API
│   │   ├── bankDetailsService.ts # Banking operations
│   │   ├── mediaService.ts     # Media file handling
│   │   └── websocketService.ts # Real-time communication
│   ├── middleware/             # Express middleware
│   │   └── cache.ts           # Caching logic
│   ├── utils/                 # Utility functions
│   │   └── helpers.ts         # Common helper functions
│   └── server.ts             # Main server configuration
├── prisma/                   # Database management
│   ├── schema.prisma        # Database schema definition
│   ├── migrations/          # Database migration history
│   └── seed.ts             # Database seeding script
├── Configuration files      # Environment, TypeScript, etc.
└── Package management      # package.json, node_modules
```

---

## 🌐 API Routes Analysis

### 🎯 Core Onboarding Routes (`src/routes/onboarding.ts`)
**Purpose**: Main onboarding workflow management
- **Key Endpoints**:
  - `GET /api/onboarding/:villaId` - Retrieve onboarding progress
  - `POST /api/onboarding/step/:stepNumber` - Submit step data
  - `PUT /api/onboarding/:villaId/progress` - Update progress tracking
  - `POST /api/onboarding/:villaId/complete` - Complete onboarding process
- **Features**:
  - Multi-step validation and processing
  - Progress tracking with granular field updates
  - Error handling and rollback capabilities
  - Integration with all service layers
- **Status**: ✅ **ACTIVE** - Core business logic

### 🏘️ Villa Management Routes (`src/routes/villas.ts`)
**Purpose**: Villa CRUD operations and management
- **Key Endpoints**:
  - `GET /api/villas` - List all villas with filtering
  - `GET /api/villas/:id` - Get specific villa details
  - `POST /api/villas` - Create new villa
  - `PUT /api/villas/:id` - Update villa information
  - `DELETE /api/villas/:id` - Soft delete villa
- **Features**:
  - Complex filtering and pagination
  - Relationship data loading (owners, documents, photos)
  - Status management and approval workflows
- **Status**: ✅ **ACTIVE** - Core functionality

### 📄 Document Management Routes

#### **Enhanced Documents** (`src/routes/documents-enhanced.ts`)
- **Purpose**: Advanced document handling with SharePoint integration
- **Key Endpoints**:
  - `POST /api/documents/upload` - Upload with SharePoint sync
  - `GET /api/documents/:villaId` - Get villa documents
  - `PUT /api/documents/:id/validate` - Document validation
- **Features**:
  - SharePoint synchronization
  - Document validation workflows
  - Metadata management
- **Status**: ✅ **ACTIVE** - Enhanced version

#### **Basic Documents** (`src/routes/documents.ts`)
- **Purpose**: Basic document operations
- **Features**: Standard CRUD operations
- **Status**: ⚠️ **LEGACY** - Consider consolidation with enhanced version

### 📸 Photo Management Routes

#### **Enhanced Photos** (`src/routes/photos-enhanced.ts`)
- **Purpose**: Advanced photo handling with categorization
- **Key Endpoints**:
  - `POST /api/photos/upload` - Upload with auto-categorization
  - `GET /api/photos/:villaId` - Get categorized photos
  - `PUT /api/photos/:id/categorize` - Update photo categories
- **Features**:
  - Automatic categorization
  - Room-based organization
  - Bulk operations
- **Status**: ✅ **ACTIVE** - Enhanced version

#### **Basic Photos** (`src/routes/photos.ts`)
- **Purpose**: Basic photo operations
- **Status**: ⚠️ **LEGACY** - Consider consolidation

### 👥 Staff Management Routes (`src/routes/staff.ts`)
**Purpose**: Staff and emergency contact management
- **Key Endpoints**:
  - `GET /api/staff/:villaId` - Get villa staff
  - `POST /api/staff` - Add staff member
  - `PUT /api/staff/:id` - Update staff information
- **Status**: ✅ **ACTIVE** - Operational feature

### 🔧 Testing Routes (`src/routes/test.ts`)
**Purpose**: API testing and development utilities
- **Features**:
  - Database connectivity tests
  - Integration testing endpoints
  - Performance monitoring
- **Status**: ✅ **ACTIVE** - Development support

### 💾 Backup Routes (`src/routes/onboarding-backup.ts`)
**Purpose**: Data backup and recovery operations
- **Key Endpoints**:
  - `POST /api/onboarding/backup` - Create backup
  - `POST /api/onboarding/restore` - Restore from backup
- **Status**: ✅ **ACTIVE** - Data protection

---

## 🔧 Services Analysis

### 🎯 Core Business Services

#### **OnboardingService** (`src/services/onboardingService.ts`)
- **Purpose**: Centralized onboarding business logic
- **Key Features**:
  - Step validation and processing
  - Data aggregation from multiple sources
  - Progress calculation and tracking
  - Integration with external services
- **Dependencies**: VillaService, SharePointService, Database
- **Status**: ✅ **ACTIVE** - Core service

#### **VillaService** (`src/services/villaService.ts`)
- **Purpose**: Villa-specific operations and management
- **Key Features**:
  - CRUD operations with complex relationships
  - Status management and workflows
  - Data validation and sanitization
- **Dependencies**: Database, OnboardingService
- **Status**: ✅ **ACTIVE** - Core service

### 🔗 Integration Services

#### **SharePointService** (`src/services/sharePointService.ts`)
- **Purpose**: SharePoint document management integration
- **Key Features**:
  - File upload and retrieval
  - Folder structure management
  - Permission handling
  - Metadata synchronization
- **Dependencies**: MicrosoftGraphService
- **Status**: ✅ **ACTIVE** - Critical integration

#### **MicrosoftGraphService** (`src/services/microsoftGraphService.ts`)
- **Purpose**: Microsoft Graph API integration
- **Key Features**:
  - Authentication management
  - API request handling
  - Error handling and retry logic
- **Dependencies**: External Microsoft Graph API
- **Status**: ✅ **ACTIVE** - Authentication layer

#### **MediaService** (`src/services/mediaService.ts`)
- **Purpose**: Media file processing and management
- **Key Features**:
  - File validation and processing
  - Image optimization
  - Storage management
- **Status**: ✅ **ACTIVE** - Media handling

### 💰 Specialized Services

#### **BankDetailsService** (`src/services/bankDetailsService.ts`)
- **Purpose**: Banking information management
- **Key Features**:
  - Secure data handling
  - Validation and verification
  - Encryption support
- **Status**: ✅ **ACTIVE** - Financial data

#### **WebSocketService** (`src/services/websocketService.ts`)
- **Purpose**: Real-time communication
- **Key Features**:
  - Live progress updates
  - Client synchronization
  - Event broadcasting
- **Status**: ✅ **ACTIVE** - Real-time features

---

## 🗄️ Database Analysis

### **Prisma Schema** (`prisma/schema.prisma`)
**Comprehensive data model with 15+ tables**:

#### **Core Entities**:
- **Villa**: Central entity with 50+ fields
- **Owner**: Owner information with company/individual variants
- **OnboardingProgress**: Granular progress tracking
- **Documents**: File management with SharePoint integration
- **Photos**: Image management with categorization
- **Staff**: Personnel management
- **Facilities**: Property amenities tracking

#### **Key Features**:
- **25+ Enum types** for standardized data
- **Complex relationships** with foreign keys and indexes
- **Audit trails** with timestamps
- **Soft delete** capabilities
- **Full-text search** optimization

#### **Recent Migrations**:
- Contact field additions (2025-09-10)
- Location type enhancements (2025-09-12)
- Agreement table removal (2025-09-12)

**Status**: ✅ **ACTIVE** - Comprehensive and well-designed

---

## 📋 API Endpoint Mapping

### **Onboarding Endpoints**
```
GET    /api/onboarding/:villaId           # Get onboarding status
POST   /api/onboarding/step/:stepNumber  # Submit step data
PUT    /api/onboarding/:villaId/progress # Update progress
POST   /api/onboarding/:villaId/complete # Complete onboarding
POST   /api/onboarding/backup            # Create backup
POST   /api/onboarding/restore           # Restore backup
```

### **Villa Management Endpoints**
```
GET    /api/villas                       # List villas
GET    /api/villas/:id                   # Get villa details
POST   /api/villas                       # Create villa
PUT    /api/villas/:id                   # Update villa
DELETE /api/villas/:id                   # Delete villa
```

### **Document Management Endpoints**
```
POST   /api/documents/upload             # Upload document
GET    /api/documents/:villaId           # Get documents
PUT    /api/documents/:id/validate       # Validate document
DELETE /api/documents/:id                # Delete document
```

### **Photo Management Endpoints**
```
POST   /api/photos/upload                # Upload photo
GET    /api/photos/:villaId              # Get photos
PUT    /api/photos/:id/categorize        # Categorize photo
DELETE /api/photos/:id                   # Delete photo
```

### **Staff Management Endpoints**
```
GET    /api/staff/:villaId               # Get staff
POST   /api/staff                        # Add staff
PUT    /api/staff/:id                    # Update staff
DELETE /api/staff/:id                    # Remove staff
```

---

## 🗑️ Unused Files Analysis

### **Definitely Unused (Safe to Delete)**

#### **Debug and Test Files**:
```bash
# Debug scripts - development artifacts
backend/debug-actual-data.js
backend/debug-document-photo-rendering.js
backend/debug-facilities.js
backend/debug-onboarding-complete.js
backend/debug-progress-tracker.js
backend/fix-facility-photo-data.js

# Test scripts - development artifacts
backend/test-facility-persistence.ts
backend/test-photo-category-fix.js
backend/test-photo-upload-with-bedrooms.js
backend/test-photo-upload.js
backend/test-progress-tracking.js
backend/test-schema-verification.js
backend/test-simple-facility.js
backend/test-stage9-readiness.js
```

#### **Legacy Routes**:
```bash
# Superseded by enhanced versions
backend/src/routes/villasSimple.ts  # Basic villa operations
```

#### **Temporary Files**:
```bash
# Backup and temporary files
backend/src/services/sharePointService.ts.tmp
backend/temp_migration.sql
backend/migration-schema-fixes.sql
```

### **Potentially Unused (Review Before Deleting)**

#### **Basic vs Enhanced Route Pairs**:
- `src/routes/documents.ts` vs `src/routes/documents-enhanced.ts`
- `src/routes/photos.ts` vs `src/routes/photos-enhanced.ts`

**Recommendation**: Keep enhanced versions, deprecate basic versions

#### **ElectricSQL Integration**:
- `src/electric/client.ts` - Check if ElectricSQL is still being used

---

## 🔄 Service Dependencies Map

```
┌─────────────────────┐
│      Routes         │
│  (API Endpoints)    │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│     Services        │
│  (Business Logic)   │
├─────────────────────┤
│ OnboardingService   │◄──┐
│ VillaService       │   │
│ SharePointService  │   │
│ BankDetailsService │   │
│ MediaService       │   │
│ WebSocketService   │   │
└──────────┬──────────┘   │
           │              │
┌──────────▼──────────┐   │
│     Database        │   │
│   (Prisma ORM)     │   │
└─────────────────────┘   │
                          │
┌─────────────────────────┴─┐
│   External Services       │
├───────────────────────────┤
│ Microsoft Graph API       │
│ SharePoint Online         │
│ ElectricSQL (optional)    │
└───────────────────────────┘
```

---

## ⚙️ Configuration Analysis

### **Server Configuration** (`src/server.ts`)
- **Framework**: Express.js with TypeScript
- **Key Features**:
  - CORS configuration
  - Rate limiting
  - Request logging
  - Error handling middleware
  - WebSocket support
- **Status**: ✅ **ACTIVE** - Production ready

### **Environment Configuration**
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk integration
- **File Storage**: Dual strategy (Database + SharePoint)
- **Real-time**: WebSocket + ElectricSQL integration

### **Package Dependencies**
- **Core**: Express, Prisma, TypeScript
- **Integrations**: Microsoft Graph SDK, SharePoint APIs
- **Utilities**: Zod validation, Winston logging
- **Status**: ✅ **ACTIVE** - Well maintained

---

## 🚨 Issues and Improvement Opportunities

### **Immediate Cleanup Actions**
```bash
# Safe to delete - confirmed unused debug/test files
rm backend/debug-*.js
rm backend/test-*.js
rm backend/test-*.ts
rm backend/fix-*.js
rm backend/src/routes/villasSimple.ts
rm backend/src/services/sharePointService.ts.tmp
rm backend/temp_migration.sql
rm backend/migration-schema-fixes.sql
```

### **Route Consolidation Opportunities**
1. **Documents**: Merge basic and enhanced document routes
2. **Photos**: Consolidate photo management routes
3. **API Versioning**: Consider implementing API versioning

### **Performance Improvements**
1. **Caching**: Enhance caching middleware usage
2. **Database**: Review and optimize slow queries
3. **File Storage**: Implement CDN for media files

### **Security Enhancements**
1. **Input Validation**: Ensure all endpoints use Zod validation
2. **Rate Limiting**: Review and adjust rate limits
3. **Authentication**: Audit auth middleware coverage

---

## 📊 Architecture Quality Assessment

### **Strengths** ✅
- **Clean Architecture**: Well-separated concerns (routes → services → database)
- **Type Safety**: Full TypeScript implementation
- **Modern Stack**: Current versions of key dependencies
- **Comprehensive Features**: Complete villa management lifecycle
- **Real-time Support**: WebSocket and ElectricSQL integration
- **External Integrations**: Professional SharePoint/Graph integration

### **Areas for Improvement** ⚠️
- **Route Duplication**: Basic vs enhanced route variants
- **Debug Artifacts**: Many leftover debug and test files
- **Documentation**: API documentation could be enhanced
- **Testing**: Could benefit from comprehensive test suite

---

## 🎯 Recommended Action Plan

### **Phase 1: Cleanup (Immediate)**
1. Delete debug and test artifact files
2. Remove temporary migration files
3. Deprecate superseded route files

### **Phase 2: Consolidation (Short-term)**
1. Merge duplicate route functionality
2. Implement API versioning strategy
3. Enhance documentation

### **Phase 3: Optimization (Medium-term)**
1. Performance optimization
2. Enhanced testing coverage
3. Security audit and improvements

---

*This analysis was generated on 2025-09-15 and reflects the current state of the backend repository.*