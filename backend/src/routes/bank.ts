import { Router, Request, Response } from 'express';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { BankDetailsService } from '../services/bankDetailsService';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();
const bankDetailsService = new BankDetailsService();

// Validation schemas
const createBankDetailsSchema = z.object({
  villaId: z.string().uuid(),
  accountHolderName: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  iban: z.string().optional(),
  swiftCode: z.string().optional(),
  branchCode: z.string().optional(),
  currency: z.string().default('USD'),
  bankAddress: z.string().optional(),
  bankCountry: z.string().optional(),
});

const updateBankDetailsSchema = createBankDetailsSchema.partial().omit({ villaId: true });

// GET /api/bank/:id - Get bank details by ID (full access)
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const masked = req.query.masked === 'true';

    let bankDetails;
    if (masked) {
      bankDetails = await bankDetailsService.getMaskedBankDetails(id);
    } else {
      bankDetails = await bankDetailsService.getBankDetailsById(id);
    }

    if (!bankDetails) {
      return res.status(404).json({ error: 'Bank details not found' });
    }

    res.json(bankDetails);
  } catch (error) {
    logger.error('Error fetching bank details:', error);
    res.status(500).json({ error: 'Failed to fetch bank details' });
  }
});

// GET /api/bank/villa/:villaId - Get bank details by villa ID
router.get('/villa/:villaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { villaId } = req.params;
    const masked = req.query.masked === 'true';

    let bankDetails;
    if (masked) {
      const fullDetails = await bankDetailsService.getBankDetailsByVillaId(villaId);
      if (fullDetails) {
        bankDetails = await bankDetailsService.getMaskedBankDetails(fullDetails.id);
      }
    } else {
      bankDetails = await bankDetailsService.getBankDetailsByVillaId(villaId);
    }

    if (!bankDetails) {
      return res.status(404).json({ error: 'Bank details not found for this villa' });
    }

    res.json(bankDetails);
  } catch (error) {
    logger.error('Error fetching bank details for villa:', error);
    res.status(500).json({ error: 'Failed to fetch bank details' });
  }
});

// POST /api/bank - Create bank details
router.post(
  '/',
  authMiddleware,
  validateRequest(createBankDetailsSchema),
  async (req: Request, res: Response) => {
    try {
      const bankDetailsData = req.body;

      // Check if villa already has bank details
      const existingBankDetails = await bankDetailsService.getBankDetailsByVillaId(
        bankDetailsData.villaId
      );

      if (existingBankDetails) {
        return res.status(400).json({ 
          error: 'Bank details already exist for this villa',
          existingId: existingBankDetails.id 
        });
      }

      const bankDetails = await bankDetailsService.createBankDetails(bankDetailsData);

      logger.info(`Bank details created for villa ${bankDetails.villa?.villaName}`);
      res.status(201).json(bankDetails);
    } catch (error) {
      logger.error('Error creating bank details:', error);
      res.status(500).json({ error: 'Failed to create bank details' });
    }
  }
);

// PUT /api/bank/:id - Update bank details
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateBankDetailsSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if bank details exist
      const existingBankDetails = await bankDetailsService.getBankDetailsById(id);
      if (!existingBankDetails) {
        return res.status(404).json({ error: 'Bank details not found' });
      }

      const bankDetails = await bankDetailsService.updateBankDetails(id, updateData);

      logger.info(`Bank details updated: ${id}`);
      res.json(bankDetails);
    } catch (error) {
      logger.error('Error updating bank details:', error);
      res.status(500).json({ error: 'Failed to update bank details' });
    }
  }
);

// POST /api/bank/:id/verify - Verify bank details
router.post('/:id/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if bank details exist
    const existingBankDetails = await bankDetailsService.getBankDetailsById(id);
    if (!existingBankDetails) {
      return res.status(404).json({ error: 'Bank details not found' });
    }

    const bankDetails = await bankDetailsService.verifyBankDetails(id);

    logger.info(`Bank details verified: ${id} for villa ${bankDetails.villa?.villaName}`);
    res.json(bankDetails);
  } catch (error) {
    logger.error('Error verifying bank details:', error);
    res.status(500).json({ error: 'Failed to verify bank details' });
  }
});

// DELETE /api/bank/:id - Delete bank details
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if bank details exist
    const existingBankDetails = await bankDetailsService.getBankDetailsById(id);
    if (!existingBankDetails) {
      return res.status(404).json({ error: 'Bank details not found' });
    }

    await bankDetailsService.deleteBankDetails(id);

    logger.info(`Bank details deleted: ${id}`);
    res.json({ message: 'Bank details deleted successfully' });
  } catch (error) {
    logger.error('Error deleting bank details:', error);
    res.status(500).json({ error: 'Failed to delete bank details' });
  }
});

// POST /api/bank/validate - Validate bank account information
router.post('/validate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { accountNumber, iban, swiftCode, bankCountry } = req.body;

    // Basic validation logic (in production, you'd integrate with bank validation services)
    const validation = {
      accountNumber: {
        valid: accountNumber && accountNumber.length >= 8 && accountNumber.length <= 20,
        message: 'Account number must be between 8 and 20 characters',
      },
      iban: {
        valid: !iban || (iban.length >= 15 && iban.length <= 34),
        message: 'IBAN must be between 15 and 34 characters if provided',
      },
      swiftCode: {
        valid: !swiftCode || (swiftCode.length === 8 || swiftCode.length === 11),
        message: 'SWIFT code must be either 8 or 11 characters if provided',
      },
    };

    const isValid = Object.values(validation).every(v => v.valid);

    res.json({
      valid: isValid,
      validation,
      bankCountry,
    });
  } catch (error) {
    logger.error('Error validating bank details:', error);
    res.status(500).json({ error: 'Failed to validate bank details' });
  }
});

// GET /api/bank/search/banks - Search banks by country (mock data for now)
router.get('/search/banks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { country, search } = req.query;

    // Mock bank data (in production, you'd integrate with a bank database API)
    const mockBanks = [
      { name: 'Chase Bank', country: 'US', swiftCode: 'CHASUS33' },
      { name: 'Bank of America', country: 'US', swiftCode: 'BOFAUS3N' },
      { name: 'Wells Fargo', country: 'US', swiftCode: 'WFBIUS6S' },
      { name: 'HSBC', country: 'GB', swiftCode: 'HBUKGB4B' },
      { name: 'Barclays', country: 'GB', swiftCode: 'BARCGB22' },
      { name: 'Deutsche Bank', country: 'DE', swiftCode: 'DEUTDEFF' },
      { name: 'Santander', country: 'ES', swiftCode: 'BSCHESMM' },
    ];

    let filteredBanks = mockBanks;

    if (country) {
      filteredBanks = filteredBanks.filter(bank => 
        bank.country.toLowerCase() === (country as string).toLowerCase()
      );
    }

    if (search) {
      filteredBanks = filteredBanks.filter(bank => 
        bank.name.toLowerCase().includes((search as string).toLowerCase())
      );
    }

    res.json({
      banks: filteredBanks.slice(0, 20), // Limit to 20 results
      total: filteredBanks.length,
    });
  } catch (error) {
    logger.error('Error searching banks:', error);
    res.status(500).json({ error: 'Failed to search banks' });
  }
});

export default router;