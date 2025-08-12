// ================================================================
// tests/models/Author.test.ts
// ================================================================
import { Sequelize } from 'sequelize';
import { Author } from '@/models/Author';
import { ModelAssociations } from '@/models/associations/ModelAssociations';

describe('Author Model', () => {
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
    Author.initModel(sequelize);
    ModelAssociations.registerModel('Author', Author);

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
    await Author.destroy({ where: {} });
  });

  describe('Model Creation', () => {
    it('should create an author with valid data', async () => {
      const authorData = {
        name: 'John',
        surname: 'Doe',
        nationality: 'American',
      };

      const author = await Author.create(authorData as any);

      expect(author.name).toBe('John');
      expect(author.surname).toBe('Doe');
      expect(author.nationality).toBe('American');
      expect(author.id).toBeDefined();
      expect(author.creationDate).toBeDefined();
      expect(author.updateDate).toBeDefined();
    });

    it('should create an author without nationality', async () => {
      const authorData = {
        name: 'Jane',
        surname: 'Smith',
      };

      const author = await Author.create(authorData as any);

      expect(author.name).toBe('Jane');
      expect(author.surname).toBe('Smith');
      expect(author.nationality == null).toBe(true);
    });

    it('should fail to create author without required fields', async () => {
      const authorData = {
        name: 'John',
        // Missing surname
      };

      await expect(Author.create(authorData as any)).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    it('should return full name correctly', async () => {
      const author = await Author.create({
        name: 'John',
        surname: 'Doe',
      } as any);

      expect(author.getFullName()).toBe('John Doe');
    });

    it('should serialize to JSON correctly', async () => {
      const author = await Author.create({
        name: 'John',
        surname: 'Doe',
        nationality: 'American',
      } as any);

      const json = author.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name', 'John');
      expect(json).toHaveProperty('surname', 'Doe');
      expect(json).toHaveProperty('nationality', 'American');
      expect(json).toHaveProperty('creationDate');
      expect(json).toHaveProperty('updateDate');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test data
      await Author.bulkCreate([
        { name: 'John', surname: 'Doe', nationality: 'American' },
        { name: 'Jane', surname: 'Smith', nationality: 'British' },
        { name: 'Bob', surname: 'Johnson', nationality: 'American' },
      ] as any);
    });

    it('should find author by full name', async () => {
      const author = await Author.findByFullName('John', 'Doe');

      expect(author).not.toBeNull();
      expect(author?.name).toBe('John');
      expect(author?.surname).toBe('Doe');
    });

    it('should find authors by nationality', async () => {
      const americanAuthors = await Author.findByNationality('American');

      expect(americanAuthors).toHaveLength(2);
      expect(americanAuthors.every(author => author.nationality === 'American')).toBe(true);
    });

    it('should search authors by name', async () => {
      const results = await Author.searchByName('John');

      expect(results).toHaveLength(2); // John Doe and Bob Johnson
    });

    it('should create new author if not exists', async () => {
      const newAuthor = await Author.createAuthor({
        name: 'New',
        surname: 'Author',
      });

      expect(newAuthor.name).toBe('New');
      expect(newAuthor.surname).toBe('Author');
    });

    it('should return existing author if already exists', async () => {
      const existingAuthor = await Author.createAuthor({
        name: 'John',
        surname: 'Doe',
      });

      const authorCount = await Author.count();
      expect(authorCount).toBe(3); // Should not create duplicate
      expect(existingAuthor.name).toBe('John');
    });
  });
});
