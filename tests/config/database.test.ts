// ================================================================
// tests/config/database.test.ts
// ================================================================

import DatabaseConnection from '@/config/database';

// Mock environment variables
const mockEnv = {
  DB_HOST: 'localhost',
  DB_PORT: '3306',
  DB_NAME: 'test_my_many_books',
  DB_USER: 'test_user',
  DB_PASSWORD: 'test_password',
  DB_SSL: 'false',
  NODE_ENV: 'test',
};

describe('DatabaseConnection', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Set mock environment variables
    Object.assign(process.env, mockEnv);
    // Reset singleton
    (DatabaseConnection as any).instance = null;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should create a singleton instance', () => {
      const instance1 = DatabaseConnection.getInstance();
      const instance2 = DatabaseConnection.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should throw error when required env vars are missing', () => {
      // Clear the required environment variable
      delete process.env['DB_HOST'];
      
      expect(() => {
        DatabaseConnection.getInstance();
      }).toThrow('Missing required database environment variables');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      // Mock successful authentication
      const mockAuthenticate = jest.fn().mockResolvedValue(undefined);
      const mockSequelize = {
        authenticate: mockAuthenticate,
      };

      jest.spyOn(DatabaseConnection, 'getInstance').mockReturnValue(mockSequelize as any);

      const result = await DatabaseConnection.testConnection();
      
      expect(result).toBe(true);
      expect(mockAuthenticate).toHaveBeenCalled();
    });

    it('should return false for failed connection', async () => {
      // Mock failed authentication
      const mockAuthenticate = jest.fn().mockRejectedValue(new Error('Connection failed'));
      const mockSequelize = {
        authenticate: mockAuthenticate,
      };

      jest.spyOn(DatabaseConnection, 'getInstance').mockReturnValue(mockSequelize as any);

      const result = await DatabaseConnection.testConnection();
      
      expect(result).toBe(false);
      expect(mockAuthenticate).toHaveBeenCalled();
    });
  });
});
