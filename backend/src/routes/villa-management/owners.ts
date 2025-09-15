import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createOwnerSchema = z.object({
  body: z.object({
    villaId: z.string().uuid(),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email(),
    phone: z.string().min(1),
    alternativePhone: z.string().optional(),
    nationality: z.string().optional(),
    passportNumber: z.string().optional(),
    idNumber: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
    zipCode: z.string().optional(),
    preferredLanguage: z.string().default('en'),
    communicationPreference: z.enum(['EMAIL', 'PHONE', 'WHATSAPP', 'SMS']).default('EMAIL'),
    notes: z.string().optional(),
  }),
});

const updateOwnerSchema = z.object({
  params: z.object({
    ownerId: z.string().uuid(),
  }),
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    alternativePhone: z.string().optional(),
    nationality: z.string().optional(),
    passportNumber: z.string().optional(),
    idNumber: z.string().optional(),
    address: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    zipCode: z.string().optional(),
    preferredLanguage: z.string().optional(),
    communicationPreference: z.enum(['EMAIL', 'PHONE', 'WHATSAPP', 'SMS']).optional(),
    notes: z.string().optional(),
  }),
});

// Get all owners
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const owners = await prisma.owner.findMany({
      include: {
        villa: {
          select: {
            id: true,
            villaName: true,
            city: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: owners,
    });
  } catch (error) {
    console.error('Error fetching owners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch owners',
    });
  }
});

// Get owner by ID
router.get('/:ownerId', authenticate, async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;

    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
      include: {
        villa: true,
      },
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found',
      });
    }

    res.json({
      success: true,
      data: owner,
    });
  } catch (error) {
    console.error('Error fetching owner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch owner',
    });
  }
});

// Get owner by villa ID
router.get('/villa/:villaId', authenticate, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;

    const owner = await prisma.owner.findUnique({
      where: { villaId },
      include: {
        villa: true,
      },
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found for this villa',
      });
    }

    res.json({
      success: true,
      data: owner,
    });
  } catch (error) {
    console.error('Error fetching owner by villa:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch owner',
    });
  }
});

// Create new owner
router.post('/', authenticate, validateRequest(createOwnerSchema), async (req: Request, res: Response) => {
  try {
    const ownerData = req.body;

    // Check if villa exists
    const villa = await prisma.villa.findUnique({
      where: { id: ownerData.villaId },
    });

    if (!villa) {
      return res.status(404).json({
        success: false,
        message: 'Villa not found',
      });
    }

    // Check if owner already exists for this villa
    const existingOwner = await prisma.owner.findUnique({
      where: { villaId: ownerData.villaId },
    });

    if (existingOwner) {
      return res.status(409).json({
        success: false,
        message: 'Owner already exists for this villa',
      });
    }

    const owner = await prisma.owner.create({
      data: ownerData,
      include: {
        villa: true,
      },
    });

    res.status(201).json({
      success: true,
      data: owner,
      message: 'Owner created successfully',
    });
  } catch (error) {
    console.error('Error creating owner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create owner',
    });
  }
});

// Update owner
router.put('/:ownerId', authenticate, validateRequest(updateOwnerSchema), async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;
    const updateData = req.body;

    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found',
      });
    }

    const updatedOwner = await prisma.owner.update({
      where: { id: ownerId },
      data: updateData,
      include: {
        villa: true,
      },
    });

    res.json({
      success: true,
      data: updatedOwner,
      message: 'Owner updated successfully',
    });
  } catch (error) {
    console.error('Error updating owner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update owner',
    });
  }
});

// Delete owner
router.delete('/:ownerId', authenticate, async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;

    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found',
      });
    }

    await prisma.owner.delete({
      where: { id: ownerId },
    });

    res.json({
      success: true,
      message: 'Owner deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting owner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete owner',
    });
  }
});

export default router;
