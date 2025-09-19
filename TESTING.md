# Comprehensive Testing Guide - M1 Villa Management System

## 🚀 Quick Start

```bash
# Run all tests with comprehensive reporting
npm test

# Run tests with detailed output
npm run test:verbose

# Run tests with coverage reports
npm run test:coverage

# Check production readiness
npm run production:ready
```

## 📋 Test Coverage Overview

### Frontend Tests (22 Test Suites)
- ✅ **API Client** - Complete HTTP client testing
- ✅ **Onboarding Persistence** - Auto-save and data management
- ✅ **OnboardingWizardUnified** - Main wizard component
- ✅ **LazyStepLoader** - Component lazy loading and error handling
- ✅ **All Onboarding Steps** - Villa info, owner details, contracts, etc.
- ✅ **Villa Profile Components** - All section components
- ✅ **Utility Functions** - Data validation, formatting, helpers

### Backend Tests (25 Test Suites)
- ✅ **Core Services** - Onboarding, villa management, media handling
- ✅ **API Routes** - All REST endpoints with full CRUD operations
- ✅ **Database Operations** - Prisma ORM integration and queries
- ✅ **Authentication** - Clerk integration and security
- ✅ **File Upload** - Document and photo handling
- ✅ **Encryption** - Sensitive data protection
- ✅ **Integration Tests** - End-to-end workflow testing

### Integration Tests (15 Scenarios)
- ✅ **Complete Onboarding Flow** - All 10 steps end-to-end
- ✅ **Error Handling** - Network failures, validation errors
- ✅ **Performance** - Concurrent operations, large payloads
- ✅ **Security** - Authentication, input sanitization
- ✅ **Data Persistence** - Session recovery, database resilience

## 🛠 Test Commands Reference

### Master Test Runner
```bash
# Complete test suite with summary report
npm test

# Verbose output showing all test details
npm run test:verbose

# Coverage reports with HTML output
npm run test:coverage

# Individual component testing
npm run test:backend
npm run test:frontend
npm run test:integration
```

### Backend-Specific Tests
```bash
cd backend

# All backend tests
npm test

# Watch mode for development
npm run test:watch

# Visual test UI
npm run test:ui

# Coverage reports
npm run test:coverage

# Specific test categories
npm run test:services    # Service layer tests
npm run test:routes      # API endpoint tests
npm run test:utils       # Utility function tests
npm run test:integration # End-to-end tests
```

### Frontend-Specific Tests
```bash
cd frontend

# All frontend tests
npm test

# Watch mode for development
npm run test:watch

# Visual test UI
npm run test:ui

# Coverage reports
npm run test:coverage
```

## 📊 Test Architecture

### Frontend Test Structure
```
frontend/
├── lib/
│   ├── api-client.test.ts              # HTTP client testing
│   ├── onboarding-persistence.test.ts  # Data persistence
│   └── data-sync.test.ts               # Data synchronization
├── components/
│   ├── onboarding/
│   │   ├── OnboardingWizardUnified.test.tsx
│   │   ├── LazyStepLoader.test.tsx
│   │   └── steps/                      # Individual step tests
│   └── villa-profile/                  # Profile component tests
└── src/test/
    ├── setup.ts                        # Test configuration
    └── test-utils.ts                   # Testing utilities
```

### Backend Test Structure
```
backend/
├── src/
│   ├── services/
│   │   └── core/
│   │       └── onboardingService.test.ts
│   ├── routes/
│   │   ├── onboarding/
│   │   │   └── onboarding.test.ts
│   │   └── villa-management/
│   │       └── villas.test.ts
│   ├── utils/
│   │   ├── helpers.test.ts
│   │   └── encryption.test.ts
│   └── test/
│       ├── setup.ts                    # Test database setup
│       ├── test-utils.ts               # API testing utilities
│       └── integration.test.ts         # End-to-end tests
└── vitest.config.ts                    # Vitest configuration
```

## 🔧 Test Configuration

### Vitest Configuration Features
- **TypeScript Support** - Native TypeScript testing
- **Mock Support** - Comprehensive mocking for external services
- **Coverage Reports** - HTML, JSON, and text coverage reports
- **Parallel Execution** - Fast test execution
- **Watch Mode** - Automatic test re-running during development

### Database Testing
- **In-Memory Database** - Isolated test environment
- **Test Data Factories** - Consistent test data generation
- **Automatic Cleanup** - Clean state between tests
- **Transaction Support** - Rollback after each test

### Frontend Testing
- **React Testing Library** - Component testing best practices
- **DOM Environment** - jsdom for browser simulation
- **User Interaction** - Event simulation and assertions
- **Async Testing** - Proper async/await support

## 📈 Coverage Reports

### Coverage Thresholds
- **Frontend**: 70% minimum (branches, functions, lines, statements)
- **Backend**: 80% minimum (branches, functions, lines, statements)
- **Critical Path**: 100% coverage for onboarding flow

### Coverage Report Locations
```bash
# After running coverage tests
frontend/coverage/index.html  # Frontend coverage report
backend/coverage/index.html   # Backend coverage report
```

## 🚨 Quality Gates

### Pre-Production Checklist
```bash
# Complete quality check
npm run production:ready

# This runs:
# 1. ESLint - Code style and quality
# 2. TypeScript - Type checking
# 3. All Tests - Functionality verification
# 4. Build - Production build verification
```

### Continuous Integration
The test suite is designed for CI/CD integration:
- ✅ Parallel test execution
- ✅ Comprehensive error reporting
- ✅ Coverage threshold enforcement
- ✅ Build verification

## 🧪 Test Categories Explained

### Unit Tests
Test individual functions and components in isolation:
- Pure function testing
- Component rendering
- State management
- Data transformation

### Integration Tests
Test interaction between multiple components:
- API endpoint testing
- Database operations
- Service layer interactions
- Component integration

### End-to-End Tests
Test complete user workflows:
- Full onboarding process
- Villa management operations
- Error recovery scenarios
- Performance under load

## 🔍 Debugging Tests

### Common Commands
```bash
# Run specific test file
npm test -- api-client.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="onboarding"

# Debug mode with detailed output
npm run test:verbose

# Visual test debugging
npm run test:ui
```

### Test Debugging Tips
1. **Use `test.only()`** - Focus on specific test
2. **Console logging** - Add debugging statements
3. **Test UI** - Visual test runner for debugging
4. **Coverage reports** - Identify untested code paths

## 📋 Test Data Management

### Mock Data Factories
```typescript
// Generate consistent test data
const villa = generateMockVillaData({
  villaName: 'Test Villa',
  bedrooms: 3,
})

const owner = generateMockOwnerData({
  email: 'test@example.com',
})
```

### Database Test Utilities
```typescript
// Create test data
const villa = await createTestVilla()
const owner = await createTestOwner(villa.id)
const progress = await createTestOnboardingProgress(villa.id)
```

## 🛡 Security Testing

### What's Tested
- ✅ Authentication requirements
- ✅ Input sanitization
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Sensitive data encryption
- ✅ Access control validation

### Security Test Examples
```typescript
// Test input sanitization
expect(sanitizeInput('<script>alert("xss")</script>'))
  .toBe('script alert("xss")/script')

// Test authentication
expect(unauthorizedRequest).toReturn(401)

// Test data encryption
expect(encryptedData).not.toBe(originalData)
```

## 📊 Performance Testing

### Load Testing Scenarios
- Concurrent onboarding sessions
- Large file uploads
- Database query performance
- Memory usage monitoring

### Performance Benchmarks
```typescript
// Test response times
expect(apiResponseTime).toBeLessThan(500) // ms

// Test memory usage
expect(memoryUsage).toBeLessThan(100) // MB

// Test concurrent operations
await Promise.all(concurrentRequests)
```

## 🎯 Test-Driven Development

### TDD Workflow
1. **Write failing test** - Define expected behavior
2. **Write minimal code** - Make test pass
3. **Refactor code** - Improve implementation
4. **Repeat cycle** - Continue with next feature

### Best Practices
- ✅ Test one thing at a time
- ✅ Use descriptive test names
- ✅ Keep tests independent
- ✅ Mock external dependencies
- ✅ Test edge cases
- ✅ Maintain test data factories

## 🔄 Continuous Testing

### Development Workflow
```bash
# Start development with continuous testing
npm run test:backend:watch  # Backend watch mode
npm run test:frontend:watch # Frontend watch mode

# Quick quality check before commit
npm run quality:check
```

### Pre-commit Testing
The testing setup supports pre-commit hooks to ensure:
- All tests pass
- Code coverage meets thresholds
- Linting rules are followed
- TypeScript compilation succeeds

## 📚 Testing Resources

### Key Libraries Used
- **Vitest** - Fast unit test framework
- **React Testing Library** - React component testing
- **Supertest** - HTTP API testing
- **@faker-js/faker** - Test data generation
- **@testing-library/user-event** - User interaction simulation

### External Documentation
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🎉 Success Metrics

Your application is production-ready when:
- ✅ All tests pass (100% success rate)
- ✅ Coverage exceeds minimum thresholds
- ✅ No ESLint errors or warnings
- ✅ TypeScript compilation succeeds
- ✅ Build process completes successfully
- ✅ Integration tests validate complete workflows

Run `npm run production:ready` to verify all criteria are met!

---

**Note**: This testing suite covers all major components and workflows in your M1 Villa Management System. The comprehensive test coverage ensures your application is robust, reliable, and ready for production deployment.