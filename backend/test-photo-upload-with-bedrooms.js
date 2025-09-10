#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testPhotoUploadWithBedrooms() {
  try {
    console.log('🔍 Testing Photo Upload Step with Bedroom Configuration...\n');

    // 1. Find a test villa or the most recent villa
    const villa = await prisma.villa.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        onboarding: true,
        photos: {
          where: {
            category: 'BEDROOMS'
          }
        }
      }
    });

    if (!villa) {
      console.log('❌ No villa found in database');
      return;
    }

    console.log(`✅ Found villa: ${villa.villaName} (${villa.id})`);
    console.log(`   Location: ${villa.location}`);
    console.log(`   Bedrooms: ${villa.bedrooms}`);
    console.log(`   Onboarding Status: ${villa.onboarding?.status || 'N/A'}`);
    console.log(`   Photos Uploaded: ${villa.onboarding?.photosUploaded ? 'Yes' : 'No'}`);

    // 2. Check field progress for bedroom configuration
    console.log('\n📋 Checking Field Progress for Step 9 (Photos)...');
    
    const stepProgress = await prisma.onboardingStepProgress.findUnique({
      where: {
        villaId_stepNumber: {
          villaId: villa.id,
          stepNumber: 9
        }
      },
      include: {
        fields: true
      }
    });

    if (stepProgress) {
      console.log(`✅ Step 9 progress found:`);
      console.log(`   Status: ${stepProgress.status}`);
      console.log(`   Completed: ${stepProgress.isCompleted}`);
      
      // Look for bedroom configuration
      const bedroomField = stepProgress.fields.find(f => 
        f.fieldName === 'bedrooms' || f.fieldName === 'bedrooms_config'
      );
      
      if (bedroomField) {
        console.log(`\n✅ Bedroom configuration found in field: ${bedroomField.fieldName}`);
        try {
          const bedroomData = JSON.parse(bedroomField.value);
          console.log('   Configured bedrooms:');
          bedroomData.forEach((bedroom, index) => {
            console.log(`   ${index + 1}. ${bedroom.name} - ${bedroom.bedType}`);
          });
        } catch (e) {
          console.log('   Raw value:', bedroomField.value);
        }
      } else {
        console.log('⚠️ No bedroom configuration found in field progress');
      }
    } else {
      console.log('⚠️ No step progress found for step 9');
    }

    // 3. Check photos in database
    console.log('\n📸 Checking Photos in Database...');
    
    const allPhotos = await prisma.photo.findMany({
      where: { villaId: villa.id },
      orderBy: { category: 'asc' }
    });

    console.log(`Total photos: ${allPhotos.length}`);
    
    // Group by category
    const photosByCategory = {};
    allPhotos.forEach(photo => {
      if (!photosByCategory[photo.category]) {
        photosByCategory[photo.category] = [];
      }
      photosByCategory[photo.category].push(photo);
    });

    Object.entries(photosByCategory).forEach(([category, photos]) => {
      console.log(`\n   ${category}: ${photos.length} photos`);
      
      if (category === 'BEDROOMS') {
        // Show bedroom subfolders
        const bySubfolder = {};
        photos.forEach(photo => {
          const subfolder = photo.subfolder || 'General';
          if (!bySubfolder[subfolder]) {
            bySubfolder[subfolder] = 0;
          }
          bySubfolder[subfolder]++;
        });
        
        Object.entries(bySubfolder).forEach(([subfolder, count]) => {
          console.log(`      - ${subfolder}: ${count} photos`);
        });
      }
    });

    // 4. Check SharePoint integration
    console.log('\n🔗 SharePoint Integration Check...');
    
    const photosWithSharePoint = allPhotos.filter(p => p.sharePointFileId);
    console.log(`Photos uploaded to SharePoint: ${photosWithSharePoint.length}/${allPhotos.length}`);
    
    if (photosWithSharePoint.length > 0) {
      console.log('Sample SharePoint paths:');
      photosWithSharePoint.slice(0, 3).forEach(photo => {
        console.log(`   - ${photo.sharePointPath || 'N/A'}`);
      });
    }

    // 5. Validation check
    console.log('\n✅ Validation Summary:');
    const hasMinPhotos = allPhotos.length >= 3;
    console.log(`   Minimum 3 photos required: ${hasMinPhotos ? '✅ Pass' : '❌ Fail'} (${allPhotos.length} photos)`);
    
    const hasBedroomConfig = stepProgress?.fields.some(f => 
      (f.fieldName === 'bedrooms' || f.fieldName === 'bedrooms_config') && f.value
    );
    console.log(`   Bedroom configuration saved: ${hasBedroomConfig ? '✅ Yes' : '⚠️ No'}`);
    
    const hasSharePointIntegration = photosWithSharePoint.length > 0;
    console.log(`   SharePoint integration working: ${hasSharePointIntegration ? '✅ Yes' : '⚠️ No'}`);

    // 6. Test data persistence
    console.log('\n🔄 Data Persistence Test:');
    console.log('   To test persistence:');
    console.log('   1. Note the bedroom configuration above');
    console.log('   2. Refresh the frontend page');
    console.log('   3. Navigate to Step 9 (Photos)');
    console.log('   4. Verify bedrooms are still configured');
    console.log('   5. Verify photos are still displayed');

    console.log('\n✨ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPhotoUploadWithBedrooms();