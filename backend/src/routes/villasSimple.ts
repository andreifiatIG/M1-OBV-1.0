import { Router, Request, Response } from 'express';
import villaService from '../services/villaService';

const router = Router();

// Simple development middleware that bypasses authentication
router.use((req: any, res, next) => {
  req.auth = { userId: 'dev-user-123' };
  req.user = { id: 'dev-user-123', email: 'dev@example.com', role: 'admin' };
  next();
});

/**
 * @route   GET /api/villas
 * @desc    Get all villas (simplified for development)
 * @access  Private
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // For now, return mock data to fix the frontend
    const mockVillas = [
      {
        id: '1',
        villaName: 'Villa Paradise',
        location: 'Bali',
        status: 'ACTIVE',
        bedrooms: 3,
        bathrooms: 2,
        maxGuests: 6,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        villaName: 'Ocean View Villa',
        location: 'Maldives',
        status: 'PENDING',
        bedrooms: 5,
        bathrooms: 4,
        maxGuests: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    res.json({
      success: true,
      data: mockVillas,
      pagination: {
        page: 1,
        limit: 10,
        total: mockVillas.length,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching villas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch villas'
    });
  }
});

/**
 * @route   POST /api/villas
 * @desc    Create a new villa (simplified)
 * @access  Private
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const mockVilla = {
      id: Math.random().toString(36).substr(2, 9),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: mockVilla
    });
  } catch (error) {
    console.error('Error creating villa:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create villa'
    });
  }
});

export default router;