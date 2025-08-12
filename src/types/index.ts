// Core entity types
export interface Book {
  id?: number;
  isbnCode: string;
  title: string;
  editionNumber?: number;
  editionDate?: Date;
  status?: BookStatus;
  notes?: string;
  creationDate?: Date;
  updateDate?: Date;
  authors?: Author[];
  categories?: Category[];
}

export interface Author {
  id?: number;
  name: string;
  surname: string;
  nationality?: string;
  creationDate?: Date;
  updateDate?: Date;
}

export interface Category {
  id?: number;
  name: string;
  creationDate?: Date;
  updateDate?: Date;
}

export type BookStatus = 'in progress' | 'paused' | 'finished';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// External API types
export interface OpenLibraryBook {
  title?: string;
  authors?: Array<{ name: string }>;
  subjects?: string[];
  publish_date?: string;
  publishers?: string[];
  number_of_pages?: number;
  isbn_10?: string[];
  isbn_13?: string[];
}

// AWS Lambda types
export interface LambdaEvent {
  httpMethod: string;
  resource: string;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  body?: string;
  headers?: Record<string, string>;
}

export interface LambdaResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

// Database operation types
export interface BookSearchParams {
  isbn?: string;
  title?: string;
  author?: string;
  status?: BookStatus;
  page?: number;
  limit?: number;
}

export interface CreateBookRequest {
  isbnCode: string;
  title: string;
  authors?: Array<{ name: string; surname: string; nationality?: string }>;
  categories?: Array<{ name: string }>;
  editionNumber?: number;
  editionDate?: string;
  status?: BookStatus;
  notes?: string;
}

export interface UpdateBookRequest extends Partial<CreateBookRequest> {
  id: number;
}

// RDS Control types
export interface DatabaseControlResponse {
  status: 'starting' | 'stopping' | 'available' | 'stopped';
  message: string;
}