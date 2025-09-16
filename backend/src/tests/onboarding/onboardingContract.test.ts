import { describe, expect, it } from 'vitest';
import {
  canonicalizeStepData,
  safeValidateStepPayload,
  validateStepPayload,
  type StepDTOMap,
} from '../../shared/onboardingContract';

describe('onboardingContract', () => {
  describe('canonicalizeStepData', () => {
    it('maps known aliases to canonical Step 1 fields', () => {
      const raw = {
        villaAddress: '123 Palm Road',
        villaCity: 'Phuket',
        villaCountry: 'Thailand',
        villaPostalCode: '83150',
        landArea: '1000',
        villaArea: '650',
      };

      const canonical = canonicalizeStepData(1, raw);

      expect(canonical).toMatchObject({
        address: '123 Palm Road',
        city: 'Phuket',
        country: 'Thailand',
        zipCode: '83150',
        plotSize: '1000',
        propertySize: '650',
      });
    });

    it('falls back gracefully when input is nullish', () => {
      expect(canonicalizeStepData(2, null)).toEqual({});
      expect(canonicalizeStepData(3, undefined)).toEqual({});
    });
  });

  describe('validateStepPayload', () => {
    it('parses required Step 2 fields and rejects missing fields when completed', () => {
      const basePayload = {
        ownerType: 'individual',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+123456',
        address: '1 Villa Way',
        city: 'Bangkok',
        country: 'Thailand',
      } satisfies Partial<StepDTOMap[2]> as Record<string, unknown>;

      const parsed = validateStepPayload(2, basePayload, true);
      expect(parsed.firstName).toBe('John');
      expect(parsed.ownerType).toBe('INDIVIDUAL');

      // Drop a required field
      const missingCity = { ...basePayload };
      delete missingCity.city;

      const missingResult = safeValidateStepPayload(2, missingCity, true);
      expect(missingResult.success).toBe(false);
      if (!missingResult.success) {
        expect(missingResult.errors.join(' ')).toMatch(/city/i);
      }
    });

    it('accepts partial payloads when not completed', () => {
      const partial = { villaName: 'Villa Bay' };
      const parsed = validateStepPayload(1, partial, false);
      expect(parsed.villaName).toBe('Villa Bay');
      expect(parsed.city).toBeUndefined();
    });
  });

  describe('safeValidateStepPayload', () => {
    it('produces a successful result for valid data', () => {
      const result = safeValidateStepPayload(4, {
        accountHolderName: 'Jane Owner',
        bankName: 'Bank of Test',
        accountNumber: '123456789',
      }, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bankName).toBe('Bank of Test');
      }
    });

    it('returns errors without throwing for invalid data', () => {
      const result = safeValidateStepPayload(3, {
        commissionRate: -5,
      }, true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toEqual(expect.arrayContaining([
          expect.stringMatching(/contractstartdate/i),
        ]));
      }
    });
  });
});
