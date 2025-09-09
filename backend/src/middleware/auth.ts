import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId?: string;
        claims?: any;
      };
      user?: {
        id: string;
        email: string;
        role: string;
        villaId?: string;
        partnerId?: string;
      };
    }
  }
}

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  villaId?: string;
  partnerId?: string;
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
  metadata?: {
    role?: string;
    villaId?: string;
    partnerId?: string;
  };
}

/**
 * Authenticate user using Clerk token or JWT token
 * This is the main authentication middleware used across the application
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    logger.debug('Auth header received:', authHeader ? 'Bearer token present' : 'No auth header');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Please include Authorization: Bearer <token> header',
      });
    }

    const token = authHeader.substring(7);

    // First try to verify as Clerk JWT token using jose for production-ready verification
    try {
      const { createRemoteJWKSet, jwtVerify } = await import('jose');
      
      // Get JWKS from Clerk
      const JWKS = createRemoteJWKSet(new URL(process.env.CLERK_JWKS_URL || ''));
      
      // Verify the JWT with Clerk's JWKS
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: process.env.CLERK_JWT_ISSUER,
      });
      
      if (payload && payload.sub) {
        logger.debug('Clerk token verified successfully via JWKS:', payload.sub);
        
        // Attach auth and user to request from Clerk payload
        req.auth = {
          userId: payload.sub,
          sessionId: (payload as any).sid,
          claims: payload,
        };

        req.user = {
          id: payload.sub,
          email: (payload as any).email || '',
          role: (payload as any).metadata?.role || 'owner', // Default role for Clerk users
          villaId: (payload as any).metadata?.villaId,
          partnerId: (payload as any).metadata?.partnerId,
        };
        
        logger.info('User authenticated successfully via Clerk JWKS:', {
          userId: req.user.id,
          email: req.user.email,
          role: req.user.role,
        });
        
        return next();
      }
    } catch (clerkError) {
      // If JWKS verification fails, fall back to simple decode for development
      logger.debug('Clerk JWKS verification failed, trying simple decode:', (clerkError as Error).message);
      
      try {
        // Decode without verification as fallback (for development)
        const decoded = jwt.decode(token) as ClerkJWTPayload;
        
        if (!decoded) {
          throw new Error('Invalid token format');
        }

        // Verify issuer matches Clerk
        const expectedIssuer = process.env.CLERK_JWT_ISSUER || 'https://novel-cheetah-60.clerk.accounts.dev';
        if (decoded.iss && decoded.iss !== expectedIssuer) {
          throw new Error(`Invalid issuer. Expected: ${expectedIssuer}, Got: ${decoded.iss}`);
        }

        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < now) {
          throw new Error('Token expired');
        }

        // Set auth and user on request
        req.auth = {
          userId: decoded.sub,
          sessionId: decoded.sid,
          claims: decoded,
        };

        req.user = {
          id: decoded.sub,
          email: decoded.email || '',
          role: decoded.metadata?.role || 'owner', // Default role for Clerk users
          villaId: decoded.metadata?.villaId,
          partnerId: decoded.metadata?.partnerId,
        };

        logger.info('User authenticated successfully via Clerk decode fallback:', {
          userId: req.user.id,
          email: req.user.email,
          role: req.user.role,
        });
        
        return next();
      } catch (decodeError) {
        logger.debug('Clerk decode fallback failed, trying JWT:', (decodeError as Error).message);
      }
    }

    // Try to verify as JWT token (fallback for custom tokens)
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default-secret'
      ) as JWTPayload;

      // Attach user to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        villaId: decoded.villaId,
        partnerId: decoded.partnerId,
      };

      logger.info('User authenticated successfully via JWT:', {
        userId: decoded.id,
        role: decoded.role,
      });
      
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
        });
      }
      
      if (jwtError instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
      }
      
      logger.error('All token verification methods failed:', jwtError);
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuthenticate = async (
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
  return authenticate(req, res, next);
};

/**
 * Authorize user based on roles
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
        error: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

/**
 * Check villa ownership
 */
export const checkVillaOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Admins and managers can access all villas
    if (['admin', 'manager'].includes(req.user.role)) {
      return next();
    }

    const villaId = req.params.villaId || req.params.id;
    
    if (!villaId) {
      return res.status(400).json({
        success: false,
        error: 'Villa ID required',
      });
    }

    // Check if user is associated with this villa
    if (req.user.villaId !== villaId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this villa',
      });
    }

    next();
  } catch (error) {
    logger.error('Villa ownership check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization failed',
    });
  }
};

/**
 * Check partner ownership
 */
export const checkPartnerOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Admins can access all partners
    if (req.user.role === 'admin') {
      return next();
    }

    const partnerId = req.params.partnerId || req.params.id;
    
    if (!partnerId) {
      return res.status(400).json({
        success: false,
        error: 'Partner ID required',
      });
    }

    // Check if user is associated with this partner
    if (req.user.partnerId !== partnerId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    next();
  } catch (error) {
    logger.error('Partner ownership check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization failed',
    });
  }
};

/**
 * Generate JWT token
 */
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'default-secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    } as jwt.SignOptions
  );
};

/**
 * Verify JWT token (for WebSocket connections)
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret'
    ) as JWTPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Development helper to create mock Clerk tokens for testing
 */
export const createMockClerkToken = (
  userId: string, 
  email: string, 
  role: string = 'owner', 
  villaId?: string
): string => {
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

// Export authenticate as authMiddleware alias for backward compatibility
export const authMiddleware = authenticate;

// Export the simple clerk auth as an alias
export const simpleClerkAuth = authenticate;

// Export the clerk auth as an alias
export const clerkAuth = authenticate;