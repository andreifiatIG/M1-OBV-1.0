import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed script...');

  // Create 5 villas with complete onboarding data
  const villas = [
    {
      villaCode: 'VILLA-001',
      villaName: 'Sunset Paradise Villa',
      location: 'Seminyak Beach Area',
      city: 'Seminyak',
      country: 'Indonesia',
      propertyType: 'VILLA',
      villaStyle: 'MODERN',
      bedrooms: 5,
      bathrooms: 6,
      maxGuests: 10,
    },
    {
      villaCode: 'VILLA-002',
      villaName: 'Ocean View Luxury Estate',
      location: 'Clifftop Uluwatu',
      city: 'Uluwatu',
      country: 'Indonesia',
      propertyType: 'ESTATE',
      villaStyle: 'CONTEMPORARY',
      bedrooms: 7,
      bathrooms: 8,
      maxGuests: 14,
    },
    {
      villaCode: 'VILLA-003',
      villaName: 'Tropical Garden Retreat',
      location: 'Ubud Rice Fields',
      city: 'Ubud',
      country: 'Indonesia',
      propertyType: 'VILLA',
      villaStyle: 'BALINESE',
      bedrooms: 4,
      bathrooms: 4,
      maxGuests: 8,
    },
    {
      villaCode: 'VILLA-004',
      villaName: 'Beachfront Modern House',
      location: 'Canggu Beach',
      city: 'Canggu',
      country: 'Indonesia',
      propertyType: 'HOUSE',
      villaStyle: 'MINIMALIST',
      bedrooms: 6,
      bathrooms: 5,
      maxGuests: 12,
    },
    {
      villaCode: 'VILLA-005',
      villaName: 'Hillside Panorama Villa',
      location: 'Jimbaran Hills',
      city: 'Jimbaran',
      country: 'Indonesia',
      propertyType: 'VILLA',
      villaStyle: 'LUXURY',
      bedrooms: 8,
      bathrooms: 9,
      maxGuests: 16,
    },
  ];

  for (let i = 0; i < villas.length; i++) {
    const villaData = villas[i];
    
    console.log(`\n📍 Creating villa ${i + 1}/5: ${villaData.villaName}`);

    // Create the villa with all related data
    const villa = await prisma.villa.create({
      data: {
        ...villaData,
        address: faker.location.streetAddress(),
        zipCode: faker.location.zipCode(),
        latitude: faker.location.latitude({ min: -9, max: -8 }),
        longitude: faker.location.longitude({ min: 114, max: 116 }),
        propertySize: faker.number.int({ min: 300, max: 1000 }),
        plotSize: faker.number.int({ min: 500, max: 2000 }),
        yearBuilt: faker.number.int({ min: 2010, max: 2020 }),
        renovationYear: faker.number.int({ min: 2021, max: 2024 }),
        description: faker.lorem.paragraphs(3),
        shortDescription: faker.lorem.sentence(15),
        status: 'ACTIVE',
        isActive: true,
        googleMapsLink: `https://maps.google.com/?q=${villaData.city},Indonesia`,
        propertyEmail: faker.internet.email(),
        propertyWebsite: faker.internet.url(),
        
        // Create Owner
        owner: {
          create: {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: faker.internet.email(),
            phone: faker.phone.number('+62##########'),
            phoneCountryCode: 'ID',
            phoneDialCode: '+62',
            nationality: 'Indonesian',
            passportNumber: faker.string.alphanumeric(9).toUpperCase(),
            idNumber: faker.string.numeric(16),
            address: faker.location.streetAddress(),
            city: faker.location.city(),
            country: 'Indonesia',
            zipCode: faker.location.zipCode(),
            preferredLanguage: 'en',
            communicationPreference: 'EMAIL',
            ownerType: faker.helpers.arrayElement(['INDIVIDUAL', 'COMPANY']),
            companyName: faker.company.name(),
            companyTaxId: faker.string.alphanumeric(15).toUpperCase(),
            managerName: faker.person.fullName(),
            managerEmail: faker.internet.email(),
            managerPhone: faker.phone.number('+62##########'),
          },
        },

        // Create Contractual Details
        contractualDetails: {
          create: {
            contractStartDate: new Date('2024-01-01'),
            contractEndDate: new Date('2026-12-31'),
            contractType: 'EXCLUSIVE',
            commissionRate: faker.number.float({ min: 15, max: 25, fractionDigits: 2 }),
            managementFee: faker.number.float({ min: 5, max: 10, fractionDigits: 2 }),
            marketingFee: faker.number.float({ min: 3, max: 7, fractionDigits: 2 }),
            paymentTerms: 'Net 30 days after month end',
            paymentSchedule: 'MONTHLY',
            minimumStayNights: faker.number.int({ min: 2, max: 5 }),
            cancellationPolicy: faker.helpers.arrayElement(['MODERATE', 'STRICT', 'FLEXIBLE']),
            checkInTime: '15:00',
            checkOutTime: '11:00',
            insuranceProvider: faker.company.name(),
            insurancePolicyNumber: faker.string.alphanumeric(12).toUpperCase(),
            insuranceExpiry: new Date('2025-12-31'),
            payoutDay1: 15,
            payoutDay2: 30,
            dbdNumber: faker.string.alphanumeric(10).toUpperCase(),
            paymentThroughIPL: true,
            vatRegistrationNumber: faker.string.alphanumeric(15).toUpperCase(),
          },
        },

        // Create Bank Details
        bankDetails: {
          create: {
            accountHolderName: faker.person.fullName(),
            bankName: faker.helpers.arrayElement(['Bank Mandiri', 'BCA', 'BNI', 'BRI', 'CIMB Niaga']),
            accountNumber: faker.finance.accountNumber(10),
            iban: faker.finance.iban(),
            swiftCode: faker.string.alphanumeric(11).toUpperCase(),
            branchCode: faker.string.numeric(4),
            currency: 'IDR',
            bankAddress: faker.location.streetAddress(),
            bankCountry: 'Indonesia',
            isVerified: true,
            verifiedAt: new Date(),
            branchName: faker.location.city() + ' Branch',
            accountType: 'CHECKING',
          },
        },

        // Create OTA Credentials
        otaCredentials: {
          create: [
            {
              platform: 'BOOKING_COM',
              propertyId: faker.string.numeric(7),
              username: faker.internet.userName(),
              password: faker.internet.password(),
              isActive: true,
              syncStatus: 'SUCCESS',
              lastSyncAt: new Date(),
              listingUrl: `https://www.booking.com/hotel/${faker.string.numeric(7)}`,
            },
            {
              platform: 'AIRBNB',
              propertyId: faker.string.numeric(8),
              username: faker.internet.userName(),
              password: faker.internet.password(),
              isActive: true,
              syncStatus: 'SUCCESS',
              lastSyncAt: new Date(),
              listingUrl: `https://www.airbnb.com/rooms/${faker.string.numeric(8)}`,
            },
          ],
        },

        // Create Staff Members
        staff: {
          create: [
            {
              firstName: faker.person.firstName(),
              lastName: faker.person.lastName(),
              email: faker.internet.email(),
              phone: faker.phone.number('+62##########'),
              position: 'VILLA_MANAGER',
              department: 'MANAGEMENT',
              employmentType: 'FULL_TIME',
              startDate: new Date('2024-01-01'),
              salary: 8000000,
              salaryFrequency: 'MONTHLY',
              currency: 'IDR',
              hasAccommodation: true,
              hasTransport: true,
              hasHealthInsurance: true,
              isActive: true,
              idNumber: faker.string.numeric(16),
              nationality: 'Indonesian',
            },
            {
              firstName: faker.person.firstName(),
              lastName: faker.person.lastName(),
              phone: faker.phone.number('+62##########'),
              position: 'HOUSEKEEPER',
              department: 'HOUSEKEEPING',
              employmentType: 'FULL_TIME',
              startDate: new Date('2024-01-15'),
              salary: 4500000,
              salaryFrequency: 'MONTHLY',
              currency: 'IDR',
              hasAccommodation: true,
              isActive: true,
              idNumber: faker.string.numeric(16),
              nationality: 'Indonesian',
            },
            {
              firstName: faker.person.firstName(),
              lastName: faker.person.lastName(),
              phone: faker.phone.number('+62##########'),
              position: 'GARDENER',
              department: 'MAINTENANCE',
              employmentType: 'FULL_TIME',
              startDate: new Date('2024-02-01'),
              salary: 3500000,
              salaryFrequency: 'MONTHLY',
              currency: 'IDR',
              isActive: true,
              idNumber: faker.string.numeric(16),
              nationality: 'Indonesian',
            },
          ],
        },

        // Create Photos
        photos: {
          create: [
            {
              category: 'EXTERIOR_VIEWS',
              fileName: 'exterior-main.jpg',
              fileUrl: faker.image.url(),
              fileSize: faker.number.int({ min: 500000, max: 2000000 }),
              mimeType: 'image/jpeg',
              width: 1920,
              height: 1080,
              caption: 'Main exterior view',
              isMain: true,
              sortOrder: 1,
              storageLocation: 'database',
            },
            {
              category: 'INTERIOR_LIVING_SPACES',
              fileName: 'living-room.jpg',
              fileUrl: faker.image.url(),
              fileSize: faker.number.int({ min: 500000, max: 2000000 }),
              mimeType: 'image/jpeg',
              width: 1920,
              height: 1080,
              caption: 'Spacious living room',
              sortOrder: 2,
              storageLocation: 'database',
            },
            {
              category: 'BEDROOMS',
              fileName: 'master-bedroom.jpg',
              fileUrl: faker.image.url(),
              fileSize: faker.number.int({ min: 500000, max: 2000000 }),
              mimeType: 'image/jpeg',
              width: 1920,
              height: 1080,
              caption: 'Master bedroom',
              subfolder: 'bedroom-1',
              sortOrder: 3,
              storageLocation: 'database',
            },
            {
              category: 'POOL_OUTDOOR_AREAS',
              fileName: 'pool-area.jpg',
              fileUrl: faker.image.url(),
              fileSize: faker.number.int({ min: 500000, max: 2000000 }),
              mimeType: 'image/jpeg',
              width: 1920,
              height: 1080,
              caption: 'Pool and outdoor area',
              sortOrder: 4,
              storageLocation: 'database',
            },
            {
              category: 'KITCHEN',
              fileName: 'kitchen.jpg',
              fileUrl: faker.image.url(),
              fileSize: faker.number.int({ min: 500000, max: 2000000 }),
              mimeType: 'image/jpeg',
              width: 1920,
              height: 1080,
              caption: 'Modern kitchen',
              sortOrder: 5,
              storageLocation: 'database',
            },
          ],
        },

        // Create Documents
        documents: {
          create: [
            {
              documentType: 'PROPERTY_CONTRACT',
              fileName: 'property-contract.pdf',
              fileUrl: faker.internet.url(),
              fileSize: faker.number.int({ min: 100000, max: 500000 }),
              mimeType: 'application/pdf',
              description: 'Property management contract',
              isActive: true,
              validFrom: new Date('2024-01-01'),
              validUntil: new Date('2026-12-31'),
              storageLocation: 'database',
            },
            {
              documentType: 'INSURANCE_CERTIFICATE',
              fileName: 'insurance-certificate.pdf',
              fileUrl: faker.internet.url(),
              fileSize: faker.number.int({ min: 100000, max: 300000 }),
              mimeType: 'application/pdf',
              description: 'Property insurance certificate',
              isActive: true,
              validFrom: new Date('2024-01-01'),
              validUntil: new Date('2025-12-31'),
              storageLocation: 'database',
            },
            {
              documentType: 'PROPERTY_TITLE',
              fileName: 'property-title.pdf',
              fileUrl: faker.internet.url(),
              fileSize: faker.number.int({ min: 200000, max: 400000 }),
              mimeType: 'application/pdf',
              description: 'Property ownership title',
              isActive: true,
              storageLocation: 'database',
            },
            {
              documentType: 'FLOOR_PLANS',
              fileName: 'floor-plans.pdf',
              fileUrl: faker.internet.url(),
              fileSize: faker.number.int({ min: 500000, max: 1000000 }),
              mimeType: 'application/pdf',
              description: 'Detailed floor plans',
              isActive: true,
              storageLocation: 'database',
            },
          ],
        },

        // Create Facilities
        facilities: {
          create: [
            // Property Layout & Spaces
            {
              category: 'property_layout_spaces',
              subcategory: 'Indoor Spaces',
              itemName: 'Living Room',
              isAvailable: true,
              quantity: 1,
              condition: 'excellent',
              notes: 'Spacious living area with ocean view',
            },
            {
              category: 'property_layout_spaces',
              subcategory: 'Indoor Spaces',
              itemName: 'Dining Room',
              isAvailable: true,
              quantity: 1,
              condition: 'excellent',
              notes: 'Seats 12 people',
            },
            // Kitchen & Dining
            {
              category: 'kitchen_dining',
              subcategory: 'Major Appliances',
              itemName: 'Refrigerator',
              isAvailable: true,
              quantity: 2,
              condition: 'excellent',
              specifications: 'Samsung double door, 600L capacity',
            },
            {
              category: 'kitchen_dining',
              subcategory: 'Major Appliances',
              itemName: 'Oven',
              isAvailable: true,
              quantity: 1,
              condition: 'good',
              specifications: 'Electric oven with convection',
            },
            {
              category: 'kitchen_dining',
              subcategory: 'Cookware',
              itemName: 'Complete Cookware Set',
              isAvailable: true,
              quantity: 1,
              condition: 'good',
            },
            // Bathrooms
            {
              category: 'bathrooms',
              subcategory: 'Fixtures',
              itemName: 'Rain Shower',
              isAvailable: true,
              quantity: villaData.bathrooms,
              condition: 'excellent',
            },
            {
              category: 'bathrooms',
              subcategory: 'Amenities',
              itemName: 'Hair Dryer',
              isAvailable: true,
              quantity: villaData.bathrooms,
              condition: 'good',
            },
            // Outdoor Facilities
            {
              category: 'outdoor_facilities',
              subcategory: 'Pool',
              itemName: 'Swimming Pool',
              isAvailable: true,
              quantity: 1,
              condition: 'excellent',
              specifications: '12m x 5m, infinity edge',
            },
            {
              category: 'outdoor_facilities',
              subcategory: 'Garden',
              itemName: 'Tropical Garden',
              isAvailable: true,
              quantity: 1,
              condition: 'excellent',
              notes: 'Well-maintained tropical landscaping',
            },
            // Technology
            {
              category: 'technology',
              subcategory: 'Internet',
              itemName: 'WiFi',
              isAvailable: true,
              quantity: 1,
              condition: 'excellent',
              specifications: '100 Mbps fiber optic',
            },
            {
              category: 'technology',
              subcategory: 'Entertainment',
              itemName: 'Smart TV',
              isAvailable: true,
              quantity: villaData.bedrooms + 1,
              condition: 'excellent',
              specifications: '55" Samsung Smart TV with Netflix',
            },
            // Safety & Security
            {
              category: 'safety_security',
              subcategory: 'Security Systems',
              itemName: 'CCTV System',
              isAvailable: true,
              quantity: 1,
              condition: 'excellent',
              specifications: '8 cameras with night vision',
            },
            {
              category: 'safety_security',
              subcategory: 'Safety Equipment',
              itemName: 'Fire Extinguisher',
              isAvailable: true,
              quantity: 3,
              condition: 'excellent',
              notes: 'Regularly inspected',
            },
            // Entertainment
            {
              category: 'entertainment_gaming',
              subcategory: 'Games',
              itemName: 'Pool Table',
              isAvailable: true,
              quantity: 1,
              condition: 'good',
            },
            // Service & Staff
            {
              category: 'service_staff',
              subcategory: 'Services',
              itemName: 'Daily Housekeeping',
              isAvailable: true,
              quantity: 1,
              condition: 'excellent',
              notes: 'Available 7 days a week',
            },
          ],
        },

        // Create Onboarding Progress (All Completed)
        onboarding: {
          create: {
            currentStep: 10,
            totalSteps: 10,
            villaInfoCompleted: true,
            ownerDetailsCompleted: true,
            contractualDetailsCompleted: true,
            bankDetailsCompleted: true,
            otaCredentialsCompleted: true,
            staffConfigCompleted: true,
            facilitiesCompleted: true,
            photosUploaded: true,
            documentsUploaded: true,
            reviewCompleted: true,
            status: 'COMPLETED',
            submittedAt: new Date(),
          },
        },

        // Create Onboarding Session
        onboardingSession: {
          create: {
            userId: faker.string.uuid(),
            userEmail: faker.internet.email(),
            sessionStartedAt: new Date(Date.now() - 7200000), // 2 hours ago
            sessionEndedAt: new Date(),
            currentStep: 10,
            totalSteps: 10,
            stepsCompleted: 10,
            stepsSkipped: 0,
            fieldsCompleted: 150,
            fieldsSkipped: 0,
            totalFields: 150,
            isCompleted: true,
            completedAt: new Date(),
            submittedForReview: true,
            submittedAt: new Date(),
            totalTimeSpent: 7200,
            averageStepTime: 720,
          },
        },

        // Create Step Progress for all steps
        stepProgress: {
          create: [
            {
              stepNumber: 1,
              stepName: 'Villa Information',
              status: 'COMPLETED',
              startedAt: new Date(Date.now() - 7200000),
              completedAt: new Date(Date.now() - 6600000),
              isValid: true,
              actualDuration: 600,
            },
            {
              stepNumber: 2,
              stepName: 'Owner Details',
              status: 'COMPLETED',
              startedAt: new Date(Date.now() - 6600000),
              completedAt: new Date(Date.now() - 6000000),
              isValid: true,
              actualDuration: 600,
            },
            {
              stepNumber: 3,
              stepName: 'Contractual Details',
              status: 'COMPLETED',
              startedAt: new Date(Date.now() - 6000000),
              completedAt: new Date(Date.now() - 5400000),
              isValid: true,
              actualDuration: 600,
            },
            {
              stepNumber: 4,
              stepName: 'Bank Details',
              status: 'COMPLETED',
              startedAt: new Date(Date.now() - 5400000),
              completedAt: new Date(Date.now() - 4800000),
              isValid: true,
              actualDuration: 600,
            },
            {
              stepNumber: 5,
              stepName: 'OTA Credentials',
              status: 'COMPLETED',
              startedAt: new Date(Date.now() - 4800000),
              completedAt: new Date(Date.now() - 4200000),
              isValid: true,
              actualDuration: 600,
            },
            {
              stepNumber: 6,
              stepName: 'Staff Configuration',
              status: 'COMPLETED',
              startedAt: new Date(Date.now() - 4200000),
              completedAt: new Date(Date.now() - 3600000),
              isValid: true,
              actualDuration: 600,
            },
            {
              stepNumber: 7,
              stepName: 'Facilities Checklist',
              status: 'COMPLETED',
              startedAt: new Date(Date.now() - 3600000),
              completedAt: new Date(Date.now() - 2400000),
              isValid: true,
              actualDuration: 1200,
            },
            {
              stepNumber: 8,
              stepName: 'Photo Upload',
              status: 'COMPLETED',
              startedAt: new Date(Date.now() - 2400000),
              completedAt: new Date(Date.now() - 1200000),
              isValid: true,
              actualDuration: 1200,
            },
            {
              stepNumber: 9,
              stepName: 'Document Upload',
              status: 'COMPLETED',
              startedAt: new Date(Date.now() - 1200000),
              completedAt: new Date(Date.now() - 600000),
              isValid: true,
              actualDuration: 600,
            },
            {
              stepNumber: 10,
              stepName: 'Review & Submit',
              status: 'COMPLETED',
              startedAt: new Date(Date.now() - 600000),
              completedAt: new Date(),
              isValid: true,
              actualDuration: 600,
            },
          ],
        },

        // Create Agreements
        agreements: {
          create: [
            {
              agreementType: 'PROPERTY_MANAGEMENT',
              title: 'Property Management Agreement',
              description: 'Full property management services agreement',
              status: 'ACTIVE',
              content: faker.lorem.paragraphs(5),
              createdBy: faker.string.uuid(),
              signedBy: faker.person.fullName(),
              sentAt: new Date(Date.now() - 864000000), // 10 days ago
              signedAt: new Date(Date.now() - 604800000), // 7 days ago
              expiresAt: new Date('2026-12-31'),
              isAutoRenewal: true,
              renewalPeriod: 12,
            },
          ],
        },
      },
    });

    console.log(`✅ Created villa: ${villa.villaName} (${villa.villaCode})`);
  }

  console.log('\n✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });