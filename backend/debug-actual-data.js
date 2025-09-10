#!/usr/bin/env node

/**
 * Debug Actual Villa Data
 * Shows EXACTLY what data exists in the database to understand why progress calculation is wrong
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const VILLA_ID = '460eb7d5-1c1b-4ed4-a4f5-169c25192275';

async function debugActualData() {
  try {
    console.log('🔍 DEBUGGING ACTUAL VILLA DATA');
    console.log('==============================\n');

    // Get complete villa data
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
        documents: { where: { isActive: true } },
        onboarding: true
      }
    });

    if (!villa) {
      console.error('❌ Villa not found!');
      return;
    }

    console.log('🏠 VILLA BASIC INFO');
    console.log('------------------');
    console.log(`ID: ${villa.id}`);
    console.log(`Name: ${villa.villaName || 'MISSING'}`);
    console.log(`Code: ${villa.villaCode || 'MISSING'}`);
    console.log(`Location: ${villa.location || 'MISSING'}`);
    console.log(`Address: ${villa.address || 'MISSING'}`);
    console.log(`City: ${villa.city || 'MISSING'}`);
    console.log(`Country: ${villa.country || 'MISSING'}`);
    console.log(`Bedrooms: ${villa.bedrooms || 'MISSING'}`);
    console.log(`Bathrooms: ${villa.bathrooms || 'MISSING'}`);
    console.log(`Max Guests: ${villa.maxGuests || 'MISSING'}`);
    console.log(`Property Type: ${villa.propertyType || 'MISSING'}`);
    console.log(`Status: ${villa.status || 'MISSING'}`);

    console.log('\n👤 OWNER DETAILS');
    console.log('---------------');
    if (villa.owner) {
      console.log(`Name: ${villa.owner.firstName || 'MISSING'} ${villa.owner.lastName || 'MISSING'}`);
      console.log(`Email: ${villa.owner.email || 'MISSING'}`);
      console.log(`Phone: ${villa.owner.phone || 'MISSING'}`);
      console.log(`Company: ${villa.owner.companyName || 'MISSING'}`);
    } else {
      console.log('❌ NO OWNER DATA FOUND');
    }

    console.log('\n📄 CONTRACTUAL DETAILS');
    console.log('---------------------');
    if (villa.contractualDetails) {
      console.log(`Contract Type: ${villa.contractualDetails.contractType || 'MISSING'}`);
      console.log(`Start Date: ${villa.contractualDetails.startDate || 'MISSING'}`);
      console.log(`End Date: ${villa.contractualDetails.endDate || 'MISSING'}`);
      console.log(`Commission Rate: ${villa.contractualDetails.commissionRate || 'MISSING'}`);
    } else {
      console.log('❌ NO CONTRACTUAL DETAILS FOUND');
    }

    console.log('\n🏦 BANK DETAILS');
    console.log('--------------');
    if (villa.bankDetails) {
      console.log(`Bank Name: ${villa.bankDetails.bankName || 'MISSING'}`);
      console.log(`Account Number: ${villa.bankDetails.accountNumber || 'MISSING'}`);
      console.log(`Routing Number: ${villa.bankDetails.routingNumber || 'MISSING'}`);
      console.log(`Account Holder: ${villa.bankDetails.accountHolderName || 'MISSING'}`);
    } else {
      console.log('❌ NO BANK DETAILS FOUND');
    }

    console.log('\n🌐 OTA CREDENTIALS');
    console.log('-----------------');
    console.log(`Total OTA Platforms: ${villa.otaCredentials.length}`);
    villa.otaCredentials.forEach((ota, i) => {
      console.log(`${i + 1}. Platform: ${ota.platform}, Username: ${ota.username || 'MISSING'}`);
    });

    console.log('\n📋 DOCUMENTS');
    console.log('-----------');
    console.log(`Total Active Documents: ${villa.documents.length}`);
    villa.documents.forEach((doc, i) => {
      console.log(`${i + 1}. ${doc.fileName} (${doc.category}) - Size: ${doc.fileSize} bytes`);
    });

    console.log('\n👥 STAFF');
    console.log('-------');
    console.log(`Total Active Staff: ${villa.staff.length}`);
    villa.staff.forEach((staff, i) => {
      console.log(`${i + 1}. ${staff.firstName} ${staff.lastName} - ${staff.position}`);
    });

    console.log('\n🏠 FACILITIES');
    console.log('------------');
    console.log(`Total Available Facilities: ${villa.facilities.length}`);
    villa.facilities.forEach((facility, i) => {
      console.log(`${i + 1}. ${facility.itemName} (${facility.category}) - Qty: ${facility.quantity}`);
    });

    console.log('\n📸 PHOTOS');
    console.log('---------');
    console.log(`Total Photos: ${villa.photos.length}`);
    villa.photos.forEach((photo, i) => {
      console.log(`${i + 1}. ${photo.fileName} (${photo.category}) - Size: ${photo.fileSize} bytes`);
    });

    console.log('\n🚦 ONBOARDING STATUS');
    console.log('-------------------');
    if (villa.onboarding) {
      const progress = villa.onboarding;
      console.log(`Current Step: ${progress.currentStep}`);
      console.log(`Status: ${progress.status}`);
      console.log('Boolean Flags:');
      console.log(`  Villa Info: ${progress.villaInfoCompleted}`);
      console.log(`  Owner Details: ${progress.ownerDetailsCompleted}`);
      console.log(`  Contractual Details: ${progress.contractualDetailsCompleted}`);
      console.log(`  Bank Details: ${progress.bankDetailsCompleted}`);
      console.log(`  OTA Credentials: ${progress.otaCredentialsCompleted}`);
      console.log(`  Documents: ${progress.documentsUploaded}`);
      console.log(`  Staff Config: ${progress.staffConfigCompleted}`);
      console.log(`  Facilities: ${progress.facilitiesCompleted}`);
      console.log(`  Photos: ${progress.photosUploaded}`);
      console.log(`  Review: ${progress.reviewCompleted}`);
    } else {
      console.log('❌ NO ONBOARDING PROGRESS FOUND');
    }

    console.log('\n🎯 COMPLETION ANALYSIS');
    console.log('---------------------');
    
    // Manual step-by-step analysis
    const steps = [
      {
        step: 1,
        name: 'Villa Info',
        check: villa.villaName && villa.location && villa.address && villa.city && 
               villa.country && villa.bedrooms && villa.bathrooms && villa.maxGuests && villa.propertyType,
        details: `${villa.villaName ? '✅' : '❌'} Name, ${villa.location ? '✅' : '❌'} Location, ${villa.address ? '✅' : '❌'} Address, ${villa.city ? '✅' : '❌'} City, ${villa.country ? '✅' : '❌'} Country, ${villa.bedrooms ? '✅' : '❌'} Bedrooms, ${villa.bathrooms ? '✅' : '❌'} Bathrooms, ${villa.maxGuests ? '✅' : '❌'} MaxGuests, ${villa.propertyType ? '✅' : '❌'} PropertyType`
      },
      {
        step: 2,
        name: 'Owner Details',
        check: villa.owner && villa.owner.firstName && villa.owner.lastName && villa.owner.email,
        details: villa.owner ? `${villa.owner.firstName ? '✅' : '❌'} FirstName, ${villa.owner.lastName ? '✅' : '❌'} LastName, ${villa.owner.email ? '✅' : '❌'} Email` : '❌ No owner record'
      },
      {
        step: 3,
        name: 'Contractual Details',
        check: villa.contractualDetails && villa.contractualDetails.contractType && 
               villa.contractualDetails.startDate && villa.contractualDetails.endDate,
        details: villa.contractualDetails ? `${villa.contractualDetails.contractType ? '✅' : '❌'} ContractType, ${villa.contractualDetails.startDate ? '✅' : '❌'} StartDate, ${villa.contractualDetails.endDate ? '✅' : '❌'} EndDate` : '❌ No contractual details'
      },
      {
        step: 4,
        name: 'Bank Details',
        check: villa.bankDetails && villa.bankDetails.bankName && 
               villa.bankDetails.accountNumber && villa.bankDetails.routingNumber,
        details: villa.bankDetails ? `${villa.bankDetails.bankName ? '✅' : '❌'} BankName, ${villa.bankDetails.accountNumber ? '✅' : '❌'} AccountNumber, ${villa.bankDetails.routingNumber ? '✅' : '❌'} RoutingNumber` : '❌ No bank details'
      },
      {
        step: 5,
        name: 'OTA Credentials',
        check: villa.otaCredentials.length >= 1,
        details: `${villa.otaCredentials.length} platforms configured (need ≥1)`
      },
      {
        step: 6,
        name: 'Documents',
        check: villa.documents.length >= 3,
        details: `${villa.documents.length} documents uploaded (need ≥3)`
      },
      {
        step: 7,
        name: 'Staff Configuration',
        check: villa.staff.length >= 1,
        details: `${villa.staff.length} staff members configured (need ≥1)`
      },
      {
        step: 8,
        name: 'Facilities',
        check: villa.facilities.length >= 5,
        details: `${villa.facilities.length} facilities configured (need ≥5)`
      },
      {
        step: 9,
        name: 'Photos',
        check: villa.photos.length >= 5,
        details: `${villa.photos.length} photos uploaded (need ≥5)`
      },
      {
        step: 10,
        name: 'Review',
        check: villa.onboarding?.reviewCompleted === true,
        details: `Review ${villa.onboarding?.reviewCompleted ? 'completed' : 'pending'}`
      }
    ];

    let actuallyCompleted = 0;
    steps.forEach(step => {
      const status = step.check ? '✅ COMPLETE' : '❌ INCOMPLETE';
      console.log(`Step ${step.step} (${step.name}): ${status}`);
      console.log(`  Details: ${step.details}`);
      if (step.check) actuallyCompleted++;
    });

    console.log(`\n🎯 ACTUAL COMPLETION: ${actuallyCompleted}/10 steps (${Math.round((actuallyCompleted/10)*100)}%)`);
    
    if (villa.onboarding) {
      const legacyCount = [
        villa.onboarding.villaInfoCompleted,
        villa.onboarding.ownerDetailsCompleted,
        villa.onboarding.contractualDetailsCompleted,
        villa.onboarding.bankDetailsCompleted,
        villa.onboarding.otaCredentialsCompleted,
        villa.onboarding.documentsUploaded,
        villa.onboarding.staffConfigCompleted,
        villa.onboarding.facilitiesCompleted,
        villa.onboarding.photosUploaded,
        villa.onboarding.reviewCompleted
      ].filter(Boolean).length;
      
      console.log(`🚦 LEGACY COMPLETION: ${legacyCount}/10 steps (${Math.round((legacyCount/10)*100)}%)`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugActualData();