import axios, { AxiosError } from 'axios';
import { OpenLibraryClient } from '@/services/openLibraryClient';
import { OpenLibraryResponse } from '@/types/openLibrary';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(),
  AxiosError: jest.requireActual('axios').AxiosError,
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenLibraryClient', () => {
  let client: OpenLibraryClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: { 
          use: jest.fn().mockReturnValue(1)
        },
        response: { 
          use: jest.fn().mockReturnValue(1)
        },
      },
    };

    (mockedAxios.create as jest.Mock).mockReturnValue(mockAxiosInstance);
    client = new OpenLibraryClient();
  });

  describe('fetchBookByIsbn', () => {
    it('should handle invalid ISBN', async () => {
      const result = await client.fetchBookByIsbn('invalid-isbn');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid ISBN');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should handle book not found', async () => {
      const mockResponse: OpenLibraryResponse = {};

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
      });

      const result = await client.fetchBookByIsbn('9780451524935');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Book not found in Open Library');
      expect(result.statusCode).toBe(404);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should fetch book successfully with valid ISBN', async () => {
      const mockBook = {
        title: 'Test Book',
        authors: [{ name: 'Test Author' }],
        publishers: ['Test Publisher'],
        publish_date: '2023',
      };

      const mockResponse: OpenLibraryResponse = {
        'ISBN:9780451524935': mockBook,
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
      });

      const result = await client.fetchBookByIsbn('9780451524935');

      expect(result.success).toBe(true);
      expect(result.book).toEqual(mockBook);
      expect(result.error).toBeUndefined();
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors', async () => {
      const networkError = new AxiosError('Network Error', 'ECONNREFUSED');
      mockAxiosInstance.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError);

      const result = await client.fetchBookByIsbn('9780451524935');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error - please check your internet connection');
      expect(result.statusCode).toBeUndefined();
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it('should handle HTTP errors', async () => {
      const axiosError = new AxiosError(
        'Request failed with status code 500',
        'ERR_BAD_RESPONSE',
        undefined,
        undefined,
        {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as any,
        }
      );

      mockAxiosInstance.get
        .mockRejectedValueOnce(axiosError)
        .mockRejectedValueOnce(axiosError)
        .mockRejectedValueOnce(axiosError);

      const result = await client.fetchBookByIsbn('9780451524935');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Open Library service is temporarily unavailable');
      expect(result.statusCode).toBe(500);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('fetchBooksByIsbns', () => {
    it('should fetch multiple books successfully', async () => {
      const mockResponse: OpenLibraryResponse = {
        'ISBN:9780451524935': {
          title: 'Book 1',
          authors: [{ name: 'Author 1' }],
        },
        'ISBN:9780486284736': {
          title: 'Book 2',
          authors: [{ name: 'Author 2' }],
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
      });

      const result = await client.fetchBooksByIsbns(['9780451524935', '9780486284736']);

      expect(result['9780451524935']).toBeDefined();
      expect(result['9780486284736']).toBeDefined();
      expect(result['9780451524935']!.success).toBe(true);
      expect(result['9780486284736']!.success).toBe(true);
      expect(result['9780451524935']!.book?.title).toBe('Book 1');
      expect(result['9780486284736']!.book?.title).toBe('Book 2');
    });

    it('should handle mix of valid and invalid ISBNs', async () => {
      const mockResponse: OpenLibraryResponse = {
        'ISBN:9780451524935': {
          title: 'Book 1',
          authors: [{ name: 'Author 1' }],
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
      });

      const result = await client.fetchBooksByIsbns(['9780451524935', 'invalid-isbn']);

      expect(result['9780451524935']).toBeDefined();
      expect(result['invalid-isbn']).toBeDefined();
      expect(result['9780451524935']!.success).toBe(true);
      expect(result['invalid-isbn']!.success).toBe(false);
      expect(result['invalid-isbn']!.error).toContain('Invalid ISBN');
    });
  });

  describe('searchBooksByTitle', () => {
    it('should search books by title successfully', async () => {
      const mockResponse = {
        docs: [
          {
            title: 'Test Book',
            author_name: ['Test Author'],
            isbn: ['9780451524935'],
            publish_year: [2023],
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
      });

      const result = await client.searchBooksByTitle('Test Book');

      expect(result.success).toBe(true);
      expect(result.books).toHaveLength(1);
      expect(result.books).toBeDefined();
      expect(result.books![0]!.title).toBe('Test Book');
    });

    it('should handle empty title', async () => {
      const result = await client.searchBooksByTitle('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Title is required for search');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });
  });

  describe('getCoverUrl', () => {
    it('should generate correct cover URL', () => {
      const url = client.getCoverUrl('9780451524935', 'M');
      
      expect(url).toBe('https://openlibrary.org/covers/isbn/9780451524935-M.jpg');
    });

    it('should throw error for invalid ISBN', () => {
      expect(() => {
        client.getCoverUrl('invalid-isbn');
      }).toThrow('Invalid ISBN');
    });
  });

  describe('healthCheck', () => {
    it('should return available when service is up', async () => {
      mockAxiosInstance.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: {},
            status: 200,
            statusText: 'OK',
          }), 10)
        )
      );

      const result = await client.healthCheck();

      expect(result.available).toBe(true);
      expect(result.responseTime).toBeGreaterThan(5);
    });

    it('should return unavailable when service is down', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network Error'));

      const result = await client.healthCheck();

      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});