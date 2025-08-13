import { Sequelize } from 'sequelize';
import DatabaseConnection from '../../src/config/database';
import { Author, Book, Category } from '../../src/models';
import { BookAuthor, BookCategory } from '../../src/models';

describe('Database Integration Tests', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    // Initialize test database
    sequelize = DatabaseConnection.getInstance();
    
    // Ensure clean test environment
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    // Clean up test database
    await DatabaseConnection.closeConnection();
  });

  beforeEach(async () => {
    // Clean all tables before each test
    await sequelize.truncate({ cascade: true, restartIdentity: true });
  });

  describe('Model Creation and Relationships', () => {
    it('should create an author with complete data validation', async () => {
      const authorData = {
        name: 'Joanne',
        surname: 'Rowling', 
        nationality: 'British'
      };

      const author = await Author.create(authorData);
      
      expect(author).toBeDefined();
      expect(author.id).toBeDefined();
      expect(author.name).toBe(authorData.name);
      expect(author.surname).toBe(authorData.surname);
      expect(author.nationality).toBe(authorData.nationality);
      expect(author.creationDate).toBeDefined();
      expect(author.updateDate).toBeDefined();
    });

    it('should create a category with proper validation', async () => {
      const categoryData = {
        name: 'Fantasy'
      };

      const category = await Category.create(categoryData);
      
      expect(category).toBeDefined();
      expect(category.id).toBeDefined();
      expect(category.name).toBe(categoryData.name);
      expect(category.creationDate).toBeDefined();
      expect(category.updateDate).toBeDefined();
    });

    it('should create a book with complete metadata', async () => {
      const bookData = {
        title: 'Harry Potter and the Philosopher\'s Stone',
        isbnCode: '9780747532699',
        editionNumber: 1,
        editionDate: new Date('1997-06-26'),
        status: 'in progress' as const,
        notes: 'The first book in the Harry Potter series'
      };

      const book = await Book.create(bookData);
      
      expect(book).toBeDefined();
      expect(book.id).toBeDefined();
      expect(book.title).toBe(bookData.title);
      expect(book.isbnCode).toBe(bookData.isbnCode);
      expect(book.editionDate?.toDateString()).toBe(bookData.editionDate.toDateString());
      expect(book.editionNumber).toBe(bookData.editionNumber);
      expect(book.status).toBe(bookData.status);
      expect(book.notes).toBe(bookData.notes);
    });

    it('should create complex many-to-many relationships', async () => {
      // Create test data
      const author1 = await Author.create({ name: 'Terry', surname: 'Pratchett' });
      const author2 = await Author.create({ name: 'Neil', surname: 'Gaiman' });
      const category1 = await Category.create({ name: 'Fantasy' });
      const category2 = await Category.create({ name: 'Humor' });
      
      const book = await Book.create({
        title: 'Good Omens',
        isbnCode: '9780060853976'
      });

      // Create relationships
      await BookAuthor.create({ bookId: book.id, authorId: author1.id });
      await BookAuthor.create({ bookId: book.id, authorId: author2.id });
      await BookCategory.create({ bookId: book.id, categoryId: category1.id });
      await BookCategory.create({ bookId: book.id, categoryId: category2.id });

      // Verify relationships exist in junction tables
      const bookAuthorRelations = await BookAuthor.findAll({
        where: { bookId: book.id }
      });
      const bookCategoryRelations = await BookCategory.findAll({
        where: { bookId: book.id }
      });

      expect(bookAuthorRelations).toHaveLength(2);
      expect(bookCategoryRelations).toHaveLength(2);
    });
  });

  describe('Data Validation and Constraints', () => {
    it('should enforce unique constraints', async () => {
      const authorData = { name: 'John', surname: 'Doe' };
      
      // Create first author
      await Author.create(authorData);
      
      // Attempt to create duplicate should fail
      await expect(Author.create(authorData)).rejects.toThrow();
    });

    it('should enforce ISBN uniqueness', async () => {
      const isbn = '9780123456789';
      
      await Book.create({
        title: 'First Book',
        isbnCode: isbn
      });

      await expect(Book.create({
        title: 'Second Book',
        isbnCode: isbn
      })).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      // Author without name should fail
      await expect(Author.create({} as any)).rejects.toThrow();
      
      // Book without title should fail
      await expect(Book.create({ isbnCode: '1234567890123' } as any)).rejects.toThrow();
      
      // Category without name should fail
      await expect(Category.create({} as any)).rejects.toThrow();
    });

    it('should handle cascading deletes properly', async () => {
      const author = await Author.create({ name: 'Test', surname: 'Author' });
      const book = await Book.create({
        title: 'Test Book',
        isbnCode: '9780123456789'
      });
      
      await BookAuthor.create({ bookId: book.id, authorId: author.id });
      
      // Delete author should remove relationship
      await author.destroy();
      
      const relationships = await BookAuthor.findAll({
        where: { authorId: author.id }
      });
      
      expect(relationships).toHaveLength(0);
    });
  });

  describe('Complex Queries and Performance', () => {
    beforeEach(async () => {
      // Create test data for complex queries
      const authors = await Author.bulkCreate([
        { name: 'Author', surname: 'One' },
        { name: 'Author', surname: 'Two' },
        { name: 'Author', surname: 'Three' }
      ]);

      const categories = await Category.bulkCreate([
        { name: 'Fiction' },
        { name: 'Non-Fiction' },
        { name: 'Biography' }
      ]);

      const books = await Book.bulkCreate([
        { title: 'Book 1', isbnCode: '1111111111111' },
        { title: 'Book 2', isbnCode: '2222222222222' },
        { title: 'Book 3', isbnCode: '3333333333333' }
      ]);

      // Create relationships
      for (let i = 0; i < books.length; i++) {
        await BookAuthor.create({ bookId: books[i].id, authorId: authors[i].id });
        await BookCategory.create({ bookId: books[i].id, categoryId: categories[i].id });
      }
    });

    it('should perform complex joins efficiently', async () => {
      const startTime = Date.now();
      
      const results = await Book.findAll({
        include: [
          {
            model: Author,
            as: 'authors',
            required: true
          },
          {
            model: Category,
            as: 'categories',
            required: true
          }
        ],
        limit: 10
      });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Verify data structure
      results.forEach(book => {
        expect(book.authors).toBeDefined();
        expect(book.categories).toBeDefined();
      });
    });

    it('should handle pagination correctly', async () => {
      const pageSize = 2;
      const page1 = await Book.findAndCountAll({
        limit: pageSize,
        offset: 0,
        order: [['title', 'ASC']]
      });
      
      const page2 = await Book.findAndCountAll({
        limit: pageSize,
        offset: pageSize,
        order: [['title', 'ASC']]
      });
      
      expect(page1.count).toBeGreaterThan(pageSize);
      expect(page1.rows).toHaveLength(pageSize);
      expect(page2.rows.length).toBeGreaterThan(0);
      
      // Ensure no overlap between pages
      const page1Ids = page1.rows.map(book => book.id);
      const page2Ids = page2.rows.map(book => book.id);
      const intersection = page1Ids.filter(id => page2Ids.includes(id));
      expect(intersection).toHaveLength(0);
    });

    it('should perform search queries efficiently', async () => {
      const searchTerm = 'Book';
      const startTime = Date.now();
      
      const results = await Book.findAll({
        where: {
          title: {
            [sequelize.Op.iLike]: `%${searchTerm}%`
          }
        },
        include: [
          {
            model: Author,
            as: 'authors'
          }
        ]
      });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(results.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(500); // Should complete within 500ms
      
      results.forEach(book => {
        expect(book.title.toLowerCase()).toContain(searchTerm.toLowerCase());
      });
    });
  });

  describe('Transaction Handling', () => {
    it('should handle successful transactions', async () => {
      const transaction = await sequelize.transaction();
      
      try {
        const author = await Author.create({ 
          name: 'Transaction', 
          surname: 'Author' 
        }, { transaction });
        
        const book = await Book.create({
          title: 'Transaction Book',
          isbnCode: '9999999999999'
        }, { transaction });
        
        await BookAuthor.create({
          bookId: book.id,
          authorId: author.id
        }, { transaction });
        
        await transaction.commit();
        
        // Verify data was committed
        const createdAuthor = await Author.findByPk(author.id);
        const createdBook = await Book.findByPk(book.id);
        const relationship = await BookAuthor.findOne({
          where: { bookId: book.id, authorId: author.id }
        });
        
        expect(createdAuthor).toBeDefined();
        expect(createdBook).toBeDefined();
        expect(relationship).toBeDefined();
        
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });

    it('should handle transaction rollbacks', async () => {
      const transaction = await sequelize.transaction();
      
      try {
        await Author.create({ 
          name: 'Rollback', 
          surname: 'Author' 
        }, { transaction });
        
        // Force an error to trigger rollback
        await Book.create({
          title: null, // This should fail validation
          isbnCode: '8888888888888'
        } as any, { transaction });
        
        await transaction.commit();
        
      } catch (error) {
        await transaction.rollback();
        
        // Verify no data was committed
        const authors = await Author.findAll({
          where: { name: 'Rollback', surname: 'Author' }
        });
        
        expect(authors).toHaveLength(0);
      }
    });
  });

  describe('Connection Pool and Performance', () => {
    it('should handle multiple concurrent connections', async () => {
      const concurrentQueries = 10;
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < concurrentQueries; i++) {
        promises.push(
          Author.create({ name: `Concurrent`, surname: `Author${i}` })
        );
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(concurrentQueries);
      results.forEach((author, index) => {
        expect(author.surname).toBe(`Author${index}`);
      });
    });

    it('should maintain connection pool health', async () => {
      // Test connection pool by making multiple sequential queries
      for (let i = 0; i < 20; i++) {
        const author = await Author.create({ 
          name: `Pool`, 
          surname: `TestAuthor${i}` 
        });
        expect(author).toBeDefined();
        
        const retrieved = await Author.findByPk(author.id);
        expect(retrieved?.surname).toBe(author.surname);
      }
      
      // Verify pool is still healthy
      const testConnection = await sequelize.authenticate();
      expect(testConnection).toBeUndefined(); // authenticate() returns undefined on success
    });
  });
});