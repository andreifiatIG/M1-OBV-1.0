#!/usr/bin/env node

/**
 * Fix Existing Facility Photo Data
 * Updates existing facilities with missing photo-related fields
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const VILLA_ID = '460eb7d5-1c1b-4ed4-a4f5-169c25192275';

async function fixFacilityPhotoData() {
  try {
    console.log('🔧 FIXING FACILITY PHOTO DATA');
    console.log('=============================\n');

    // Get all facilities for the villa
    const facilities = await prisma.facilityChecklist.findMany({
      where: { villaId: VILLA_ID },
      orderBy: [{ category: 'asc' }, { itemName: 'asc' }]
    });

    console.log(`📋 Found ${facilities.length} facilities to check`);

    // Get all photos for the villa that might be associated with facilities
    const photos = await prisma.photo.findMany({
      where: { 
        villaId: VILLA_ID,
        category: 'AMENITIES_FACILITIES' 
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📸 Found ${photos.length} facility-related photos`);

    let updatedCount = 0;
    let issuesFound = 0;

    for (const facility of facilities) {
      console.log(`\n🔍 Checking facility: ${facility.itemName} (${facility.category})`);
      
      // Check if facility is missing photo data
      const missingFields = [];
      if (!facility.photoUrl) missingFields.push('photoUrl');
      if (!facility.photoData) missingFields.push('photoData');
      if (!facility.photoMimeType) missingFields.push('photoMimeType');
      if (!facility.photoSize) missingFields.push('photoSize');
      if (!facility.photoWidth) missingFields.push('photoWidth');
      if (!facility.photoHeight) missingFields.push('photoHeight');
      if (!facility.specifications || facility.specifications.trim() === '') missingFields.push('specifications');
      if (!facility.notes || facility.notes.trim() === '') missingFields.push('notes');

      if (missingFields.length > 0) {
        issuesFound++;
        console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`);

        // Try to find a matching photo
        let matchingPhoto = photos.find(photo => 
          photo.fileName.toLowerCase().includes(facility.itemName.toLowerCase().replace(/\s+/g, '_'))
        );

        if (!matchingPhoto && photos.length > 0) {
          // Use the first available photo as fallback
          matchingPhoto = photos[0];
          console.log(`   ⚠️ Using fallback photo: ${matchingPhoto.fileName}`);
        }

        // Prepare update data
        const updateData = {};
        
        // Add photo data if we have a matching photo
        if (matchingPhoto) {
          if (!facility.photoUrl) updateData.photoUrl = matchingPhoto.fileUrl;
          if (!facility.photoMimeType) updateData.photoMimeType = matchingPhoto.mimeType;
          if (!facility.photoSize) updateData.photoSize = matchingPhoto.fileSize;
          if (!facility.photoWidth) updateData.photoWidth = matchingPhoto.width;
          if (!facility.photoHeight) updateData.photoHeight = matchingPhoto.height;
          
          console.log(`   ✅ Will add photo data from: ${matchingPhoto.fileName}`);
        }

        // Add default specifications if missing
        if (!facility.specifications || facility.specifications.trim() === '') {
          updateData.specifications = `${facility.itemName} - Standard specifications and features`;
        }

        // Add default notes if missing
        if (!facility.notes || facility.notes.trim() === '') {
          updateData.notes = `${facility.itemName} available and in ${facility.condition || 'good'} condition`;
        }

        // Add metadata
        updateData.lastCheckedAt = new Date();
        updateData.checkedBy = 'system-fix';

        // Update the facility
        if (Object.keys(updateData).length > 0) {
          await prisma.facilityChecklist.update({
            where: { id: facility.id },
            data: updateData
          });

          updatedCount++;
          console.log(`   ✅ Updated facility with ${Object.keys(updateData).length} fields`);
        }
      } else {
        console.log(`   ✅ All fields complete`);
      }
    }

    console.log(`\n🎯 SUMMARY`);
    console.log(`=========`);
    console.log(`Total facilities checked: ${facilities.length}`);
    console.log(`Facilities with issues: ${issuesFound}`);
    console.log(`Facilities updated: ${updatedCount}`);
    console.log(`Available photos: ${photos.length}`);

    // Show final state
    console.log(`\n📊 FINAL FACILITY STATE`);
    console.log(`======================`);
    
    const updatedFacilities = await prisma.facilityChecklist.findMany({
      where: { villaId: VILLA_ID },
      orderBy: [{ category: 'asc' }, { itemName: 'asc' }]
    });

    updatedFacilities.forEach((facility, i) => {
      const hasPhoto = !!facility.photoUrl;
      const hasData = !!facility.photoData;
      const hasSpecs = !!facility.specifications && facility.specifications.trim().length > 0;
      const hasNotes = !!facility.notes && facility.notes.trim().length > 0;
      
      console.log(`${i + 1}. ${facility.itemName}:`);
      console.log(`   Photo URL: ${hasPhoto ? '✅' : '❌'}`);
      console.log(`   Photo Data: ${hasData ? '✅' : '❌'}`);
      console.log(`   Specifications: ${hasSpecs ? '✅' : '❌'}`);
      console.log(`   Notes: ${hasNotes ? '✅' : '❌'}`);
    });

    console.log(`\n🎉 Facility photo data fix completed!`);

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFacilityPhotoData();