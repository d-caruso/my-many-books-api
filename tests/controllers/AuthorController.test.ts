// ================================================================
// tests/controllers/AuthorController.test.ts
// ================================================================

import { APIGatewayProxyEvent } from 'aws-lambda';
import { AuthorController } from '../../src/controllers/AuthorController';
import { Author, Book } from '../../src/models';

// Mock dependencies
jest.mock('../../src/models');

describe('AuthorController', () => {
  let authorController: AuthorController;
  let mockEvent: Partial<APIGatewayProxyEvent>;

  beforeEach(() => {
    authorController = new AuthorController();
    jest.clearAllMocks();

    mockEvent = {
      httpMethod: 'GET',
      resource: '/authors',
      pathParameters: null,
      queryStringParameters: null,
      headers: {},
      body: null,
      requestContext: {
        requestId: 'test-request-id',
      } as any,
    };
  });

  describe('createAuthor', () => {
    const validAuthorData = {
      name: 'John',
      surname: 'Doe',
      nationality: 'American',
    };

    it('should create an author successfully', async () => {
      const mockAuthor = { id: 1, ...validAuthorData };

      (Author.findOne as jest.Mock).mockResolvedValue(null);
      (Author.create as jest.Mock).mockResolvedValue(mockAuthor);

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify(validAuthorData);

      const result = await authorController.createAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Author created successfully');
      expect(body.data).toEqual(mockAuthor);
    });

    it('should create author with name and surname', async () => {
      const authorData = {
        name: 'Jane',
        surname: 'Smith',
        nationality: 'British',
      };

      const expectedAuthor = {
        id: 1,
        ...authorData,
        getFullName: jest.fn().mockReturnValue('Jane Smith'),
      };

      (Author.findOne as jest.Mock).mockResolvedValue(null);
      (Author.create as jest.Mock).mockResolvedValue(expectedAuthor);

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify(authorData);

      const result = await authorController.createAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(Author.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane',
          surname: 'Smith',
        })
      );
    });

    it('should return 400 for missing request body', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = null;

      const result = await authorController.createAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Request body is required');
    });

    it('should return 400 for validation errors', async () => {
      const invalidData = { name: 'John' }; // Missing required surname

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify(invalidData);

      const result = await authorController.createAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });

    it('should return 409 for duplicate author name', async () => {
      (Author.findOne as jest.Mock).mockResolvedValue({
        id: 2,
        name: 'John',
        surname: 'Doe',
      });

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify(validAuthorData);

      const result = await authorController.createAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(409);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Author with this name already exists');
    });

    it('should validate basic author data', async () => {
      const invalidData = {
        name: 'John',
        surname: 'Doe',
        nationality: 'A'.repeat(300), // Too long
      };

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify(invalidData);

      const result = await authorController.createAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });
  });

  describe('getAuthor', () => {
    it('should get an author successfully', async () => {
      const mockAuthor = {
        id: 1,
        name: 'John',
        surname: 'Doe',
        nationality: 'American',
      };

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);

      mockEvent.pathParameters = { id: '1' };

      const result = await authorController.getAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockAuthor);
    });

    it('should get author with books when includeBooks=true', async () => {
      const mockAuthor = {
        id: 1,
        name: 'John',
        surname: 'Doe',
        Books: [{ id: 1, title: 'Test Book' }],
      };

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);

      mockEvent.pathParameters = { id: '1' };
      mockEvent.queryStringParameters = { includeBooks: 'true' };

      const result = await authorController.getAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.Books).toBeDefined();
    });

    it('should return 400 for invalid author ID', async () => {
      mockEvent.pathParameters = { id: 'invalid' };

      const result = await authorController.getAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Valid author ID is required');
    });

    it('should return 404 for non-existent author', async () => {
      (Author.findByPk as jest.Mock).mockResolvedValue(null);

      mockEvent.pathParameters = { id: '999' };

      const result = await authorController.getAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Author not found');
    });
  });

  describe('updateAuthor', () => {
    const updateData = {
      nationality: 'British',
    };

    it('should update an author successfully', async () => {
      const mockAuthor = {
        id: 1,
        name: 'John',
        surname: 'Doe',
        nationality: 'American',
        update: jest.fn(),
      };

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);

      mockEvent.httpMethod = 'PUT';
      mockEvent.pathParameters = { id: '1' };
      mockEvent.body = JSON.stringify(updateData);

      const result = await authorController.updateAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Author updated successfully');
      expect(mockAuthor.update).toHaveBeenCalled();
    });

    it('should update name when name or surname changes', async () => {
      const mockAuthor = {
        id: 1,
        name: 'John',
        surname: 'Doe',
        nationality: 'American',
        update: jest.fn(),
      };

      const nameUpdateData = {
        name: 'Jane',
        surname: 'Smith',
      };

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);
      (Author.findOne as jest.Mock).mockResolvedValue(null); // No conflict

      mockEvent.httpMethod = 'PUT';
      mockEvent.pathParameters = { id: '1' };
      mockEvent.body = JSON.stringify(nameUpdateData);

      const result = await authorController.updateAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockAuthor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane',
          surname: 'Smith',
        })
      );
    });

    it('should return 404 for non-existent author', async () => {
      (Author.findByPk as jest.Mock).mockResolvedValue(null);

      mockEvent.httpMethod = 'PUT';
      mockEvent.pathParameters = { id: '999' };
      mockEvent.body = JSON.stringify(updateData);

      const result = await authorController.updateAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Author not found');
    });
  });

  describe('deleteAuthor', () => {
    it('should delete an author successfully', async () => {
      const mockAuthor = {
        id: 1,
        destroy: jest.fn(),
      };

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);
      (Book.count as jest.Mock).mockResolvedValue(0); // No books associated

      mockEvent.httpMethod = 'DELETE';
      mockEvent.pathParameters = { id: '1' };

      const result = await authorController.deleteAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(204);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Author deleted successfully');
      expect(mockAuthor.destroy).toHaveBeenCalled();
    });

    it('should return 409 when author has associated books', async () => {
      const mockAuthor = {
        id: 1,
        destroy: jest.fn(),
      };

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);
      (Book.count as jest.Mock).mockResolvedValue(1); // Author has books

      mockEvent.httpMethod = 'DELETE';
      mockEvent.pathParameters = { id: '1' };

      const result = await authorController.deleteAuthor(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(409);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Cannot delete author with associated books');
      expect(mockAuthor.destroy).not.toHaveBeenCalled();
    });
  });

  describe('listAuthors', () => {
    it('should list authors with pagination', async () => {
      const mockAuthors = [
        { id: 1, name: 'John', surname: 'Doe' },
        { id: 2, name: 'Jane', surname: 'Smith' },
      ];

      (Author.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockAuthors,
      });

      mockEvent.queryStringParameters = { page: '1', limit: '10' };

      const result = await authorController.listAuthors(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockAuthors);
      expect(body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });
  });

  describe('getAuthorBooks', () => {
    it('should get author books with pagination', async () => {
      const mockAuthor = { 
        id: 1, 
        name: 'John', 
        surname: 'Doe',
        getFullName: jest.fn().mockReturnValue('John Doe')
      };
      const mockBooks = [
        { id: 1, title: 'Book 1' },
        { id: 2, title: 'Book 2' },
      ];

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);
      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockBooks,
      });

      mockEvent.pathParameters = { id: '1' };

      const result = await authorController.getAuthorBooks(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.author).toEqual({
        id: 1,
        name: 'John',
        surname: 'Doe',
      });
      expect(body.data.books).toEqual(mockBooks);
    });
  });
});