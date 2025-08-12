// ================================================================
// src/utils/validation.ts
// ================================================================

import Joi from 'joi';
import { VALIDATION_RULES, BOOK_STATUS } from './constants';

// Base validation schemas
export const baseValidationSchema = {
  id: Joi.number().integer().positive(),
  creationDate: Joi.date(),
  updateDate: Joi.date(),
};

// Author validation schemas
export const authorValidationSchema = {
  ...baseValidationSchema,
  name: Joi.string()
    .min(VALIDATION_RULES.AUTHOR_NAME.MIN_LENGTH)
    .max(VALIDATION_RULES.AUTHOR_NAME.MAX_LENGTH)
    .required(),
  surname: Joi.string()
    .min(VALIDATION_RULES.AUTHOR_NAME.MIN_LENGTH)
    .max(VALIDATION_RULES.AUTHOR_NAME.MAX_LENGTH)
    .required(),
  nationality: Joi.string().max(VALIDATION_RULES.AUTHOR_NAME.MAX_LENGTH).optional(),
};

// Category validation schemas
export const categoryValidationSchema = {
  ...baseValidationSchema,
  name: Joi.string()
    .min(VALIDATION_RULES.CATEGORY_NAME.MIN_LENGTH)
    .max(VALIDATION_RULES.CATEGORY_NAME.MAX_LENGTH)
    .required(),
};

// Book validation schemas
export const bookValidationSchema = {
  ...baseValidationSchema,
  isbnCode: Joi.string()
    .min(VALIDATION_RULES.ISBN.MIN_LENGTH)
    .max(VALIDATION_RULES.ISBN.MAX_LENGTH)
    .pattern(/^[\d-]+$/)
    .required(),
  title: Joi.string()
    .min(VALIDATION_RULES.TITLE.MIN_LENGTH)
    .max(VALIDATION_RULES.TITLE.MAX_LENGTH)
    .required(),
  editionNumber: Joi.number().integer().positive().optional(),
  editionDate: Joi.date().optional(),
  status: Joi.string()
    .valid(...Object.values(BOOK_STATUS))
    .optional(),
  notes: Joi.string().max(VALIDATION_RULES.NOTES.MAX_LENGTH).optional(),
};

// Validation functions
export const validateAuthor = (data: unknown): Joi.ValidationResult => {
  const schema = Joi.object(authorValidationSchema);
  return schema.validate(data);
};

export const validateCategory = (data: unknown): Joi.ValidationResult => {
  const schema = Joi.object(categoryValidationSchema);
  return schema.validate(data);
};

export const validateBook = (data: unknown): Joi.ValidationResult => {
  const schema = Joi.object(bookValidationSchema);
  return schema.validate(data);
};

export const validatePagination = (data: unknown): Joi.ValidationResult => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  });
  return schema.validate(data);
};
