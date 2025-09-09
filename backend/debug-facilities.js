#!/usr/bin/env node

/**
 * Debug Facilities Persistence Issues
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const VILLA_ID = 'a4f16e6e-8a05-4014-bbbd-b6c2be60bbda'; // Villa Boreal

async function debugFacilities() {
  try {
    console.log('🔍 FACILITIES DEBUG INVESTIGATION');
    console.log('==================================\n');

    // Step 1: Check current database state
    console.log('📊 STEP 1: Current Database State');
    console.log('----------------------------------');
    
    const facilities = await prisma.facilityChecklist.findMany({
      where: { villaId: VILLA_ID },
      orderBy: [{ category: 'asc' }, { itemName: 'asc' }],
      select: {
        id: true,
        category: true,
        subcategory: true,
        itemName: true,
        isAvailable: true,
        quantity: true,
        condition: true,
        notes: true,
        specifications: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`Found ${facilities.length} facilities in database:`);
    facilities.forEach((facility, i) => {
      console.log(`${i + 1}. ${facility.itemName} (${facility.category})`);
      console.log(`   - ID: ${facility.id}`);
      console.log(`   - Available: ${facility.isAvailable}`);
      console.log(`   - Quantity: ${facility.quantity}`);
      console.log(`   - Condition: ${facility.condition}`);
      console.log(`   - Notes: ${facility.notes || 'None'}`);
      console.log(`   - Created: ${facility.createdAt.toISOString()}`);
      console.log(`   - Updated: ${facility.updatedAt.toISOString()}`);
      console.log('');
    });

    // Step 2: Check recent onboarding API calls
    console.log('📋 STEP 2: Recent Onboarding Activity');
    console.log('-------------------------------------');
    
    const progress = await prisma.onboardingProgress.findUnique({
      where: { villaId: VILLA_ID },
      include: {
        villa: {
          include: {
            facilities: {
              orderBy: { updatedAt: 'desc' },
              take: 5
            }
          }
        }
      }
    });

    if (progress) {
      console.log(`Onboarding progress exists for villa ${VILLA_ID}`);
      console.log(`Villa has ${progress.villa?.facilities?.length || 0} facilities total`);
      
      if (progress.villa?.facilities && progress.villa.facilities.length > 0) {
        console.log('Most recently updated facilities:');
        progress.villa.facilities.forEach((facility, i) => {
          console.log(`  ${i + 1}. ${facility.itemName} - Updated: ${facility.updatedAt.toISOString()}`);
        });
      }
    }

    // Step 3: Test facility creation logic
    console.log('\n🧪 STEP 3: Test Facility Creation/Update Logic');
    console.log('----------------------------------------------');

    // Simulate what the frontend sends
    const testFacilityData = {
      category: 'property_layout_spaces',
      subcategory: 'living-room',
      itemName: 'Living room',
      isAvailable: true,
      quantity: 1,
      condition: 'good',
      notes: 'Test update - ' + new Date().toISOString(),
      specifications: 'Updated specifications'
    };

    console.log('Testing upsert with:', testFacilityData);

    try {
      const upsertResult = await prisma.facilityChecklist.upsert({
        where: {
          villaId_category_subcategory_itemName: {
            villaId: VILLA_ID,
            category: testFacilityData.category,
            subcategory: testFacilityData.subcategory,
            itemName: testFacilityData.itemName,
          },
        },
        update: {
          ...testFacilityData,
          villaId: VILLA_ID,
        },
        create: {
          ...testFacilityData,
          villaId: VILLA_ID,
        },
      });

      console.log('✅ Upsert successful:', {
        id: upsertResult.id,
        itemName: upsertResult.itemName,
        notes: upsertResult.notes,
        updatedAt: upsertResult.updatedAt.toISOString()
      });

      // Verify the change
      const verifyResult = await prisma.facilityChecklist.findUnique({
        where: { id: upsertResult.id }
      });
      
      console.log('✅ Verification:', {
        found: !!verifyResult,
        notes: verifyResult?.notes,
        updatedAt: verifyResult?.updatedAt.toISOString()
      });

    } catch (upsertError) {
      console.error('❌ Upsert failed:', upsertError);
    }

    // Step 4: Simple duplicate check
    console.log('\n🔍 STEP 4: Check for Duplicates/Conflicts');
    console.log('------------------------------------------');

    // Simple approach: find any facilities with matching keys
    const allFacilities = await prisma.facilityChecklist.findMany({
      where: { villaId: VILLA_ID },
      select: { category: true, subcategory: true, itemName: true }
    });

    const keys = allFacilities.map(f => `${f.category}/${f.subcategory}/${f.itemName}`);
    const uniqueKeys = [...new Set(keys)];

    if (keys.length !== uniqueKeys.length) {
      console.log(`❌ Found duplicates: ${keys.length} facilities but only ${uniqueKeys.length} unique keys`);
    } else {
      console.log(`✅ No duplicates found (${keys.length} facilities, all unique)`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFacilities();