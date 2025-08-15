// ================================================================
// src/routes/authorRoutes.ts
// Author management routes
// ================================================================

import { Router } from 'express';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Author } from '../models';

const router = Router();

// List all authors with optional search
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};
    
    if (search) {
      const { Op } = require('sequelize');
      whereClause = {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { surname: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }

    const { count, rows: authors } = await Author.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['surname', 'ASC'], ['name', 'ASC']],
    });

    res.status(200).json({
      authors: authors.map(author => author.toJSON()),
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        totalItems: count,
        itemsPerPage: Number(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching authors:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get author by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const authorId = Number(id);

    if (!authorId || isNaN(authorId)) {
      res.status(400).json({ error: 'Invalid author ID' });
      return;
    }

    const author = await Author.findByPk(authorId);

    if (!author) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }

    res.status(200).json(author.toJSON());
  } catch (error) {
    console.error('Error fetching author:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new author
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, surname, nationality } = req.body;

    if (!name || !surname) {
      res.status(400).json({ error: 'Name and surname are required' });
      return;
    }

    // Check if author already exists
    const existingAuthor = await Author.findOne({
      where: { name, surname }
    });

    if (existingAuthor) {
      res.status(409).json({ error: 'Author with this name already exists' });
      return;
    }

    const author = await Author.create({
      name,
      surname,
      nationality: nationality || null
    } as any);

    res.status(201).json(author.toJSON());
  } catch (error) {
    console.error('Error creating author:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update author
router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const authorId = Number(id);

    if (!authorId || isNaN(authorId)) {
      res.status(400).json({ error: 'Invalid author ID' });
      return;
    }

    const author = await Author.findByPk(authorId);

    if (!author) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }

    const { name, surname, nationality } = req.body;

    // Check if name is being changed and if it conflicts
    if ((name || surname) && (name !== author.name || surname !== author.surname)) {
      const newName = name || author.name;
      const newSurname = surname || author.surname;
      
      const existingAuthor = await Author.findOne({
        where: { name: newName, surname: newSurname }
      });

      if (existingAuthor && existingAuthor.id !== author.id) {
        res.status(409).json({ error: 'Author with this name already exists' });
        return;
      }
    }

    await author.update({
      ...(name && { name }),
      ...(surname && { surname }),
      ...(nationality !== undefined && { nationality }),
    });

    res.status(200).json(author.toJSON());
  } catch (error) {
    console.error('Error updating author:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete author
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const authorId = Number(id);

    if (!authorId || isNaN(authorId)) {
      res.status(400).json({ error: 'Invalid author ID' });
      return;
    }

    const author = await Author.findByPk(authorId);

    if (!author) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }

    await author.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting author:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;