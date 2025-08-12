// ================================================================
// tests/utils/validation.test.ts
// ================================================================

import {
  validateAuthor,
  validateCategory,
  validateBook,
  validatePagination,
} from '@/utils/validation';

describe('Validation Utils', () => {
  describe('validateAuthor', () => {
    it('should validate correct author data', () => {
      const authorData = {
        name: 'John',
        surname: 'Doe',
        nationality: 'American',
      };

      const result = validateAuthor(authorData);
      expect(result.error).toBeUndefined();
    });

    it('should reject author without required fields', () => {
      const authorData = {
        name: 'John',
        // missing surname
      };

      const result = validateAuthor(authorData);
      expect(result.error).toBeDefined();
    });

    it('should reject author with invalid name length', () => {
      const authorData = {
        name: '', // too short
        surname: 'Doe',
      };

      const result = validateAuthor(authorData);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateCategory', () => {
    it('should validate correct category data', () => {
      const categoryData = {
        name: 'Fiction',
      };

      const result = validateCategory(categoryData);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty category name', () => {
      const categoryData = {
        name: '',
      };

      const result = validateCategory(categoryData);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateBook', () => {
    it('should validate correct book data', () => {
      const bookData = {
        isbnCode: '9780415127394',
        title: 'Test Book',
        status: 'in progress',
      };

      const result = validateBook(bookData);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid ISBN format', () => {
      const bookData = {
        isbnCode: 'invalid-isbn',
        title: 'Test Book',
      };

      const result = validateBook(bookData);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid status', () => {
      const bookData = {
        isbnCode: '9780415127394',
        title: 'Test Book',
        status: 'invalid-status',
      };

      const result = validateBook(bookData);
      expect(result.error).toBeDefined();
    });
  });

  describe('validatePagination', () => {
    it('should validate correct pagination data', () => {
      const paginationData = {
        page: 1,
        limit: 20,
      };

      const result = validatePagination(paginationData);
      expect(result.error).toBeUndefined();
    });

    it('should apply default values', () => {
      const result = validatePagination({});
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(20);
    });
  });
});