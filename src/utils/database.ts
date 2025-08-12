// ================================================================
// src/utils/database.ts
// ================================================================

import { Sequelize } from 'sequelize';
import DatabaseConnection from '@/config/database';
import { ModelManager } from '@/models';
import { Author, Category, Book } from '@/models';

export class DatabaseUtils {
  private static sequelize: Sequelize | null = null;

  static async initialize(): Promise<Sequelize> {
    if (DatabaseUtils.sequelize) {
      return DatabaseUtils.sequelize;
    }

    try {
      // Get database connection
      DatabaseUtils.sequelize = DatabaseConnection.getInstance();

      // Test connection
      const isConnected = await DatabaseConnection.testConnection();
      if (!isConnected) {
        throw new Error('Failed to establish database connection');
      }

      // Initialize models
      ModelManager.initialize(DatabaseUtils.sequelize);

      console.log('Database initialization completed successfully');
      return DatabaseUtils.sequelize;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  static async syncDatabase(options: { force?: boolean; alter?: boolean } = {}): Promise<void> {
    if (!DatabaseUtils.sequelize) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      const { force = false, alter = false } = options;

      await DatabaseUtils.sequelize.sync({ force, alter });

      console.log('Database synchronization completed successfully', {
        force,
        alter,
        tablesCreated: force ? 'all recreated' : 'created if not exists',
      });
    } catch (error) {
      console.error('Database synchronization failed:', error);
      throw error;
    }
  }

  static async seedDatabase(): Promise<void> {
    if (!DatabaseUtils.sequelize) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      console.log('Starting database seeding...');

      // Seed authors
      const authors = await DatabaseUtils.seedAuthors();
      console.log(`Seeded ${authors.length} authors`);

      // Seed categories
      const categories = await DatabaseUtils.seedCategories();
      console.log(`Seeded ${categories.length} categories`);

      // Seed books with associations
      const books = await DatabaseUtils.seedBooks(authors, categories);
      console.log(`Seeded ${books.length} books`);

      console.log('Database seeding completed successfully');
    } catch (error) {
      console.error('Database seeding failed:', error);
      throw error;
    }
  }

  private static async seedAuthors(): Promise<Author[]> {
    const authorsData = [
      { name: 'George', surname: 'Orwell', nationality: 'British' },
      { name: 'Jane', surname: 'Austen', nationality: 'British' },
      { name: 'Mark', surname: 'Twain', nationality: 'American' },
      { name: 'Gabriel', surname: 'García Márquez', nationality: 'Colombian' },
      { name: 'Virginia', surname: 'Woolf', nationality: 'British' },
      { name: 'Franz', surname: 'Kafka', nationality: 'Czech' },
      { name: 'Ernest', surname: 'Hemingway', nationality: 'American' },
      { name: 'Toni', surname: 'Morrison', nationality: 'American' },
    ];

    const authors: Author[] = [];
    for (const authorData of authorsData) {
      const [author] = await Author.findOrCreateAuthor(authorData);
      authors.push(author);
    }

    return authors;
  }

  private static async seedCategories(): Promise<Category[]> {
    const categoriesData = [
      { name: 'Fiction' },
      { name: 'Classic Literature' },
      { name: 'Dystopian Fiction' },
      { name: 'Romance' },
      { name: 'Adventure' },
      { name: 'Magical Realism' },
      { name: 'Modernist Literature' },
      { name: 'Existential Fiction' },
      { name: 'War Fiction' },
      { name: 'Contemporary Fiction' },
    ];

    const categories: Category[] = [];
    for (const categoryData of categoriesData) {
      const [category] = await Category.findOrCreateCategory(categoryData);
      categories.push(category);
    }

    return categories;
  }

  private static async seedBooks(authors: Author[], categories: Category[]): Promise<Book[]> {
    const booksData = [
      {
        isbnCode: '9780451524935',
        title: '1984',
        status: 'finished' as const,
        notes: 'A powerful dystopian novel about totalitarianism',
        authorNames: ['George Orwell'],
        categoryNames: ['Fiction', 'Dystopian Fiction', 'Classic Literature'],
      },
      {
        isbnCode: '9780486284736',
        title: 'Pride and Prejudice',
        status: 'in progress' as const,
        notes: 'Classic romance novel with wit and social commentary',
        authorNames: ['Jane Austen'],
        categoryNames: ['Fiction', 'Romance', 'Classic Literature'],
      },
      {
        isbnCode: '9780486400778',
        title: 'The Adventures of Huckleberry Finn',
        editionNumber: 1,
        editionDate: new Date('1884-12-10'),
        authorNames: ['Mark Twain'],
        categoryNames: ['Fiction', 'Adventure', 'Classic Literature'],
      },
      {
        isbnCode: '9780060883287',
        title: 'One Hundred Years of Solitude',
        status: 'paused' as const,
        notes: 'Magical realism masterpiece',
        authorNames: ['Gabriel García Márquez'],
        categoryNames: ['Fiction', 'Magical Realism', 'Classic Literature'],
      },
      {
        isbnCode: '9780156907392',
        title: 'To the Lighthouse',
        authorNames: ['Virginia Woolf'],
        categoryNames: ['Fiction', 'Modernist Literature', 'Classic Literature'],
      },
    ];

    const books: Book[] = [];
    for (const bookData of booksData) {
      const { authorNames, categoryNames, ...bookAttributes } = bookData;

      // Create book
      const book = await Book.createBook(bookAttributes);

      // Add authors
      if (authorNames) {
        for (const authorName of authorNames) {
          const [firstName, lastName] = authorName.split(' ');
          const author = authors.find(a => a.name === firstName && a.surname === lastName);
          if (author) {
            await book.addAuthors([author]);
          }
        }
      }

      // Add categories
      if (categoryNames) {
        const bookCategories = categories.filter(c => categoryNames.includes(c.name));
        await book.addCategories(bookCategories);
      }

      books.push(book);
    }

    return books;
  }

  static async resetDatabase(): Promise<void> {
    if (!DatabaseUtils.sequelize) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      console.log('Resetting database...');

      // Drop all tables and recreate
      await DatabaseUtils.syncDatabase({ force: true });

      // Reseed with sample data
      await DatabaseUtils.seedDatabase();

      console.log('Database reset completed successfully');
    } catch (error) {
      console.error('Database reset failed:', error);
      throw error;
    }
  }

  static async closeConnection(): Promise<void> {
    if (DatabaseUtils.sequelize) {
      await ModelManager.close();
      await DatabaseConnection.closeConnection();
      DatabaseUtils.sequelize = null;
      console.log('Database connection closed');
    }
  }

  static async getStatus(): Promise<{
    connected: boolean;
    modelsInitialized: boolean;
    tableStats: {
      authors: number;
      categories: number;
      books: number;
      bookAuthors: number;
      bookCategories: number;
    };
  }> {
    try {
      const connected = DatabaseUtils.sequelize ? await DatabaseConnection.testConnection() : false;
      const modelsInitialized = ModelManager.isInitialized();

      let tableStats = {
        authors: 0,
        categories: 0,
        books: 0,
        bookAuthors: 0,
        bookCategories: 0,
      };

      if (connected && modelsInitialized) {
        const { Author, Category, Book, BookAuthor, BookCategory } = ModelManager.getModels();

        tableStats = {
          authors: await Author.count(),
          categories: await Category.count(),
          books: await Book.count(),
          bookAuthors: await BookAuthor.count(),
          bookCategories: await BookCategory.count(),
        };
      }

      return {
        connected,
        modelsInitialized,
        tableStats,
      };
    } catch (error) {
      console.error('Error getting database status:', error);
      return {
        connected: false,
        modelsInitialized: false,
        tableStats: {
          authors: 0,
          categories: 0,
          books: 0,
          bookAuthors: 0,
          bookCategories: 0,
        },
      };
    }
  }
}
