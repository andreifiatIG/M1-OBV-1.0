/**
 * Data Consistency Checker
 *
 * Verifies that all three progress tracking systems are in sync:
 * 1. OnboardingProgress boolean flags (legacy system)
 * 2. OnboardingStepProgress status (field-level tracking)
 * 3. Actual data in primary tables (Villa, Owner, etc.)
 *
 * Usage:
 *   import { checkConsistency, checkAllVillas } from './utils/dataConsistency';
 *   const issues = await checkConsistency(villaId);
 */

import prisma from './prisma';
import { logger } from './logger';
import { OnboardingStatus } from '@prisma/client';

export interface ConsistencyIssue {
  villaId: string;
  step: number;
  stepName: string;
  issueType: 'DATA_EXISTS_FLAG_FALSE' | 'FLAG_TRUE_NO_DATA' | 'STEP_STATUS_MISMATCH' | 'SESSION_MISMATCH';
  description: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface ConsistencyReport {
  villaId: string;
  villaName?: string;
  totalIssues: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  issues: ConsistencyIssue[];
  overallStatus: 'CONSISTENT' | 'MINOR_ISSUES' | 'MAJOR_ISSUES';
}

/**
 * Check if step data actually exists in the database
 */
async function checkStepDataExists(villaId: string, step: number): Promise<boolean> {
  try {
    switch (step) {
      case 1: {
        // Villa Information - check if required fields are filled
        const villa = await prisma.villa.findUnique({
          where: { id: villaId }
        });
        return !!(villa && villa.address && villa.city && villa.country && villa.bedrooms && villa.bathrooms);
      }

      case 2: {
        // Owner Details
        const owner = await prisma.owner.findUnique({
          where: { villaId }
        });
        return !!(owner && owner.firstName && owner.lastName && owner.email && owner.phone);
      }

      case 3: {
        // Contractual Details
        const contract = await prisma.contractualDetails.findUnique({
          where: { villaId }
        });
        return !!(contract && contract.contractStartDate && contract.contractType && contract.commissionRate);
      }

      case 4: {
        // Bank Details
        const bank = await prisma.bankDetails.findUnique({
          where: { villaId }
        });
        return !!(bank && bank.accountHolderName && bank.bankName && bank.accountNumber);
      }

      case 5: {
        // OTA Credentials - at least one platform configured
        const otaCount = await prisma.oTACredentials.count({
          where: { villaId, isActive: true }
        });
        return otaCount > 0;
      }

      case 6: {
        // Documents - at least one document uploaded
        const docCount = await prisma.document.count({
          where: { villaId, isActive: true }
        });
        return docCount > 0;
      }

      case 7: {
        // Staff - at least one staff member configured
        const staffCount = await prisma.staff.count({
          where: { villaId, isActive: true }
        });
        return staffCount > 0;
      }

      case 8: {
        // Facilities - at least some facilities checked
        const facilityCount = await prisma.facilityChecklist.count({
          where: { villaId, isAvailable: true }
        });
        return facilityCount > 0;
      }

      case 9: {
        // Photos - at least one photo uploaded
        const photoCount = await prisma.photo.count({
          where: { villaId }
        });
        return photoCount > 0;
      }

      case 10: {
        // Review - check if onboarding was submitted
        const progress = await prisma.onboardingProgress.findUnique({
          where: { villaId }
        });
        return !!(progress && progress.submittedAt);
      }

      default:
        return false;
    }
  } catch (error) {
    logger.error(`Error checking data existence for step ${step}:`, error);
    return false;
  }
}

/**
 * Get step name from step number
 */
function getStepName(step: number): string {
  const names: Record<number, string> = {
    1: 'Villa Information',
    2: 'Owner Details',
    3: 'Contractual Details',
    4: 'Bank Details',
    5: 'OTA Credentials',
    6: 'Documents Upload',
    7: 'Staff Configuration',
    8: 'Facilities Checklist',
    9: 'Photo Upload',
    10: 'Review & Submit',
  };
  return names[step] || `Step ${step}`;
}

/**
 * Get boolean flag field name for a step
 */
function getStepFlagField(step: number): string | null {
  const flags: Record<number, string> = {
    1: 'villaInfoCompleted',
    2: 'ownerDetailsCompleted',
    3: 'contractualDetailsCompleted',
    4: 'bankDetailsCompleted',
    5: 'otaCredentialsCompleted',
    6: 'documentsUploaded',
    7: 'staffConfigCompleted',
    8: 'facilitiesCompleted',
    9: 'photosUploaded',
    10: 'reviewCompleted',
  };
  return flags[step] || null;
}

/**
 * Check consistency for a single villa
 */
export async function checkConsistency(villaId: string): Promise<ConsistencyReport> {
  const issues: ConsistencyIssue[] = [];

  try {
    // Get villa info
    const villa = await prisma.villa.findUnique({
      where: { id: villaId },
      select: { villaName: true }
    });

    if (!villa) {
      throw new Error(`Villa ${villaId} not found`);
    }

    // Get onboarding progress
    const progress = await prisma.onboardingProgress.findUnique({
      where: { villaId }
    });

    if (!progress) {
      throw new Error(`OnboardingProgress not found for villa ${villaId}`);
    }

    // Get step progress
    const stepProgress = await prisma.onboardingStepProgress.findMany({
      where: { villaId }
    });

    // Get session
    const session = await prisma.onboardingSession.findUnique({
      where: { villaId }
    });

    // Check each step (1-10)
    for (let step = 1; step <= 10; step++) {
      const stepName = getStepName(step);
      const flagField = getStepFlagField(step);

      // Check 1: Does actual data exist?
      const dataExists = await checkStepDataExists(villaId, step);

      // Check 2: What does the legacy flag say?
      const legacyFlag = flagField ? (progress as any)[flagField] : false;

      // Check 3: What does StepProgress say?
      const stepProgressRecord = stepProgress.find(sp => sp.stepNumber === step);
      const stepProgressStatus = stepProgressRecord?.status || 'NOT_STARTED';
      const isStepComplete = stepProgressStatus === 'COMPLETED';

      // Issue Type 1: Data exists but flag is false
      if (dataExists && !legacyFlag) {
        issues.push({
          villaId,
          step,
          stepName,
          issueType: 'DATA_EXISTS_FLAG_FALSE',
          description: `${stepName} has data in database, but OnboardingProgress.${flagField} is false`,
          severity: 'high',
          suggestion: `Update OnboardingProgress.${flagField} to true`
        });
      }

      // Issue Type 2: Flag is true but no data exists
      if (!dataExists && legacyFlag) {
        issues.push({
          villaId,
          step,
          stepName,
          issueType: 'FLAG_TRUE_NO_DATA',
          description: `OnboardingProgress.${flagField} is true, but no data exists in database`,
          severity: 'medium',
          suggestion: `Either add missing data or set OnboardingProgress.${flagField} to false`
        });
      }

      // Issue Type 3: Step progress status doesn't match data existence
      if (dataExists && !isStepComplete) {
        issues.push({
          villaId,
          step,
          stepName,
          issueType: 'STEP_STATUS_MISMATCH',
          description: `${stepName} has data but OnboardingStepProgress status is ${stepProgressStatus}`,
          severity: 'medium',
          suggestion: `Update OnboardingStepProgress status to COMPLETED`
        });
      }

      if (!dataExists && isStepComplete) {
        issues.push({
          villaId,
          step,
          stepName,
          issueType: 'STEP_STATUS_MISMATCH',
          description: `OnboardingStepProgress status is COMPLETED but no data exists`,
          severity: 'medium',
          suggestion: `Update OnboardingStepProgress status to NOT_STARTED or IN_PROGRESS`
        });
      }
    }

    // Check 4: Session counter consistency
    if (session) {
      const actualStepsCompleted = stepProgress.filter(sp => sp.status === 'COMPLETED').length;
      if (session.stepsCompleted !== actualStepsCompleted) {
        issues.push({
          villaId,
          step: 0,
          stepName: 'Session',
          issueType: 'SESSION_MISMATCH',
          description: `OnboardingSession.stepsCompleted (${session.stepsCompleted}) doesn't match actual count (${actualStepsCompleted})`,
          severity: 'low',
          suggestion: `Run updateSessionCounters() to recalculate`
        });
      }
    }

    // Calculate severity counts
    const highSeverity = issues.filter(i => i.severity === 'high').length;
    const mediumSeverity = issues.filter(i => i.severity === 'medium').length;
    const lowSeverity = issues.filter(i => i.severity === 'low').length;

    // Determine overall status
    let overallStatus: 'CONSISTENT' | 'MINOR_ISSUES' | 'MAJOR_ISSUES';
    if (issues.length === 0) {
      overallStatus = 'CONSISTENT';
    } else if (highSeverity > 0) {
      overallStatus = 'MAJOR_ISSUES';
    } else {
      overallStatus = 'MINOR_ISSUES';
    }

    return {
      villaId,
      villaName: villa.villaName,
      totalIssues: issues.length,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      issues,
      overallStatus,
    };
  } catch (error) {
    logger.error(`Error checking consistency for villa ${villaId}:`, error);
    throw error;
  }
}

/**
 * Check consistency for all villas
 */
export async function checkAllVillas(): Promise<ConsistencyReport[]> {
  try {
    const villas = await prisma.villa.findMany({
      select: { id: true }
    });

    logger.info(`Checking consistency for ${villas.length} villas...`);

    const reports: ConsistencyReport[] = [];

    for (const villa of villas) {
      try {
        const report = await checkConsistency(villa.id);
        reports.push(report);

        if (report.overallStatus !== 'CONSISTENT') {
          logger.warn(`Villa ${villa.id}: ${report.totalIssues} issues found (${report.highSeverity} high, ${report.mediumSeverity} medium, ${report.lowSeverity} low)`);
        }
      } catch (error) {
        logger.error(`Failed to check villa ${villa.id}:`, error);
      }
    }

    return reports;
  } catch (error) {
    logger.error('Error checking all villas:', error);
    throw error;
  }
}

/**
 * Print a consistency report
 */
export function printReport(report: ConsistencyReport): void {
  console.log('='.repeat(80));
  console.log(`Consistency Report: ${report.villaName} (${report.villaId})`);
  console.log('='.repeat(80));
  console.log(`Overall Status: ${report.overallStatus}`);
  console.log(`Total Issues: ${report.totalIssues}`);
  console.log(`  - High Severity: ${report.highSeverity}`);
  console.log(`  - Medium Severity: ${report.mediumSeverity}`);
  console.log(`  - Low Severity: ${report.lowSeverity}`);
  console.log('');

  if (report.issues.length > 0) {
    console.log('Issues:');
    report.issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.severity.toUpperCase()}] ${issue.stepName}`);
      console.log(`   Type: ${issue.issueType}`);
      console.log(`   Description: ${issue.description}`);
      console.log(`   Suggestion: ${issue.suggestion}`);
    });
  } else {
    console.log('✅ No issues found. All systems are consistent!');
  }

  console.log('');
  console.log('='.repeat(80));
}

/**
 * Main execution for CLI usage
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const villaId = args[0];

    if (villaId && villaId !== '--all') {
      // Check single villa
      const report = await checkConsistency(villaId);
      printReport(report);
    } else {
      // Check all villas
      const reports = await checkAllVillas();

      console.log('');
      console.log('='.repeat(80));
      console.log('Summary of All Villas');
      console.log('='.repeat(80));

      const consistent = reports.filter(r => r.overallStatus === 'CONSISTENT').length;
      const minorIssues = reports.filter(r => r.overallStatus === 'MINOR_ISSUES').length;
      const majorIssues = reports.filter(r => r.overallStatus === 'MAJOR_ISSUES').length;

      console.log(`Total Villas: ${reports.length}`);
      console.log(`  - Consistent: ${consistent}`);
      console.log(`  - Minor Issues: ${minorIssues}`);
      console.log(`  - Major Issues: ${majorIssues}`);
      console.log('');

      if (majorIssues > 0) {
        console.log('Villas with Major Issues:');
        reports.filter(r => r.overallStatus === 'MAJOR_ISSUES').forEach(r => {
          console.log(`  - ${r.villaName} (${r.villaId}): ${r.highSeverity} high, ${r.mediumSeverity} medium, ${r.lowSeverity} low`);
        });
      }
    }

    process.exit(0);
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default { checkConsistency, checkAllVillas, printReport };