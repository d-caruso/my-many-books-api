// ================================================================
// src/controllers/BookController.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Joi from 'joi';
import { BaseController } from './base/BaseController';
import { Book, Author, Category } from '../models';
import { isbnService } from '../services/isbnService';
import { validateIsbn } from '../utils/isbn';

interface CreateBookRequest {
  title: string;
  subtitle?: string;
  isbn?: string;
  description?: string;
  publishedDate?: string;
  pageCount?: number;
  language?: string;
  publisher?: string;
  physicalFormat?: string;
  weight?: string;
  authorIds?: number[];
  categoryIds?: number[];
}


interface BookSearchFilters {
  title?: string;
  author?: string;
  category?: string;
  isbn?: string;
  publisher?: string;
  language?: string;
  publishedYear?: number;
}

export class BookController extends BaseController {
  private readonly createBookSchema = Joi.object<CreateBookRequest>({
    title: Joi.string().required().max(500).trim(),
    subtitle: Joi.string().optional().max(500).trim(),
    isbn: Joi.string().optional().custom(this.validateIsbnField),
    description: Joi.string().optional().max(5000).trim(),
    publishedDate: Joi.date().iso().optional(),
    pageCount: Joi.number().integer().min(1).max(50000).optional(),
    language: Joi.string().length(2).optional(),
    publisher: Joi.string().max(200).optional().trim(),
    physicalFormat: Joi.string().max(100).optional().trim(),
    weight: Joi.string().max(50).optional().trim(),
    authorIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    categoryIds: Joi.array().items(Joi.number().integer().positive()).optional(),
  });

  private readonly updateBookSchema = this.createBookSchema.fork(['title'], (schema) => schema.optional());

  private readonly searchFiltersSchema = Joi.object<BookSearchFilters>({
    title: Joi.string().max(200).optional().trim(),
    author: Joi.string().max(200).optional().trim(),
    category: Joi.string().max(100).optional().trim(),
    isbn: Joi.string().optional().custom(this.validateIsbnField),
    publisher: Joi.string().max(200).optional().trim(),
    language: Joi.string().length(2).optional(),
    publishedYear: Joi.number().integer().min(1000).max(new Date().getFullYear() + 10).optional(),
  });

  private validateIsbnField(value: string, helpers: Joi.CustomHelpers) {
    const validation = validateIsbn(value);
    if (!validation.isValid) {
      return helpers.error('any.invalid', { message: `Invalid ISBN: ${validation.error}` });
    }
    return validation.normalizedIsbn;
  }

  async createBook(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const body = this.parseBody<CreateBookRequest>(event);
      if (!body) {
        return this.createErrorResponse('Request body is required', 400);
      }

      const validation = this.validateRequest(body, this.createBookSchema);
      if (!validation.isValid) {
        return this.createErrorResponse('Validation failed', 400, validation.errors);
      }

      const bookData = validation.value!;

      // Check if book with ISBN already exists
      if (bookData.isbn) {
        const existingBook = await Book.findOne({ where: { isbnCode: bookData.isbn } });
        if (existingBook) {
          return this.createErrorResponse('Book with this ISBN already exists', 409);
        }
      }

      // Validate author IDs
      if (bookData.authorIds && bookData.authorIds.length > 0) {
        const authors = await Author.findAll({
          where: { id: bookData.authorIds },
          attributes: ['id'],
        });

        if (authors.length !== bookData.authorIds.length) {
          return this.createErrorResponse('One or more author IDs are invalid', 400);
        }
      }

      // Validate category IDs
      if (bookData.categoryIds && bookData.categoryIds.length > 0) {
        const categories = await Category.findAll({
          where: { id: bookData.categoryIds },
          attributes: ['id'],
        });

        if (categories.length !== bookData.categoryIds.length) {
          return this.createErrorResponse('One or more category IDs are invalid', 400);
        }
      }

      // Create book
      const book = await Book.create({
        title: bookData.title,
        isbnCode: bookData.isbn || '',
        editionDate: bookData.publishedDate ? new Date(bookData.publishedDate) : undefined,
        notes: bookData.description,
      } as any);

      // Associate authors
      if (bookData.authorIds && bookData.authorIds.length > 0) {
        const authors = await Author.findAll({ where: { id: bookData.authorIds } });
        await book.addAuthors(authors);
      }

      // Associate categories
      if (bookData.categoryIds && bookData.categoryIds.length > 0) {
        const categories = await Category.findAll({ where: { id: bookData.categoryIds } });
        await book.addCategories(categories);
      }

      // Fetch complete book with associations
      const createdBook = await Book.findByPk(book.id, {
        include: [
          { model: Author, through: { attributes: [] } },
          { model: Category, through: { attributes: [] } },
        ],
      });

      return this.createSuccessResponse(createdBook, 'Book created successfully', undefined, 201);
    });
  }

  async getBook(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const bookId = this.getPathParameter(event, 'id');
      if (!bookId || isNaN(Number(bookId))) {
        return this.createErrorResponse('Valid book ID is required', 400);
      }

      const book = await Book.findByPk(Number(bookId), {
        include: [
          { model: Author, through: { attributes: [] } },
          { model: Category, through: { attributes: [] } },
        ],
      });

      if (!book) {
        return this.createErrorResponse('Book not found', 404);
      }

      return this.createSuccessResponse(book);
    });
  }

  async updateBook(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const bookId = this.getPathParameter(event, 'id');
      if (!bookId || isNaN(Number(bookId))) {
        return this.createErrorResponse('Valid book ID is required', 400);
      }

      const body = this.parseBody<Partial<CreateBookRequest>>(event);
      if (!body) {
        return this.createErrorResponse('Request body is required', 400);
      }

      const validation = this.validateRequest(body, this.updateBookSchema);
      if (!validation.isValid) {
        return this.createErrorResponse('Validation failed', 400, validation.errors);
      }

      const book = await Book.findByPk(Number(bookId));
      if (!book) {
        return this.createErrorResponse('Book not found', 404);
      }

      const bookData = validation.value!;

      // Check if ISBN is being changed and if it conflicts
      if (bookData.isbn && bookData.isbn !== book.isbnCode) {
        const existingBook = await Book.findOne({ where: { isbnCode: bookData.isbn } });
        if (existingBook && existingBook.id !== book.id) {
          return this.createErrorResponse('Book with this ISBN already exists', 409);
        }
      }

      // Update book fields
      await book.update({
        title: bookData.title ?? book.title,
        isbnCode: bookData.isbn ?? book.isbnCode,
        notes: bookData.description ?? book.notes,
        editionDate: bookData.publishedDate ? new Date(bookData.publishedDate) : book.editionDate,
      });

      // Update associations if provided
      if (bookData.authorIds !== undefined) {
        if (bookData.authorIds.length > 0) {
          const authors = await Author.findAll({
            where: { id: bookData.authorIds },
            attributes: ['id'],
          });

          if (authors.length !== bookData.authorIds.length) {
            return this.createErrorResponse('One or more author IDs are invalid', 400);
          }
        }
        // Remove existing authors and add new ones
        await book.removeAuthors(book.authors || []);
        if (bookData.authorIds.length > 0) {
          const authors = await Author.findAll({ where: { id: bookData.authorIds } });
          await book.addAuthors(authors);
        }
      }

      if (bookData.categoryIds !== undefined) {
        if (bookData.categoryIds.length > 0) {
          const categories = await Category.findAll({
            where: { id: bookData.categoryIds },
            attributes: ['id'],
          });

          if (categories.length !== bookData.categoryIds.length) {
            return this.createErrorResponse('One or more category IDs are invalid', 400);
          }
        }
        // Remove existing categories and add new ones
        await book.removeCategories(book.categories || []);
        if (bookData.categoryIds.length > 0) {
          const categories = await Category.findAll({ where: { id: bookData.categoryIds } });
          await book.addCategories(categories);
        }
      }

      // Fetch updated book with associations
      const updatedBook = await Book.findByPk(book.id, {
        include: [
          { model: Author, through: { attributes: [] } },
          { model: Category, through: { attributes: [] } },
        ],
      });

      return this.createSuccessResponse(updatedBook, 'Book updated successfully');
    });
  }

  async deleteBook(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const bookId = this.getPathParameter(event, 'id');
      if (!bookId || isNaN(Number(bookId))) {
        return this.createErrorResponse('Valid book ID is required', 400);
      }

      const book = await Book.findByPk(Number(bookId));
      if (!book) {
        return this.createErrorResponse('Book not found', 404);
      }

      await book.destroy();

      return this.createSuccessResponse(null, 'Book deleted successfully', undefined, 204);
    });
  }

  async listBooks(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const pagination = this.getPaginationParams(event);
      const filters = this.getQueryParameter(event, 'filters');
      
      let searchFilters: BookSearchFilters = {};
      if (filters) {
        try {
          searchFilters = JSON.parse(filters);
          const filterValidation = this.validateRequest(searchFilters, this.searchFiltersSchema);
          if (!filterValidation.isValid) {
            return this.createErrorResponse('Invalid search filters', 400, filterValidation.errors);
          }
          searchFilters = filterValidation.value!;
        } catch {
          return this.createErrorResponse('Invalid filters format. Expected JSON string.', 400);
        }
      }

      const whereClause: any = {};
      const includeClause: any[] = [
        { model: Author, through: { attributes: [] } },
        { model: Category, through: { attributes: [] } },
      ];

      // Apply filters
      if (searchFilters.title) {
        whereClause.title = { [require('sequelize').Op.iLike]: `%${searchFilters.title}%` };
      }

      if (searchFilters.isbn) {
        whereClause.isbnCode = searchFilters.isbn;
      }

      if (searchFilters.publisher) {
        whereClause.publisher = { [require('sequelize').Op.iLike]: `%${searchFilters.publisher}%` };
      }

      if (searchFilters.language) {
        whereClause.language = searchFilters.language;
      }

      if (searchFilters.publishedYear) {
        whereClause.publishedDate = {
          [require('sequelize').Op.gte]: new Date(`${searchFilters.publishedYear}-01-01`),
          [require('sequelize').Op.lt]: new Date(`${searchFilters.publishedYear + 1}-01-01`),
        };
      }

      // Author filter
      if (searchFilters.author) {
        includeClause[0] = {
          model: Author,
          through: { attributes: [] },
          where: {
            [require('sequelize').Op.or]: [
              { name: { [require('sequelize').Op.iLike]: `%${searchFilters.author}%` } },
              { surname: { [require('sequelize').Op.iLike]: `%${searchFilters.author}%` } },
            ],
          },
        };
      }

      // Category filter
      if (searchFilters.category) {
        includeClause[1] = {
          model: Category,
          through: { attributes: [] },
          where: {
            name: { [require('sequelize').Op.iLike]: `%${searchFilters.category}%` },
          },
        };
      }

      const { count, rows } = await Book.findAndCountAll({
        where: whereClause,
        include: includeClause,
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['updatedAt', 'DESC']],
        distinct: true,
      });

      const meta = this.createPaginationMeta(pagination.page, pagination.limit, count);

      return this.createSuccessResponse(rows, undefined, meta);
    });
  }

  async searchBooksByIsbn(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const isbn = this.getQueryParameter(event, 'isbn');
      if (!isbn) {
        return this.createErrorResponse('ISBN parameter is required', 400);
      }

      const validation = validateIsbn(isbn);
      if (!validation.isValid) {
        return this.createErrorResponse(`Invalid ISBN: ${validation.error}`, 400);
      }

      // First check local database
      const localBook = await Book.findOne({
        where: { isbnCode: validation.normalizedIsbn },
        include: [
          { model: Author, through: { attributes: [] } },
          { model: Category, through: { attributes: [] } },
        ],
      });

      if (localBook) {
        return this.createSuccessResponse({
          source: 'local',
          book: localBook,
        });
      }

      // If not found locally, try ISBN service
      const result = await isbnService.lookupBook(validation.normalizedIsbn!);
      
      return this.createSuccessResponse({
        source: result.source,
        book: result.success ? result.book : null,
        error: result.success ? undefined : result.error,
      });
    });
  }

  async importBookFromIsbn(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const body = this.parseBody<{ isbn: string }>(event);
      if (!body?.isbn) {
        return this.createErrorResponse('ISBN is required', 400);
      }

      const validation = validateIsbn(body.isbn);
      if (!validation.isValid) {
        return this.createErrorResponse(`Invalid ISBN: ${validation.error}`, 400);
      }

      // Check if book already exists
      const existingBook = await Book.findOne({ where: { isbnCode: validation.normalizedIsbn } });
      if (existingBook) {
        return this.createErrorResponse('Book with this ISBN already exists', 409);
      }

      // Lookup book data from ISBN service
      const result = await isbnService.lookupBook(validation.normalizedIsbn!);
      if (!result.success || !result.book) {
        return this.createErrorResponse(
          result.error || 'Book not found in external sources',
          404
        );
      }

      const bookData = result.book;

      // Create book from external data
      const book = await Book.create({
        title: bookData.title,
        isbnCode: bookData.isbnCode,
        notes: bookData.description,
        editionDate: bookData.editionDate,
      } as any);

      // Create authors if they don't exist
      if (bookData.authors && bookData.authors.length > 0) {
        const authorPromises = bookData.authors.map(async (authorData) => {
          const [author] = await Author.findOrCreate({
            where: {
              name: authorData.name,
              surname: authorData.surname || '',
            },
            defaults: {
              name: authorData.name,
              surname: authorData.surname || '',
              nationality: authorData.nationality,
            } as any,
          });
          return author;
        });

        const authors = await Promise.all(authorPromises);
        await book.addAuthors(authors);
      }

      // Create categories if they don't exist
      if (bookData.categories && bookData.categories.length > 0) {
        const categoryPromises = bookData.categories.map(async (categoryData) => {
          const [category] = await Category.findOrCreate({
            where: { name: categoryData.name },
            defaults: {
              name: categoryData.name,
            } as any,
          });
          return category;
        });

        const categories = await Promise.all(categoryPromises);
        await book.addCategories(categories);
      }

      // Fetch complete book with associations
      const importedBook = await Book.findByPk(book.id, {
        include: [
          { model: Author, through: { attributes: [] } },
          { model: Category, through: { attributes: [] } },
        ],
      });

      return this.createSuccessResponse(
        {
          book: importedBook,
          source: result.source,
          responseTime: result.responseTime,
        },
        'Book imported successfully',
        undefined,
        201
      );
    });
  }
}

export const bookController = new BookController();