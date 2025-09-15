# Routes Organization Structure

## 📁 Folder Structure

The routes have been organized into logical sub-folders for better navigation and maintainability:

```
routes/
├── 🔐 auth-user/           # Authentication & User Management
│   ├── auth.ts             # Authentication endpoints
│   └── users.ts            # User management endpoints
│
├── 🏘️ villa-management/    # Villa & Property Management
│   ├── villas.ts           # Villa CRUD operations
│   ├── owners.ts           # Owner management
│   ├── staff.ts            # Staff management
│   ├── facilities.ts       # Facility management
│   ├── facilityPhotos.ts   # Facility photos
│   └── bank.ts             # Banking details
│
├── 📸 media/               # Document & Photo Management
│   ├── documents.ts        # Document operations
│   ├── documents-enhanced.ts # Enhanced document handling
│   ├── photos.ts           # Photo operations
│   ├── photos-enhanced.ts  # Enhanced photo handling
│   └── fileServer.ts       # File serving endpoints
│
├── 🎯 onboarding/          # Onboarding Process
│   ├── onboarding.ts       # Main onboarding flow
│   └── onboarding-backup.ts # Backup/restore functionality
│
├── 👨‍💼 admin/              # Admin & Dashboard
│   └── dashboard.ts        # Dashboard endpoints
│
├── 🔗 integrations/        # External Integrations
│   ├── ota.ts              # OTA platform integration
│   ├── sharepoint.ts       # SharePoint integration
│   └── sharepoint-test.ts  # SharePoint testing
│
└── 🔧 utilities/           # Utility & Testing
    ├── analytics.ts        # Analytics endpoints
    └── test.ts            # Testing endpoints
```

## 🎯 Quick Navigation Guide

### By Feature Area:

- **Villa Operations**: `villa-management/villas.ts`
- **User Authentication**: `auth-user/auth.ts`
- **File Uploads**: `media/documents.ts`, `media/photos.ts`
- **Onboarding Wizard**: `onboarding/onboarding.ts`
- **Admin Dashboard**: `admin/dashboard.ts`
- **SharePoint Sync**: `integrations/sharepoint.ts`
- **OTA Platforms**: `integrations/ota.ts`

### By Common Tasks:

| Task | Location |
|------|----------|
| Add new villa | `villa-management/villas.ts` |
| Upload documents | `media/documents.ts` |
| Manage staff | `villa-management/staff.ts` |
| Handle onboarding | `onboarding/onboarding.ts` |
| View dashboard | `admin/dashboard.ts` |
| Test endpoints | `utilities/test.ts` |

## 📝 Import Examples

```typescript
// Old way (flat structure)
import villaRouter from './routes/villas';

// New way (organized structure)
import villaRouter from './routes/villa-management/villas';
```

## 🔄 Route Registration

All routes are still registered in `server.ts` with their API prefixes:

- `/api/villas` → villa-management/villas.ts
- `/api/onboarding` → onboarding/onboarding.ts
- `/api/documents` → media/documents.ts
- `/api/dashboard` → admin/dashboard.ts
- etc.

## 🎯 Benefits

1. **Faster Navigation**: Related routes are grouped together
2. **Clear Organization**: Logical separation by feature area
3. **Easier Maintenance**: Know exactly where to find/add routes
4. **Better Scalability**: Easy to add new route categories

---

*Routes organized on 2025-09-15 for improved developer experience*