import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { backupRateLimit } from '../middleware/rateLimiting';

const router = Router();
const prisma = new PrismaClient();

const BackupDataSchema = z.object({
  sessionId: z.string(),
  villaId: z.string().optional(),
  currentStep: z.number().min(1).max(10),
  stepData: z.record(z.any()),
  lastSaved: z.string(),
  userAgent: z.string(),
  version: z.string(),
});

// Create or update backup
router.post('/backup', backupRateLimit, authenticate, async (req, res) => {
  try {
    const validatedData = BackupDataSchema.parse(req.body);
    const userId = (req as any).user.id;

    // Check if backup already exists for this user/session
    const existingBackup = await prisma.onboardingBackup.findFirst({
      where: {
        userId,
        sessionId: validatedData.sessionId,
      },
    });

    let backup;
    if (existingBackup) {
      backup = await prisma.onboardingBackup.update({
        where: { id: existingBackup.id },
        data: {
          villaId: validatedData.villaId,
          currentStep: validatedData.currentStep,
          stepData: validatedData.stepData,
          lastSaved: new Date(validatedData.lastSaved),
          userAgent: validatedData.userAgent,
          version: validatedData.version,
          updatedAt: new Date(),
        },
      });
    } else {
      backup = await prisma.onboardingBackup.create({
        data: {
          userId,
          sessionId: validatedData.sessionId,
          villaId: validatedData.villaId,
          currentStep: validatedData.currentStep,
          stepData: validatedData.stepData,
          lastSaved: new Date(validatedData.lastSaved),
          userAgent: validatedData.userAgent,
          version: validatedData.version,
        },
      });
    }

    res.json({ 
      success: true, 
      backupId: backup.id,
      message: 'Backup saved successfully' 
    });
  } catch (error) {
    console.error('Backup save error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid backup data format',
        details: error.errors,
      });
    }
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save backup' 
    });
  }
});

// Get latest backup for user
router.get('/backup/latest', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const backup = await prisma.onboardingBackup.findFirst({
      where: { userId },
      orderBy: { lastSaved: 'desc' },
    });

    if (!backup) {
      return res.status(404).json({ 
        success: false, 
        error: 'No backup found' 
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: backup.sessionId,
        villaId: backup.villaId,
        currentStep: backup.currentStep,
        stepData: backup.stepData,
        lastSaved: backup.lastSaved.toISOString(),
        userAgent: backup.userAgent,
        version: backup.version,
      },
    });
  } catch (error) {
    console.error('Backup retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve backup' 
    });
  }
});

// Get backup by villa ID
router.get('/backup/:villaId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { villaId } = req.params;

    // Verify user has access to this villa
    const villa = await prisma.villa.findFirst({
      where: {
        id: villaId,
        onboardingSession: {
          userId,
        },
      },
    });

    if (!villa) {
      return res.status(404).json({ 
        success: false, 
        error: 'Villa not found or access denied' 
      });
    }

    const backup = await prisma.onboardingBackup.findFirst({
      where: {
        userId,
        villaId,
      },
      orderBy: { lastSaved: 'desc' },
    });

    if (!backup) {
      return res.status(404).json({ 
        success: false, 
        error: 'No backup found for this villa' 
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: backup.sessionId,
        villaId: backup.villaId,
        currentStep: backup.currentStep,
        stepData: backup.stepData,
        lastSaved: backup.lastSaved.toISOString(),
        userAgent: backup.userAgent,
        version: backup.version,
      },
    });
  } catch (error) {
    console.error('Backup retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve backup' 
    });
  }
});

// Delete backup by villa ID
router.delete('/backup/:villaId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { villaId } = req.params;

    const deletedBackup = await prisma.onboardingBackup.deleteMany({
      where: {
        userId,
        villaId,
      },
    });

    res.json({ 
      success: true, 
      deletedCount: deletedBackup.count,
      message: 'Backup deleted successfully' 
    });
  } catch (error) {
    console.error('Backup deletion error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete backup' 
    });
  }
});

// Delete all backups for user
router.delete('/backup', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const deletedBackups = await prisma.onboardingBackup.deleteMany({
      where: { userId },
    });

    res.json({ 
      success: true, 
      deletedCount: deletedBackups.count,
      message: 'All backups deleted successfully' 
    });
  } catch (error) {
    console.error('Backup deletion error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete backups' 
    });
  }
});

// Get user's backup history
router.get('/backups', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const backups = await prisma.onboardingBackup.findMany({
      where: { userId },
      orderBy: { lastSaved: 'desc' },
      take: limit,
      skip: offset,
      include: {
        villa: {
          select: {
            villaName: true,
            villaCode: true,
          },
        },
      },
    });

    const totalCount = await prisma.onboardingBackup.count({
      where: { userId },
    });

    res.json({
      success: true,
      data: backups.map(backup => ({
        id: backup.id,
        sessionId: backup.sessionId,
        villaId: backup.villaId,
        villaName: backup.villa?.villaName,
        villaCode: backup.villa?.villaCode,
        currentStep: backup.currentStep,
        lastSaved: backup.lastSaved.toISOString(),
        version: backup.version,
        stepCount: Object.keys(backup.stepData as any).length,
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Backup history error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve backup history' 
    });
  }
});

// Cleanup old backups (admin/cron job)
router.delete('/backups/cleanup', authenticate, async (req, res) => {
  try {
    // Only allow admins to run cleanup
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    const daysToKeep = parseInt(req.query.days as string) || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deletedBackups = await prisma.onboardingBackup.deleteMany({
      where: {
        lastSaved: {
          lt: cutoffDate,
        },
      },
    });

    res.json({ 
      success: true, 
      deletedCount: deletedBackups.count,
      cutoffDate: cutoffDate.toISOString(),
      message: `Cleaned up backups older than ${daysToKeep} days` 
    });
  } catch (error) {
    console.error('Backup cleanup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cleanup backups' 
    });
  }
});

export default router;