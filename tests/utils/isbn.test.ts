// ================================================================
// tests/utils/isbn.test.ts
// ================================================================

import { IsbnUtils, validateIsbn, formatIsbn, isValidIsbn, normalizeIsbn } from '@/utils/isbn';

describe('IsbnUtils', () => {
  describe('validate', () => {
    describe('Valid ISBNs', () => {
      it('should validate correct ISBN-13', () => {
        const result = IsbnUtils.validate('9780451524935');
        
        expect(result.isValid).toBe(true);
        expect(result.normalizedIsbn).toBe('9780451524935');
        expect(result.format).toBe('ISBN-13');
        expect(result.error).toBeUndefined();
      });

      it('should validate correct ISBN-10 and convert to ISBN-13', () => {
        const result = IsbnUtils.validate('0451524934');
        
        expect(result.isValid).toBe(true);
        expect(result.normalizedIsbn).toBe('9780451524935');
        expect(result.format).toBe('ISBN-10');
        expect(result.error).toBeUndefined();
      });

      it('should validate ISBN-10 with X check digit', () => {
        const result = IsbnUtils.validate('043942089X');
        
        expect(result.isValid).toBe(true);
        expect(result.format).toBe('ISBN-10');
        expect(result.error).toBeUndefined();
      });

      it('should handle ISBNs with hyphens and spaces', () => {
        const result = IsbnUtils.validate('978-0-451-52493-5');
        
        expect(result.isValid).toBe(true);
        expect(result.normalizedIsbn).toBe('9780451524935');
      });

      it('should handle ISBNs with mixed formatting', () => {
        const result = IsbnUtils.validate(' 978 0451 524935 ');
        
        expect(result.isValid).toBe(true);
        expect(result.normalizedIsbn).toBe('9780451524935');
      });
    });

    describe('Invalid ISBNs', () => {
      it('should reject empty string', () => {
        const result = IsbnUtils.validate('');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('ISBN is required');
      });

      it('should reject null/undefined', () => {
        const result1 = IsbnUtils.validate(null as any);
        const result2 = IsbnUtils.validate(undefined as any);
        
        expect(result1.isValid).toBe(false);
        expect(result2.isValid).toBe(false);
      });

      it('should reject wrong length', () => {
        const result = IsbnUtils.validate('123456789');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid ISBN length');
      });

      it('should reject ISBN-13 with wrong prefix', () => {
        const result = IsbnUtils.validate('1234567890123');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must start with 978 or 979');
      });

      it('should reject ISBN-13 with invalid checksum', () => {
        const result = IsbnUtils.validate('9780451524934'); // Last digit should be 5
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid ISBN-13 checksum');
      });

      it('should reject ISBN-10 with invalid checksum', () => {
        const result = IsbnUtils.validate('0451524933'); // Last digit should be 4
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid ISBN-10 checksum');
      });

      it('should reject ISBN-10 with invalid characters', () => {
        const result = IsbnUtils.validate('045152493A'); // A is not valid (only X allowed)
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must be a digit or X');
      });

      it('should reject string with no valid characters', () => {
        const result = IsbnUtils.validate('ABC-DEF-GHI');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('ISBN contains no valid characters');
      });
    });
  });

  describe('formatForDisplay', () => {
    it('should format valid ISBN-13 with hyphens', () => {
      const formatted = IsbnUtils.formatForDisplay('9780451524935');
      
      expect(formatted).toBe('978-0-451-52493-5');
    });

    it('should format valid ISBN-10 with hyphens', () => {
      const formatted = IsbnUtils.formatForDisplay('0451524934');
      
      expect(formatted).toBe('978-0-451-52493-5'); // Converts to ISBN-13 first
    });

    it('should return original string for invalid ISBN', () => {
      const formatted = IsbnUtils.formatForDisplay('invalid');
      
      expect(formatted).toBe('invalid');
    });
  });

  describe('isLikelyIsbn', () => {
    it('should return true for 10-digit strings', () => {
      expect(IsbnUtils.isLikelyIsbn('1234567890')).toBe(true);
      expect(IsbnUtils.isLikelyIsbn('123456789X')).toBe(true);
    });

    it('should return true for 13-digit strings', () => {
      expect(IsbnUtils.isLikelyIsbn('1234567890123')).toBe(true);
    });

    it('should return true for formatted ISBNs', () => {
      expect(IsbnUtils.isLikelyIsbn('978-0-451-52493-5')).toBe(true);
      expect(IsbnUtils.isLikelyIsbn('0-451-52493-4')).toBe(true);
    });

    it('should return false for invalid lengths', () => {
      expect(IsbnUtils.isLikelyIsbn('12345')).toBe(false);
      expect(IsbnUtils.isLikelyIsbn('12345678901234')).toBe(false);
    });

    it('should return false for empty/null', () => {
      expect(IsbnUtils.isLikelyIsbn('')).toBe(false);
      expect(IsbnUtils.isLikelyIsbn(null as any)).toBe(false);
    });
  });

  describe('extractIsbn', () => {
    it('should extract ISBN-13 from longer text', () => {
      const text = 'The book ISBN is 9780451524935 and it costs $15';
      const extracted = IsbnUtils.extractIsbn(text);
      
      expect(extracted).toBe('9780451524935');
    });

    it('should extract ISBN-10 from longer text', () => {
      const text = 'Book code: 0451524934 - in stock';
      const extracted = IsbnUtils.extractIsbn(text);
      
      expect(extracted).toBe('9780451524935'); // Converted to ISBN-13
    });

    it('should return null if no valid ISBN found', () => {
      const text = 'No ISBN in this text 123456';
      const extracted = IsbnUtils.extractIsbn(text);
      
      expect(extracted).toBeNull();
    });

    it('should prioritize ISBN-13 over ISBN-10', () => {
      const text = 'Old: 0451524934 New: 9780451524935';
      const extracted = IsbnUtils.extractIsbn(text);
      
      expect(extracted).toBe('9780451524935');
    });
  });

  describe('convenience functions', () => {
    it('validateIsbn should work', () => {
      const result = validateIsbn('9780451524935');
      expect(result.isValid).toBe(true);
    });

    it('formatIsbn should work', () => {
      const formatted = formatIsbn('9780451524935');
      expect(formatted).toBe('978-0-451-52493-5');
    });

    it('isValidIsbn should work', () => {
      expect(isValidIsbn('9780451524935')).toBe(true);
      expect(isValidIsbn('invalid')).toBe(false);
    });

    it('normalizeIsbn should work', () => {
      expect(normalizeIsbn('978-0-451-52493-5')).toBe('9780451524935');
      expect(normalizeIsbn('invalid')).toBeNull();
    });
  });
});