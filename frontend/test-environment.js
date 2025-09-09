#!/usr/bin/env node

/**
 * Frontend Environment Variables Validation Test Script
 * Validates that all required Next.js environment variables are properly configured
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  for (const line of envLines) {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  }
}

const environmentTests = [
  // API Configuration
  {
    name: 'NEXT_PUBLIC_API_URL',
    test: () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return 'NEXT_PUBLIC_API_URL not set';
      
      try {
        const url = new URL(apiUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return 'API URL must use HTTP or HTTPS';
        }
        return true;
      } catch {
        return 'Invalid API URL format';
      }
    },
    required: true,
    category: 'API'
  },

  // Clerk Authentication
  {
    name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    test: () => {
      const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
      if (!publishableKey) return 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not set';
      if (!publishableKey.startsWith('pk_')) return 'Clerk publishable key should start with pk_';
      return true;
    },
    required: true,
    category: 'Authentication'
  },

  {
    name: 'CLERK_SECRET_KEY',
    test: () => {
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!secretKey) return 'CLERK_SECRET_KEY not set';
      if (!secretKey.startsWith('sk_')) return 'Clerk secret key should start with sk_';
      return true;
    },
    required: true,
    category: 'Authentication'
  },

  // Authentication URLs
  {
    name: 'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
    test: () => {
      const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL;
      if (!signInUrl) return 'NEXT_PUBLIC_CLERK_SIGN_IN_URL not set';
      if (!signInUrl.startsWith('/')) return 'Sign in URL should start with /';
      return true;
    },
    required: true,
    category: 'Authentication'
  },

  {
    name: 'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
    test: () => {
      const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL;
      if (!signUpUrl) return 'NEXT_PUBLIC_CLERK_SIGN_UP_URL not set';
      if (!signUpUrl.startsWith('/')) return 'Sign up URL should start with /';
      return true;
    },
    required: true,
    category: 'Authentication'
  },

  {
    name: 'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
    test: () => {
      const afterSignInUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL;
      if (!afterSignInUrl) return 'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL not set';
      if (!afterSignInUrl.startsWith('/')) return 'After sign in URL should start with /';
      return true;
    },
    required: true,
    category: 'Authentication'
  },

  {
    name: 'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
    test: () => {
      const afterSignUpUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL;
      if (!afterSignUpUrl) return 'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL not set';
      if (!afterSignUpUrl.startsWith('/')) return 'After sign up URL should start with /';
      return true;
    },
    required: true,
    category: 'Authentication'
  },

  // App Configuration
  {
    name: 'NEXT_PUBLIC_APP_URL',
    test: () => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) return 'NEXT_PUBLIC_APP_URL not set';
      
      try {
        const url = new URL(appUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return 'App URL must use HTTP or HTTPS';
        }
        return true;
      } catch {
        return 'Invalid App URL format';
      }
    },
    required: true,
    category: 'Configuration'
  },

  // WebSocket Configuration
  {
    name: 'NEXT_PUBLIC_WEBSOCKET_URL',
    test: () => {
      const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
      if (!wsUrl) return 'NEXT_PUBLIC_WEBSOCKET_URL not set';
      
      try {
        const url = new URL(wsUrl);
        if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
          return 'WebSocket URL must use HTTP, HTTPS, WS, or WSS';
        }
        return true;
      } catch {
        return 'Invalid WebSocket URL format';
      }
    },
    required: false,
    category: 'WebSocket'
  },

  // Environment Configuration
  {
    name: 'NEXT_PUBLIC_ENVIRONMENT',
    test: () => {
      const env = process.env.NEXT_PUBLIC_ENVIRONMENT;
      if (!env) return 'NEXT_PUBLIC_ENVIRONMENT not set';
      if (!['development', 'production', 'test'].includes(env)) {
        return 'Environment must be development, production, or test';
      }
      return true;
    },
    required: false,
    category: 'Configuration'
  },

  // Feature Flags
  {
    name: 'NEXT_PUBLIC_ENABLE_REAL_TIME',
    test: () => {
      const enableRealTime = process.env.NEXT_PUBLIC_ENABLE_REAL_TIME;
      if (enableRealTime && !['true', 'false'].includes(enableRealTime.toLowerCase())) {
        return 'NEXT_PUBLIC_ENABLE_REAL_TIME should be true or false';
      }
      return true;
    },
    required: false,
    category: 'Features'
  },

  {
    name: 'NEXT_PUBLIC_ENABLE_SHAREPOINT',
    test: () => {
      const enableSharePoint = process.env.NEXT_PUBLIC_ENABLE_SHAREPOINT;
      if (enableSharePoint && !['true', 'false'].includes(enableSharePoint.toLowerCase())) {
        return 'NEXT_PUBLIC_ENABLE_SHAREPOINT should be true or false';
      }
      return true;
    },
    required: false,
    category: 'Features'
  },

  {
    name: 'NEXT_PUBLIC_ENABLE_MICROSOFT_GRAPH',
    test: () => {
      const enableMSGraph = process.env.NEXT_PUBLIC_ENABLE_MICROSOFT_GRAPH;
      if (enableMSGraph && !['true', 'false'].includes(enableMSGraph.toLowerCase())) {
        return 'NEXT_PUBLIC_ENABLE_MICROSOFT_GRAPH should be true or false';
      }
      return true;
    },
    required: false,
    category: 'Features'
  }
];

async function runTests() {
  console.log('🔧 Frontend Environment Variables Validation\\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    categories: {}
  };

  for (const test of environmentTests) {
    results.total++;
    
    if (!results.categories[test.category]) {
      results.categories[test.category] = { passed: 0, failed: 0, warnings: 0 };
    }

    try {
      const result = test.test();
      
      if (result === true) {
        console.log(`✅ ${test.name}: PASS`);
        results.passed++;
        results.categories[test.category].passed++;
      } else {
        const isWarning = typeof result === 'string' && result.includes('WARNING');
        const status = isWarning ? 'WARNING' : 'FAIL';
        const icon = isWarning ? '⚠️' : test.required ? '❌' : '⚠️';
        
        console.log(`${icon} ${test.name}: ${status} - ${result}`);
        
        if (isWarning || !test.required) {
          results.warnings++;
          results.categories[test.category].warnings++;
        } else {
          results.failed++;
          results.categories[test.category].failed++;
        }
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message || 'Unknown error'}`);
      results.failed++;
      results.categories[test.category].failed++;
    }
  }

  // Print summary
  console.log('\\n📊 Test Summary:');
  console.log(`Total tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Warnings: ${results.warnings} ⚠️`);
  
  // Print category breakdown
  console.log('\\n📋 By Category:');
  for (const [category, stats] of Object.entries(results.categories)) {
    const total = stats.passed + stats.failed + stats.warnings;
    console.log(`${category}: ${stats.passed}/${total} passed (${stats.failed} failed, ${stats.warnings} warnings)`);
  }

  // Test API connectivity
  console.log('\\n🔗 Testing API Connectivity:');
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      // Use Node.js fetch or a simple HTTP request
      const response = await fetch(`${apiUrl}/health`);
      const data = await response.json();
      
      if (data.status === 'healthy') {
        console.log('✅ Backend API is accessible and healthy');
      } else {
        console.log('⚠️  Backend API responded but may have issues');
      }
    } catch (error) {
      console.log('❌ Cannot connect to backend API:', error.message);
    }
  }

  const criticalFailures = results.failed;

  if (criticalFailures === 0) {
    console.log('\\n🎉 All critical frontend environment variables are properly configured!');
    return 0;
  } else {
    console.log(`\\n💥 ${criticalFailures} critical environment variable(s) failed validation!`);
    return 1;
  }
}

// Polyfill fetch for Node.js if not available
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}

// Run the tests
runTests().then(exitCode => {
  process.exit(exitCode);
}).catch((error) => {
  console.error('❌ Fatal error during frontend environment validation:', error);
  process.exit(1);
});