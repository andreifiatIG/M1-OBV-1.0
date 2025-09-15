import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createFacilitySchema = z.object({
  villaId: z.string().uuid(),
  category: z.enum([
    // New frontend-matching categories
    'property_layout_spaces', 'occupancy_sleeping', 'bathrooms', 'kitchen_dining',
    'service_staff', 'living_spaces', 'outdoor_facilities', 'home_office',
    'entertainment_gaming', 'technology', 'wellness_spa', 'accessibility',
    'safety_security', 'child_friendly',
    // Legacy categories for backward compatibility
    'KITCHEN_EQUIPMENT', 'BATHROOM_AMENITIES', 'BEDROOM_AMENITIES', 'LIVING_ROOM',
    'OUTDOOR_FACILITIES', 'POOL_AREA', 'ENTERTAINMENT', 'SAFETY_SECURITY',
    'UTILITIES', 'ACCESSIBILITY', 'BUSINESS_FACILITIES', 'CHILDREN_FACILITIES',
    'PET_FACILITIES', 'OTHER'
  ]),
  subcategory: z.string().min(1),
  itemName: z.string().min(1),
  isAvailable: z.boolean().default(false),
  quantity: z.number().int().positive().optional(),
  condition: z.string().optional(),
  notes: z.string().optional(),
});

const updateFacilitySchema = createFacilitySchema.partial();

const bulkUpdateSchema = z.object({
  villaId: z.string().uuid(),
  facilities: z.array(z.object({
    category: z.string(),
    subcategory: z.string(),
    itemName: z.string(),
    isAvailable: z.boolean(),
    quantity: z.number().optional(),
    condition: z.string().optional(),
    notes: z.string().optional(),
  })),
});

// GET /api/facilities - Get all facilities with pagination and filtering
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const villaId = req.query.villaId as string;
    const category = req.query.category as string;
    const isAvailable = req.query.isAvailable === 'true' ? true : req.query.isAvailable === 'false' ? false : undefined;
    const search = req.query.search as string;
    
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (villaId) where.villaId = villaId;
    if (category) where.category = category;
    if (isAvailable !== undefined) where.isAvailable = isAvailable;
    
    if (search) {
      where.OR = [
        { itemName: { contains: search, mode: 'insensitive' } },
        { subcategory: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [facilities, total] = await Promise.all([
      prisma.facilityChecklist.findMany({
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
        orderBy: [
          { category: 'asc' },
          { subcategory: 'asc' },
          { itemName: 'asc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.facilityChecklist.count({ where }),
    ]);

    res.json({
      facilities,
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
    logger.error('Error fetching facilities:', error);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
});

// GET /api/facilities/:id - Get facility by ID
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const facility = await prisma.facilityChecklist.findUnique({
      where: { id },
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

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    res.json(facility);
  } catch (error) {
    logger.error('Error fetching facility:', error);
    res.status(500).json({ error: 'Failed to fetch facility' });
  }
});

// GET /api/facilities/villa/:villaId - Get facilities by villa ID
router.get('/villa/:villaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const category = req.query.category as string;
    const groupBy = req.query.groupBy as string;

    const where: any = { villaId };
    if (category) where.category = category;

    const facilities = await prisma.facilityChecklist.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { subcategory: 'asc' },
        { itemName: 'asc' },
      ],
    });

    if (groupBy === 'category') {
      const grouped = facilities.reduce((acc, facility) => {
        if (!acc[facility.category]) {
          acc[facility.category] = [];
        }
        acc[facility.category].push(facility);
        return acc;
      }, {} as Record<string, any[]>);
      
      res.json(grouped);
    } else {
      res.json(facilities);
    }
  } catch (error) {
    logger.error('Error fetching villa facilities:', error);
    res.status(500).json({ error: 'Failed to fetch villa facilities' });
  }
});

// POST /api/facilities - Create new facility
router.post(
  '/',
  authMiddleware,
  validateRequest(createFacilitySchema),
  async (req: Request, res: Response) => {
    try {
      const facilityData = req.body;

      // Check if villa exists
      const villa = await prisma.villa.findUnique({
        where: { id: facilityData.villaId },
      });

      if (!villa) {
        return res.status(400).json({ error: 'Villa not found' });
      }

      // Check for duplicate facility
      const existingFacility = await prisma.facilityChecklist.findFirst({
        where: {
          villaId: facilityData.villaId,
          category: facilityData.category,
          subcategory: facilityData.subcategory,
          itemName: facilityData.itemName,
        },
      });

      if (existingFacility) {
        return res.status(400).json({ 
          error: 'Facility already exists for this villa',
          existingId: existingFacility.id 
        });
      }

      const facility = await prisma.facilityChecklist.create({
        data: {
          ...facilityData,
          lastCheckedAt: facilityData.isAvailable ? new Date() : null,
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

      logger.info(`Facility created: ${facility.itemName} for villa ${villa.villaName}`);
      res.status(201).json(facility);
    } catch (error) {
      logger.error('Error creating facility:', error);
      res.status(500).json({ error: 'Failed to create facility' });
    }
  }
);

// POST /api/facilities/bulk - Bulk create/update facilities
router.post(
  '/bulk',
  authMiddleware,
  validateRequest(bulkUpdateSchema),
  async (req: Request, res: Response) => {
    try {
      const { villaId, facilities } = req.body;

      // Check if villa exists
      const villa = await prisma.villa.findUnique({
        where: { id: villaId },
      });

      if (!villa) {
        return res.status(400).json({ error: 'Villa not found' });
      }

      const results = {
        created: 0,
        updated: 0,
        errors: [] as string[],
      };

      for (const facilityData of facilities) {
        try {
          await prisma.facilityChecklist.upsert({
            where: {
              villaId_category_subcategory_itemName: {
                villaId,
                category: facilityData.category as any,
                subcategory: facilityData.subcategory,
                itemName: facilityData.itemName,
              },
            },
            update: {
              isAvailable: facilityData.isAvailable,
              quantity: facilityData.quantity,
              condition: facilityData.condition,
              notes: facilityData.notes,
              lastCheckedAt: facilityData.isAvailable ? new Date() : undefined,
            },
            create: {
              villaId,
              category: facilityData.category as any,
              subcategory: facilityData.subcategory,
              itemName: facilityData.itemName,
              isAvailable: facilityData.isAvailable,
              quantity: facilityData.quantity,
              condition: facilityData.condition,
              notes: facilityData.notes,
              lastCheckedAt: facilityData.isAvailable ? new Date() : null,
            },
          });

          // Check if this was a create or update operation
          const existing = await prisma.facilityChecklist.findFirst({
            where: {
              villaId,
              category: facilityData.category as any,
              subcategory: facilityData.subcategory,
              itemName: facilityData.itemName,
            },
          });

          if (existing) {
            results.updated++;
          } else {
            results.created++;
          }
        } catch (error) {
          results.errors.push(`${facilityData.itemName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      logger.info(`Bulk facility update for villa ${villa.villaName}: ${results.created} created, ${results.updated} updated`);
      res.json({
        message: 'Bulk facility update completed',
        results,
      });
    } catch (error) {
      logger.error('Error bulk updating facilities:', error);
      res.status(500).json({ error: 'Failed to bulk update facilities' });
    }
  }
);

// PUT /api/facilities/:id - Update facility
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateFacilitySchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if facility exists
      const existingFacility = await prisma.facilityChecklist.findUnique({
        where: { id },
      });

      if (!existingFacility) {
        return res.status(404).json({ error: 'Facility not found' });
      }

      // If villaId is being updated, check if new villa exists
      if (updateData.villaId && updateData.villaId !== existingFacility.villaId) {
        const villa = await prisma.villa.findUnique({
          where: { id: updateData.villaId },
        });

        if (!villa) {
          return res.status(400).json({ error: 'Villa not found' });
        }
      }

      const facility = await prisma.facilityChecklist.update({
        where: { id },
        data: {
          ...updateData,
          lastCheckedAt: updateData.isAvailable !== undefined ? new Date() : undefined,
          checkedBy: updateData.isAvailable !== undefined ? 'system' : undefined,
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

      logger.info(`Facility updated: ${facility.id}`);
      res.json(facility);
    } catch (error) {
      logger.error('Error updating facility:', error);
      res.status(500).json({ error: 'Failed to update facility' });
    }
  }
);

// DELETE /api/facilities/:id - Delete facility
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingFacility = await prisma.facilityChecklist.findUnique({
      where: { id },
    });

    if (!existingFacility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    await prisma.facilityChecklist.delete({
      where: { id },
    });

    logger.info(`Facility deleted: ${id}`);
    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    logger.error('Error deleting facility:', error);
    res.status(500).json({ error: 'Failed to delete facility' });
  }
});

// GET /api/facilities/stats - Get facility statistics
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const villaId = req.query.villaId as string;
    const where = villaId ? { villaId } : {};

    const [total, available, unavailable, byCategory] = await Promise.all([
      prisma.facilityChecklist.count({ where }),
      prisma.facilityChecklist.count({ where: { ...where, isAvailable: true } }),
      prisma.facilityChecklist.count({ where: { ...where, isAvailable: false } }),
      prisma.facilityChecklist.groupBy({
        by: ['category'],
        where,
        _count: { category: true },
        _sum: { quantity: true },
      }),
    ]);

    const stats = {
      total,
      available,
      unavailable,
      availabilityRate: total > 0 ? (available / total * 100).toFixed(1) : '0.0',
      byCategory: byCategory.reduce((acc, item) => {
        acc[item.category] = {
          count: item._count.category,
          totalQuantity: item._sum.quantity || 0,
        };
        return acc;
      }, {} as Record<string, { count: number; totalQuantity: number }>),
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching facility statistics:', error);
    res.status(500).json({ error: 'Failed to fetch facility statistics' });
  }
});

// GET /api/facilities/template - Get facility template for a new villa
router.get('/template', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Define standard facility templates by category
    const facilityTemplate = {
      KITCHEN_EQUIPMENT: [
        { subcategory: 'Appliances', itemName: 'Refrigerator' },
        { subcategory: 'Appliances', itemName: 'Microwave' },
        { subcategory: 'Appliances', itemName: 'Dishwasher' },
        { subcategory: 'Appliances', itemName: 'Oven' },
        { subcategory: 'Appliances', itemName: 'Stovetop' },
        { subcategory: 'Appliances', itemName: 'Coffee Machine' },
        { subcategory: 'Utensils', itemName: 'Cooking Pots' },
        { subcategory: 'Utensils', itemName: 'Plates & Cutlery' },
      ],
      BATHROOM_AMENITIES: [
        { subcategory: 'Towels', itemName: 'Bath Towels' },
        { subcategory: 'Towels', itemName: 'Hand Towels' },
        { subcategory: 'Toiletries', itemName: 'Shampoo & Conditioner' },
        { subcategory: 'Toiletries', itemName: 'Body Wash' },
        { subcategory: 'Equipment', itemName: 'Hair Dryer' },
      ],
      BEDROOM_AMENITIES: [
        { subcategory: 'Bedding', itemName: 'Bed Sheets' },
        { subcategory: 'Bedding', itemName: 'Pillows' },
        { subcategory: 'Bedding', itemName: 'Blankets' },
        { subcategory: 'Furniture', itemName: 'Wardrobe' },
        { subcategory: 'Furniture', itemName: 'Bedside Tables' },
      ],
      LIVING_ROOM: [
        { subcategory: 'Furniture', itemName: 'Sofa' },
        { subcategory: 'Furniture', itemName: 'Coffee Table' },
        { subcategory: 'Electronics', itemName: 'Television' },
        { subcategory: 'Electronics', itemName: 'Air Conditioning' },
      ],
      POOL_AREA: [
        { subcategory: 'Furniture', itemName: 'Pool Chairs' },
        { subcategory: 'Furniture', itemName: 'Pool Umbrellas' },
        { subcategory: 'Equipment', itemName: 'Pool Cleaning Equipment' },
        { subcategory: 'Safety', itemName: 'Pool Fence' },
      ],
      SAFETY_SECURITY: [
        { subcategory: 'Fire Safety', itemName: 'Smoke Detectors' },
        { subcategory: 'Fire Safety', itemName: 'Fire Extinguisher' },
        { subcategory: 'Security', itemName: 'Security System' },
        { subcategory: 'Safety', itemName: 'First Aid Kit' },
      ],
    };

    res.json({
      template: facilityTemplate,
      categories: Object.keys(facilityTemplate),
    });
  } catch (error) {
    logger.error('Error fetching facility template:', error);
    res.status(500).json({ error: 'Failed to fetch facility template' });
  }
});

export default router;
