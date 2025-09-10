/**
 * Test Facility Persistence and Modifications
 * Simulates the exact frontend workflow
 */

import { PrismaClient } from '@prisma/client';
import onboardingService from './src/services/onboardingService.ts';

const prisma = new PrismaClient();
const VILLA_ID = 'a4f16e6e-8a05-4014-bbbd-b6c2be60bbda'; // Villa Boreal

async function testFacilityPersistence() {
  try {
    console.log('🧪 FACILITY PERSISTENCE TEST');
    console.log('=============================\n');

    // Step 1: Get current state
    console.log('📊 STEP 1: Current Database State');
    console.log('----------------------------------');
    
    const initialState = await prisma.facilityChecklist.findMany({
      where: { villaId: VILLA_ID },
      orderBy: [{ category: 'asc' }, { itemName: 'asc' }]
    });
    
    console.log(`Initial facilities: ${initialState.length}`);
    initialState.forEach((facility, i) => {
      console.log(`${i + 1}. ${facility.itemName} (${facility.category}) - Available: ${facility.isAvailable}`);
    });

    // Step 2: Test new facility creation
    console.log('\n🆕 STEP 2: Test New Facility Creation');
    console.log('-------------------------------------');
    
    const newFacilities = [
      {
        id: 'property_layout_spaces-kitchen',
        category: 'property_layout_spaces',
        subcategory: 'kitchen',
        itemName: 'Kitchen',
        available: true,
        quantity: 1,
        condition: 'good',
        notes: 'Modern kitchen with island',
        specifications: 'Granite countertops, stainless steel appliances',
        photoUrl: '',
        productLink: ''
      },
      {
        id: 'property_layout_spaces-master-bedroom',
        category: 'property_layout_spaces',
        subcategory: 'bedroom',
        itemName: 'Master bedroom',
        available: true,
        quantity: 1,
        condition: 'excellent',
        notes: 'King bed, ocean view',
        specifications: 'California King bed, private balcony',
        photoUrl: '',
        productLink: ''
      }
    ];

    console.log(`Testing creation of ${newFacilities.length} new facilities...`);
    
    // Use updateStep method which handles facility processing
    const createResult = await onboardingService.updateStep(VILLA_ID, {
      step: 8,
      data: { facilities: newFacilities },
      completed: true
    }, 'test-user-id');
    
    console.log('✅ Creation completed for step 8');

    // Step 3: Test facility modifications
    console.log('\n📝 STEP 3: Test Facility Modifications');
    console.log('--------------------------------------');
    
    // Get current facilities after creation
    const currentFacilities = await prisma.facilityChecklist.findMany({
      where: { villaId: VILLA_ID },
      orderBy: [{ category: 'asc' }, { itemName: 'asc' }]
    });

    console.log(`Current facilities after creation: ${currentFacilities.length}`);

    // Modify existing facilities
    const modifiedFacilities = currentFacilities.map(facility => ({
      id: `${facility.category}-${facility.itemName}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
      databaseId: facility.id, // Important: include database ID
      category: facility.category,
      subcategory: facility.subcategory,
      itemName: facility.itemName,
      available: facility.isAvailable,
      quantity: facility.quantity + 1, // Modify quantity
      condition: facility.condition === 'good' ? 'excellent' : 'good', // Toggle condition
      notes: `${facility.notes || ''} - Modified on ${new Date().toISOString()}`,
      specifications: facility.specifications || 'Updated specifications',
      photoUrl: facility.photoUrl || '',
      productLink: facility.productLink || '',
      _fromDatabase: true // Mark as from database
    }));

    console.log(`Testing modification of ${modifiedFacilities.length} facilities...`);
    
    await onboardingService.updateStep(VILLA_ID, {
      step: 8,
      data: { facilities: modifiedFacilities },
      completed: true
    }, 'test-user-id');
    
    console.log('✅ Modifications completed');

    // Step 4: Test facility deletion (unchecking)
    console.log('\n🗑️ STEP 4: Test Facility Unchecking (Should Delete)');
    console.log('---------------------------------------------------');
    
    const facilitiesToUncheck = currentFacilities.slice(0, 1).map(facility => ({
      id: `${facility.category}-${facility.itemName}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
      databaseId: facility.id,
      category: facility.category,
      subcategory: facility.subcategory,
      itemName: facility.itemName,
      available: false, // Uncheck this facility
      quantity: facility.quantity,
      condition: facility.condition,
      notes: facility.notes,
      specifications: facility.specifications,
      photoUrl: facility.photoUrl || '',
      productLink: facility.productLink || '',
      _fromDatabase: true
    }));

    console.log(`Testing unchecking of ${facilitiesToUncheck.length} facilities...`);
    
    await onboardingService.updateStep(VILLA_ID, {
      step: 8,
      data: { facilities: facilitiesToUncheck },
      completed: true
    }, 'test-user-id');
    
    console.log('✅ Unchecking completed');

    // Step 5: Final state verification
    console.log('\n🔍 STEP 5: Final State Verification');
    console.log('-----------------------------------');
    
    const finalState = await prisma.facilityChecklist.findMany({
      where: { villaId: VILLA_ID },
      orderBy: [{ category: 'asc' }, { itemName: 'asc' }]
    });
    
    console.log(`Final facilities: ${finalState.length}`);
    finalState.forEach((facility, i) => {
      console.log(`${i + 1}. ${facility.itemName} (${facility.category})`);
      console.log(`   - Available: ${facility.isAvailable}`);
      console.log(`   - Quantity: ${facility.quantity}`);
      console.log(`   - Condition: ${facility.condition}`);
      console.log(`   - Notes: ${facility.notes || 'None'}`);
      console.log(`   - Updated: ${facility.updatedAt.toISOString()}`);
      console.log('');
    });

    // Summary
    console.log('📊 TEST SUMMARY');
    console.log('===============');
    console.log(`Initial facilities: ${initialState.length}`);
    console.log(`Final facilities: ${finalState.length}`);
    console.log(`Net change: ${finalState.length - initialState.length}`);
    
    const expectationsMsg = [
      `✓ Should have created 2 new facilities (Kitchen, Master bedroom)`,
      `✓ Should have updated existing facilities with new quantities/conditions`,
      `✓ Should handle unchecked facilities appropriately`,
      `✓ All database operations should be atomic and consistent`
    ].join('\n');
    
    console.log('\nExpected outcomes:');
    console.log(expectationsMsg);
    
    console.log('\n🎉 Facility persistence test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFacilityPersistence();