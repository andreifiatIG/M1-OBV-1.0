/**
 * Data Migration Script: Fix Field Mappings
 *
 * This script fixes existing StepFieldProgress records that have incorrect frontend field names
 * (e.g., "villaAddress", "villaCity") and updates them to match the database schema field names
 * (e.g., "address", "city").
 *
 * This is a ONE-TIME migration to fix data created before the field normalizer was implemented.
 *
 * Usage:
 *   tsx src/migrations/fixFieldMappings.ts
 */

import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Field name mappings from frontend to backend
 * These are the transformations we need to apply
 */
const FIELD_MAPPINGS: Record<string, string> = {
  // Villa fields (Step 1)
  villaAddress: 'address',
  villaCity: 'city',
  villaCountry: 'country',
  villaPostalCode: 'zipCode',
  villaArea: 'propertySize',
  landArea: 'plotSize',

  // Bank fields (Step 4)
  accountName: 'accountHolderName',
  bankAccountNumber: 'accountNumber',
  swiftBicCode: 'swiftCode',
  bankBranch: 'branchName',
  bankNotes: 'notes',
};

/**
 * Get statistics before migration
 */
async function getMigrationStats() {
  const stats: Record<string, number> = {};

  for (const [oldFieldName, newFieldName] of Object.entries(FIELD_MAPPINGS)) {
    const count = await prisma.stepFieldProgress.count({
      where: {
        fieldName: oldFieldName
      }
    });
    if (count > 0) {
      stats[`${oldFieldName} → ${newFieldName}`] = count;
    }
  }

  return stats;
}

/**
 * Migrate field names
 */
async function migrateFieldNames(dryRun: boolean = true) {
  logger.info('='.repeat(80));
  logger.info('Field Mapping Migration Script');
  logger.info('='.repeat(80));
  logger.info(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be applied)'}`);
  logger.info('');

  // Get stats before migration
  logger.info('Scanning database for fields that need migration...');
  const statsBeforeMigration = await getMigrationStats();

  if (Object.keys(statsBeforeMigration).length === 0) {
    logger.info('✅ No fields need migration. Database is already clean!');
    return {
      success: true,
      migrated: 0,
      skipped: 0,
    };
  }

  logger.info('Found fields that need migration:');
  for (const [mapping, count] of Object.entries(statsBeforeMigration)) {
    logger.info(`  - ${mapping}: ${count} records`);
  }
  logger.info('');

  if (dryRun) {
    logger.info('⚠️  DRY RUN MODE - No changes will be made');
    logger.info('To apply these changes, run: tsx src/migrations/fixFieldMappings.ts --apply');
    return {
      success: true,
      migrated: 0,
      skipped: Object.values(statsBeforeMigration).reduce((a, b) => a + b, 0),
    };
  }

  // Apply migrations
  logger.info('Applying migrations...');
  let totalMigrated = 0;
  let totalErrors = 0;

  for (const [oldFieldName, newFieldName] of Object.entries(FIELD_MAPPINGS)) {
    try {
      // Check if any records need migration
      const recordsToMigrate = await prisma.stepFieldProgress.findMany({
        where: {
          fieldName: oldFieldName
        },
        select: {
          id: true,
          stepProgressId: true,
          fieldName: true,
          stepProgress: {
            select: {
              villaId: true
            }
          }
        }
      });

      if (recordsToMigrate.length === 0) {
        continue;
      }

      logger.info(`Migrating ${oldFieldName} → ${newFieldName} (${recordsToMigrate.length} records)...`);

      // Use transaction to ensure atomic update
      const result = await prisma.$transaction(async (tx) => {
        // Check if target field name already exists for any of these step progressions
        for (const record of recordsToMigrate) {
          const conflictingField = await tx.stepFieldProgress.findFirst({
            where: {
              stepProgressId: record.stepProgressId,
              fieldName: newFieldName,
              id: { not: record.id }  // Not the current record
            }
          });

          if (conflictingField) {
            logger.warn(`  ⚠️  Conflict detected for step ${record.stepProgressId}: ${newFieldName} already exists`);
            logger.warn(`      Deleting duplicate old field: ${oldFieldName} (id: ${record.id})`);

            // Delete the old field since new field already exists
            await tx.stepFieldProgress.delete({
              where: { id: record.id }
            });
          } else {
            // No conflict, safe to rename
            await tx.stepFieldProgress.update({
              where: { id: record.id },
              data: { fieldName: newFieldName }
            });
          }
        }

        return recordsToMigrate.length;
      });

      totalMigrated += result;
      logger.info(`  ✅ Migrated ${result} records`);

    } catch (error) {
      totalErrors++;
      logger.error(`  ❌ Error migrating ${oldFieldName}:`, error);
    }
  }

  logger.info('');
  logger.info('='.repeat(80));
  logger.info('Migration Summary');
  logger.info('='.repeat(80));
  logger.info(`Total migrated: ${totalMigrated}`);
  logger.info(`Total errors: ${totalErrors}`);

  // Verify migration
  logger.info('');
  logger.info('Verifying migration...');
  const statsAfterMigration = await getMigrationStats();

  if (Object.keys(statsAfterMigration).length === 0) {
    logger.info('✅ Migration successful! All fields have been updated.');
    return {
      success: true,
      migrated: totalMigrated,
      errors: totalErrors,
    };
  } else {
    logger.warn('⚠️  Some fields still need migration:');
    for (const [mapping, count] of Object.entries(statsAfterMigration)) {
      logger.warn(`  - ${mapping}: ${count} records`);
    }
    return {
      success: false,
      migrated: totalMigrated,
      errors: totalErrors,
      remaining: statsAfterMigration,
    };
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const isApplyMode = args.includes('--apply');

    const result = await migrateFieldNames(!isApplyMode);

    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    logger.error('Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { migrateFieldNames, getMigrationStats };