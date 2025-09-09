// Export M1 Villa Management route modules only
export { default as authRouter } from './auth';
export { default as villaRouter } from './villas';
export { default as ownerRouter } from './owners';
export { default as staffRouter } from './staff';
export { default as documentRouter } from './documents';
export { default as photoRouter } from './photos';
export { default as facilityRouter } from './facilities';
export { default as onboardingRouter } from './onboarding';
export { default as dashboardRouter } from './dashboard';
export { default as analyticsRouter } from './analytics';
export { default as bankRouter } from './bank';
export { default as otaRouter } from './ota';
export { default as usersRouter } from './users';
export { default as sharepointTestRouter } from './sharepoint-test';

// M6 routes are handled separately in M6 microservice:
// - bookings, partners, commissions