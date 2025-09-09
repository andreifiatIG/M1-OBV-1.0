import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import validator from 'validator';

// Initialize DOMPurify with jsdom
const window = new JSDOM('').window as unknown as Window & typeof globalThis;
const purify = DOMPurify(window);

// Configuration for different sanitization levels
const sanitizationConfig = {
  strict: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: false,
  },
  moderate: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  lenient: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
    KEEP_CONTENT: true,
  },
};

// Input validation and sanitization functions
export const sanitizers: {
  text: (input: any) => string;
  richText: (input: any, level?: 'strict' | 'moderate' | 'lenient') => string;
  email: (input: any) => string;
  url: (input: any) => string;
  phone: (input: any) => string;
  number: (input: any) => number | null;
  integer: (input: any) => number | null;
  boolean: (input: any) => boolean;
  array: (input: any, sanitizer?: (item: any) => any) => any[];
  id: (input: any) => string;
  json: (input: any) => any;
  fileName: (input: any) => string;
  slug: (input: any) => string;
  objectKey: (input: any) => string;
  sqlSafe: (input: any) => string;
} = {
  // Text sanitization with HTML removal
  text: (input: any): string => {
    if (typeof input !== 'string') return '';
    return purify.sanitize(input, sanitizationConfig.strict).trim();
  },

  // Rich text sanitization (allows basic formatting)
  richText: (input: any, level: 'strict' | 'moderate' | 'lenient' = 'moderate'): string => {
    if (typeof input !== 'string') return '';
    return purify.sanitize(input, sanitizationConfig[level]).trim();
  },

  // Email sanitization
  email: (input: any): string => {
    if (typeof input !== 'string') return '';
    const sanitized = sanitizers.text(input).toLowerCase();
    return validator.isEmail(sanitized) ? validator.normalizeEmail(sanitized) || sanitized : '';
  },

  // URL sanitization
  url: (input: any): string => {
    if (typeof input !== 'string') return '';
    const sanitized = sanitizers.text(input);
    if (!sanitized) return '';
    
    // Ensure URL has protocol
    const urlWithProtocol = sanitized.match(/^https?:\/\//) ? sanitized : `https://${sanitized}`;
    return validator.isURL(urlWithProtocol, { 
      protocols: ['http', 'https'], 
      require_protocol: true 
    }) ? urlWithProtocol : '';
  },

  // Phone number sanitization
  phone: (input: any): string => {
    if (typeof input !== 'string') return '';
    // Remove all non-digit characters except + at the beginning
    return sanitizers.text(input).replace(/[^\d+]/g, '').replace(/\+/g, (match: string, offset: number) => offset === 0 ? match : '');
  },

  // Number sanitization
  number: (input: any): number | null => {
    if (typeof input === 'number') return isNaN(input) ? null : input;
    if (typeof input !== 'string') return null;
    
    const sanitized = sanitizers.text(input);
    const num = parseFloat(sanitized);
    return isNaN(num) ? null : num;
  },

  // Integer sanitization
  integer: (input: any): number | null => {
    const num = sanitizers.number(input);
    return num !== null ? Math.floor(num) : null;
  },

  // Boolean sanitization
  boolean: (input: any): boolean => {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
      const sanitized = sanitizers.text(input).toLowerCase();
      return sanitized === 'true' || sanitized === '1' || sanitized === 'yes';
    }
    return Boolean(input);
  },

  // Array sanitization
  array: (input: any, itemSanitizer?: (item: any) => any): any[] => {
    if (!Array.isArray(input)) return [];
    const sanitizer = itemSanitizer || sanitizers.text;
    return input.map(item => sanitizer(item)).filter(item => item !== null && item !== undefined && item !== '');
  },

  // Object key sanitization (for preventing prototype pollution)
  objectKey: (key: any): string => {
    if (typeof key !== 'string') return '';
    const sanitized = sanitizers.text(key);
    
    // Prevent prototype pollution
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    if (dangerousKeys.includes(sanitized.toLowerCase())) return '';
    
    return sanitized;
  },

  // SQL injection prevention (basic)
  sqlSafe: (input: any): string => {
    if (typeof input !== 'string') return '';
    const sanitized = sanitizers.text(input);
    
    // Remove common SQL injection patterns
    return sanitized.replace(/[';"\-\-]/g, '').replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b/gi, '');
  },

  // Filename sanitization
  fileName: (input: any): string => {
    if (typeof input !== 'string') return '';
    const sanitized = sanitizers.text(input);
    
    // Remove path traversal attempts and dangerous characters
    return sanitized
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\.\./g, '')
      .replace(/^\.+/, '') // Remove leading dots
      .trim();
  },

  // ID sanitization (UUID validation)
  id: (input: any): string => {
    if (typeof input !== 'string') return '';
    const sanitized = sanitizers.text(input);
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(sanitized) ? sanitized : '';
  },

  // JSON sanitization
  json: (input: any): any => {
    if (typeof input === 'object' && input !== null) {
      return JSON.parse(JSON.stringify(input)); // Deep clone to remove functions/prototypes
    }
    if (typeof input === 'string') {
      try {
        return JSON.parse(input);
      } catch {
        return {};
      }
    }
    return {};
  },

  // Slug sanitization (URL-friendly strings)
  slug: (input: any): string => {
    if (typeof input !== 'string') return '';
    return sanitizers.text(input)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .trim();
  },
};

// Validation functions
export const validators = {
  required: (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  },

  minLength: (value: any, min: number): boolean => {
    if (typeof value !== 'string') return false;
    return value.length >= min;
  },

  maxLength: (value: any, max: number): boolean => {
    if (typeof value !== 'string') return false;
    return value.length <= max;
  },

  email: (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return validator.isEmail(value);
  },

  url: (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return validator.isURL(value, { protocols: ['http', 'https'] });
  },

  phone: (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return validator.isMobilePhone(value) || /^[\+]?[\d\s\-\(\)]{7,15}$/.test(value);
  },

  number: (value: any): boolean => {
    return typeof value === 'number' && !isNaN(value);
  },

  integer: (value: any): boolean => {
    return Number.isInteger(value);
  },

  positiveNumber: (value: any): boolean => {
    return validators.number(value) && value > 0;
  },

  range: (value: any, min: number, max: number): boolean => {
    return validators.number(value) && value >= min && value <= max;
  },

  uuid: (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return validator.isUUID(value);
  },

  alphanumeric: (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return validator.isAlphanumeric(value);
  },

  noScript: (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(value);
  },
};

// Sanitization middleware factory
export const createSanitizationMiddleware = (config: {
  body?: Record<string, (value: any) => any>;
  query?: Record<string, (value: any) => any>;
  params?: Record<string, (value: any) => any>;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize body
      if (config.body && req.body) {
        for (const [key, sanitizer] of Object.entries(config.body)) {
          if (key in req.body) {
            req.body[key] = sanitizer(req.body[key]);
          }
        }
      }

      // Sanitize query parameters
      if (config.query && req.query) {
        for (const [key, sanitizer] of Object.entries(config.query)) {
          if (key in req.query) {
            req.query[key] = sanitizer(req.query[key]);
          }
        }
      }

      // Sanitize route parameters
      if (config.params && req.params) {
        for (const [key, sanitizer] of Object.entries(config.params)) {
          if (key in req.params) {
            req.params[key] = sanitizer(req.params[key]);
          }
        }
      }

      next();
    } catch (error) {
      console.error('Sanitization middleware error:', error);
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
        message: 'Input data could not be processed safely',
      });
    }
  };
};

// Deep sanitization for complex objects
export const deepSanitize = (obj: any, sanitizer: (value: any) => any = sanitizers.text): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item, sanitizer));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizers.objectKey(key);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = deepSanitize(value, sanitizer);
      }
    }
    return sanitized;
  }
  
  return sanitizer(obj);
};

// Validation middleware factory
export const createValidationMiddleware = (config: {
  body?: Record<string, ((value: any) => boolean)[]>;
  query?: Record<string, ((value: any) => boolean)[]>;
  params?: Record<string, ((value: any) => boolean)[]>;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    const validate = (data: any, rules: Record<string, ((value: any) => boolean)[]>, prefix: string) => {
      for (const [key, validatorList] of Object.entries(rules)) {
        if (key in data) {
          const value = data[key];
          for (const validator of validatorList) {
            if (!validator(value)) {
              errors.push(`Invalid ${prefix}.${key}: ${value}`);
            }
          }
        }
      }
    };

    if (config.body && req.body) validate(req.body, config.body, 'body');
    if (config.query && req.query) validate(req.query, config.query, 'query');
    if (config.params && req.params) validate(req.params, config.params, 'params');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  };
};

export default {
  sanitizers,
  validators,
  createSanitizationMiddleware,
  createValidationMiddleware,
  deepSanitize,
};