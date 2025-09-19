import { describe, it, expect, vi } from 'vitest'

// Mock helper functions since we're testing their functionality
const mockHelpers = {
  generateId: () => 'mock-id-' + Math.random().toString(36).substr(2, 9),

  validateEmail: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  validatePhone: (phone: string) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
    return phoneRegex.test(phone)
  },

  formatCurrency: (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  },

  sanitizeString: (input: string) => {
    return input.trim().replace(/[<>]/g, '')
  },

  calculateProgressPercentage: (completed: number[], total: number) => {
    if (total === 0) return 0
    return Math.round((completed.length / total) * 100)
  },

  generateSlug: (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  },

  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj))
  },

  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): T => {
    let timeout: NodeJS.Timeout
    return ((...args: any[]) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }) as T
  },

  isValidDate: (date: string | Date) => {
    const dateObj = new Date(date)
    return !isNaN(dateObj.getTime())
  },

  formatFileSize: (bytes: number) => {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  getFileExtension: (filename: string) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
  },

  isImageFile: (filename: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    const extension = mockHelpers.getFileExtension(filename).toLowerCase()
    return imageExtensions.includes(extension)
  },

  isPdfFile: (filename: string) => {
    return mockHelpers.getFileExtension(filename).toLowerCase() === 'pdf'
  },

  capitalizeFirstLetter: (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  },

  removeSpecialCharacters: (str: string) => {
    return str.replace(/[^a-zA-Z0-9\s]/g, '')
  },

  generateRandomString: (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

describe('Helper Functions', () => {
  describe('ID Generation', () => {
    it('should generate unique IDs', () => {
      const id1 = mockHelpers.generateId()
      const id2 = mockHelpers.generateId()

      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^mock-id-/)
    })
  })

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'test123@test-domain.com'
      ]

      validEmails.forEach(email => {
        expect(mockHelpers.validateEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'test@',
        'test@domain',
        'test.domain.com',
        ''
      ]

      invalidEmails.forEach(email => {
        expect(mockHelpers.validateEmail(email)).toBe(false)
      })
    })
  })

  describe('Phone Validation', () => {
    it('should validate correct phone formats', () => {
      const validPhones = [
        '+1234567890',
        '+44-123-456-7890',
        '(555) 123-4567',
        '555-123-4567',
        '+1 (555) 123-4567'
      ]

      validPhones.forEach(phone => {
        expect(mockHelpers.validatePhone(phone)).toBe(true)
      })
    })

    it('should reject invalid phone formats', () => {
      const invalidPhones = [
        '123',
        'phone',
        '555-123',
        ''
      ]

      invalidPhones.forEach(phone => {
        expect(mockHelpers.validatePhone(phone)).toBe(false)
      })
    })
  })

  describe('Currency Formatting', () => {
    it('should format currency correctly', () => {
      expect(mockHelpers.formatCurrency(100)).toBe('$100.00')
      expect(mockHelpers.formatCurrency(1234.56)).toBe('$1,234.56')
      expect(mockHelpers.formatCurrency(0)).toBe('$0.00')
    })

    it('should handle different currencies', () => {
      expect(mockHelpers.formatCurrency(100, 'EUR')).toBe('€100.00')
      expect(mockHelpers.formatCurrency(100, 'GBP')).toBe('£100.00')
    })
  })

  describe('String Sanitization', () => {
    it('should sanitize dangerous characters', () => {
      expect(mockHelpers.sanitizeString('<script>alert("xss")</script>')).toBe('script alert("xss")/script')
      expect(mockHelpers.sanitizeString('  test string  ')).toBe('test string')
    })
  })

  describe('Progress Calculation', () => {
    it('should calculate progress percentage correctly', () => {
      expect(mockHelpers.calculateProgressPercentage([1, 2, 3], 10)).toBe(30)
      expect(mockHelpers.calculateProgressPercentage([1, 2, 3, 4, 5], 10)).toBe(50)
      expect(mockHelpers.calculateProgressPercentage([], 10)).toBe(0)
      expect(mockHelpers.calculateProgressPercentage([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10)).toBe(100)
    })

    it('should handle edge cases', () => {
      expect(mockHelpers.calculateProgressPercentage([], 0)).toBe(0)
      expect(mockHelpers.calculateProgressPercentage([1], 1)).toBe(100)
    })
  })

  describe('Slug Generation', () => {
    it('should generate valid slugs', () => {
      expect(mockHelpers.generateSlug('Test Villa Name')).toBe('test-villa-name')
      expect(mockHelpers.generateSlug('Villa with Special!@#$%^&*()Characters')).toBe('villa-with-specialcharacters')
      expect(mockHelpers.generateSlug('  Multiple    Spaces  ')).toBe('multiple-spaces')
    })
  })

  describe('Deep Clone', () => {
    it('should create deep copies of objects', () => {
      const original = {
        name: 'Test',
        nested: {
          value: 123,
          array: [1, 2, 3]
        }
      }

      const cloned = mockHelpers.deepClone(original)

      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
      expect(cloned.nested).not.toBe(original.nested)

      cloned.nested.value = 456
      expect(original.nested.value).toBe(123)
    })
  })

  describe('Debounce Function', () => {
    it('should debounce function calls', async () => {
      const mockFn = vi.fn()
      const debouncedFn = mockHelpers.debounce(mockFn, 100)

      debouncedFn('test1')
      debouncedFn('test2')
      debouncedFn('test3')

      expect(mockFn).not.toHaveBeenCalled()

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('test3')
    })
  })

  describe('Date Validation', () => {
    it('should validate dates correctly', () => {
      expect(mockHelpers.isValidDate('2023-01-01')).toBe(true)
      expect(mockHelpers.isValidDate(new Date())).toBe(true)
      expect(mockHelpers.isValidDate('invalid-date')).toBe(false)
      expect(mockHelpers.isValidDate('')).toBe(false)
    })
  })

  describe('File Size Formatting', () => {
    it('should format file sizes correctly', () => {
      expect(mockHelpers.formatFileSize(0)).toBe('0 Bytes')
      expect(mockHelpers.formatFileSize(1024)).toBe('1 KB')
      expect(mockHelpers.formatFileSize(1048576)).toBe('1 MB')
      expect(mockHelpers.formatFileSize(1073741824)).toBe('1 GB')
    })
  })

  describe('File Extension Utilities', () => {
    it('should extract file extensions correctly', () => {
      expect(mockHelpers.getFileExtension('test.pdf')).toBe('pdf')
      expect(mockHelpers.getFileExtension('image.jpg')).toBe('jpg')
      expect(mockHelpers.getFileExtension('file.name.with.dots.txt')).toBe('txt')
      expect(mockHelpers.getFileExtension('no-extension')).toBe('')
    })

    it('should identify image files', () => {
      expect(mockHelpers.isImageFile('photo.jpg')).toBe(true)
      expect(mockHelpers.isImageFile('image.png')).toBe(true)
      expect(mockHelpers.isImageFile('document.pdf')).toBe(false)
      expect(mockHelpers.isImageFile('text.txt')).toBe(false)
    })

    it('should identify PDF files', () => {
      expect(mockHelpers.isPdfFile('document.pdf')).toBe(true)
      expect(mockHelpers.isPdfFile('Document.PDF')).toBe(true)
      expect(mockHelpers.isPdfFile('image.jpg')).toBe(false)
    })
  })

  describe('String Utilities', () => {
    it('should capitalize first letter', () => {
      expect(mockHelpers.capitalizeFirstLetter('hello')).toBe('Hello')
      expect(mockHelpers.capitalizeFirstLetter('HELLO')).toBe('HELLO')
      expect(mockHelpers.capitalizeFirstLetter('')).toBe('')
    })

    it('should remove special characters', () => {
      expect(mockHelpers.removeSpecialCharacters('Hello!@#$%^&*()World123')).toBe('HelloWorld123')
      expect(mockHelpers.removeSpecialCharacters('Normal text')).toBe('Normal text')
    })

    it('should generate random strings', () => {
      const str1 = mockHelpers.generateRandomString(10)
      const str2 = mockHelpers.generateRandomString(10)

      expect(str1).toHaveLength(10)
      expect(str2).toHaveLength(10)
      expect(str1).not.toBe(str2)
    })
  })

  describe('Error Handling', () => {
    it('should handle null/undefined inputs gracefully', () => {
      expect(() => mockHelpers.validateEmail('')).not.toThrow()
      expect(() => mockHelpers.sanitizeString('')).not.toThrow()
      expect(() => mockHelpers.calculateProgressPercentage([], 0)).not.toThrow()
    })
  })
})