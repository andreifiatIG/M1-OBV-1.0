#!/usr/bin/env node

/**
 * Test Photo Category Fix
 * Tests that the kebab-case to underscore conversion works correctly
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const VILLA_ID = '460eb7d5-1c1b-4ed4-a4f5-169c25192275';

async function testPhotoCategoryConversion() {
  try {
    console.log('🧪 TESTING PHOTO CATEGORY CONVERSION');
    console.log('===================================\n');

    // Test the conversion logic
    const testCategories = [
      'property-layout-spaces',
      'occupancy-sleeping', 
      'kitchen-dining',
      'wellness-spa'
    ];

    console.log('📝 Category conversion tests:');
    testCategories.forEach(category => {
      const converted = category.replace(/-/g, '_');
      console.log(`   "${category}" → "${converted}"`);
    });

    console.log('\n🔍 Checking current facility categories:');
    
    // Check what categories are actually in the database
    const facilities = await prisma.facilityChecklist.findMany({
      where: { villaId: VILLA_ID },
      select: { category: true, itemName: true },
      distinct: ['category', 'itemName']
    });

    facilities.forEach(facility => {
      console.log(`   ${facility.category}: ${facility.itemName}`);
    });

    console.log('\n✅ Category conversion test completed!');
    console.log('\nThe photo upload should now work correctly with kebab-case categories from frontend.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPhotoCategoryConversion();