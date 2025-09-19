import { describe, it, expect, vi } from 'vitest'
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// Mock encryption utilities
const mockEncryption = {
  hashPassword: (password: string) => {
    return createHash('sha256').update(password + 'salt').digest('hex')
  },

  verifyPassword: (password: string, hash: string) => {
    const computed = createHash('sha256').update(password + 'salt').digest('hex')
    return computed === hash
  },

  encrypt: (text: string, key: string) => {
    const algorithm = 'aes-256-cbc'
    const iv = randomBytes(16)
    const cipher = createCipheriv(algorithm, Buffer.from(key.padEnd(32, '0')), iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return iv.toString('hex') + ':' + encrypted
  },

  decrypt: (encryptedData: string, key: string) => {
    const algorithm = 'aes-256-cbc'
    const [ivHex, encrypted] = encryptedData.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = createDecipheriv(algorithm, Buffer.from(key.padEnd(32, '0')), iv)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  },

  generateSecretKey: (length = 32) => {
    return randomBytes(length).toString('hex')
  },

  hashSensitiveData: (data: string) => {
    return createHash('sha256').update(data).digest('hex')
  },

  encryptBankDetails: (bankDetails: any, key: string) => {
    const sensitiveFields = ['accountNumber', 'routingNumber', 'swiftCode']
    const encrypted = { ...bankDetails }

    sensitiveFields.forEach(field => {
      if (encrypted[field]) {
        encrypted[field] = mockEncryption.encrypt(encrypted[field], key)
      }
    })

    return encrypted
  },

  decryptBankDetails: (encryptedBankDetails: any, key: string) => {
    const sensitiveFields = ['accountNumber', 'routingNumber', 'swiftCode']
    const decrypted = { ...encryptedBankDetails }

    sensitiveFields.forEach(field => {
      if (decrypted[field]) {
        try {
          decrypted[field] = mockEncryption.decrypt(decrypted[field], key)
        } catch (error) {
          // Field might not be encrypted
        }
      }
    })

    return decrypted
  },

  sanitizeForLog: (data: any) => {
    const sensitiveFields = ['password', 'accountNumber', 'ssn', 'creditCard']
    const sanitized = JSON.parse(JSON.stringify(data))

    const sanitizeObject = (obj: any) => {
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '***'
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key])
        }
      }
    }

    sanitizeObject(sanitized)
    return sanitized
  }
}

describe('Encryption Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash passwords securely', () => {
      const password = 'testPassword123'
      const hash = mockEncryption.hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).toHaveLength(64) // SHA256 hex length
      expect(hash).not.toBe(password)
    })

    it('should generate consistent hashes for same password', () => {
      const password = 'testPassword123'
      const hash1 = mockEncryption.hashPassword(password)
      const hash2 = mockEncryption.hashPassword(password)

      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different passwords', () => {
      const password1 = 'testPassword123'
      const password2 = 'differentPassword456'
      const hash1 = mockEncryption.hashPassword(password1)
      const hash2 = mockEncryption.hashPassword(password2)

      expect(hash1).not.toBe(hash2)
    })

    it('should verify passwords correctly', () => {
      const password = 'testPassword123'
      const hash = mockEncryption.hashPassword(password)

      expect(mockEncryption.verifyPassword(password, hash)).toBe(true)
      expect(mockEncryption.verifyPassword('wrongPassword', hash)).toBe(false)
    })
  })

  describe('Data Encryption/Decryption', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'This is sensitive data'
      const key = 'mySecretKey123'

      const encrypted = mockEncryption.encrypt(plaintext, key)
      const decrypted = mockEncryption.decrypt(encrypted, key)

      expect(encrypted).not.toBe(plaintext)
      expect(encrypted).toContain(':') // IV separator
      expect(decrypted).toBe(plaintext)
    })

    it('should handle empty strings', () => {
      const plaintext = ''
      const key = 'mySecretKey123'

      const encrypted = mockEncryption.encrypt(plaintext, key)
      const decrypted = mockEncryption.decrypt(encrypted, key)

      expect(decrypted).toBe(plaintext)
    })

    it('should fail decryption with wrong key', () => {
      const plaintext = 'This is sensitive data'
      const key1 = 'correctKey123'
      const key2 = 'wrongKey456'

      const encrypted = mockEncryption.encrypt(plaintext, key1)

      expect(() => {
        mockEncryption.decrypt(encrypted, key2)
      }).toThrow()
    })

    it('should handle unicode characters', () => {
      const plaintext = 'Тест 测试 🚀 éñ'
      const key = 'mySecretKey123'

      const encrypted = mockEncryption.encrypt(plaintext, key)
      const decrypted = mockEncryption.decrypt(encrypted, key)

      expect(decrypted).toBe(plaintext)
    })
  })

  describe('Secret Key Generation', () => {
    it('should generate secure random keys', () => {
      const key1 = mockEncryption.generateSecretKey()
      const key2 = mockEncryption.generateSecretKey()

      expect(key1).toBeDefined()
      expect(key2).toBeDefined()
      expect(key1).not.toBe(key2)
      expect(key1).toHaveLength(64) // 32 bytes = 64 hex chars
    })

    it('should generate keys of specified length', () => {
      const key16 = mockEncryption.generateSecretKey(16)
      const key64 = mockEncryption.generateSecretKey(64)

      expect(key16).toHaveLength(32) // 16 bytes = 32 hex chars
      expect(key64).toHaveLength(128) // 64 bytes = 128 hex chars
    })
  })

  describe('Sensitive Data Hashing', () => {
    it('should hash sensitive data consistently', () => {
      const data = '1234567890' // Account number
      const hash1 = mockEncryption.hashSensitiveData(data)
      const hash2 = mockEncryption.hashSensitiveData(data)

      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64)
      expect(hash1).not.toBe(data)
    })

    it('should hash different data differently', () => {
      const data1 = '1234567890'
      const data2 = '0987654321'
      const hash1 = mockEncryption.hashSensitiveData(data1)
      const hash2 = mockEncryption.hashSensitiveData(data2)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Bank Details Encryption', () => {
    it('should encrypt sensitive bank fields', () => {
      const bankDetails = {
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        routingNumber: '987654321',
        accountHolderName: 'John Doe',
        swiftCode: 'TESTBANK'
      }
      const key = mockEncryption.generateSecretKey()

      const encrypted = mockEncryption.encryptBankDetails(bankDetails, key)

      expect(encrypted.bankName).toBe(bankDetails.bankName) // Not sensitive
      expect(encrypted.accountHolderName).toBe(bankDetails.accountHolderName) // Not sensitive
      expect(encrypted.accountNumber).not.toBe(bankDetails.accountNumber) // Encrypted
      expect(encrypted.routingNumber).not.toBe(bankDetails.routingNumber) // Encrypted
      expect(encrypted.swiftCode).not.toBe(bankDetails.swiftCode) // Encrypted
    })

    it('should decrypt bank details correctly', () => {
      const bankDetails = {
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        routingNumber: '987654321',
        accountHolderName: 'John Doe',
        swiftCode: 'TESTBANK'
      }
      const key = mockEncryption.generateSecretKey()

      const encrypted = mockEncryption.encryptBankDetails(bankDetails, key)
      const decrypted = mockEncryption.decryptBankDetails(encrypted, key)

      expect(decrypted).toEqual(bankDetails)
    })

    it('should handle missing sensitive fields', () => {
      const partialBankDetails = {
        bankName: 'Test Bank',
        accountHolderName: 'John Doe'
      }
      const key = mockEncryption.generateSecretKey()

      const encrypted = mockEncryption.encryptBankDetails(partialBankDetails, key)
      const decrypted = mockEncryption.decryptBankDetails(encrypted, key)

      expect(decrypted).toEqual(partialBankDetails)
    })
  })

  describe('Log Sanitization', () => {
    it('should sanitize sensitive fields in logs', () => {
      const data = {
        username: 'testuser',
        password: 'secretPassword',
        accountNumber: '1234567890',
        normalField: 'normalValue',
        nested: {
          creditCard: '4111111111111111',
          publicInfo: 'public'
        }
      }

      const sanitized = mockEncryption.sanitizeForLog(data)

      expect(sanitized.username).toBe('testuser')
      expect(sanitized.password).toBe('***')
      expect(sanitized.accountNumber).toBe('***')
      expect(sanitized.normalField).toBe('normalValue')
      expect(sanitized.nested.creditCard).toBe('***')
      expect(sanitized.nested.publicInfo).toBe('public')
    })

    it('should handle arrays and complex objects', () => {
      const data = {
        users: [
          { name: 'User1', password: 'secret1' },
          { name: 'User2', password: 'secret2' }
        ],
        metadata: {
          publicInfo: 'public',
          sensitivePassword: 'secret'
        }
      }

      const sanitized = mockEncryption.sanitizeForLog(data)

      expect(sanitized.users[0].name).toBe('User1')
      expect(sanitized.users[0].password).toBe('***')
      expect(sanitized.users[1].password).toBe('***')
      expect(sanitized.metadata.publicInfo).toBe('public')
      expect(sanitized.metadata.sensitivePassword).toBe('***')
    })

    it('should not modify original object', () => {
      const data = {
        username: 'testuser',
        password: 'secretPassword'
      }

      const sanitized = mockEncryption.sanitizeForLog(data)

      expect(data.password).toBe('secretPassword') // Original unchanged
      expect(sanitized.password).toBe('***') // Sanitized version
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid encrypted data gracefully', () => {
      const invalidData = 'not:valid:encrypted:data'
      const key = 'testKey123'

      expect(() => {
        mockEncryption.decrypt(invalidData, key)
      }).toThrow()
    })

    it('should handle malformed bank details decryption', () => {
      const malformedData = {
        accountNumber: 'not-encrypted-data'
      }
      const key = mockEncryption.generateSecretKey()

      // Should not throw, just return original for non-encrypted fields
      const result = mockEncryption.decryptBankDetails(malformedData, key)
      expect(result.accountNumber).toBe('not-encrypted-data')
    })
  })

  describe('Security Best Practices', () => {
    it('should use different IVs for each encryption', () => {
      const plaintext = 'same text'
      const key = 'same key'

      const encrypted1 = mockEncryption.encrypt(plaintext, key)
      const encrypted2 = mockEncryption.encrypt(plaintext, key)

      expect(encrypted1).not.toBe(encrypted2) // Different IVs
      expect(mockEncryption.decrypt(encrypted1, key)).toBe(plaintext)
      expect(mockEncryption.decrypt(encrypted2, key)).toBe(plaintext)
    })

    it('should handle key length variations', () => {
      const plaintext = 'test data'
      const shortKey = 'short'
      const longKey = 'very-long-key-that-exceeds-normal-length'

      const encrypted1 = mockEncryption.encrypt(plaintext, shortKey)
      const encrypted2 = mockEncryption.encrypt(plaintext, longKey)

      expect(mockEncryption.decrypt(encrypted1, shortKey)).toBe(plaintext)
      expect(mockEncryption.decrypt(encrypted2, longKey)).toBe(plaintext)
    })
  })
})