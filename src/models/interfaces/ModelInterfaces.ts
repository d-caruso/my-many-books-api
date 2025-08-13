// ================================================================
// src/models/interfaces/ModelInterfaces.ts
// ================================================================

import { BaseModelAttributes } from '../base/BaseModel';
import { IdBaseModelAttributes } from '../base/IdBaseModel';

// Author interfaces
export interface AuthorAttributes extends IdBaseModelAttributes {
  name: string;
  surname: string;
  nationality?: string | null;
}

export interface AuthorCreationAttributes extends Omit<AuthorAttributes, 'id' | 'creationDate' | 'updateDate'> {}

// Category interfaces
export interface CategoryAttributes extends IdBaseModelAttributes {
  name: string;
}

export interface CategoryCreationAttributes extends Omit<CategoryAttributes, 'id' | 'creationDate' | 'updateDate'> {}

// Book interfaces
export interface BookAttributes extends IdBaseModelAttributes {
  isbnCode: string;
  title: string;
  editionNumber?: number | undefined;
  editionDate?: Date | undefined;
  status?: BookStatus | undefined;
  notes?: string | undefined;
  userId?: number | undefined;
}

export interface BookCreationAttributes extends Omit<BookAttributes, 'id' | 'creationDate' | 'updateDate'> {}

export interface BookUpdateAttributes extends Omit<Partial<BookAttributes>, 'id' | 'creationDate'> {}

// Junction table interfaces
export interface BookAuthorAttributes extends BaseModelAttributes {
  bookId: number;
  authorId: number;
}

export interface BookAuthorCreationAttributes extends Omit<BookAuthorAttributes, 'creationDate' | 'updateDate'> {}

export interface BookCategoryAttributes extends BaseModelAttributes {
  bookId: number;
  categoryId: number;
}

export interface BookCategoryCreationAttributes extends Omit<BookCategoryAttributes, 'creationDate' | 'updateDate'> {}

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
  book: BookUpdateAttributes;
  authors?: AuthorCreationAttributes[];
  categories?: CategoryCreationAttributes[];
}

// User interfaces
export interface UserAttributes extends IdBaseModelAttributes {
  email: string;
  name: string;
  surname: string;
  isActive: boolean;
}

export interface UserCreationAttributes extends Omit<UserAttributes, 'id' | 'creationDate' | 'updateDate'> {}

export interface UserUpdateAttributes extends Omit<Partial<UserAttributes>, 'id' | 'creationDate'> {}

// Authentication interface for middleware context
export interface AuthUser {
  userId: number;          // Database user ID (primary key)
  email: string;           // For logging/debugging
  provider: string;        // Auth provider used
  providerUserId?: string; // External auth system ID
  isNewUser?: boolean;     // Helpful for onboarding flows
}