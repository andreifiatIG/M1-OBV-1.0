import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate a unique villa code
 */
export async function generateVillaCode(): Promise<string> {
  const prefix = 'VIL';
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Try up to 10 times to generate a unique code
  for (let attempt = 1; attempt <= 10; attempt++) {
    let villaCode: string;
    
    if (attempt === 1) {
      // First attempt: use count-based sequence
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const count = await prisma.villa.count({
        where: {
          createdAt: { gte: startOfYear },
        },
      });
      const sequence = (count + 1).toString().padStart(4, '0');
      villaCode = `${prefix}${year}${sequence}`;
    } else {
      // Subsequent attempts: add random component
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      villaCode = `${prefix}${year}${randomNum}`;
    }
    
    // Check if this code already exists
    const existingVilla = await prisma.villa.findUnique({
      where: { villaCode },
      select: { id: true },
    });
    
    if (!existingVilla) {
      return villaCode;
    }
    
    console.warn(`Villa code ${villaCode} already exists, trying again (attempt ${attempt}/10)`);
  }
  
  // Fallback: use timestamp-based code if all attempts fail
  const timestamp = Date.now().toString().slice(-6);
  const fallbackCode = `${prefix}${year}${timestamp}`;
  console.warn(`Using fallback villa code: ${fallbackCode}`);
  return fallbackCode;
}

/**
 * Generate a unique booking code
 */
export async function generateBookingCode(): Promise<string> {
  const prefix = 'BKG';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a unique partner code
 */
export async function generatePartnerCode(): Promise<string> {
  const prefix = 'PTR';
  const year = new Date().getFullYear().toString().slice(-2);
  
  // const count = await prisma.partner.count(); // Partner model not available yet
  const count = 0;
  const sequence = (count + 1).toString().padStart(4, '0');
  
  return `${prefix}${year}${sequence}`;
}

/**
 * Generate a unique agreement number
 */
export async function generateAgreementNumber(type: string): Promise<string> {
  const prefix = type.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  
  const count = await prisma.agreement.count({
    where: {
      createdAt: {
        gte: new Date(year, new Date().getMonth(), 1),
        lt: new Date(year, new Date().getMonth() + 1, 1),
      },
    },
  });
  
  const sequence = (count + 1).toString().padStart(3, '0');
  return `${prefix}-${year}${month}-${sequence}`;
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this', 'utf8').slice(0, 32);
  const iv = Buffer.from(process.env.ENCRYPTION_IV || 'default-iv-change', 'utf8').slice(0, 16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this', 'utf8').slice(0, 32);
  const iv = Buffer.from(process.env.ENCRYPTION_IV || 'default-iv-change', 'utf8').slice(0, 16);
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = Array.isArray(input) ? [] : {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }
  return input;
}

/**
 * Generate random password
 */
export function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Calculate number of nights between dates
 */
export function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Parse boolean from string
 */
export function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return !!value;
}

/**
 * Generate slug from string
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
}

/**
 * Get date range for period
 */
export function getDateRange(period: 'today' | 'week' | 'month' | 'year' | 'custom', customStart?: Date, customEnd?: Date) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date();

  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom date range requires start and end dates');
      }
      startDate = customStart;
      endDate = customEnd;
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  return { startDate, endDate };
}