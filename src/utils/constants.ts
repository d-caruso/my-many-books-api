// ================================================================
// src/utils/constants.ts (add database constants)
// ================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
  BOOK_NOT_FOUND: 'Book not found',
  BOOK_ALREADY_EXISTS: 'Book with this ISBN already exists',
  INVALID_REQUEST_BODY: 'Invalid request body',
  DATABASE_ERROR: 'Database operation failed',
  EXTERNAL_API_ERROR: 'External API request failed',
  INVALID_BOOK_STATUS: 'Invalid book status',
  CONNECTION_ERROR: 'Database connection failed',
  MISSING_REQUIRED_FIELDS: 'Missing required fields',
} as const;

export const BOOK_STATUS = {
  IN_PROGRESS: 'in progress',
  PAUSED: 'paused',
  FINISHED: 'finished',
} as const;

export const API_ENDPOINTS = {
  OPEN_LIBRARY: 'https://openlibrary.org/api/books',
} as const;

export const DATABASE_CONFIG = {
  DIALECT: 'mysql' as const,
  TIMEZONE: '+00:00',
  POOL: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Database table names
export const TABLE_NAMES = {
  BOOKS: 'books',
  AUTHORS: 'authors',
  CATEGORIES: 'categories',
  BOOK_AUTHORS: 'book_authors',
  BOOK_CATEGORIES: 'book_categories',
} as const;

// Validation constants
export const VALIDATION_RULES = {
  ISBN: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 13,
  },
  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  AUTHOR_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  CATEGORY_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  NOTES: {
    MAX_LENGTH: 2000,
  },
} as const;

export const ISBN_CONSTANTS = {
  ISBN_10_LENGTH: 10,
  ISBN_13_LENGTH: 13,
  VALID_PREFIXES: ['978', '979'],
  REGEX: {
    DIGITS_ONLY: /^\d+$/,
    ISBN_10: /^\d{9}[\dX]$/i,
    ISBN_13: /^\d{13}$/,
    EXTRACT_13: /\b\d{13}\b/g,
    EXTRACT_10: /\b\d{9}[\dX]\b/gi,
  },
} as const;

export const ISBN_ERROR_MESSAGES = {
  INVALID_ISBN_LENGTH: 'Invalid ISBN length',
  EXPECTED_LENGTH: 'Expected 10 or 13 digits',
  ISBN_REQUIRED: 'ISBN is required',
  ISBN_10_MUST_BE_10_CHAR: 'ISBN-10 must be exactly 10 characters',
  ISBN_13_MUST_BE_13_CHAR: 'ISBN-13 must be exactly 13 characters',
  ISBN_10_MUST_BE_DIGITS: 'First 9 characters of ISBN-10 must be digits',
  ISBN_10_LAST_CHAR: 'Last character of ISBN-10 must be a digit or X',
  ISBN_13_PREFIX: 'ISBN-13 must start with 978 or 979',
  ISBN_13_DIGITS_ONLY: 'ISBN-13 must contain only digits',
  ISBN_10_INVALID_CHECKSUM: 'Invalid ISBN-10 checksum',
  ISBN_13_INVALID_CHECKSUM: 'Invalid ISBN-13 checksum',
} as const;