import { rateLimit } from 'express-rate-limit';
import { Request, Response } from 'express';

// Extend Request interface to include rate limit properties
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number;
        remaining: number;
        resetTime: number;
      };
    }
  }
}

// Custom key generator that considers user ID if available
const generateKey = (req: Request): string => {
  // Try to get user ID from auth middleware
  const userId = (req as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fallback to IP address
  return `ip:${req.ip}`;
};

// Enhanced error response
const onLimitReached = (req: Request, res: Response) => {
  const retryAfter = Math.round(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 60);
  
  res.status(429).json({
    success: false,
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please try again later.',
    retryAfter: retryAfter,
    limit: req.rateLimit?.limit,
    remaining: req.rateLimit?.remaining,
    resetTime: req.rateLimit?.resetTime,
  });
};

// Very relaxed rate limiting for onboarding operations (allows for initialization burst + auto-save)
export const onboardingRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 150, // Significantly increased to 150 requests per minute to handle initialization + auto-save
  keyGenerator: generateKey,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many onboarding requests from this user/IP, please try again after a minute.',
  handler: onLimitReached,
  skip: (req) => {
    // Skip rate limiting in non-production to prevent dev UX issues
    return process.env.NODE_ENV !== 'production' || process.env.SKIP_RATE_LIMIT === 'true';
  },
});

// Very lenient rate limiting for data fetching operations (handles initialization burst)
export const onboardingReadRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Very high limit for read operations to handle initialization
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many read requests from this user/IP, please try again after a minute.',
  handler: onLimitReached,
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' || process.env.SKIP_RATE_LIMIT === 'true';
  },
});

// Very strict rate limiting for completion operations
export const onboardingCompleteRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Only 5 completion attempts per 5 minutes
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many completion attempts. Please wait 5 minutes before trying again.',
  handler: onLimitReached,
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' || process.env.SKIP_RATE_LIMIT === 'true';
  },
});

// Moderate rate limiting for backup operations
export const backupRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Allow more frequent backups for auto-save
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many backup requests from this user/IP.',
  handler: onLimitReached,
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' || process.env.SKIP_RATE_LIMIT === 'true';
  },
});

// Extremely lenient rate limiting specifically for auto-save operations
export const autoSaveRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // Allow very frequent auto-save requests (5 per second on average)
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Auto-save rate limit exceeded. Please wait a moment.',
  handler: onLimitReached,
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' || process.env.SKIP_RATE_LIMIT === 'true';
  },
});

// Progressive rate limiting - increases limits for authenticated users
export const createProgressiveRateLimit = (baseLimit: number, multiplier: number = 1.5) => {
  return rateLimit({
    windowMs: 1 * 60 * 1000,
    max: (req: Request) => {
      const isAuthenticated = !!(req as any).user?.id;
      return isAuthenticated ? Math.floor(baseLimit * multiplier) : baseLimit;
    },
    keyGenerator: generateKey,
    standardHeaders: true,
    legacyHeaders: false,
    handler: onLimitReached,
    skip: (req) => {
      return process.env.NODE_ENV !== 'production' || process.env.SKIP_RATE_LIMIT === 'true';
    },
  });
};

// File upload rate limiting (more restrictive)
export const fileUploadRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 file uploads per 5 minutes
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many file upload requests. Please wait before uploading more files.',
  handler: onLimitReached,
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' || process.env.SKIP_RATE_LIMIT === 'true';
  },
});

export default {
  onboardingRateLimit,
  onboardingReadRateLimit,
  onboardingCompleteRateLimit,
  backupRateLimit,
  autoSaveRateLimit,
  createProgressiveRateLimit,
  fileUploadRateLimit,
};