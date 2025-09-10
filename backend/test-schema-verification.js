#!/usr/bin/env node

/**
 * Verify FacilityChecklist table schema after migration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSchemaColumns() {
  try {
    console.log('🔍 Testing FacilityChecklist schema columns...');
    console.log('================================================\n');

    // First create a test villa
    const testVilla = await prisma.villa.create({
      data: {
        villaCode: 'TEST001',
        villaName: 'Schema Test Villa',
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

    // Test by attempting to create a record with all photo columns
    const testFacility = {
      villaId: testVilla.id,
      category: 'property_layout_spaces',
      subcategory: 'test-room',
      itemName: 'Schema Test Room',
      isAvailable: true,
      quantity: 1,
      condition: 'good',
      notes: 'Testing schema columns',
      specifications: 'Test specifications',
      photoUrl: 'https://example.com/photo.jpg',
      photoData: Buffer.from('test-image-data'),
      photoMimeType: 'image/jpeg',
      photoSize: 12345,
      photoWidth: 800,
      photoHeight: 600,
      productLink: 'https://example.com/product',
      checkedBy: 'schema-test',
    };

    console.log('Creating test facility with all photo columns...');
    
    const created = await prisma.facilityChecklist.create({
      data: testFacility
    });

    console.log('✅ SUCCESS: All columns exist and working:', {
      id: created.id,
      itemName: created.itemName,
      hasPhotoUrl: !!created.photoUrl,
      hasPhotoData: !!created.photoData,
      photoMimeType: created.photoMimeType,
      photoSize: created.photoSize,
      photoWidth: created.photoWidth,
      photoHeight: created.photoHeight,
      hasProductLink: !!created.productLink
    });

    // Verify by reading the record back
    const retrieved = await prisma.facilityChecklist.findUnique({
      where: { id: created.id }
    });

    console.log('\n✅ VERIFICATION: Record retrieved successfully with all fields');
    console.log('Photo data size:', retrieved?.photoData?.length || 0, 'bytes');

    // Clean up test records
    await prisma.facilityChecklist.delete({
      where: { id: created.id }
    });
    
    await prisma.villa.delete({
      where: { id: testVilla.id }
    });

    console.log('\n🎉 Schema verification completed successfully!');
    console.log('All photo-related columns are properly created and functional.');

  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.error('\n🚨 MISSING COLUMNS DETECTED!');
      console.error('The database table is missing some columns from the Prisma schema.');
      console.error('This explains why photo data is not being stored.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testSchemaColumns();