// ================================================================
// src/types/bookData.ts
// ================================================================

export interface TransformedBookData {
  isbnCode: string;
  title: string;
  subtitle?: string | undefined;
  authors: TransformedAuthorData[];
  categories: TransformedCategoryData[];
  editionNumber?: number | undefined;
  editionDate?: Date | undefined;
  publishers?: string[] | undefined;
  pages?: number | undefined;
  language?: string | undefined;
  coverUrls?: {
    small?: string | undefined;
    medium?: string | undefined;
    large?: string | undefined;
  } | undefined;
  description?: string | undefined;
  physicalFormat?: string | undefined;
  weight?: string | undefined;
  dimensions?: string | undefined;
}

export interface TransformedAuthorData {
  name: string;
  surname: string;
  fullName: string;
  nationality?: string | undefined;
}

export interface TransformedCategoryData {
  name: string;
  type: 'subject' | 'genre' | 'topic';
}

export interface IsbnLookupResult {
  success: boolean;
  isbn: string;
  book?: TransformedBookData | undefined;
  error?: string | undefined;
  source: 'cache' | 'api' | 'validation_error';
  responseTime?: number | undefined;
}

export interface BatchIsbnLookupResult {
  results: Record<string, IsbnLookupResult>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
    apiCalls: number;
  };
  errors: string[];
}