// ================================================================
// src/types/openLibrary.ts
// ================================================================

export interface OpenLibraryResponse {
  [isbn: string]: OpenLibraryBook | undefined;
}

export interface OpenLibraryBook {
  title?: string;
  subtitle?: string;
  authors?: OpenLibraryAuthor[];
  subjects?: string[];
  subject_places?: string[];
  subject_times?: string[];
  publishers?: string[];
  publish_date?: string;
  publish_places?: string[];
  number_of_pages?: number;
  pagination?: string;
  physical_dimensions?: string;
  physical_format?: string;
  isbn_10?: string[];
  isbn_13?: string[];
  identifiers?: {
    isbn_10?: string[];
    isbn_13?: string[];
    lccn?: string[];
    oclc?: string[];
    goodreads?: string[];
    librarything?: string[];
  };
  url?: string;
  cover?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  notes?: string;
  weight?: string;
  languages?: OpenLibraryLanguage[];
  table_of_contents?: OpenLibraryTOC[];
  links?: OpenLibraryLink[];
  ebooks?: OpenLibraryEbook[];
}

export interface OpenLibraryAuthor {
  name: string;
  url?: string;
}

export interface OpenLibraryLanguage {
  key: string;
}

export interface OpenLibraryTOC {
  title?: string;
  type?: {
    key: string;
  };
  level?: number;
}

export interface OpenLibraryLink {
  title?: string;
  url?: string;
  type?: {
    key: string;
  };
}

export interface OpenLibraryEbook {
  preview_url?: string;
  availability?: string;
  formats?: Record<string, string>;
}