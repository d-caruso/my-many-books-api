// ================================================================
// tests/services/dataTransformer.test.ts
// ================================================================

import { DataTransformer } from '@/services/dataTransformer';
import { OpenLibraryBook } from '@/types/openLibrary';

describe('DataTransformer', () => {
  describe('transformBook', () => {
    it('should transform basic book data correctly', () => {
      const olBook: OpenLibraryBook = {
        title: 'Test Book',
        subtitle: 'A Test Subtitle',
        authors: [{ name: 'John Doe' }],
        subjects: ['Fiction', 'Science Fiction'],
        publishers: ['Test Publisher'],
        publish_date: '2023',
        number_of_pages: 300,
      };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      expect(result.isbnCode).toBe('9780451524935');
      expect(result.title).toBe('Test Book');
      expect(result.subtitle).toBe('A Test Subtitle');
      expect(result.authors).toHaveLength(1);
      expect(result.authors[0]!.name).toBe('John');
      expect(result.authors[0]!.surname).toBe('Doe');
      expect(result.categories).toHaveLength(2);
      expect(result.publishers).toEqual(['Test Publisher']);
      expect(result.pages).toBe(300);
    });

    it('should handle missing title gracefully', () => {
      const olBook: OpenLibraryBook = {
        authors: [{ name: 'Jane Smith' }],
      };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      expect(result.title).toBe('Unknown Title');
    });

    it('should parse author names correctly', () => {
      const olBook: OpenLibraryBook = {
        title: 'Test',
        authors: [
          { name: 'John Doe' },
          { name: 'Smith, Jane' },
          { name: 'Gabriel García Márquez' },
          { name: 'Cher' },
        ],
      };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      expect(result.authors).toHaveLength(4);
      expect(result.authors[0]).toEqual({
        name: 'John',
        surname: 'Doe',
        fullName: 'John Doe',
        nationality: undefined,
      });
      expect(result.authors[1]).toEqual({
        name: 'Jane',
        surname: 'Smith',
        fullName: 'Smith, Jane',
        nationality: undefined,
      });
      expect(result.authors[2]).toEqual({
        name: 'Gabriel García',
        surname: 'Márquez',
        fullName: 'Gabriel García Márquez',
        nationality: undefined,
      });
      expect(result.authors[3]).toEqual({
        name: 'Cher',
        surname: '',
        fullName: 'Cher',
        nationality: undefined,
      });
    });

    it('should extract categories from multiple sources', () => {
      const olBook: OpenLibraryBook = {
        title: 'Test',
        subjects: ['Fiction', 'Science Fiction'],
        subject_places: ['New York', 'Mars'],
        subject_times: ['21st century', 'Future'],
      };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      expect(result.categories).toHaveLength(6);
      expect(result.categories.find(c => c.name === 'Fiction' && c.type === 'subject')).toBeDefined();
      expect(result.categories.find(c => c.name === 'New York' && c.type === 'topic')).toBeDefined();
      expect(result.categories.find(c => c.name === '21st century' && c.type === 'topic')).toBeDefined();
    });

    it('should parse edition dates correctly', () => {
      const testCases = [
        { input: '2023', expected: 2023 },
        { input: 'January 15, 2023', expected: new Date('January 15, 2023') },
        { input: '2023-03-15', expected: new Date('2023-03-15') },
        { input: 'invalid date', expected: undefined },
      ];

      testCases.forEach(({ input, expected }) => {
        const olBook: OpenLibraryBook = {
          title: 'Test',
          publish_date: input,
        };

        const result = DataTransformer.transformBook(olBook, '9780451524935');

        if (typeof expected === 'number') {
          // For year-only inputs, just check the year
          expect(result.editionDate?.getFullYear()).toBe(expected);
        } else if (expected) {
          expect(result.editionDate?.getTime()).toBe(expected.getTime());
        } else {
          expect(result.editionDate).toBeUndefined();
        }
      });
    });

    it('should extract language correctly', () => {
      const olBook: OpenLibraryBook = {
        title: 'Test',
        languages: [{ key: '/languages/eng' }],
      };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      expect(result.language).toBe('English');
    });

    it('should deduplicate categories', () => {
      const olBook: OpenLibraryBook = {
        title: 'Test',
        subjects: ['Fiction', 'fiction', 'FICTION'], // Duplicates with different cases
        subject_places: ['Fiction'], // Different type but same name
      };

      const result = DataTransformer.transformBook(olBook, '9780451524935');

      // Should have 2 categories: Fiction (subject) and Fiction (topic)
      expect(result.categories).toHaveLength(2);
      expect(result.categories.filter(c => c.name === 'Fiction')).toHaveLength(2);
    });

    it('should throw error for invalid ISBN', () => {
      const olBook: OpenLibraryBook = { title: 'Test' };

      expect(() => {
        DataTransformer.transformBook(olBook, 'invalid-isbn');
      }).toThrow('Invalid ISBN provided for transformation');
    });
  });
});