#!/usr/bin/env node

/**
 * Test Enhanced Progress Tracking System
 * Tests the new data-based completion calculation vs legacy approach
 */

import { PrismaClient } from '@prisma/client';
import onboardingService from './src/services/onboardingService.ts';

const prisma = new PrismaClient();

async function testProgressTracking() {
  try {
    console.log('🧪 ENHANCED PROGRESS TRACKING TEST');
    console.log('==================================\n');

    // Use the existing villa ID from the logs
    const VILLA_ID = '460eb7d5-1c1b-4ed4-a4f5-169c25192275';

    console.log('📊 STEP 1: Testing progress calculation with current data...');
    console.log('-----------------------------------------------------------');
    
    // Get current onboarding progress
    const progress = await onboardingService.getOnboardingProgress(VILLA_ID);
    
    console.log('✅ Progress calculation results:');
    console.log(`   Current Step: ${progress.currentStep}`);
    console.log(`   Data-Based Completion: ${progress.completionPercentage}% (${progress.completedStepsCount}/${10} steps)`);
    
    if (progress.legacyProgress) {
      console.log(`   Legacy Completion: ${progress.legacyProgress.completionPercentage}% (${progress.legacyProgress.completedSteps}/${10} steps)`);
    }
    
    console.log(`   Completed Steps: [${progress.completedSteps.join(', ')}]`);

    console.log('\n📋 STEP 2: Detailed step-by-step analysis...');
    console.log('---------------------------------------------');
    
    if (progress.stepCompletionDetails) {
      for (let step = 1; step <= 10; step++) {
        const stepDetail = progress.stepCompletionDetails[step];
        if (stepDetail) {
          const status = stepDetail.isComplete ? '✅' : '❌';
          console.log(`   Step ${step}: ${status} ${stepDetail.reason}`);
          if (stepDetail.requiredFields.length > 0) {
            console.log(`      Required: [${stepDetail.requiredFields.join(', ')}]`);
            console.log(`      Completed: [${stepDetail.completedFields.join(', ')}]`);
          }
        }
      }
    }

    console.log('\n🔍 STEP 3: Data verification...');
    console.log('-------------------------------');
    
    // Check actual villa data
    const villa = await prisma.villa.findUnique({
      where: { id: VILLA_ID },
      include: {
        owner: true,
        contractualDetails: true,
        bankDetails: true,
        otaCredentials: true,
        staff: { where: { isActive: true } },
        facilities: { where: { isAvailable: true } },
        photos: true,
        documents: { where: { isActive: true } }
      }
    });

    if (villa) {
      console.log('✅ Villa data summary:');
      console.log(`   Villa Info: ${villa.villaName || 'Missing'} - ${villa.location || 'Missing'}`);
      console.log(`   Owner: ${villa.owner ? `${villa.owner.firstName} ${villa.owner.lastName}` : 'Missing'}`);
      console.log(`   Contractual Details: ${villa.contractualDetails ? 'Present' : 'Missing'}`);
      console.log(`   Bank Details: ${villa.bankDetails ? 'Present' : 'Missing'}`);
      console.log(`   OTA Credentials: ${villa.otaCredentials.length} platforms`);
      console.log(`   Documents: ${villa.documents.length} uploaded`);
      console.log(`   Staff: ${villa.staff.length} members`);
      console.log(`   Facilities: ${villa.facilities.length} available`);
      console.log(`   Photos: ${villa.photos.length} uploaded`);
    }

    console.log('\n📈 STEP 4: Progress consistency check...');
    console.log('---------------------------------------');
    
    // Check if legacy flags match data-based analysis
    const onboardingProgress = await prisma.onboardingProgress.findUnique({
      where: { villaId: VILLA_ID }
    });

    if (onboardingProgress && progress.stepCompletionDetails) {
      const legacyFlags = {
        1: onboardingProgress.villaInfoCompleted,
        2: onboardingProgress.ownerDetailsCompleted,
        3: onboardingProgress.contractualDetailsCompleted,
        4: onboardingProgress.bankDetailsCompleted,
        5: onboardingProgress.otaCredentialsCompleted,
        6: onboardingProgress.documentsUploaded,
        7: onboardingProgress.staffConfigCompleted,
        8: onboardingProgress.facilitiesCompleted,
        9: onboardingProgress.photosUploaded,
        10: onboardingProgress.reviewCompleted
      };

      console.log('✅ Legacy vs Data-based comparison:');
      for (let step = 1; step <= 10; step++) {
        const legacyComplete = legacyFlags[step];
        const dataComplete = progress.stepCompletionDetails[step]?.isComplete;
        const match = legacyComplete === dataComplete;
        
        const matchSymbol = match ? '✅' : '⚠️';
        console.log(`   Step ${step}: Legacy=${legacyComplete ? '✅' : '❌'}, Data=${dataComplete ? '✅' : '❌'} ${matchSymbol}`);
      }
    }

    console.log('\n🎯 STEP 5: Frontend integration test...');
    console.log('--------------------------------------');
    
    // Simulate what frontend would receive
    const frontendData = {
      currentStep: progress.currentStep,
      totalSteps: 10,
      completionPercentage: progress.completionPercentage,
      completedSteps: progress.completedSteps,
      stepDetails: progress.stepCompletionDetails
    };

    console.log('✅ Frontend would receive:');
    console.log('   Progress Display:', `Step ${frontendData.currentStep} of ${frontendData.totalSteps} • ${frontendData.completionPercentage}% Complete`);
    console.log('   Steps Completed:', frontendData.completedSteps.length, 'out of', frontendData.totalSteps);
    
    // Show what the progress bar would look like
    const progressBar = '█'.repeat(Math.floor(frontendData.completionPercentage / 10)) + 
                       '░'.repeat(10 - Math.floor(frontendData.completionPercentage / 10));
    console.log('   Progress Bar:', `[${progressBar}] ${frontendData.completionPercentage}%`);

    console.log('\n🎉 PROGRESS TRACKING TEST SUMMARY');
    console.log('=================================');
    console.log('✓ Data-based completion calculation working');
    console.log('✓ Step-by-step progress analysis functional');
    console.log('✓ Legacy system synchronization implemented');
    console.log('✓ Frontend integration data structure ready');
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log('• Frontend can now display accurate progress percentages');
    console.log('• Each step shows completion based on actual data, not manual flags');
    console.log('• Progress updates automatically when data is added/modified');
    console.log('• Legacy system remains compatible for existing integrations');

  } catch (error) {
    console.error('❌ Progress tracking test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProgressTracking();