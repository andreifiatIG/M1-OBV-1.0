import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import villaService from '../services/villaService';
import { simpleClerkAuth } from '../middleware/simpleClerkAuth';
import { validateRequest } from '../middleware/validation';
import { VillaStatus } from '@prisma/client';

const router = Router();

// Apply simple auth middleware to all routes for development
const authenticate = simpleClerkAuth;

// Simple authorization middleware
const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
};

// Validation schemas
const createVillaSchema = z.object({
  body: z.object({
    villaName: z.string().min(1).max(100),
    location: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
    zipCode: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    bedrooms: z.number().int().positive(),
    bathrooms: z.number().int().positive(),
    maxGuests: z.number().int().positive(),
    propertySize: z.number().positive().optional(),
    plotSize: z.number().positive().optional(),
    yearBuilt: z.number().int().optional(),
    renovationYear: z.number().int().optional(),
    propertyType: z.enum(['VILLA', 'APARTMENT', 'PENTHOUSE', 'TOWNHOUSE', 'CHALET', 'BUNGALOW', 'ESTATE']),
    villaStyle: z.enum(['MODERN', 'TRADITIONAL', 'MEDITERRANEAN', 'CONTEMPORARY', 'BALINESE', 'MINIMALIST', 'LUXURY', 'RUSTIC']).optional(),
    description: z.string().optional(),
    shortDescription: z.string().max(500).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const updateVillaSchema = z.object({
  body: z.object({
    villaName: z.string().min(1).max(100).optional(),
    location: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    zipCode: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    bedrooms: z.number().int().positive().optional(),
    bathrooms: z.number().int().positive().optional(),
    maxGuests: z.number().int().positive().optional(),
    propertySize: z.number().positive().optional(),
    plotSize: z.number().positive().optional(),
    yearBuilt: z.number().int().optional(),
    renovationYear: z.number().int().optional(),
    propertyType: z.enum(['VILLA', 'APARTMENT', 'PENTHOUSE', 'TOWNHOUSE', 'CHALET', 'BUNGALOW', 'ESTATE']).optional(),
    villaStyle: z.enum(['MODERN', 'TRADITIONAL', 'MEDITERRANEAN', 'CONTEMPORARY', 'BALINESE', 'MINIMALIST', 'LUXURY', 'RUSTIC']).optional(),
    description: z.string().optional(),
    shortDescription: z.string().max(500).optional(),
    tags: z.array(z.string()).optional(),
    status: z.nativeEnum(VillaStatus).optional(),
    isActive: z.boolean().optional(),
  }),
});

const listVillasSchema = z.object({
  query: z.object({
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    status: z.nativeEnum(VillaStatus).optional(),
    isActive: z.string().transform(val => val === 'true').optional(),
    location: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    minBedrooms: z.string().transform(Number).optional(),
    maxBedrooms: z.string().transform(Number).optional(),
    minGuests: z.string().transform(Number).optional(),
    maxGuests: z.string().transform(Number).optional(),
    propertyType: z.string().optional(),
    search: z.string().optional(),
  }),
});

// Routes

/**
 * @route   POST /api/villas
 * @desc    Create a new villa
 * @access  Private (Admin, Manager)
 */
router.post(
  '/',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(createVillaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const villa = await villaService.createVilla(req.body);
      res.status(201).json({
        success: true,
        data: villa,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/villas/onboarding
 * @desc    Create a new villa for onboarding (owner access)
 * @access  Private (Owner)
 */
router.post(
  '/onboarding',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Allow owners to create villas for their own onboarding
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Create villa for onboarding with minimal data
      const villaData = {
        name: req.body.name || 'New Villa',
        owner_id: userId
      };

      const villa = await villaService.createVillaForOnboarding(villaData);
      res.status(201).json({
        success: true,
        data: villa,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/villas
 * @desc    List all villas with filters
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  validateRequest(listVillasSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 20, ...filters } = req.query;
      const result = await villaService.listVillas(
        filters as any,
        Number(page),
        Number(limit)
      );
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/villas/search
 * @desc    Search villas for autocomplete
 * @access  Private
 */
router.get(
  '/search',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, limit = 10 } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
      }
      
      const villas = await villaService.searchVillas(q, Number(limit));
      res.json({
        success: true,
        data: villas,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/villas/:id
 * @desc    Get villa by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const villa = await villaService.getVillaById(req.params.id);
      res.json({
        success: true,
        data: villa,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/villas/:id/profile
 * @desc    Get comprehensive villa profile with all related data
 * @access  Private
 */
router.get(
  '/:id/profile',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const villaProfile = await villaService.getVillaProfile(req.params.id);
      
      res.json({
        success: true,
        data: villaProfile,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/villas/code/:villaCode
 * @desc    Get villa by code
 * @access  Private
 */
router.get(
  '/code/:villaCode',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const villa = await villaService.getVillaByCode(req.params.villaCode);
      res.json({
        success: true,
        data: villa,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/villas/:id
 * @desc    Update villa
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(updateVillaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const villa = await villaService.updateVilla(req.params.id, req.body);
      res.json({
        success: true,
        data: villa,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/villas/:id
 * @desc    Delete/Archive villa
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const villaId = req.params.id;
      
      // For now, allow any authenticated user to delete DRAFT villas (simplify permissions)
      // TODO: Implement proper role-based access control later
      const deletedVilla = await villaService.deleteVilla(villaId);
      
      res.json({
        success: true,
        data: deletedVilla,
        message: 'Villa deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/villas/:id/stats
 * @desc    Get villa statistics
 * @access  Private
 */
router.get(
  '/:id/stats',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await villaService.getVillaStats(req.params.id);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/villas/bulk/status
 * @desc    Bulk update villa status
 * @access  Private (Admin, Manager)
 */
router.post(
  '/bulk/status',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { villaIds, status } = req.body;
      
      if (!Array.isArray(villaIds) || villaIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Villa IDs array is required',
        });
      }
      
      if (!Object.values(VillaStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
        });
      }
      
      const result = await villaService.bulkUpdateStatus(villaIds, status);
      res.json({
        success: true,
        data: result,
        message: `${result.count} villas updated successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Villa-specific nested resource endpoints

/**
 * @route   PUT /api/villas/:id/bank-details
 * @desc    Update villa bank details
 * @access  Private
 */
router.put(
  '/:id/bank-details',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Delegate to bank service
      const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4001'}/api/bank/villa/${req.params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify(req.body)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      res.json({
        success: true,
        data: data.data,
        message: 'Bank details updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/villas/:id/contractual-details
 * @desc    Update villa contractual details
 * @access  Private
 */
router.put(
  '/:id/contractual-details',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Update villa with contractual details
      const contractualData = {
        contractType: req.body.contractType,
        commissionRate: req.body.commissionRate,
        managementFee: req.body.managementFee,
        paymentSchedule: req.body.paymentSchedule,
        cancellationPolicy: req.body.cancellationPolicy,
        ...req.body
      };
      
      const villa = await villaService.updateVilla(req.params.id, contractualData);
      
      res.json({
        success: true,
        data: villa,
        message: 'Contractual details updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/villas/:id/documents
 * @desc    Upload villa document
 * @access  Private
 */
router.post(
  '/:id/documents',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Delegate to documents service
      const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4001'}/api/documents`, {
        method: 'POST',
        headers: {
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify({
          ...req.body,
          villaId: req.params.id
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      res.status(201).json({
        success: true,
        data: data.data,
        message: 'Document uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/villas/:id/documents/:documentId
 * @desc    Delete villa document
 * @access  Private
 */
router.delete(
  '/:id/documents/:documentId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Delegate to documents service
      const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4001'}/api/documents/${req.params.documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/villas/:id/facilities
 * @desc    Update villa facilities
 * @access  Private
 */
router.put(
  '/:id/facilities',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Delegate to facilities service
      const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4001'}/api/facilities/villa/${req.params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify(req.body)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      res.json({
        success: true,
        data: data.data,
        message: 'Facilities updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/villas/:id/ota-credentials
 * @desc    Update villa OTA credentials
 * @access  Private
 */
router.put(
  '/:id/ota-credentials',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Delegate to OTA service
      const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4001'}/api/ota`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify({
          ...req.body,
          villaId: req.params.id
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      res.json({
        success: true,
        data: data.data,
        message: 'OTA credentials updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/villas/:id/owner-details
 * @desc    Update villa owner details
 * @access  Private
 */
router.put(
  '/:id/owner-details',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get villa to find owner
      const villa = await villaService.getVillaById(req.params.id);
      const ownerId = (villa as any).ownerId;
      
      if (!ownerId) {
        return res.status(400).json({
          success: false,
          error: 'Villa has no associated owner'
        });
      }
      
      // Delegate to owners service
      const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4001'}/api/owners/${ownerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify(req.body)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      res.json({
        success: true,
        data: data.data,
        message: 'Owner details updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/villas/:id/photos
 * @desc    Upload villa photo
 * @access  Private
 */
router.post(
  '/:id/photos',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Delegate to photos service
      const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4001'}/api/photos`, {
        method: 'POST',
        headers: {
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify({
          ...req.body,
          villaId: req.params.id
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      res.status(201).json({
        success: true,
        data: data.data,
        message: 'Photo uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/villas/:id/photos/:photoId
 * @desc    Delete villa photo
 * @access  Private
 */
router.delete(
  '/:id/photos/:photoId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Delegate to photos service
      const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4001'}/api/photos/${req.params.photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      res.json({
        success: true,
        message: 'Photo deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/villas/:id/submit-for-review
 * @desc    Submit villa for review
 * @access  Private
 */
router.post(
  '/:id/submit-for-review',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Update villa status to PENDING_REVIEW
      const villa = await villaService.updateVilla(req.params.id, {
        status: VillaStatus.PENDING_REVIEW
      });
      
      res.json({
        success: true,
        data: villa,
        message: 'Villa submitted for review successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/villas/:id/staff
 * @desc    Add staff member to villa
 * @access  Private
 */
router.post(
  '/:id/staff',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Delegate to staff service
      const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4001'}/api/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify({
          ...req.body,
          villaId: req.params.id
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      res.status(201).json({
        success: true,
        data: data.data,
        message: 'Staff member added successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/villas/:id/staff/:staffId
 * @desc    Remove staff member from villa
 * @access  Private
 */
router.delete(
  '/:id/staff/:staffId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Delegate to staff service
      const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:4001'}/api/staff/${req.params.staffId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      res.json({
        success: true,
        message: 'Staff member removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;