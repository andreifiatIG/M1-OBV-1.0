#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class ProgressTrackerDebugger {
  async debugProgressDiscrepancies() {
    console.log('🔍 Debugging Progress Tracker Issues...\n');

    try {
      // Get the test villa with all progress data
      const villa = await prisma.villa.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          onboarding: true,
          stepProgress: {
            include: {
              fields: true
            }
          }
        }
      });

      if (!villa) {
        console.log('❌ No villa found');
        return;
      }

      console.log(`✅ Found villa: ${villa.villaName} (${villa.id})\n`);

      // Check OnboardingProgress completion flags vs StepProgress isCompleted
      console.log('📊 PROGRESS DISCREPANCY ANALYSIS:');
      console.log('='.repeat(60));

      const flagToStepMap = {
        villaInfoCompleted: 1,
        ownerDetailsCompleted: 2,
        contractualDetailsCompleted: 3,
        bankDetailsCompleted: 4,
        otaCredentialsCompleted: 5,
        documentsUploaded: 6,
        staffConfigCompleted: 7,
        facilitiesCompleted: 8,
        photosUploaded: 9,
        reviewCompleted: 10
      };

      let discrepancies = 0;
      let missingStepRecords = 0;

      Object.entries(flagToStepMap).forEach(([flagName, stepNumber]) => {
        const onboardingFlag = villa.onboarding?.[flagName];
        const stepProgress = villa.stepProgress.find(sp => sp.stepNumber === stepNumber);
        
        const isStepCompleted = stepProgress ? (stepProgress.status === 'COMPLETED') : false;
        const status = stepProgress ? 
          `${stepProgress.status} (${isStepCompleted ? 'COMPLETED' : 'NOT_COMPLETED'})` : 
          'NO_RECORD';

        const mismatch = stepProgress ? 
          (isStepCompleted !== onboardingFlag) : 
          'MISSING_RECORD';

        console.log(`Step ${stepNumber.toString().padStart(2)}: Onboarding[${onboardingFlag ? '✅' : '❌'}] vs StepProgress[${status}] ${mismatch === true ? '⚠️  MISMATCH' : mismatch === 'MISSING_RECORD' ? '🔴 MISSING' : '✅'}`);

        if (mismatch === true) discrepancies++;
        if (mismatch === 'MISSING_RECORD') missingStepRecords++;
      });

      console.log('\n📈 SUMMARY:');
      console.log(`   Discrepancies: ${discrepancies}`);
      console.log(`   Missing Step Records: ${missingStepRecords}`);
      console.log(`   Total Issues: ${discrepancies + missingStepRecords}`);

      // Fix the isCompleted field issue
      console.log('\n🔧 FIXING STEP PROGRESS COMPLETION FLAGS:');
      
      for (const [flagName, stepNumber] of Object.entries(flagToStepMap)) {
        const onboardingFlag = villa.onboarding?.[flagName];
        const stepProgress = villa.stepProgress.find(sp => sp.stepNumber === stepNumber);
        
        if (stepProgress) {
          const isStepCompleted = stepProgress.status === 'COMPLETED';
          
          if (isStepCompleted !== onboardingFlag) {
            console.log(`   Fixing Step ${stepNumber}: ${stepProgress.status} → ${onboardingFlag ? 'COMPLETED' : 'IN_PROGRESS'}`);
            
            await prisma.onboardingStepProgress.update({
              where: {
                villaId_stepNumber: {
                  villaId: villa.id,
                  stepNumber: stepNumber
                }
              },
              data: {
                status: onboardingFlag ? 'COMPLETED' : 'IN_PROGRESS',
                completedAt: onboardingFlag ? new Date() : null
              }
            });
          }
        }
      }

      // Check field progress for bedroom data
      console.log('\n🛏️  BEDROOM CONFIGURATION CHECK:');
      const step9Progress = villa.stepProgress.find(sp => sp.stepNumber === 9);
      if (step9Progress) {
        console.log(`   Step 9 has ${step9Progress.fields.length} fields`);
        
        const bedroomFields = step9Progress.fields.filter(f => 
          f.fieldName.toLowerCase().includes('bedroom')
        );
        
        console.log(`   Found ${bedroomFields.length} bedroom-related fields:`);
        bedroomFields.forEach(field => {
          console.log(`     - ${field.fieldName}: ${field.value || 'NULL'} (${field.status})`);
        });
      }

      // Check SharePoint integration issues
      console.log('\n🔗 SHAREPOINT INTEGRATION ISSUES:');
      
      // Documents without SharePoint
      const documentsCount = await prisma.document.count({
        where: { villaId: villa.id }
      });
      
      const documentsWithSharePoint = await prisma.document.count({
        where: { 
          villaId: villa.id,
          sharePointFileId: { not: null }
        }
      });

      console.log(`   Documents: ${documentsWithSharePoint}/${documentsCount} uploaded to SharePoint`);

      // Photos without SharePoint
      const photosCount = await prisma.photo.count({
        where: { villaId: villa.id }
      });
      
      const photosWithSharePoint = await prisma.photo.count({
        where: { 
          villaId: villa.id,
          sharePointFileId: { not: null }
        }
      });

      console.log(`   Photos: ${photosWithSharePoint}/${photosCount} uploaded to SharePoint`);

      console.log('\n✨ Progress tracking debugging completed!');

    } catch (error) {
      console.error('❌ Debug failed:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run the debugger
const progressDebugger = new ProgressTrackerDebugger();
progressDebugger.debugProgressDiscrepancies();