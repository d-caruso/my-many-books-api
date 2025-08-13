// ================================================================
// src/controllers/AuthorController.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Joi from 'joi';
import { BaseController } from './base/BaseController';
import { Author, Book } from '../models';

interface CreateAuthorRequest {
  name: string;
  surname: string;
  nationality?: string;
}


interface AuthorSearchFilters {
  name?: string;
  nationality?: string;
  birthYear?: number;
  deathYear?: number;
}

export class AuthorController extends BaseController {
  private readonly createAuthorSchema = Joi.object<CreateAuthorRequest>({
    name: Joi.string().required().max(255).trim(),
    surname: Joi.string().required().max(255).trim(),
    nationality: Joi.string().max(255).optional().trim(),
  });

  private readonly updateAuthorSchema = this.createAuthorSchema.fork(['name', 'surname'], (schema) => schema.optional());

  private readonly searchFiltersSchema = Joi.object<AuthorSearchFilters>({
    name: Joi.string().max(200).optional().trim(),
    nationality: Joi.string().max(100).optional().trim(),
    birthYear: Joi.number().integer().min(1).max(new Date().getFullYear()).optional(),
    deathYear: Joi.number().integer().min(1).max(new Date().getFullYear()).optional(),
  });

  async createAuthor(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const body = this.parseBody<CreateAuthorRequest>(event);
      if (!body) {
        return this.createErrorResponse('Request body is required', 400);
      }

      const validation = this.validateRequest(body, this.createAuthorSchema);
      if (!validation.isValid) {
        return this.createErrorResponse('Validation failed', 400, validation.errors);
      }

      const authorData = validation.value!;

      // Check if author already exists
      const existingAuthor = await Author.findOne({
        where: {
          name: authorData.name,
          surname: authorData.surname,
        },
      });

      if (existingAuthor) {
        return this.createErrorResponse(
          'Author with this name already exists',
          409
        );
      }

      // Create author
      const author = await Author.create({
        name: authorData.name,
        surname: authorData.surname,
        nationality: authorData.nationality || null,
      } as any);

      return this.createSuccessResponse(author, 'Author created successfully', undefined, 201);
    });
  }

  async getAuthor(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const authorId = this.getPathParameter(event, 'id');
      if (!authorId || isNaN(Number(authorId))) {
        return this.createErrorResponse('Valid author ID is required', 400);
      }

      const includeBooks = this.getQueryParameter(event, 'includeBooks') === 'true';

      const includeClause: any[] = [
        { model: Book, as: 'books' }
      ];

      if (includeBooks) {
        includeClause.push({ model: Book, through: { attributes: [] } });
      }

      const author = await Author.findByPk(Number(authorId));

      if (!author) {
        return this.createErrorResponse('Author not found', 404);
      }

      return this.createSuccessResponse(author);
    });
  }

  async updateAuthor(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const authorId = this.getPathParameter(event, 'id');
      if (!authorId || isNaN(Number(authorId))) {
        return this.createErrorResponse('Valid author ID is required', 400);
      }

      const body = this.parseBody<Partial<CreateAuthorRequest>>(event);
      if (!body) {
        return this.createErrorResponse('Request body is required', 400);
      }

      const validation = this.validateRequest(body, this.updateAuthorSchema);
      if (!validation.isValid) {
        return this.createErrorResponse('Validation failed', 400, validation.errors);
      }

      const author = await Author.findByPk(Number(authorId));
      if (!author) {
        return this.createErrorResponse('Author not found', 404);
      }

      const authorData = validation.value!;

      // Check if name is being changed and if it conflicts
      if ((authorData.name || authorData.surname) && 
          (authorData.name !== author.name || authorData.surname !== author.surname)) {
        const name = authorData.name ?? author.name;
        const surname = authorData.surname ?? author.surname;
        
        const existingAuthor = await Author.findOne({
          where: {
            name,
            surname,
          },
        });

        if (existingAuthor && existingAuthor.id !== author.id) {
          return this.createErrorResponse(
            'Author with this name already exists',
            409
          );
        }
      }

      // Update author
      await author.update({
        name: authorData.name ?? author.name,
        surname: authorData.surname ?? author.surname,
        nationality: authorData.nationality !== undefined ? authorData.nationality : author.nationality,
      } as any);

      return this.createSuccessResponse(author, 'Author updated successfully');
    });
  }

  async deleteAuthor(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const authorId = this.getPathParameter(event, 'id');
      if (!authorId || isNaN(Number(authorId))) {
        return this.createErrorResponse('Valid author ID is required', 400);
      }

      const author = await Author.findByPk(Number(authorId));

      if (!author) {
        return this.createErrorResponse('Author not found', 404);
      }

      // Check if author has books by querying the association
      const bookCount = await Book.count({
        include: [{
          model: Author,
          where: { id: Number(authorId) },
        }],
      });

      if (bookCount > 0) {
        return this.createErrorResponse(
          'Cannot delete author with associated books. Remove book associations first.',
          409
        );
      }

      await author.destroy();

      return this.createSuccessResponse(null, 'Author deleted successfully', undefined, 204);
    });
  }

  async listAuthors(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const pagination = this.getPaginationParams(event);
      const filters = this.getQueryParameter(event, 'filters');
      const includeBooks = this.getQueryParameter(event, 'includeBooks') === 'true';
      
      let searchFilters: AuthorSearchFilters = {};
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

      // Apply filters
      if (searchFilters.name) {
        whereClause[require('sequelize').Op.or] = [
          { name: { [require('sequelize').Op.iLike]: `%${searchFilters.name}%` } },
          { surname: { [require('sequelize').Op.iLike]: `%${searchFilters.name}%` } },
        ];
      }

      if (searchFilters.nationality) {
        whereClause.nationality = { [require('sequelize').Op.iLike]: `%${searchFilters.nationality}%` };
      }

      if (searchFilters.birthYear) {
        whereClause.birthDate = {
          [require('sequelize').Op.gte]: new Date(`${searchFilters.birthYear}-01-01`),
          [require('sequelize').Op.lt]: new Date(`${searchFilters.birthYear + 1}-01-01`),
        };
      }

      if (searchFilters.deathYear) {
        whereClause.deathDate = {
          [require('sequelize').Op.gte]: new Date(`${searchFilters.deathYear}-01-01`),
          [require('sequelize').Op.lt]: new Date(`${searchFilters.deathYear + 1}-01-01`),
        };
      }

      const { count, rows } = await Author.findAndCountAll({
        where: whereClause,
        include: includeBooks ? [{ model: Book, through: { attributes: [] } }] : [],
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['surname', 'ASC'], ['name', 'ASC']],
      });

      const meta = this.createPaginationMeta(pagination.page, pagination.limit, count);

      return this.createSuccessResponse(rows, undefined, meta);
    });
  }

  async getAuthorBooks(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const authorId = this.getPathParameter(event, 'id');
      if (!authorId || isNaN(Number(authorId))) {
        return this.createErrorResponse('Valid author ID is required', 400);
      }

      const pagination = this.getPaginationParams(event);

      const author = await Author.findByPk(Number(authorId));
      if (!author) {
        return this.createErrorResponse('Author not found', 404);
      }

      const { count, rows } = await Book.findAndCountAll({
        include: [
          {
            model: Author,
            where: { id: Number(authorId) },
            through: { attributes: [] },
          },
        ],
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['publishedDate', 'DESC']],
        distinct: true,
      });

      const meta = this.createPaginationMeta(pagination.page, pagination.limit, count);

      return this.createSuccessResponse(
        {
          author: {
            id: author.id,
            name: author.name,
            surname: author.surname,
          },
          books: rows,
        },
        undefined,
        meta
      );
    });
  }
}

export const authorController = new AuthorController();