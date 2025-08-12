// ================================================================
// src/services/fallbackService.ts
// ================================================================

import { TransformedBookData, IsbnLookupResult } from '@/types/bookData';
import { validateIsbn } from '@/utils/isbn';

export interface FallbackBookData {
  isbn: string;
  title: string;
  source: 'manual' | 'cache' | 'static';
  confidence: 'low' | 'medium' | 'high';
}

export class FallbackService {
  private staticBookData: Map<string, FallbackBookData> = new Map();

  constructor() {
    this.initializeStaticData();
  }

  /**
   * Get fallback book data when API is unavailable
   */
  getFallbackBook(isbn: string): IsbnLookupResult | null {
    const validation = validateIsbn(isbn);
    if (!validation.isValid) {
      return null;
    }

    const normalizedIsbn = validation.normalizedIsbn!;
    
    // Check static data first
    const staticData = this.staticBookData.get(normalizedIsbn);
    if (staticData) {
      return {
        success: true,
        isbn: normalizedIsbn,
        book: this.convertToTransformedBook(staticData),
        source: 'api', // Maintain consistency with main service
      };
    }

    // Generate minimal book data based on ISBN
    const fallbackBook = this.generateMinimalBook(normalizedIsbn);
    return {
      success: true,
      isbn: normalizedIsbn,
      book: fallbackBook,
      source: 'api',
    };
  }

  /**
   * Add manual book data for common ISBNs
   */
  addStaticBookData(isbn: string, bookData: Partial<FallbackBookData>): boolean {
    const validation = validateIsbn(isbn);
    if (!validation.isValid) {
      return false;
    }

    const normalizedIsbn = validation.normalizedIsbn!;
    this.staticBookData.set(normalizedIsbn, {
      isbn: normalizedIsbn,
      title: bookData.title || `Book ${normalizedIsbn}`,
      source: bookData.source || 'manual',
      confidence: bookData.confidence || 'medium',
    });

    return true;
  }

  /**
   * Generate minimal book data when no information is available
   */
  private generateMinimalBook(isbn: string): TransformedBookData {
    return {
      isbnCode: isbn,
      title: `Book ${isbn.substring(isbn.length - 4)}`, // Use last 4 digits
      authors: [
        {
          name: 'Unknown',
          surname: 'Author',
          fullName: 'Unknown Author',
          nationality: undefined,
        },
      ],
      categories: [
        {
          name: 'Unknown',
          type: 'subject',
        },
      ],
      subtitle: undefined,
      editionNumber: undefined,
      editionDate: undefined,
      publishers: undefined,
      pages: undefined,
      language: undefined,
      coverUrls: undefined,
      description: undefined,
      physicalFormat: undefined,
      weight: undefined,
      dimensions: undefined,
    };
  }

  private convertToTransformedBook(fallbackData: FallbackBookData): TransformedBookData {
    return {
      isbnCode: fallbackData.isbn,
      title: fallbackData.title,
      authors: [
        {
          name: 'Unknown',
          surname: 'Author',
          fullName: 'Unknown Author',
          nationality: undefined,
        },
      ],
      categories: [
        {
          name: 'General',
          type: 'subject',
        },
      ],
      subtitle: undefined,
      editionNumber: undefined,
      editionDate: undefined,
      publishers: undefined,
      pages: undefined,
      language: undefined,
      coverUrls: undefined,
      description: `Book information from ${fallbackData.source} source (${fallbackData.confidence} confidence)`,
      physicalFormat: undefined,
      weight: undefined,
      dimensions: undefined,
    };
  }

  /**
   * Initialize with some common book data
   */
  private initializeStaticData(): void {
    const commonBooks = [
      {
        isbn: '9780451524935',
        title: '1984',
        confidence: 'high' as const,
      },
      {
        isbn: '9780486284736',
        title: 'Pride and Prejudice',
        confidence: 'high' as const,
      },
      {
        isbn: '9780060883287',
        title: 'One Hundred Years of Solitude',
        confidence: 'high' as const,
      },
    ];

    commonBooks.forEach(book => {
      this.addStaticBookData(book.isbn, {
        title: book.title,
        source: 'static',
        confidence: book.confidence,
      });
    });
  }

  /**
   * Get statistics about fallback data
   */
  getStats(): {
    staticDataCount: number;
    availableIsbns: string[];
  } {
    return {
      staticDataCount: this.staticBookData.size,
      availableIsbns: Array.from(this.staticBookData.keys()),
    };
  }

  /**
   * Clear all static data
   */
  clearStaticData(): void {
    this.staticBookData.clear();
    this.initializeStaticData(); // Reinitialize with defaults
  }
}