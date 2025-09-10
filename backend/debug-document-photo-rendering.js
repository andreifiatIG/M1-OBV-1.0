#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

class DocumentPhotoRenderingDebugger {
  async debugDocumentPhotoRendering() {
    console.log('🔍 Debugging Document and Photo Rendering Issues...\n');

    try {
      // Get the test villa with all media data
      const villa = await prisma.villa.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          documents: true,
          photos: true,
          stepProgress: {
            where: {
              stepNumber: { in: [6, 9] } // Documents and Photos steps
            },
            include: {
              fields: true
            }
          }
        }
      });

      if (!villa) {
        console.log('❌ No villa found');
        return;
      }

      console.log(`✅ Found villa: ${villa.villaName} (${villa.id})\n`);

      // DOCUMENTS ANALYSIS
      console.log('📄 DOCUMENTS ANALYSIS:');
      console.log('='.repeat(60));
      
      const documents = villa.documents || [];
      console.log(`Total documents: ${documents.length}`);

      const documentIssues = [];

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        console.log(`\nDocument ${i + 1}: ${doc.fileName}`);
        console.log(`   Type: ${doc.documentType}`);
        console.log(`   File URL: ${doc.fileUrl}`);
        console.log(`   SharePoint File ID: ${doc.sharePointFileId || 'NULL'}`);
        console.log(`   SharePoint Path: ${doc.sharePointPath || 'NULL'}`);
        console.log(`   Storage Location: ${doc.storageLocation || 'database'}`);
        console.log(`   File Size: ${doc.fileSize || 'N/A'} bytes`);
        console.log(`   Has Content: ${doc.fileContent ? 'YES' : 'NO'}`);

        // Check for rendering issues
        if (!doc.fileUrl) {
          documentIssues.push(`Document ${i + 1}: Missing fileUrl`);
        }
        
        if (doc.fileUrl && doc.fileUrl.startsWith('database://') && !doc.fileContent) {
          documentIssues.push(`Document ${i + 1}: Database storage but no content`);
        }

        if (doc.sharePointFileId && !doc.sharePointPath) {
          documentIssues.push(`Document ${i + 1}: Has SharePoint ID but no path`);
        }
      }

      // PHOTOS ANALYSIS
      console.log('\n📸 PHOTOS ANALYSIS:');
      console.log('='.repeat(60));
      
      const photos = villa.photos || [];
      console.log(`Total photos: ${photos.length}`);

      const photoIssues = [];
      const photosByCategory = {};

      photos.forEach(photo => {
        if (!photosByCategory[photo.category]) {
          photosByCategory[photo.category] = [];
        }
        photosByCategory[photo.category].push(photo);
      });

      Object.entries(photosByCategory).forEach(([category, categoryPhotos]) => {
        console.log(`\n${category}: ${categoryPhotos.length} photos`);
        
        categoryPhotos.forEach((photo, index) => {
          console.log(`   Photo ${index + 1}: ${photo.fileName}`);
          console.log(`     File URL: ${photo.fileUrl}`);
          console.log(`     SharePoint File ID: ${photo.sharePointFileId || 'NULL'}`);
          console.log(`     SharePoint Path: ${photo.sharePointPath || 'NULL'}`);
          console.log(`     SharePoint URL: ${photo.sharePointUrl || 'NULL'}`);
          console.log(`     Storage Location: ${photo.storageLocation || 'database'}`);
          console.log(`     Subfolder: ${photo.subfolder || 'None'}`);
          console.log(`     Has Content: ${photo.fileContent ? 'YES' : 'NO'}`);
          console.log(`     Thumbnail: ${photo.thumbnailContent ? 'YES' : 'NO'}`);

          // Check for rendering issues
          if (!photo.fileUrl) {
            photoIssues.push(`${category} Photo ${index + 1}: Missing fileUrl`);
          }
          
          if (photo.fileUrl && photo.fileUrl.startsWith('database://') && !photo.fileContent) {
            photoIssues.push(`${category} Photo ${index + 1}: Database storage but no content`);
          }

          if (photo.sharePointFileId && !photo.sharePointPath) {
            photoIssues.push(`${category} Photo ${index + 1}: Has SharePoint ID but no path/URL`);
          }

          if (photo.category === 'BEDROOMS' && !photo.subfolder) {
            photoIssues.push(`${category} Photo ${index + 1}: Bedroom photo without subfolder`);
          }
        });
      });

      // API ENDPOINT TESTING
      console.log('\n🔗 API ENDPOINT TESTING:');
      console.log('='.repeat(60));
      
      if (documents.length > 0) {
        const testDoc = documents[0];
        console.log(`Testing document API endpoints for: ${testDoc.fileName}`);
        console.log(`   Database URL: /api/documents/${testDoc.id}`);
        console.log(`   Public URL: /api/documents/public/${testDoc.id}`);
        console.log(`   File content length: ${testDoc.fileContent?.length || 0} bytes`);
      }

      if (photos.length > 0) {
        const testPhoto = photos[0];
        console.log(`Testing photo API endpoints for: ${testPhoto.fileName}`);
        console.log(`   Database URL: /api/photos/${testPhoto.id}`);
        console.log(`   Public URL: /api/photos/public/${testPhoto.id}`);
        console.log(`   Serve URL: /api/photos/serve/${testPhoto.id}`);
        console.log(`   File content length: ${testPhoto.fileContent?.length || 0} bytes`);
        console.log(`   Thumbnail length: ${testPhoto.thumbnailContent?.length || 0} bytes`);
      }

      // STEP PROGRESS ANALYSIS
      console.log('\n📋 STEP PROGRESS ANALYSIS:');
      console.log('='.repeat(60));
      
      const step6Progress = villa.stepProgress.find(sp => sp.stepNumber === 6);
      const step9Progress = villa.stepProgress.find(sp => sp.stepNumber === 9);

      if (step6Progress) {
        console.log(`Step 6 (Documents): ${step6Progress.status}`);
        console.log(`   Fields: ${step6Progress.fields?.length || 0}`);
        step6Progress.fields?.forEach(field => {
          if (field.fieldName.includes('document') || field.fieldName.includes('upload')) {
            console.log(`   - ${field.fieldName}: ${field.value || 'NULL'} (${field.status})`);
          }
        });
      }

      if (step9Progress) {
        console.log(`Step 9 (Photos): ${step9Progress.status}`);
        console.log(`   Fields: ${step9Progress.fields?.length || 0}`);
        step9Progress.fields?.forEach(field => {
          console.log(`   - ${field.fieldName}: ${field.value || 'NULL'} (${field.status})`);
        });
      }

      // ISSUES SUMMARY
      console.log('\n⚠️  ISSUES SUMMARY:');
      console.log('='.repeat(60));
      
      const allIssues = [...documentIssues, ...photoIssues];
      
      if (allIssues.length === 0) {
        console.log('✅ No rendering issues found!');
      } else {
        console.log(`Found ${allIssues.length} potential rendering issues:`);
        allIssues.forEach((issue, index) => {
          console.log(`   ${index + 1}. ${issue}`);
        });
      }

      // RECOMMENDATIONS
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('='.repeat(60));
      
      console.log('1. For documents and photos stored in database:');
      console.log('   - Use /api/photos/public/:id for public access');
      console.log('   - Use /api/documents/public/:id for public access');
      console.log('   - Ensure fileContent is not null');

      console.log('\n2. For SharePoint integration:');
      console.log('   - Ensure sharePointUrl is populated when sharePointFileId exists');
      console.log('   - Use sharePointUrl for direct access when available');
      console.log('   - Fallback to database content when SharePoint is unavailable');

      console.log('\n3. For bedroom photos:');
      console.log('   - Ensure subfolder is set for proper organization');
      console.log('   - Load bedroom configuration from field progress');
      console.log('   - Display photos grouped by bedroom subfolder');

      console.log('\n4. Frontend display logic:');
      console.log('   - Check for fileContent before rendering database:// URLs');
      console.log('   - Use img tags with proper error handling');
      console.log('   - Implement loading states for better UX');

      console.log('\n✨ Document and photo rendering debug completed!');

    } catch (error) {
      console.error('❌ Debug failed:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run the debugger
const renderingDebugger = new DocumentPhotoRenderingDebugger();
renderingDebugger.debugDocumentPhotoRendering();