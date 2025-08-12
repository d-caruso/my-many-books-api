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
  INVALID_ISBN: 'Invalid ISBN format',
  BOOK_NOT_FOUND: 'Book not found',
  BOOK_ALREADY_EXISTS: 'Book with this ISBN already exists',
  INVALID_REQUEST_BODY: 'Invalid request body',
  DATABASE_ERROR: 'Database operation failed',
  EXTERNAL_API_ERROR: 'External API request failed',
  INVALID_BOOK_STATUS: 'Invalid book status',
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
  DIALECT: 'mysql',
  TIMEZONE: '+00:00',
  POOL: {
    MAX: 5,
    MIN: 0,
    ACQUIRE: 30000,
    IDLE: 10000,
  },
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;