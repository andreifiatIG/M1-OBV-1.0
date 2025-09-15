# Backend SRC Folder Organization

## 📁 Final Structure Overview

```
src/
├── 📁 middleware/          # Express middleware functions
│   ├── auth.ts            # Main authentication middleware
│   ├── cache.ts           # Response caching middleware
│   ├── clerkAuth.ts       # Clerk JWT authentication
│   ├── errorHandler.ts    # Global error handling
│   ├── rateLimiting.ts    # API rate limiting
│   ├── sanitization.ts    # Input sanitization
│   ├── simpleClerkAuth.ts # Simplified Clerk auth for dev
│   ├── upload.ts          # File upload handling
│   └── validation.ts      # Request validation
│
├── 📁 routes/             # API route handlers (organized by feature)
│   ├── 🔐 auth-user/      # User authentication & management
│   ├── 👨‍💼 admin/         # Admin dashboard routes
│   ├── 🔗 integrations/   # External service integrations
│   ├── 📸 media/          # Document & photo management
│   ├── 🎯 onboarding/     # Villa onboarding process
│   ├── 🏘️ villa-management/ # Villa operations
│   └── index.ts           # Route exports
│
├── 📁 services/           # Business logic services (organized by domain)
│   ├── 🎯 core/           # Core business services
│   │   ├── onboardingService.ts    # Main onboarding logic (110KB)
│   │   ├── villaService.ts         # Villa operations (21KB)
│   │   └── bankDetailsService.ts   # Banking operations (9KB)
│   ├── 🔗 integrations/   # External service integrations
│   │   ├── sharePointService.ts    # SharePoint integration (47KB)
│   │   ├── microsoftGraphService.ts # MS Graph API (18KB)
│   │   ├── emailService.ts         # Email functionality (10KB)
│   │   └── websocketService.ts     # Real-time communication (15KB)
│   ├── 💾 storage/        # Data & media storage
│   │   ├── mediaService.ts              # Media file handling (15KB)
│   │   └── databaseFileStorageService.ts # Database file ops (9KB)
│   ├── 👨‍💼 admin/         # Admin & monitoring services
│   │   ├── dashboardService.ts          # Dashboard logic (26KB)
│   │   └── onboardingProgressService.ts # Progress tracking (22KB)
│   └── 🔧 utilities/      # Utility & support services
│       ├── otaCredentialsService.ts     # OTA credentials (11KB)
│       ├── databaseOptimization.ts     # DB optimization (7KB)
│       └── mockSharePointService.ts    # Mock for testing (10KB)
│
├── 📁 types/             # TypeScript type definitions
│   └── global.d.ts       # Global type declarations
│
├── 📁 utils/             # Utility functions
│   ├── helpers.ts        # General helper functions
│   ├── logger.ts         # Logging utilities
│   ├── encryption.ts     # Data encryption
│   └── logger-mock.ts    # Mock logger for testing
│
└── server.ts             # Main Express server configuration
```

## 🎯 Organization Benefits

### **Services Organization**
- **Core**: Essential business logic (onboarding, villas, banking)
- **Integrations**: External APIs (SharePoint, Graph, email, WebSocket)
- **Storage**: File and media management
- **Admin**: Dashboard and monitoring functionality
- **Utilities**: Supporting services and testing mocks

### **Routes Organization**
- **Logical grouping** by business domain
- **Easy navigation** - know exactly where to find specific functionality
- **Scalable structure** - easy to add new feature areas

## 🔄 Import Path Examples

### **Old vs New Service Imports**
```typescript
// OLD (flat structure)
import onboardingService from '../services/onboardingService';
import { mediaService } from '../services/mediaService';

// NEW (organized structure)
import onboardingService from '../../services/core/onboardingService';
import { mediaService } from '../../services/storage/mediaService';
```

### **Service Categories**
```typescript
// Core business services
import onboardingService from './services/core/onboardingService';
import villaService from './services/core/villaService';

// Integration services
import sharePointService from './services/integrations/sharePointService';
import emailService from './services/integrations/emailService';

// Storage services
import { mediaService } from './services/storage/mediaService';

// Admin services
import dashboardService from './services/admin/dashboardService';

// Utility services
import mockService from './services/utilities/mockSharePointService';
```

## 📋 Quick Navigation Guide

### **By Task Type**

| Task | Location |
|------|----------|
| **Add new business logic** | `services/core/` |
| **Add new API endpoint** | `routes/{domain}/` |
| **Add external integration** | `services/integrations/` |
| **Add middleware** | `middleware/` |
| **Add utility function** | `utils/` |
| **Add type definitions** | `types/` |

### **By Feature Area**

| Feature | Routes | Services |
|---------|--------|----------|
| **Villa Management** | `routes/villa-management/` | `services/core/` |
| **User Management** | `routes/auth-user/` | `middleware/auth.ts` |
| **File Management** | `routes/media/` | `services/storage/` |
| **Onboarding** | `routes/onboarding/` | `services/core/onboardingService.ts` |
| **Admin Dashboard** | `routes/admin/` | `services/admin/` |
| **External APIs** | `routes/integrations/` | `services/integrations/` |

## 🧹 Cleanup Actions Performed

### **Temp & Upload Folders**
- ✅ Added `temp/` and `uploads/` to `.gitignore`
- ✅ Both folders are empty (used for runtime file storage)

### **Services Reorganization**
- ✅ Organized 14 services into 5 logical categories
- ✅ Updated all import paths throughout codebase
- ✅ Maintained all existing functionality

### **File Size Distribution**
- **Largest**: `onboardingService.ts` (110KB) - Main business logic
- **Integration Heavy**: `sharePointService.ts` (47KB) - SharePoint integration
- **Admin Features**: `dashboardService.ts` (26KB) - Dashboard logic

## 🎯 Maintenance Guidelines

1. **New Services**: Place in appropriate category folder
2. **Import Paths**: Always use relative paths from file location
3. **Naming**: Keep consistent naming conventions
4. **Documentation**: Update this file when adding new categories

---

*SRC folder organized on 2025-09-15 for improved developer experience and maintainability*