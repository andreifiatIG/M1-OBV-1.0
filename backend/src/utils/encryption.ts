import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const keyLength = 32; // 256 bits
const ivLength = 16; // 128 bits

// Get encryption key from environment variable
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  // If the key is hex, convert it to buffer
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // Otherwise, hash the key to ensure proper length
  return crypto.scryptSync(key, 'salt', keyLength);
};

interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt sensitive data
 */
export const encrypt = (text: string): EncryptedData => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(ivLength);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('villa-management-system', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Decrypt sensitive data
 */
export const decrypt = (encryptedData: EncryptedData): string => {
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('villa-management-system', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Encrypt bank account number
 */
export const encryptBankData = (accountNumber: string, iban?: string) => {
  return {
    accountNumber: encrypt(accountNumber),
    iban: iban ? encrypt(iban) : null,
  };
};

/**
 * Decrypt bank account number
 */
export const decryptBankData = (
  encryptedAccountNumber: EncryptedData,
  encryptedIban?: EncryptedData | null
) => {
  return {
    accountNumber: decrypt(encryptedAccountNumber),
    iban: encryptedIban ? decrypt(encryptedIban) : null,
  };
};

/**
 * Encrypt OTA credentials
 */
export const encryptOTACredentials = (
  username?: string,
  password?: string,
  apiKey?: string,
  apiSecret?: string
) => {
  return {
    username: username ? encrypt(username) : null,
    password: password ? encrypt(password) : null,
    apiKey: apiKey ? encrypt(apiKey) : null,
    apiSecret: apiSecret ? encrypt(apiSecret) : null,
  };
};

/**
 * Decrypt OTA credentials
 */
export const decryptOTACredentials = (encryptedCredentials: {
  username?: EncryptedData | null;
  password?: EncryptedData | null;
  apiKey?: EncryptedData | null;
  apiSecret?: EncryptedData | null;
}) => {
  return {
    username: encryptedCredentials.username ? decrypt(encryptedCredentials.username) : null,
    password: encryptedCredentials.password ? decrypt(encryptedCredentials.password) : null,
    apiKey: encryptedCredentials.apiKey ? decrypt(encryptedCredentials.apiKey) : null,
    apiSecret: encryptedCredentials.apiSecret ? decrypt(encryptedCredentials.apiSecret) : null,
  };
};

/**
 * Hash password for staff authentication
 */
export const hashPassword = async (password: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
};

/**
 * Verify password for staff authentication
 */
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const [salt, hash] = hashedPassword.split(':');
    crypto.pbkdf2(password, salt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(hash === derivedKey.toString('hex'));
    });
  });
};

/**
 * Generate random encryption key (for initial setup)
 */
export const generateEncryptionKey = (): string => {
  return crypto.randomBytes(keyLength).toString('hex');
};