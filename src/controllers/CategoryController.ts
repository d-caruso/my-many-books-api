// ================================================================
// src/controllers/CategoryController.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Joi from 'joi';
import { BaseController } from './base/BaseController';
import { Category, Book } from '../models';

interface CreateCategoryRequest {
  name: string;
  type?: string;
  description?: string;
  color?: string;
  parentCategoryId?: number;
}

interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: number;
}

interface CategorySearchFilters {
  name?: string;
  type?: string;
  parentId?: number;
}

export class CategoryController extends BaseController {
  private readonly createCategorySchema = Joi.object<CreateCategoryRequest>({
    name: Joi.string().required().max(100).trim(),
    type: Joi.string().max(50).optional().trim(),
    description: Joi.string().max(500).optional().trim(),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().message('Color must be a valid hex color (e.g., #FF0000)'),
    parentCategoryId: Joi.number().integer().positive().optional(),
  });

  private readonly updateCategorySchema = this.createCategorySchema.keys({
    id: Joi.number().integer().positive().required(),
    name: Joi.string().max(100).trim().optional(),
  });

  private readonly searchFiltersSchema = Joi.object<CategorySearchFilters>({
    name: Joi.string().max(100).optional().trim(),
    type: Joi.string().max(50).optional().trim(),
    parentId: Joi.number().integer().positive().optional(),
  });

  async createCategory(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const body = this.parseBody<CreateCategoryRequest>(event);
      if (!body) {
        return this.createErrorResponse('Request body is required', 400);
      }

      const validation = this.validateRequest(body, this.createCategorySchema);
      if (!validation.isValid) {
        return this.createErrorResponse('Validation failed', 400, validation.errors);
      }

      const categoryData = validation.value!;

      // Check if category already exists
      const existingCategory = await Category.findOne({
        where: { name: categoryData.name },
      });

      if (existingCategory) {
        return this.createErrorResponse(
          'Category with this name already exists',
          409
        );
      }

      // Validate parent category if provided
      if (categoryData.parentCategoryId) {
        const parentCategory = await Category.findByPk(categoryData.parentCategoryId);
        if (!parentCategory) {
          return this.createErrorResponse('Parent category not found', 400);
        }
      }

      // Create category
      const category = await Category.create({
        name: categoryData.name,
        type: categoryData.type,
        description: categoryData.description,
        color: categoryData.color,
        parentCategoryId: categoryData.parentCategoryId,
      });

      // Fetch category with parent if it exists
      const createdCategory = await Category.findByPk(category.id, {
        include: categoryData.parentCategoryId ? [
          { model: Category, as: 'parentCategory' }
        ] : [],
      });

      return this.createSuccessResponse(createdCategory, 'Category created successfully', undefined, 201);
    });
  }

  async getCategory(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const categoryId = this.getPathParameter(event, 'id');
      if (!categoryId || isNaN(Number(categoryId))) {
        return this.createErrorResponse('Valid category ID is required', 400);
      }

      const includeBooks = this.getQueryParameter(event, 'includeBooks') === 'true';
      const includeChildren = this.getQueryParameter(event, 'includeChildren') === 'true';

      const includeClause: any[] = [
        { model: Category, as: 'parentCategory' }
      ];

      if (includeBooks) {
        includeClause.push({ model: Book, through: { attributes: [] } });
      }

      if (includeChildren) {
        includeClause.push({ model: Category, as: 'subcategories' });
      }

      const category = await Category.findByPk(Number(categoryId), {
        include: includeClause,
      });

      if (!category) {
        return this.createErrorResponse('Category not found', 404);
      }

      return this.createSuccessResponse(category);
    });
  }

  async updateCategory(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const categoryId = this.getPathParameter(event, 'id');
      if (!categoryId || isNaN(Number(categoryId))) {
        return this.createErrorResponse('Valid category ID is required', 400);
      }

      const body = this.parseBody<Partial<CreateCategoryRequest>>(event);
      if (!body) {
        return this.createErrorResponse('Request body is required', 400);
      }

      const updateData = { ...body, id: Number(categoryId) };
      const validation = this.validateRequest(updateData, this.updateCategorySchema);
      if (!validation.isValid) {
        return this.createErrorResponse('Validation failed', 400, validation.errors);
      }

      const category = await Category.findByPk(Number(categoryId));
      if (!category) {
        return this.createErrorResponse('Category not found', 404);
      }

      const categoryData = validation.value!;

      // Check if name is being changed and if it conflicts
      if (categoryData.name && categoryData.name !== category.name) {
        const existingCategory = await Category.findOne({
          where: { name: categoryData.name },
        });

        if (existingCategory && existingCategory.id !== category.id) {
          return this.createErrorResponse(
            'Category with this name already exists',
            409
          );
        }
      }

      // Validate parent category if being changed
      if (categoryData.parentCategoryId !== undefined) {
        if (categoryData.parentCategoryId) {
          // Check if parent exists
          const parentCategory = await Category.findByPk(categoryData.parentCategoryId);
          if (!parentCategory) {
            return this.createErrorResponse('Parent category not found', 400);
          }

          // Prevent circular reference (category cannot be its own parent or descendant)
          if (categoryData.parentCategoryId === category.id) {
            return this.createErrorResponse('Category cannot be its own parent', 400);
          }

          // Check if this would create a circular reference by making this category
          // a parent of one of its ancestors
          let currentParent = parentCategory;
          while (currentParent && currentParent.parentCategoryId) {
            if (currentParent.parentCategoryId === category.id) {
              return this.createErrorResponse(
                'This would create a circular reference in the category hierarchy',
                400
              );
            }
            currentParent = await Category.findByPk(currentParent.parentCategoryId);
          }
        }
      }

      // Update category
      await category.update({
        name: categoryData.name ?? category.name,
        type: categoryData.type ?? category.type,
        description: categoryData.description ?? category.description,
        color: categoryData.color ?? category.color,
        parentCategoryId: categoryData.parentCategoryId !== undefined 
          ? categoryData.parentCategoryId 
          : category.parentCategoryId,
      });

      // Fetch updated category with parent
      const updatedCategory = await Category.findByPk(category.id, {
        include: [{ model: Category, as: 'parentCategory' }],
      });

      return this.createSuccessResponse(updatedCategory, 'Category updated successfully');
    });
  }

  async deleteCategory(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const categoryId = this.getPathParameter(event, 'id');
      if (!categoryId || isNaN(Number(categoryId))) {
        return this.createErrorResponse('Valid category ID is required', 400);
      }

      const force = this.getQueryParameter(event, 'force') === 'true';

      const category = await Category.findByPk(Number(categoryId), {
        include: [
          { model: Book, through: { attributes: [] } },
          { model: Category, as: 'subcategories' },
        ],
      });

      if (!category) {
        return this.createErrorResponse('Category not found', 404);
      }

      // Check if category has books
      if (category.Books && category.Books.length > 0 && !force) {
        return this.createErrorResponse(
          'Cannot delete category with associated books. Use force=true to delete anyway or remove book associations first.',
          409
        );
      }

      // Check if category has subcategories
      if (category.subcategories && category.subcategories.length > 0 && !force) {
        return this.createErrorResponse(
          'Cannot delete category with subcategories. Use force=true to delete anyway or remove subcategories first.',
          409
        );
      }

      if (force) {
        // If force is true, move subcategories to parent or set to null
        const subcategories = await Category.findAll({
          where: { parentCategoryId: category.id },
        });

        for (const subcategory of subcategories) {
          await subcategory.update({
            parentCategoryId: category.parentCategoryId || null,
          });
        }
      }

      await category.destroy();

      return this.createSuccessResponse(null, 'Category deleted successfully', undefined, 204);
    });
  }

  async listCategories(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const pagination = this.getPaginationParams(event);
      const filters = this.getQueryParameter(event, 'filters');
      const includeBooks = this.getQueryParameter(event, 'includeBooks') === 'true';
      const hierarchical = this.getQueryParameter(event, 'hierarchical') === 'true';
      
      let searchFilters: CategorySearchFilters = {};
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

      if (hierarchical) {
        // Return hierarchical structure (only root categories with their children)
        const rootCategories = await Category.findAll({
          where: { parentCategoryId: null },
          include: [
            {
              model: Category,
              as: 'subcategories',
              include: includeBooks ? [{ model: Book, through: { attributes: [] } }] : [],
            },
            ...(includeBooks ? [{ model: Book, through: { attributes: [] } }] : []),
          ],
          order: [['name', 'ASC'], [{ model: Category, as: 'subcategories' }, 'name', 'ASC']],
        });

        return this.createSuccessResponse(rootCategories);
      }

      // Flat list with pagination and filters
      const whereClause: any = {};

      // Apply filters
      if (searchFilters.name) {
        whereClause.name = { [require('sequelize').Op.iLike]: `%${searchFilters.name}%` };
      }

      if (searchFilters.type) {
        whereClause.type = { [require('sequelize').Op.iLike]: `%${searchFilters.type}%` };
      }

      if (searchFilters.parentId !== undefined) {
        whereClause.parentCategoryId = searchFilters.parentId;
      }

      const includeClause: any[] = [
        { model: Category, as: 'parentCategory' }
      ];

      if (includeBooks) {
        includeClause.push({ model: Book, through: { attributes: [] } });
      }

      const { count, rows } = await Category.findAndCountAll({
        where: whereClause,
        include: includeClause,
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['name', 'ASC']],
        distinct: true,
      });

      const meta = this.createPaginationMeta(pagination.page, pagination.limit, count);

      return this.createSuccessResponse(rows, undefined, meta);
    });
  }

  async getCategoryBooks(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return this.handleRequest(event, async () => {
      const categoryId = this.getPathParameter(event, 'id');
      if (!categoryId || isNaN(Number(categoryId))) {
        return this.createErrorResponse('Valid category ID is required', 400);
      }

      const pagination = this.getPaginationParams(event);

      const category = await Category.findByPk(Number(categoryId));
      if (!category) {
        return this.createErrorResponse('Category not found', 404);
      }

      const { count, rows } = await Book.findAndCountAll({
        include: [
          {
            model: Category,
            where: { id: Number(categoryId) },
            through: { attributes: [] },
          },
        ],
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['title', 'ASC']],
        distinct: true,
      });

      const meta = this.createPaginationMeta(pagination.page, pagination.limit, count);

      return this.createSuccessResponse(
        {
          category: {
            id: category.id,
            name: category.name,
            type: category.type,
          },
          books: rows,
        },
        undefined,
        meta
      );
    });
  }
  
}

export const categoryController = new CategoryController();