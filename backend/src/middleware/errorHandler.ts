import { Request, Response, NextFunction } from 'express';
import { logError, securityLog } from '../utils/logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Custom error class for application errors
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error types for better categorization
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  FILE_UPLOAD = 'FILE_UPLOAD_ERROR',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC_ERROR',
  INTERNAL_SERVER = 'INTERNAL_SERVER_ERROR',
}

// Map error types to HTTP status codes
const errorStatusMap: Record<ErrorType, number> = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.AUTHENTICATION]: 401,
  [ErrorType.AUTHORIZATION]: 403,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.DATABASE]: 500,
  [ErrorType.EXTERNAL_SERVICE]: 503,
  [ErrorType.RATE_LIMIT]: 429,
  [ErrorType.FILE_UPLOAD]: 400,
  [ErrorType.BUSINESS_LOGIC]: 422,
  [ErrorType.INTERNAL_SERVER]: 500,
};

// Handle Zod validation errors
const handleZodError = (error: ZodError): AppError => {
  const errors = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
  
  return new AppError(
    400,
    'Validation failed',
    ErrorType.VALIDATION,
    { errors }
  );
};

// Handle Prisma database errors
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      return new AppError(
        409,
        'Duplicate entry found',
        ErrorType.DATABASE,
        { field: error.meta?.target }
      );
    
    case 'P2014':
      return new AppError(
        400,
        'Invalid relation data',
        ErrorType.DATABASE,
        { details: error.meta }
      );
    
    case 'P2003':
      return new AppError(
        400,
        'Foreign key constraint failed',
        ErrorType.DATABASE,
        { field: error.meta?.field_name }
      );
    
    case 'P2025':
      return new AppError(
        404,
        'Record not found',
        ErrorType.NOT_FOUND
      );
    
    default:
      return new AppError(
        500,
        'Database operation failed',
        ErrorType.DATABASE,
        { code: error.code }
      );
  }
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handler middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logError(err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
  });
  
  // Handle different error types
  let appError: AppError;
  
  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = handleZodError(err);
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    appError = new AppError(
      400,
      'Invalid data provided',
      ErrorType.VALIDATION
    );
  } else if (err.name === 'UnauthorizedError') {
    appError = new AppError(
      401,
      'Unauthorized access',
      ErrorType.AUTHENTICATION
    );
    
    // Log security event
    securityLog('Unauthorized access attempt', {
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id,
    });
  } else if (err.name === 'MulterError') {
    appError = new AppError(
      400,
      err.message || 'File upload error',
      ErrorType.FILE_UPLOAD
    );
  } else {
    // Generic error
    appError = new AppError(
      500,
      process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      ErrorType.INTERNAL_SERVER
    );
  }
  
  // Send error response
  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(process.env.NODE_ENV !== 'production' && {
        details: appError.details,
        stack: err.stack,
      }),
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response) => {
  const error = new AppError(
    404,
    `Route ${req.originalUrl} not found`,
    ErrorType.NOT_FOUND
  );
  
  logError(error, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });
  
  res.status(404).json({
    success: false,
    error: {
      code: ErrorType.NOT_FOUND,
      message: error.message,
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
};

// Request timeout handler
export const timeoutHandler = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      const error = new AppError(
        408,
        'Request timeout',
        'REQUEST_TIMEOUT'
      );
      
      logError(error, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userId: req.user?.id,
      });
      
      res.status(408).json({
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Request took too long to process',
        },
      });
    }, timeout);
    
    res.on('finish', () => {
      clearTimeout(timer);
    });
    
    next();
  };
};