// ================================================================
// src/models/interfaces/ModelInterfaces.ts
// ================================================================

import { BaseModelAttributes } from '../base/BaseModel';

// Author interfaces
export interface AuthorAttributes extends BaseModelAttributes {
  name: string;
  surname: string;
  nationality?: string | null;
}

export interface AuthorCreationAttributes extends Omit<AuthorAttributes, 'id' | 'creationDate' | 'updateDate'> {}

// Category interfaces
export interface CategoryAttributes extends BaseModelAttributes {
  name: string;
}

export interface CategoryCreationAttributes extends Omit<CategoryAttributes, 'id' | 'creationDate' | 'updateDate'> {}

// Book interfaces
export interface BookAttributes extends BaseModelAttributes {
  isbnCode: string;
  title: string;
  editionNumber?: number;
  editionDate?: Date;
  status?: BookStatus;
  notes?: string;
}

export interface BookCreationAttributes extends Omit<BookAttributes, 'id' | 'creationDate' | 'updateDate'> {}

// Junction table interfaces
export interface BookAuthorAttributes {
  bookId: number;
  authorId: number;
  creationDate: Date;
  updateDate?: Date;
}

export interface BookAuthorCreationAttributes {
  bookId: number;
  authorId: number;
}

export interface BookCategoryAttributes {
  bookId: number;
  categoryId: number;
  creationDate: Date;
  updateDate?: Date;
}

export interface BookCategoryCreationAttributes {
  bookId: number;
  categoryId: number;
}

// Enums and types
export type BookStatus = 'in progress' | 'paused' | 'finished';

// Response interfaces with associations
export interface BookWithAssociations extends BookAttributes {
  authors?: AuthorAttributes[];
  categories?: CategoryAttributes[];
}

export interface AuthorWithBooks extends AuthorAttributes {
  books?: BookAttributes[];
}

export interface CategoryWithBooks extends CategoryAttributes {
  books?: BookAttributes[];
}

// Database operation interfaces
export interface FindOptions {
  page?: number;
  limit?: number;
  include?: string[];
  where?: Record<string, unknown>;
  order?: Array<[string, 'ASC' | 'DESC']>;
}

export interface CreateBookWithAssociations {
  book: BookCreationAttributes;
  authors?: AuthorCreationAttributes[];
  categories?: CategoryCreationAttributes[];
}

export interface UpdateBookWithAssociations {
  book: Partial<BookAttributes>;
  authors?: AuthorCreationAttributes[];
  categories?: CategoryCreationAttributes[];
}