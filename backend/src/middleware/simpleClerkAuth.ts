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

/**
 * Simple Clerk authentication middleware
 * This version just decodes the JWT without full verification for development
 */
export const simpleClerkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    logger.debug('Auth header received:', authHeader ? 'Bearer token present' : 'No auth header');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('No valid authorization header found');
      return res.status(401).json({
        success: false,
        error: 'No token provided. Please include Authorization: Bearer <token> header',
      });
    }

    const token = authHeader.substring(7);
    
    // Decode the token (without verification for now)
    const decoded = jwt.decode(token) as any;
    
    if (!decoded) {
      logger.error('Failed to decode token');
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    logger.debug('Token decoded successfully:', {
      sub: decoded.sub,
      iss: decoded.iss,
      exp: decoded.exp,
    });

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      logger.warn('Token expired');
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }

    // Set auth and user on request
    req.auth = {
      userId: decoded.sub || decoded.userId || 'unknown',
      sessionId: decoded.sid,
      claims: decoded,
    };

    // For compatibility with existing code
    req.user = {
      id: decoded.sub || decoded.userId || 'unknown',
      email: decoded.email || '',
      role: decoded.role || decoded.metadata?.role || 'user',
      villaId: decoded.villaId || decoded.metadata?.villaId,
      partnerId: decoded.partnerId || decoded.metadata?.partnerId,
    };

    logger.info('User authenticated successfully:', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed: ' + (error as Error).message,
    });
  }
};

export default simpleClerkAuth;