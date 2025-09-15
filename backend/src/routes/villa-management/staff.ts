import { Router, Request, Response } from 'express';
import { prisma } from '../../server';
import { validateRequest } from '../../middleware/validation';
import { authMiddleware } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { z } from 'zod';

const router = Router();

// Emergency contact schema for nested validation
const emergencyContactSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().min(1),
  country: z.string().min(1),
});

// Validation schemas
const createStaffSchema = z.object({
  villaId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(1),
  idNumber: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  nickname: z.string().optional(),
  maritalStatus: z.boolean().optional(),
  position: z.enum([
    'VILLA_MANAGER', 'HOUSEKEEPER', 'GARDENER', 'POOL_MAINTENANCE',
    'SECURITY', 'CHEF', 'DRIVER', 'CONCIERGE', 'MAINTENANCE', 'OTHER'
  ]),
  department: z.enum([
    'MANAGEMENT', 'HOUSEKEEPING', 'MAINTENANCE', 
    'SECURITY', 'HOSPITALITY', 'ADMINISTRATION'
  ]),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'SEASONAL', 'FREELANCE']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  salary: z.number().min(0),
  salaryFrequency: z.enum([
    'HOURLY', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ANNUALLY'
  ]).default('MONTHLY'),
  currency: z.string().default('USD'),
  numberOfDaySalary: z.number().int().min(0).optional(),
  otherDeductions: z.number().min(0).optional(),
  hasAccommodation: z.boolean().default(false),
  hasTransport: z.boolean().default(false),
  hasHealthInsurance: z.boolean().default(false),
  foodAllowance: z.boolean().default(false),
  emergencyContacts: z.array(emergencyContactSchema).optional(),
  // Legacy fields for backward compatibility
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  notes: z.string().optional(),
});

const updateStaffSchema = createStaffSchema.partial();

// GET /api/staff - Get all staff with pagination and filtering
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const villaId = req.query.villaId as string;
    const position = req.query.position as string;
    const department = req.query.department as string;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (villaId) where.villaId = villaId;
    if (position) where.position = position;
    if (department) where.department = department;
    if (isActive !== undefined) where.isActive = isActive;

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        include: {
          villa: {
            select: {
              id: true,
              villaName: true,
              villaCode: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.staff.count({ where }),
    ]);

    res.json({
      staff,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// GET /api/staff/stats - Get staff statistics
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const [total, active, inactive, byPosition, byDepartment] = await Promise.all([
      prisma.staff.count(),
      prisma.staff.count({ where: { isActive: true } }),
      prisma.staff.count({ where: { isActive: false } }),
      prisma.staff.groupBy({
        by: ['position'],
        _count: { position: true },
      }),
      prisma.staff.groupBy({
        by: ['department'],
        _count: { department: true },
      }),
    ]);

    const stats = {
      total,
      active,
      inactive,
      byPosition: byPosition.reduce((acc, item) => {
        acc[item.position] = item._count.position;
        return acc;
      }, {} as Record<string, number>),
      byDepartment: byDepartment.reduce((acc, item) => {
        acc[item.department] = item._count.department;
        return acc;
      }, {} as Record<string, number>),
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching staff statistics:', error);
    res.status(500).json({ error: 'Failed to fetch staff statistics' });
  }
});

// GET /api/staff/:id - Get staff by ID
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        villa: {
          select: {
            id: true,
            villaCode: true,
            villaName: true,
            city: true,
          },
        },
      },
    });

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json(staff);
  } catch (error) {
    logger.error('Error fetching staff member:', error);
    res.status(500).json({ error: 'Failed to fetch staff member' });
  }
});

// GET /api/staff/villa/:villaId - Get staff by villa ID
router.get('/villa/:villaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;

    const staff = await prisma.staff.findMany({
      where: { villaId },
      orderBy: [
        { position: 'asc' },
        { firstName: 'asc' },
      ],
    });

    res.json(staff);
  } catch (error) {
    logger.error('Error fetching villa staff:', error);
    res.status(500).json({ error: 'Failed to fetch villa staff' });
  }
});

// POST /api/staff - Create new staff member
router.post(
  '/',
  authMiddleware,
  validateRequest(createStaffSchema),
  async (req: Request, res: Response) => {
    try {
      const staffData = req.body;

      // Check if villa exists
      const villa = await prisma.villa.findUnique({
        where: { id: staffData.villaId },
      });

      if (!villa) {
        return res.status(400).json({ error: 'Villa not found' });
      }

      const staff = await prisma.staff.create({
        data: {
          ...staffData,
          startDate: new Date(staffData.startDate),
          endDate: staffData.endDate ? new Date(staffData.endDate) : null,
          dateOfBirth: staffData.dateOfBirth ? new Date(staffData.dateOfBirth) : null,
          emergencyContacts: staffData.emergencyContacts || null,
        },
        include: {
          villa: {
            select: {
              id: true,
              villaName: true,
              villaCode: true,
            },
          },
        },
      });

      logger.info(`Staff member created: ${staff.id} for villa ${villa.villaName}`);
      res.status(201).json(staff);
    } catch (error) {
      logger.error('Error creating staff member:', error);
      res.status(500).json({ error: 'Failed to create staff member' });
    }
  }
);

// PUT /api/staff/:id - Update staff member
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateStaffSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if staff member exists
      const existingStaff = await prisma.staff.findUnique({
        where: { id },
      });

      if (!existingStaff) {
        return res.status(404).json({ error: 'Staff member not found' });
      }

      // If villaId is being updated, check if new villa exists
      if (updateData.villaId && updateData.villaId !== existingStaff.villaId) {
        const villa = await prisma.villa.findUnique({
          where: { id: updateData.villaId },
        });

        if (!villa) {
          return res.status(400).json({ error: 'Villa not found' });
        }
      }

      const staff = await prisma.staff.update({
        where: { id },
        data: {
          ...updateData,
          startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
          endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
          dateOfBirth: updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : undefined,
          emergencyContacts: updateData.emergencyContacts !== undefined ? updateData.emergencyContacts : undefined,
        },
        include: {
          villa: {
            select: {
              id: true,
              villaName: true,
              villaCode: true,
            },
          },
        },
      });

      logger.info(`Staff member updated: ${staff.id}`);
      res.json(staff);
    } catch (error) {
      logger.error('Error updating staff member:', error);
      res.status(500).json({ error: 'Failed to update staff member' });
    }
  }
);

// DELETE /api/staff/:id - Delete staff member (soft delete)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingStaff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!existingStaff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Soft delete by setting isActive to false
    await prisma.staff.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`Staff member deactivated: ${id}`);
    res.json({ message: 'Staff member deactivated successfully' });
  } catch (error) {
    logger.error('Error deleting staff member:', error);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
});

// DELETE /api/staff/:id/permanent - Permanently delete staff member
router.delete('/:id/permanent', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingStaff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!existingStaff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    await prisma.staff.delete({
      where: { id },
    });

    logger.info(`Staff member permanently deleted: ${id}`);
    res.json({ message: 'Staff member permanently deleted' });
  } catch (error) {
    logger.error('Error permanently deleting staff member:', error);
    res.status(500).json({ error: 'Failed to permanently delete staff member' });
  }
});

// POST /api/staff/:id/activate - Activate staff member
router.post('/:id/activate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.update({
      where: { id },
      data: { isActive: true },
      include: {
        villa: {
          select: {
            id: true,
            villaName: true,
            villaCode: true,
          },
        },
      },
    });

    logger.info(`Staff member activated: ${id}`);
    res.json(staff);
  } catch (error) {
    logger.error('Error activating staff member:', error);
    res.status(500).json({ error: 'Failed to activate staff member' });
  }
});

export default router;
