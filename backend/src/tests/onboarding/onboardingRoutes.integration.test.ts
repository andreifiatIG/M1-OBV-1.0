import request from 'supertest';
import express from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1' };
    next();
  },
}));

vi.mock('../../middleware/rateLimiting', () => ({
  onboardingRateLimit: (_req: any, _res: any, next: any) => next(),
  onboardingReadRateLimit: (_req: any, _res: any, next: any) => next(),
  onboardingCompleteRateLimit: (_req: any, _res: any, next: any) => next(),
  autoSaveRateLimit: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../middleware/cache', () => ({
  cacheMiddleware: () => (_req: any, _res: any, next: any) => next(),
  invalidateCache: () => (_req: any, _res: any, next: any) => next(),
  CacheDuration: { SHORT: 0 },
}));

const updateStepMock = vi.fn();
const VersionConflictError = vi.hoisted(() => class VersionConflictError extends Error {});

vi.mock('../../services/core/onboardingService', () => ({
  __esModule: true,
  default: {
    updateStep: (...args: any[]) => updateStepMock(...args),
  },
  VersionConflictError,
}));

import onboardingRouter from '../../routes/onboarding/onboarding';

const app = express();
app.use(express.json());
app.use('/api/onboarding', onboardingRouter);

const VILLA_ID = '550e8400-e29b-41d4-a716-446655440000';

const validPayload = {
  step: 1,
  data: {
    villaName: 'Test Villa',
    address: '123 Road',
    city: 'Test City',
    country: 'Wonderland',
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    propertyType: 'VILLA',
  },
  completed: true,
};

describe('Onboarding router integration', () => {
  beforeEach(() => {
    updateStepMock.mockReset();
  });

  it('returns 200 and version when update succeeds', async () => {
    updateStepMock.mockResolvedValue({
      progress: { villaId: 'villa-1', currentStep: 2 },
      version: 2,
    });

    const res = await request(app)
      .put(`/api/onboarding/${VILLA_ID}/step`)
      .send(validPayload);

    if (res.status !== 200) {
      console.error('Response body:', res.body);
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.version).toBe(2);
    expect(updateStepMock).toHaveBeenCalledWith(VILLA_ID, expect.objectContaining({
      step: 1,
      completed: true,
      isAutoSave: expect.any(Boolean),
    }), 'user-1');
  });

  it('returns 422 when payload fails validation', async () => {
    const res = await request(app)
      .put(`/api/onboarding/${VILLA_ID}/step`)
      .send({
        step: 1,
        data: { villaName: '' },
        completed: true,
      });

    if (res.status !== 422) {
      console.error('Validation response body:', res.body);
    }

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(updateStepMock).not.toHaveBeenCalled();
  });

  it('returns 409 when version conflict occurs', async () => {
    updateStepMock.mockRejectedValueOnce(new VersionConflictError('Version mismatch'));

    const res = await request(app)
      .put(`/api/onboarding/${VILLA_ID}/step`)
      .send(validPayload);

    if (res.status !== 409) {
      console.error('Conflict response body:', res.body);
    }

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Version mismatch/);
  });
});
