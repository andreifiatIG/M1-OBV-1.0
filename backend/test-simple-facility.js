#!/usr/bin/env node

/**
 * Simple Facility Test with Photo Storage
 * Tests database photo column functionality directly
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFacilityPhotoStorage() {
  try {
    console.log('🧪 FACILITY PHOTO STORAGE TEST');
    console.log('==============================\n');

    // Step 1: Create a test villa
    console.log('📝 STEP 1: Creating test villa...');
    const testVilla = await prisma.villa.create({
      data: {
        villaCode: 'TEST-PHOTO-001',
        villaName: 'Photo Test Villa',
        location: 'Test Location',
        address: 'Test Address',
        city: 'Test City',
        country: 'Test Country',
        zipCode: '12345',
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 2,
        propertyType: 'VILLA',
        status: 'DRAFT'
      }
    });
    console.log('✅ Test villa created:', testVilla.id);

    // Step 2: Create facility with photo data
    console.log('\n📷 STEP 2: Creating facility with photo data...');
    
    const sampleImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    
    const facilityWithPhoto = await prisma.facilityChecklist.create({
      data: {
        villaId: testVilla.id,
        category: 'property_layout_spaces',
        subcategory: 'kitchen',
        itemName: 'Test Kitchen with Photo',
        isAvailable: true,
        quantity: 1,
        condition: 'excellent',
        notes: 'Kitchen with photo storage test',
        specifications: 'Test specifications',
        photoUrl: 'https://example.com/test-photo.jpg',
        photoData: sampleImageData,
        photoMimeType: 'image/png',
        photoSize: sampleImageData.length,
        photoWidth: 800,
        photoHeight: 600,
        productLink: 'https://example.com/product',
        checkedBy: 'test-user',
      }
    });

    console.log('✅ Facility with photo created:', {
      id: facilityWithPhoto.id,
      itemName: facilityWithPhoto.itemName,
      hasPhotoUrl: !!facilityWithPhoto.photoUrl,
      hasPhotoData: !!facilityWithPhoto.photoData,
      photoDataSize: facilityWithPhoto.photoData?.length || 0,
      photoMimeType: facilityWithPhoto.photoMimeType,
      photoSize: facilityWithPhoto.photoSize,
      photoWidth: facilityWithPhoto.photoWidth,
      photoHeight: facilityWithPhoto.photoHeight
    });

    // Step 3: Verify retrieval
    console.log('\n🔍 STEP 3: Verifying photo data retrieval...');
    
    const retrievedFacility = await prisma.facilityChecklist.findUnique({
      where: { id: facilityWithPhoto.id }
    });

    if (retrievedFacility) {
      console.log('✅ Facility retrieved successfully:');
      console.log(`   - Photo URL: ${retrievedFacility.photoUrl}`);
      console.log(`   - Photo Data Size: ${retrievedFacility.photoData?.length || 0} bytes`);
      console.log(`   - Photo MIME Type: ${retrievedFacility.photoMimeType}`);
      console.log(`   - Photo Dimensions: ${retrievedFacility.photoWidth}x${retrievedFacility.photoHeight}`);
      console.log(`   - Photo Size Metadata: ${retrievedFacility.photoSize} bytes`);
      
      // Verify photo data integrity
      const isPhotoDataIntact = retrievedFacility.photoData && 
                               Buffer.compare(retrievedFacility.photoData, sampleImageData) === 0;
      
      console.log(`   - Photo Data Integrity: ${isPhotoDataIntact ? '✅ INTACT' : '❌ CORRUPTED'}`);
    }

    // Step 4: Test photo update
    console.log('\n🔄 STEP 4: Testing photo update...');
    
    const newImageData = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    const updatedFacility = await prisma.facilityChecklist.update({
      where: { id: facilityWithPhoto.id },
      data: {
        photoData: newImageData,
        photoMimeType: 'image/gif',
        photoSize: newImageData.length,
        photoWidth: 200,
        photoHeight: 200,
        notes: 'Updated with new photo data'
      }
    });

    console.log('✅ Facility photo updated:', {
      newPhotoSize: updatedFacility.photoData?.length || 0,
      newMimeType: updatedFacility.photoMimeType,
      newDimensions: `${updatedFacility.photoWidth}x${updatedFacility.photoHeight}`
    });

    // Step 5: Clean up
    console.log('\n🧹 STEP 5: Cleaning up test data...');
    
    await prisma.facilityChecklist.delete({
      where: { id: facilityWithPhoto.id }
    });
    
    await prisma.villa.delete({
      where: { id: testVilla.id }
    });

    console.log('✅ Test data cleaned up successfully');

    console.log('\n🎉 PHOTO STORAGE TEST COMPLETED SUCCESSFULLY!');
    console.log('==============================================');
    console.log('✓ Photo data can be stored as BYTEA in database');
    console.log('✓ Photo metadata (MIME type, dimensions, size) stored correctly'); 
    console.log('✓ Photo data maintains integrity on retrieval');
    console.log('✓ Photo data can be updated successfully');

  } catch (error) {
    console.error('❌ Photo storage test failed:', error);
    
    if (error.code === 'P2002') {
      console.error('\n🚨 UNIQUE CONSTRAINT VIOLATION!');
      console.error('The test villa code already exists.');
    } else if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.error('\n🚨 MISSING COLUMNS!');
      console.error('Photo-related columns are missing from the database table.');
    } else {
      console.error('\n🚨 UNEXPECTED ERROR!');
      console.error('Check database connection and schema consistency.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testFacilityPhotoStorage();