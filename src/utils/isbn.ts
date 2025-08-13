// ================================================================
// src/utils/isbn.ts
// ================================================================

import { ISBN_ERROR_MESSAGES } from './constants';

export interface IsbnValidationResult {
  isValid: boolean;
  normalizedIsbn?: string;
  format?: 'ISBN-10' | 'ISBN-13';
  error?: string;
}

export class IsbnUtils {
  /**
   * Validates and normalizes an ISBN string
   * @param isbn - Raw ISBN string from scanner or user input
   * @returns Validation result with normalized ISBN
   */
  static validate(isbn: string): IsbnValidationResult {
    if (!isbn || typeof isbn !== 'string') {
      return {
        isValid: false,
        error: ISBN_ERROR_MESSAGES.ISBN_REQUIRED,
      };
    }

    // Clean the ISBN - remove spaces, hyphens, and other non-alphanumeric characters
    const cleanIsbn = isbn.replace(/[^0-9A-Z]/gi, '').toUpperCase();

    if (cleanIsbn.length === 0) {
      return {
        isValid: false,
        error: ISBN_ERROR_MESSAGES.NO_VALID_ISBN_FOUND,
      };
    }

    // Check for ISBN-10
    if (cleanIsbn.length === 10) {
      const isbn10Result = IsbnUtils.validateIsbn10(cleanIsbn);
      if (isbn10Result.isValid) {
        // Convert ISBN-10 to ISBN-13 for consistency
        const isbn13 = IsbnUtils.convertIsbn10ToIsbn13(cleanIsbn);
        return {
          isValid: true,
          normalizedIsbn: isbn13,
          format: 'ISBN-10',
        };
      }
      return isbn10Result;
    }

    // Check for ISBN-13
    if (cleanIsbn.length === 13) {
      return IsbnUtils.validateIsbn13(cleanIsbn);
    }

    return {
      isValid: false,
      error: ISBN_ERROR_MESSAGES.INVALID_ISBN_LENGTH + `: ${cleanIsbn.length}.` + ISBN_ERROR_MESSAGES.EXPECTED_LENGTH,
    };
  }

  /**
   * Validates ISBN-10 format and checksum
   */
  private static validateIsbn10(isbn: string): IsbnValidationResult {
    if (isbn.length !== 10) {
      return {
        isValid: false,
        error: ISBN_ERROR_MESSAGES.ISBN_10_MUST_BE_10_CHAR,
      };
    }

    // Check that first 9 characters are digits
    const firstNine = isbn.substring(0, 9);
    if (!/^\d{9}$/.test(firstNine)) {
      return {
        isValid: false,
        error: ISBN_ERROR_MESSAGES.ISBN_10_MUST_BE_DIGITS,
      };
    }

    // Last character can be digit or X
    const checkChar = isbn.charAt(9);
    if (!/^[\dX]$/.test(checkChar)) {
      return {
        isValid: false,
        error: ISBN_ERROR_MESSAGES.ISBN_10_LAST_CHAR,
      };
    }

    // Validate checksum
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(firstNine.charAt(i)) * (10 - i);
    }

    const checkValue = checkChar === 'X' ? 10 : parseInt(checkChar);
    sum += checkValue;

    if (sum % 11 !== 0) {
      return {
        isValid: false,
        error: ISBN_ERROR_MESSAGES.ISBN_10_INVALID_CHECKSUM,
      };
    }

    return {
      isValid: true,
      normalizedIsbn: isbn,
      format: 'ISBN-10',
    };
  }

  /**
   * Validates ISBN-13 format and checksum
   */
  private static validateIsbn13(isbn: string): IsbnValidationResult {
    if (isbn.length !== 13) {
      return {
        isValid: false,
        error: ISBN_ERROR_MESSAGES.ISBN_13_MUST_BE_13_CHAR,
      };
    }

    // Check that all characters are digits
    if (!/^\d{13}$/.test(isbn)) {
      return {
        isValid: false,
        error: ISBN_ERROR_MESSAGES.ISBN_13_DIGITS_ONLY,
      };
    }

    // Check prefix (must start with 978 or 979)
    const prefix = isbn.substring(0, 3);
    if (prefix !== '978' && prefix !== '979') {
      return {
        isValid: false,
        error: ISBN_ERROR_MESSAGES.ISBN_13_PREFIX,
      };
    }

    // Validate checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbn.charAt(i));
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }

    const checkDigit = parseInt(isbn.charAt(12));
    const calculatedCheck = (10 - (sum % 10)) % 10;

    if (checkDigit !== calculatedCheck) {
      return {
        isValid: false,
        error: ISBN_ERROR_MESSAGES.ISBN_13_INVALID_CHECKSUM,
      };
    }

    return {
      isValid: true,
      normalizedIsbn: isbn,
      format: 'ISBN-13',
    };
  }

  /**
   * Converts ISBN-10 to ISBN-13
   */
  private static convertIsbn10ToIsbn13(isbn10: string): string {
    // Remove check digit and add 978 prefix
    const base = '978' + isbn10.substring(0, 9);

    // Calculate new check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(base.charAt(i));
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return base + checkDigit.toString();
  }

  /**
   * Formats ISBN with standard hyphens for display
   */
  static formatForDisplay(isbn: string): string {
    const validation = IsbnUtils.validate(isbn);
    if (!validation.isValid || !validation.normalizedIsbn) {
      return isbn; // Return original if invalid
    }

    const normalizedIsbn = validation.normalizedIsbn;

    if (normalizedIsbn.length === 13) {
      // Format ISBN-13: 978-0-123-45678-9
      return `${normalizedIsbn.substring(0, 3)}-${normalizedIsbn.substring(3, 4)}-${normalizedIsbn.substring(4, 7)}-${normalizedIsbn.substring(7, 12)}-${normalizedIsbn.substring(12)}`;
    }

    if (normalizedIsbn.length === 10) {
      // Format ISBN-10: 0-123-45678-9
      return `${normalizedIsbn.substring(0, 1)}-${normalizedIsbn.substring(1, 4)}-${normalizedIsbn.substring(4, 9)}-${normalizedIsbn.substring(9)}`;
    }

    return normalizedIsbn;
  }

  /**
   * Quick check if a string could be an ISBN
   */
  static isLikelyIsbn(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    const cleaned = input.replace(/[^0-9X]/gi, '');
    return cleaned.length === 10 || cleaned.length === 13;
  }

  /**
   * Extract potential ISBN from a longer string
   */
  static extractIsbn(input: string): string | null {
    if (!input || typeof input !== 'string') {
      return null;
    }

    // Look for 13-digit sequences
    const isbn13Match = input.match(/\b\d{13}\b/);
    if (isbn13Match) {
      const result = IsbnUtils.validate(isbn13Match[0]);
      if (result.isValid) {
        return result.normalizedIsbn!;
      }
    }

    // Look for 10-digit sequences (with possible X at end)
    const isbn10Match = input.match(/\b\d{9}[\dX]\b/i);
    if (isbn10Match) {
      const result = IsbnUtils.validate(isbn10Match[0]);
      if (result.isValid) {
        return result.normalizedIsbn!;
      }
    }

    return null;
  }
}

// Export convenience functions
export const validateIsbn = IsbnUtils.validate;
export const formatIsbn = IsbnUtils.formatForDisplay;
export const isValidIsbn = (isbn: string): boolean => IsbnUtils.validate(isbn).isValid;
export const normalizeIsbn = (isbn: string): string | null => {
  const result = IsbnUtils.validate(isbn);
  return result.isValid ? result.normalizedIsbn! : null;
};