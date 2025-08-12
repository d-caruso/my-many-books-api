// ================================================================
// tests/models/Category.test.ts
// ================================================================

import { Sequelize } from 'sequelize';
import { Category } from '@/models/Category';
import { ModelAssociations } from '@/models/associations/ModelAssociations';

describe('Category Model', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize('sqlite://memory:', { 
      logging: false,
      define: {
        timestamps: true,
        underscored: true,
        createdAt: 'creation_date',
        updatedAt: 'update_date',
      },
    });

    // Initialize model
    Category.initModel(sequelize);
    ModelAssociations.registerModel('Category', Category);

    // Sync database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }
  });

  beforeEach(async () => {
    // Clean up data before each test
    await Category.destroy({ where: {} });
  });

  describe('Model Creation', () => {
    it('should create a category with valid data', async () => {
      const categoryData = {
        name: 'Fiction',
      };

      const category = await Category.create(categoryData as any);

      expect(category.name).toBe('Fiction');
      expect(category.id).toBeDefined();
      expect(category.creationDate).toBeDefined();
      expect(category.updateDate).toBeDefined();
    });

    it('should fail to create category without name', async () => {
      await expect(Category.create({} as any)).rejects.toThrow();
    });

    it('should fail to create duplicate category names', async () => {
      await Category.create({ name: 'Fiction' } as any);
      
      await expect(Category.create({ name: 'Fiction' } as any)).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    it('should serialize to JSON correctly', async () => {
      const category = await Category.create({
        name: 'Science Fiction',
      } as any);

      const json = category.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name', 'Science Fiction');
      expect(json).toHaveProperty('creationDate');
      expect(json).toHaveProperty('updateDate');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test data
      await Category.bulkCreate([
        { name: 'Fiction' },
        { name: 'Non-Fiction' },
        { name: 'Science Fiction' },
        { name: 'Biography' },
      ] as any);
    });

    it('should find category by name', async () => {
      const category = await Category.findByName('Fiction');

      expect(category).not.toBeNull();
      expect(category?.name).toBe('Fiction');
    });

    it('should search categories by name', async () => {
      const results = await Category.searchByName('Fiction');

      expect(results).toHaveLength(3); // Fiction, Non-Fiction and Science Fiction
    });

    it('should get all categories sorted by name', async () => {
      const categories = await Category.getAllCategories();

      expect(categories).toHaveLength(4);
      expect(categories[0]!.name).toBe('Biography'); // Alphabetical order
      expect(categories[1]!.name).toBe('Fiction');
    });

    it('should create new category if not exists', async () => {
      const newCategory = await Category.createCategory({
        name: 'Mystery',
      });

      expect(newCategory.name).toBe('Mystery');
    });

    it('should return existing category if already exists', async () => {
      const existingCategory = await Category.createCategory({
        name: 'Fiction',
      });

      const categoryCount = await Category.count();
      expect(categoryCount).toBe(4); // Should not create duplicate
      expect(existingCategory.name).toBe('Fiction');
    });

    it('should trim category names', async () => {
      const category = await Category.createCategory({
        name: '  Trimmed Category  ',
      });

      expect(category.name).toBe('Trimmed Category');
    });
  });
});
