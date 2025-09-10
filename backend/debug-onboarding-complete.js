#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient();

class OnboardingDebugger {
  constructor() {
    this.results = {};
    this.performanceMetrics = {};
    this.errors = [];
    this.warnings = [];
  }

  log(step, type, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      step,
      type,
      message,
      data
    };
    
    console.log(`[${timestamp}] [${step}] [${type.toUpperCase()}] ${message}`);
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
    
    if (!this.results[step]) {
      this.results[step] = [];
    }
    this.results[step].push(logEntry);
  }

  async measurePerformance(step, operation, asyncFn) {
    const start = performance.now();
    try {
      const result = await asyncFn();
      const end = performance.now();
      const duration = Math.round(end - start);
      
      if (!this.performanceMetrics[step]) {
        this.performanceMetrics[step] = {};
      }
      this.performanceMetrics[step][operation] = duration;
      
      this.log(step, 'PERF', `${operation} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      const duration = Math.round(end - start);
      this.log(step, 'ERROR', `${operation} failed after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  async findTestVilla() {
    return await this.measurePerformance('INIT', 'Find Villa', async () => {
      const villa = await prisma.villa.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          onboarding: true,
          stepProgress: {
            include: {
              fields: true
            }
          },
          owner: true,
          photos: true,
          documents: true,
          staff: true,
          facilities: true,
          otaCredentials: true
        }
      });

      if (!villa) {
        throw new Error('No villa found for testing');
      }

      this.log('INIT', 'SUCCESS', `Found villa: ${villa.villaName}`, {
        villaId: villa.id,
        villaCode: villa.villaCode,
        onboardingStatus: villa.onboarding?.status,
        totalSteps: villa.stepProgress?.length || 0
      });

      return villa;
    });
  }

  async debugStep1VillaInfo(villa) {
    this.log('STEP1', 'INFO', 'Debugging Step 1: Villa Information');
    
    // Check villa basic info
    const villaData = {
      villaName: villa.villaName,
      location: villa.location,
      bedrooms: villa.bedrooms,
      bathrooms: villa.bathrooms,
      maxGuests: villa.maxGuests,
      propertyType: villa.propertyType
    };

    this.log('STEP1', 'DATA', 'Villa basic information', villaData);

    // Check step progress
    const step1Progress = villa.stepProgress.find(sp => sp.stepNumber === 1);
    if (step1Progress) {
      this.log('STEP1', 'PROGRESS', 'Step progress found', {
        status: step1Progress.status,
        isCompleted: step1Progress.isCompleted,
        fieldsCount: step1Progress.fields?.length || 0
      });

      // Check field progress
      if (step1Progress.fields?.length > 0) {
        step1Progress.fields.forEach(field => {
          this.log('STEP1', 'FIELD', `Field: ${field.fieldName}`, {
            value: field.value,
            status: field.status,
            updatedAt: field.updatedAt
          });
        });
      } else {
        this.warnings.push('Step 1: No field progress found');
      }
    } else {
      this.warnings.push('Step 1: No step progress record found');
    }

    // Check onboarding completion flag
    const onboardingFlag = villa.onboarding?.villaInfoCompleted;
    this.log('STEP1', 'COMPLETION', `Onboarding flag: ${onboardingFlag ? 'COMPLETED' : 'NOT_COMPLETED'}`);
  }

  async debugStep2OwnerDetails(villa) {
    this.log('STEP2', 'INFO', 'Debugging Step 2: Owner Details');

    // Check owner data
    if (villa.owner) {
      const ownerData = {
        firstName: villa.owner.firstName,
        lastName: villa.owner.lastName,
        email: villa.owner.email,
        phone: villa.owner.phone,
        ownerType: villa.owner.ownerType
      };
      this.log('STEP2', 'DATA', 'Owner information found', ownerData);
    } else {
      this.warnings.push('Step 2: No owner data found');
    }

    // Check step progress
    const step2Progress = villa.stepProgress.find(sp => sp.stepNumber === 2);
    if (step2Progress) {
      this.log('STEP2', 'PROGRESS', 'Step progress found', {
        status: step2Progress.status,
        isCompleted: step2Progress.isCompleted,
        fieldsCount: step2Progress.fields?.length || 0
      });
    } else {
      this.warnings.push('Step 2: No step progress record found');
    }

    const onboardingFlag = villa.onboarding?.ownerDetailsCompleted;
    this.log('STEP2', 'COMPLETION', `Onboarding flag: ${onboardingFlag ? 'COMPLETED' : 'NOT_COMPLETED'}`);
  }

  async debugStep6Documents(villa) {
    this.log('STEP6', 'INFO', 'Debugging Step 6: Documents Upload');

    // Check documents in database
    const documents = villa.documents || [];
    this.log('STEP6', 'DATA', `Found ${documents.length} documents`);

    documents.forEach((doc, index) => {
      this.log('STEP6', 'DOCUMENT', `Document ${index + 1}`, {
        fileName: doc.fileName,
        documentType: doc.documentType,
        fileUrl: doc.fileUrl,
        sharePointFileId: doc.sharePointFileId,
        sharePointPath: doc.sharePointPath,
        uploadedAt: doc.createdAt
      });
    });

    // Check step progress
    const step6Progress = villa.stepProgress.find(sp => sp.stepNumber === 6);
    if (step6Progress) {
      this.log('STEP6', 'PROGRESS', 'Step progress found', {
        status: step6Progress.status,
        isCompleted: step6Progress.isCompleted,
        fieldsCount: step6Progress.fields?.length || 0
      });
    }

    const onboardingFlag = villa.onboarding?.documentsUploaded;
    this.log('STEP6', 'COMPLETION', `Onboarding flag: ${onboardingFlag ? 'COMPLETED' : 'NOT_COMPLETED'}`);

    // Check SharePoint integration
    const sharePointDocs = documents.filter(d => d.sharePointFileId);
    this.log('STEP6', 'SHAREPOINT', `${sharePointDocs.length}/${documents.length} documents uploaded to SharePoint`);
  }

  async debugStep8Facilities(villa) {
    this.log('STEP8', 'INFO', 'Debugging Step 8: Facilities Checklist');

    // Check facilities data
    const facilities = villa.facilities || [];
    this.log('STEP8', 'DATA', `Found ${facilities.length} facilities`);

    facilities.forEach((facility, index) => {
      this.log('STEP8', 'FACILITY', `Facility ${index + 1}`, {
        category: facility.category,
        name: facility.name,
        isAvailable: facility.isAvailable,
        isWorking: facility.isWorking,
        notes: facility.notes
      });
    });

    // Check step progress for bedroom configuration
    const step8Progress = villa.stepProgress.find(sp => sp.stepNumber === 8);
    if (step8Progress) {
      this.log('STEP8', 'PROGRESS', 'Step progress found', {
        status: step8Progress.status,
        isCompleted: step8Progress.isCompleted,
        fieldsCount: step8Progress.fields?.length || 0
      });

      // Look for bedroom configuration in field progress
      const bedroomField = step8Progress.fields?.find(f => 
        f.fieldName.includes('bedroom') || f.fieldName.includes('Bedroom')
      );
      
      if (bedroomField) {
        this.log('STEP8', 'BEDROOMS', 'Bedroom configuration found', {
          fieldName: bedroomField.fieldName,
          value: bedroomField.value
        });
      }
    }

    const onboardingFlag = villa.onboarding?.facilitiesCompleted;
    this.log('STEP8', 'COMPLETION', `Onboarding flag: ${onboardingFlag ? 'COMPLETED' : 'NOT_COMPLETED'}`);
  }

  async debugStep9Photos(villa) {
    this.log('STEP9', 'INFO', 'Debugging Step 9: Photo Upload');

    // Check photos in database
    const photos = villa.photos || [];
    this.log('STEP9', 'DATA', `Found ${photos.length} photos`);

    // Group by category
    const photosByCategory = {};
    photos.forEach(photo => {
      if (!photosByCategory[photo.category]) {
        photosByCategory[photo.category] = [];
      }
      photosByCategory[photo.category].push(photo);
    });

    Object.entries(photosByCategory).forEach(([category, categoryPhotos]) => {
      this.log('STEP9', 'CATEGORY', `${category}: ${categoryPhotos.length} photos`);
      
      categoryPhotos.forEach((photo, index) => {
        this.log('STEP9', 'PHOTO', `Photo ${index + 1} in ${category}`, {
          fileName: photo.fileName,
          fileUrl: photo.fileUrl,
          sharePointFileId: photo.sharePointFileId,
          sharePointPath: photo.sharePointPath,
          subfolder: photo.subfolder,
          uploadedAt: photo.createdAt
        });
      });
    });

    // Check step progress for bedroom configuration
    const step9Progress = villa.stepProgress.find(sp => sp.stepNumber === 9);
    if (step9Progress) {
      this.log('STEP9', 'PROGRESS', 'Step progress found', {
        status: step9Progress.status,
        isCompleted: step9Progress.isCompleted,
        fieldsCount: step9Progress.fields?.length || 0
      });

      // Look for bedroom configuration
      const bedroomFields = step9Progress.fields?.filter(f => 
        f.fieldName.includes('bedroom') || f.fieldName.includes('Bedroom')
      );
      
      bedroomFields?.forEach(field => {
        this.log('STEP9', 'BEDROOMS', 'Bedroom configuration found', {
          fieldName: field.fieldName,
          value: field.value
        });
      });
    }

    const onboardingFlag = villa.onboarding?.photosUploaded;
    this.log('STEP9', 'COMPLETION', `Onboarding flag: ${onboardingFlag ? 'COMPLETED' : 'NOT_COMPLETED'}`);

    // Check SharePoint integration
    const sharePointPhotos = photos.filter(p => p.sharePointFileId);
    this.log('STEP9', 'SHAREPOINT', `${sharePointPhotos.length}/${photos.length} photos uploaded to SharePoint`);

    // Check for missing SharePoint URLs
    const photosWithoutSharePointUrl = photos.filter(p => p.sharePointFileId && !p.sharePointPath);
    if (photosWithoutSharePointUrl.length > 0) {
      this.warnings.push(`${photosWithoutSharePointUrl.length} photos missing SharePoint URL despite having SharePoint File ID`);
    }
  }

  async debugProgressCalculation(villa) {
    this.log('PROGRESS', 'INFO', 'Debugging Progress Calculation');

    const onboarding = villa.onboarding;
    if (!onboarding) {
      this.errors.push('No onboarding progress record found');
      return;
    }

    // Check each step completion flag
    const completionFlags = {
      step1: onboarding.villaInfoCompleted,
      step2: onboarding.ownerDetailsCompleted,
      step3: onboarding.contractualDetailsCompleted,
      step4: onboarding.bankDetailsCompleted,
      step5: onboarding.otaCredentialsCompleted,
      step6: onboarding.documentsUploaded,
      step7: onboarding.staffConfigCompleted,
      step8: onboarding.facilitiesCompleted,
      step9: onboarding.photosUploaded,
      step10: onboarding.reviewCompleted
    };

    this.log('PROGRESS', 'FLAGS', 'Completion flags', completionFlags);

    // Calculate progress percentage
    const completedSteps = Object.values(completionFlags).filter(Boolean).length;
    const progressPercentage = Math.round((completedSteps / 10) * 100);

    this.log('PROGRESS', 'CALCULATION', `Progress: ${completedSteps}/10 steps (${progressPercentage}%)`);

    // Check step progress records vs completion flags
    villa.stepProgress.forEach(stepProg => {
      const flagKey = `step${stepProg.stepNumber}`;
      const flag = completionFlags[flagKey];
      const mismatch = stepProg.isCompleted !== flag;
      
      if (mismatch) {
        this.warnings.push(`Step ${stepProg.stepNumber}: Mismatch between step progress (${stepProg.isCompleted}) and onboarding flag (${flag})`);
      }
    });
  }

  async generateSummaryReport() {
    console.log('\n' + '='.repeat(80));
    console.log('                    ONBOARDING DEBUG SUMMARY REPORT');
    console.log('='.repeat(80));

    // Performance Summary
    console.log('\n📊 PERFORMANCE METRICS:');
    Object.entries(this.performanceMetrics).forEach(([step, metrics]) => {
      console.log(`\n  ${step}:`);
      Object.entries(metrics).forEach(([operation, duration]) => {
        const status = duration < 100 ? '🟢' : duration < 500 ? '🟡' : '🔴';
        console.log(`    ${status} ${operation}: ${duration}ms`);
      });
    });

    // Warnings Summary
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }

    // Errors Summary
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('  1. Add missing SharePoint URL column to photos table');
    console.log('  2. Fix progress calculation mismatches');
    console.log('  3. Ensure step progress records match completion flags');
    console.log('  4. Implement better error handling for missing data');
    console.log('  5. Add data validation before saving to database');

    console.log('\n' + '='.repeat(80));
  }

  async runCompleteDebug() {
    try {
      console.log('🚀 Starting Comprehensive Onboarding Debug...\n');

      const villa = await this.findTestVilla();
      
      // Debug each step
      await this.debugStep1VillaInfo(villa);
      await this.debugStep2OwnerDetails(villa);
      await this.debugStep6Documents(villa);
      await this.debugStep8Facilities(villa);
      await this.debugStep9Photos(villa);
      
      // Debug progress calculation
      await this.debugProgressCalculation(villa);
      
      // Generate summary
      await this.generateSummaryReport();

    } catch (error) {
      console.error('❌ Debug failed:', error);
      this.errors.push(`Main debug process failed: ${error.message}`);
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run the debugger
const onboardingDebugger = new OnboardingDebugger();
onboardingDebugger.runCompleteDebug();