// Export M1 Villa Management route modules with organized structure

// Authentication & User Management
export { default as authRouter } from './auth-user/auth';
export { default as usersRouter } from './auth-user/users';

// Villa Management
export { default as villaRouter } from './villa-management/villas';
export { default as ownerRouter } from './villa-management/owners';
export { default as staffRouter } from './villa-management/staff';
export { default as facilityRouter } from './villa-management/facilities';
export { default as bankRouter } from './villa-management/bank';

// Media Management
export { default as documentRouter } from './media/documents';
export { default as photoRouter } from './media/photos';

// Onboarding
export { default as onboardingRouter } from './onboarding/onboarding';

// Admin
export { default as dashboardRouter } from './admin/dashboard';

// Integrations
export { default as otaRouter } from './integrations/ota';
export { default as sharepointTestRouter } from './integrations/sharepoint-test';

// Utilities
export { default as analyticsRouter } from './utilities/analytics';

// M6 routes are handled separately in M6 microservice:
// - bookings, partners, commissions