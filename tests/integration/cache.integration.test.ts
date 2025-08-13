import DatabaseConnection from '../../src/config/database';
import { Author, Book, Category } from '../../src/models';
import { BookAuthor, BookCategory } from '../../src/models';

// Mock Redis client for testing cache integration
interface MockRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX: number }): Promise<string>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  flushall(): Promise<string>;
  keys(pattern: string): Promise<string[]>;
}

class MockRedis implements MockRedisClient {
  private store: Map<string, { value: string; expires?: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (item.expires && Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: string, options?: { EX: number }): Promise<string> {
    const expires = options?.EX ? Date.now() + (options.EX * 1000) : undefined;
    this.store.set(key, { value, expires: expires });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  async flushall(): Promise<string> {
    this.store.clear();
    return 'OK';
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }
}

// Cache service wrapper for testing
class CacheService {
  constructor(private redis: MockRedisClient) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async clear(): Promise<void> {
    await this.redis.flushall();
  }

  async getKeys(pattern: string): Promise<string[]> {
    return this.redis.keys(pattern);
  }
}

describe('Cache Integration Tests', () => {
  let sequelize: any;
  let redis: MockRedis;
  let cacheService: CacheService;

  beforeAll(async () => {
    // Initialize test database and cache
    sequelize = DatabaseConnection.getInstance();
    await sequelize.sync({ force: true });
    
    redis = new MockRedis();
    cacheService = new CacheService(redis);
  });

  afterAll(async () => {
    await DatabaseConnection.closeConnection();
  });

  beforeEach(async () => {
    // Clean database and cache before each test
    await sequelize.truncate({ cascade: true, restartIdentity: true });
    await cacheService.clear();
  });

  describe('Database Query Caching', () => {
    it('should cache and retrieve book queries', async () => {
      // Create test book in database
      const book = await Book.create({
        title: 'Cached Book',
        isbnCode: '9780123456789',
        editionNumber: 1,
        status: 'in progress' as const,
        notes: 'A book for cache testing'
      });

      const cacheKey = `book:${book.id}`;
      
      // Cache the book data
      await cacheService.set(cacheKey, {
        id: book.id,
        title: book.title,
        isbnCode: book.isbnCode,
        editionNumber: book.editionNumber,
        cached: true,
        cachedAt: new Date().toISOString()
      });

      // Retrieve from cache
      const cachedData = await cacheService.get(cacheKey);
      
      expect(cachedData).toBeDefined();
      expect(cachedData).toMatchObject({
        id: book.id,
        title: 'Cached Book',
        isbnCode: '9780123456789',
        editionNumber: 1,
        cached: true
      });

      // Verify cache hit
      const exists = await cacheService.exists(cacheKey);
      expect(exists).toBe(true);
    });

    it('should handle cache miss and fallback to database', async () => {
      // Create book in database only
      const book = await Book.create({
        title: 'Database Only Book',
        isbnCode: '9780987654321',
        editionNumber: 2
      });

      const cacheKey = `book:${book.id}`;
      
      // Verify cache miss
      const cachedData = await cacheService.get(cacheKey);
      expect(cachedData).toBeNull();
      
      // Fallback to database
      const dbBook = await Book.findByPk(book.id);
      expect(dbBook).toBeDefined();
      expect(dbBook?.title).toBe('Database Only Book');
      
      // Cache the database result for future use
      if (dbBook) {
        await cacheService.set(cacheKey, {
          id: dbBook.id,
          title: dbBook.title,
          isbnCode: dbBook.isbnCode,
          editionNumber: dbBook.editionNumber,
          cachedAt: new Date().toISOString()
        });
        
        // Verify it's now cached
        const nowCached = await cacheService.get(cacheKey);
        expect(nowCached).toBeDefined();
        expect((nowCached as any).title).toBe('Database Only Book');
      }
    });

    it('should invalidate cache when database records are updated', async () => {
      // Create and cache book
      const book = await Book.create({
        title: 'Original Title',
        isbnCode: '9780111111111',
        editionNumber: 1
      });

      const cacheKey = `book:${book.id}`;
      await cacheService.set(cacheKey, {
        id: book.id,
        title: book.title,
        editionNumber: book.editionNumber
      });

      // Verify cached data
      let cachedData = await cacheService.get(cacheKey);
      expect((cachedData as any).title).toBe('Original Title');

      // Update database record
      await book.update({ title: 'Updated Title', editionNumber: 2 });

      // Invalidate cache (simulating what should happen in real implementation)
      await cacheService.del(cacheKey);

      // Verify cache is invalidated
      cachedData = await cacheService.get(cacheKey);
      expect(cachedData).toBeNull();

      // Get fresh data from database
      const updatedBook = await Book.findByPk(book.id);
      expect(updatedBook?.title).toBe('Updated Title');
      expect(updatedBook?.editionNumber).toBe(2);

      // Re-cache updated data
      if (updatedBook) {
        await cacheService.set(cacheKey, {
          id: updatedBook.id,
          title: updatedBook.title,
          editionNumber: updatedBook.editionNumber
        });
      }
    });

    it('should handle complex queries with relationships', async () => {
      // Create test data
      const author = await Author.create({ name: 'Test', surname: 'Author' });
      const category = await Category.create({ name: 'Test Category' });
      const book = await Book.create({
        title: 'Complex Book',
        isbnCode: '9780222222222',
        editionNumber: 1
      });

      // Create relationships
      await BookAuthor.create({ bookId: book.id, authorId: author.id });
      await BookCategory.create({ bookId: book.id, categoryId: category.id });

      // Simulate complex query caching
      const complexQueryKey = `book_with_relations:${book.id}`;
      
      // Get data with relationships from database
      const bookAuthorRelations = await BookAuthor.findAll({
        where: { bookId: book.id },
        include: [{ model: Author, as: 'Author' }]
      });
      const bookCategoryRelations = await BookCategory.findAll({
        where: { bookId: book.id },
        include: [{ model: Category, as: 'Category' }]
      });

      expect(bookAuthorRelations).toHaveLength(1);
      expect(bookCategoryRelations).toHaveLength(1);

      // Cache complex query result
      const cacheData = {
        id: book.id,
        title: book.title,
        isbnCode: book.isbnCode,
        authors: [{ id: author.id, name: author.name, surname: author.surname }],
        categories: [{ id: category.id, name: category.name }],
        cachedAt: new Date().toISOString()
      };

      await cacheService.set(complexQueryKey, cacheData);

      // Retrieve and verify cached complex data
      const cachedComplexData = await cacheService.get(complexQueryKey);
      expect(cachedComplexData).toBeDefined();
      expect((cachedComplexData as any).authors).toHaveLength(1);
      expect((cachedComplexData as any).categories).toHaveLength(1);
      expect((cachedComplexData as any).authors[0].name).toBe('Test');
      expect((cachedComplexData as any).categories[0].name).toBe('Test Category');
    });
  });

  describe('Search Result Caching', () => {
    beforeEach(async () => {
      // Create test data for search scenarios
      await Book.bulkCreate([
        { title: 'Harry Potter and the Stone', isbnCode: '1111111111111', editionNumber: 1 },
        { title: 'Harry Potter and the Chamber', isbnCode: '2222222222222', editionNumber: 1 },
        { title: 'Lord of the Rings', isbnCode: '3333333333333', editionNumber: 1 },
        { title: 'The Hobbit', isbnCode: '4444444444444', editionNumber: 1 }
      ]);
    });

    it('should cache search results by query', async () => {
      const searchQuery = 'Harry Potter';
      const searchKey = `search:books:${Buffer.from(searchQuery).toString('base64')}`;
      
      // Perform database search
      const searchResults = await Book.findAll({
        where: {
          title: {
            [sequelize.Op.iLike]: `%${searchQuery}%`
          }
        },
        limit: 10
      });

      expect(searchResults).toHaveLength(2);

      // Cache search results
      const cacheData = {
        query: searchQuery,
        results: searchResults.map(book => ({
          id: book.id,
          title: book.title,
          isbnCode: book.isbnCode,
          editionNumber: book.editionNumber
        })),
        totalCount: searchResults.length,
        cachedAt: new Date().toISOString()
      };

      await cacheService.set(searchKey, cacheData, 1800); // 30 minutes TTL

      // Retrieve cached search results
      const cachedSearchResults = await cacheService.get(searchKey);
      expect(cachedSearchResults).toBeDefined();
      expect((cachedSearchResults as any).results).toHaveLength(2);
      expect((cachedSearchResults as any).query).toBe(searchQuery);
      expect((cachedSearchResults as any).totalCount).toBe(2);
    });

    it('should handle paginated search result caching', async () => {
      const searchQuery = 'the';
      const page = 1;
      const limit = 2;
      const paginatedSearchKey = `search:books:${Buffer.from(searchQuery).toString('base64')}:p${page}:l${limit}`;
      
      // Perform paginated database search
      const { count, rows } = await Book.findAndCountAll({
        where: {
          title: {
            [sequelize.Op.iLike]: `%${searchQuery}%`
          }
        },
        limit,
        offset: (page - 1) * limit,
        order: [['title', 'ASC']]
      });

      expect(rows.length).toBeLessThanOrEqual(limit);
      expect(count).toBeGreaterThan(0);

      // Cache paginated results
      const paginatedCacheData = {
        query: searchQuery,
        page,
        limit,
        results: rows.map(book => ({
          id: book.id,
          title: book.title,
          isbnCode: book.isbnCode
        })),
        totalCount: count,
        totalPages: Math.ceil(count / limit),
        cachedAt: new Date().toISOString()
      };

      await cacheService.set(paginatedSearchKey, paginatedCacheData, 1800);

      // Verify cached paginated results
      const cachedPaginatedResults = await cacheService.get(paginatedSearchKey);
      expect(cachedPaginatedResults).toBeDefined();
      expect((cachedPaginatedResults as any).page).toBe(page);
      expect((cachedPaginatedResults as any).limit).toBe(limit);
      expect((cachedPaginatedResults as any).totalCount).toBe(count);
      expect((cachedPaginatedResults as any).results.length).toBeLessThanOrEqual(limit);
    });

    it('should invalidate search caches when relevant data changes', async () => {
      const searchQuery = 'Potter';
      const searchKey = `search:books:${Buffer.from(searchQuery).toString('base64')}`;
      
      // Initial search and cache
      const initialResults = await Book.findAll({
        where: { title: { [sequelize.Op.iLike]: `%${searchQuery}%` } }
      });

      await cacheService.set(searchKey, {
        query: searchQuery,
        results: initialResults.map(b => ({ id: b.id, title: b.title })),
        totalCount: initialResults.length
      });

      // Verify initial cache
      let cachedResults = await cacheService.get(searchKey);
      expect((cachedResults as any).totalCount).toBe(2);

      // Add new book that matches search
      await Book.create({
        title: 'Harry Potter and the Prisoner',
        isbnCode: '5555555555555',
        editionNumber: 1
      });

      // Invalidate related search caches (simulate cache invalidation strategy)
      const searchKeys = await cacheService.getKeys('search:books:*');
      for (const key of searchKeys) {
        if (key.includes('Potter') || key.includes('Harry')) {
          await cacheService.del(key);
        }
      }

      // Verify cache invalidation
      cachedResults = await cacheService.get(searchKey);
      expect(cachedResults).toBeNull();

      // Fresh search should now return 3 results
      const freshResults = await Book.findAll({
        where: { title: { [sequelize.Op.iLike]: `%${searchQuery}%` } }
      });
      expect(freshResults).toHaveLength(3);
    });
  });

  describe('Cache Performance and TTL', () => {
    it('should respect TTL settings', async () => {
      const key = 'test:ttl';
      const shortTTL = 1; // 1 second
      
      await cacheService.set(key, { data: 'test' }, shortTTL);
      
      // Should exist immediately
      const exists1 = await cacheService.exists(key);
      expect(exists1).toBe(true);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be expired
      const exists2 = await cacheService.exists(key);
      expect(exists2).toBe(false);
      
      const expiredData = await cacheService.get(key);
      expect(expiredData).toBeNull();
    });

    it('should handle cache operations efficiently with large datasets', async () => {
      // Create large dataset
      const books = Array.from({ length: 100 }, (_, i) => ({
        title: `Book ${i}`,
        isbnCode: `978${i.toString().padStart(10, '0')}`,
        editionNumber: 1
      }));

      const createdBooks = await Book.bulkCreate(books);
      expect(createdBooks).toHaveLength(100);

      // Benchmark cache operations
      const startTime = Date.now();
      
      // Cache all books individually
      const cachePromises = createdBooks.map(book => 
        cacheService.set(`book:${book.id}`, {
          id: book.id,
          title: book.title,
          isbnCode: book.isbnCode,
          editionNumber: book.editionNumber
        })
      );
      
      await Promise.all(cachePromises);
      
      // Retrieve all cached books
      const retrievePromises = createdBooks.map(book => 
        cacheService.get(`book:${book.id}`)
      );
      
      const cachedData = await Promise.all(retrievePromises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(cachedData).toHaveLength(100);
      expect(cachedData.every(data => data !== null)).toBe(true);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent cache operations', async () => {
      const concurrentOperations = 50;
      const promises: Promise<any>[] = [];
      
      // Create concurrent cache set operations
      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          cacheService.set(`concurrent:${i}`, {
            index: i,
            data: `concurrent data ${i}`,
            timestamp: Date.now()
          })
        );
      }
      
      await Promise.all(promises);
      
      // Verify all operations completed successfully
      const retrievePromises = Array.from({ length: concurrentOperations }, (_, i) =>
        cacheService.get(`concurrent:${i}`)
      );
      
      const results = await Promise.all(retrievePromises);
      
      expect(results).toHaveLength(concurrentOperations);
      expect(results.every(result => result !== null)).toBe(true);
      
      results.forEach((result, index) => {
        expect((result as any).index).toBe(index);
        expect((result as any).data).toBe(`concurrent data ${index}`);
      });
    });
  });

  describe('Cache Consistency with Database', () => {
    it('should maintain consistency during concurrent read/write operations', async () => {
      const book = await Book.create({
        title: 'Consistency Test Book',
        isbnCode: '9780999999999',
        editionNumber: 1
      });

      const cacheKey = `book:${book.id}`;
      
      // Initial cache
      await cacheService.set(cacheKey, {
        id: book.id,
        title: book.title,
        editionNumber: book.editionNumber,
        version: 1
      });

      // Simulate concurrent operations
      const operations = [
        // Database update
        book.update({ editionNumber: 2 }).then(() => 
          cacheService.set(cacheKey, {
            id: book.id,
            title: book.title,
            editionNumber: 2,
            version: 2
          })
        ),
        
        // Cache read
        cacheService.get(cacheKey),
        
        // Another database update
        book.update({ title: 'Updated Consistency Test' }).then(() =>
          cacheService.set(cacheKey, {
            id: book.id,
            title: 'Updated Consistency Test',
            editionNumber: 2,
            version: 3
          })
        )
      ];

      const results = await Promise.all(operations);
      
      // Verify final state consistency
      const finalCachedData = await cacheService.get(cacheKey);
      const finalDbData = await Book.findByPk(book.id);
      
      expect(finalDbData?.title).toBe('Updated Consistency Test');
      expect(finalDbData?.editionNumber).toBe(2);
      expect((finalCachedData as any).version).toBe(3);
      expect((finalCachedData as any).title).toBe('Updated Consistency Test');
    });

    it('should handle cache warming from database', async () => {
      // Create books in database without caching
      const books = await Book.bulkCreate([
        { title: 'Warm Book 1', isbnCode: '7777777777777', editionNumber: 1 },
        { title: 'Warm Book 2', isbnCode: '8888888888888', editionNumber: 1 },
        { title: 'Warm Book 3', isbnCode: '9999999999999', editionNumber: 1 }
      ]);

      // Verify no cache exists
      for (const book of books) {
        const cached = await cacheService.get(`book:${book.id}`);
        expect(cached).toBeNull();
      }

      // Warm cache from database
      const warmingPromises = books.map(async book => {
        const cacheKey = `book:${book.id}`;
        return cacheService.set(cacheKey, {
          id: book.id,
          title: book.title,
          isbnCode: book.isbnCode,
          editionNumber: book.editionNumber,
          warmed: true,
          warmedAt: new Date().toISOString()
        });
      });

      await Promise.all(warmingPromises);

      // Verify cache is warmed
      for (const book of books) {
        const cached = await cacheService.get(`book:${book.id}`);
        expect(cached).toBeDefined();
        expect((cached as any).warmed).toBe(true);
        expect((cached as any).title).toBe(book.title);
        expect((cached as any).editionNumber).toBe(book.editionNumber);
      }
    });
  });
});