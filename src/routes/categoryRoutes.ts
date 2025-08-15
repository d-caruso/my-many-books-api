// ================================================================
// src/routes/categoryRoutes.ts
// Category management routes
// ================================================================

import { Router } from 'express';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Category } from '../models';

const router = Router();

// List all categories with optional search
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};
    
    if (search) {
      const { Op } = require('sequelize');
      whereClause = {
        name: { [Op.iLike]: `%${search}%` }
      };
    }

    const { count, rows: categories } = await Category.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['name', 'ASC']],
    });

    res.status(200).json({
      categories: categories.map(category => category.toJSON()),
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        totalItems: count,
        itemsPerPage: Number(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get category by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const categoryId = Number(id);

    if (!categoryId || isNaN(categoryId)) {
      res.status(400).json({ error: 'Invalid category ID' });
      return;
    }

    const category = await Category.findByPk(categoryId);

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.status(200).json(category.toJSON());
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new category
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({
      where: { name }
    });

    if (existingCategory) {
      res.status(409).json({ error: 'Category with this name already exists' });
      return;
    }

    const category = await Category.create({ name } as any);

    res.status(201).json(category.toJSON());
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update category
router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const categoryId = Number(id);

    if (!categoryId || isNaN(categoryId)) {
      res.status(400).json({ error: 'Invalid category ID' });
      return;
    }

    const category = await Category.findByPk(categoryId);

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    // Check if new name already exists
    if (name !== category.name) {
      const existingCategory = await Category.findOne({
        where: { name }
      });

      if (existingCategory) {
        res.status(409).json({ error: 'Category with this name already exists' });
        return;
      }
    }

    await category.update({ name });

    res.status(200).json(category.toJSON());
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete category
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const categoryId = Number(id);

    if (!categoryId || isNaN(categoryId)) {
      res.status(400).json({ error: 'Invalid category ID' });
      return;
    }

    const category = await Category.findByPk(categoryId);

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    await category.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;