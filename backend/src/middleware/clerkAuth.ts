import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Extend Express Request type for Clerk
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId?: string;
        claims?: any;
      };
      clerkUser?: {
        id: string;
        email?: string;
        role?: string;
        villaId?: string;
        partnerId?: string;
      };
    }
  }
}

interface ClerkJWTPayload {
  sub: string; // Clerk user ID
  email?: string;
  email_verified?: boolean;
  iss: string; // Clerk issuer
  aud?: string;
  exp: number;
  iat: number;
  sid?: string; // Session ID
  // Custom claims can be added here
  metadata?: {
    role?: string;
    villaId?: string;
    partnerId?: string;
  };
}

/**
 * Authenticate user using Clerk JWT token
 */
export const clerkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7);

    // For development, we'll decode without verification first
    // In production, you should verify using Clerk's JWKS
    let decoded: ClerkJWTPayload;
    
    try {
      // Decode without verification for development
      decoded = jwt.decode(token) as ClerkJWTPayload;
      
      if (!decoded) {
        throw new Error('Invalid token format');
      }

      // Verify issuer matches Clerk
      const expectedIssuer = process.env.CLERK_JWT_ISSUER || 'https://novel-cheetah-60.clerk.accounts.dev';
      if (decoded.iss !== expectedIssuer) {
        throw new Error(`Invalid issuer. Expected: ${expectedIssuer}, Got: ${decoded.iss}`);
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        throw new Error('Token expired');
      }

    } catch (verifyError) {
      logger.error('Token verification failed:', verifyError);
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    // Attach Clerk auth to request
    req.auth = {
      userId: decoded.sub,
      sessionId: decoded.sid,
      claims: decoded,
    };

    // For compatibility with existing code, also set user object
    req.user = {
      id: decoded.sub,
      email: decoded.email || '',
      role: decoded.metadata?.role || 'user',
      villaId: decoded.metadata?.villaId,
      partnerId: decoded.metadata?.partnerId,
    };

    logger.debug('User authenticated via Clerk:', {
      userId: decoded.sub,
      email: decoded.email,
      role: req.user?.role,
    });

    next();
  } catch (error) {
    logger.error('Clerk authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalClerkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without auth
    return next();
  }

  // Token provided, try to authenticate
  return clerkAuth(req, res, next);
};

/**
 * Authorize user based on roles (works with Clerk auth)
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No user context',
      });
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Require specific villa access
 */
export const requireVillaAccess = (villaIdParam: string = 'villaId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const requestedVillaId = req.params[villaIdParam];
    const userRole = req.user.role;
    const userVillaId = req.user.villaId;

    // Admins and managers can access any villa
    if (userRole === 'admin' || userRole === 'manager') {
      return next();
    }

    // Villa owners can only access their own villa
    if (userRole === 'owner' && userVillaId === requestedVillaId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Access denied to this villa',
    });
  };
};

/**
 * Development helper to simulate Clerk JWT for testing
 */
export const createMockClerkToken = (userId: string, email: string, role: string = 'user', villaId?: string) => {
  const payload: ClerkJWTPayload = {
    sub: userId,
    email,
    email_verified: true,
    iss: process.env.CLERK_JWT_ISSUER || 'https://novel-cheetah-60.clerk.accounts.dev',
    aud: 'mock-audience',
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000),
    sid: `mock_session_${Date.now()}`,
    metadata: {
      role,
      villaId,
    },
  };

  return jwt.sign(payload, 'mock-secret-for-development');
};

export default clerkAuth;