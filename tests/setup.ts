import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  RDS: jest.fn().mockImplementation(() => ({
    startDBInstance: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ DBInstance: { DBInstanceStatus: 'starting' } }),
    }),
    stopDBInstance: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ DBInstance: { DBInstanceStatus: 'stopping' } }),
    }),
  })),
}));

// Global test setup
beforeAll(async () => {
  // Setup test database connection if needed
});

afterAll(async () => {
  // Cleanup test resources
});