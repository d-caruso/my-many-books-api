// ================================================================
// tests/interfaces/AuthUser.test.ts
// Unit tests for AuthUser interface and related services
// ================================================================

import { AuthUser } from '../../src/models/interfaces/ModelInterfaces';
import { UserService } from '../../src/middleware/auth';
import { User } from '../../src/models/User';

// Mock dependencies
jest.mock('../../src/models/User');

const mockUser = User as jest.Mocked<typeof User>;

describe('AuthUser Interface', () => {
  describe('Interface Structure', () => {
    it('should define the correct AuthUser interface structure', () => {
      const authUser: AuthUser = {
        userId: 1,
        email: 'test@example.com',
        provider: 'cognito',
        providerUserId: 'provider123',
        isNewUser: false,
      };

      expect(authUser).toHaveProperty('userId');
      expect(authUser).toHaveProperty('email');
      expect(authUser).toHaveProperty('provider');
      expect(authUser).toHaveProperty('providerUserId');
      expect(authUser).toHaveProperty('isNewUser');

      expect(typeof authUser.userId).toBe('number');
      expect(typeof authUser.email).toBe('string');
      expect(typeof authUser.provider).toBe('string');
      expect(typeof authUser.providerUserId).toBe('string');
      expect(typeof authUser.isNewUser).toBe('boolean');
    });

    it('should allow optional providerUserId', () => {
      const authUser: AuthUser = {
        userId: 1,
        email: 'test@example.com',
        provider: 'cognito',
        // providerUserId is optional
        isNewUser: false,
      };

      expect(authUser.providerUserId).toBeUndefined();
    });

    it('should allow optional isNewUser', () => {
      const authUser: AuthUser = {
        userId: 1,
        email: 'test@example.com',
        provider: 'cognito',
        providerUserId: 'provider123',
        // isNewUser is optional
      };

      expect(authUser.isNewUser).toBeUndefined();
    });

    it('should support different provider types', () => {
      const providers = ['cognito', 'auth0', 'firebase', 'google'];

      providers.forEach(provider => {
        const authUser: AuthUser = {
          userId: 1,
          email: 'test@example.com',
          provider,
          providerUserId: 'provider123',
        };

        expect(authUser.provider).toBe(provider);
      });
    });

    it('should support different userId formats', () => {
      const userIds = [1, 999, 1234567890];

      userIds.forEach(userId => {
        const authUser: AuthUser = {
          userId,
          email: 'test@example.com',
          provider: 'cognito',
        };

        expect(authUser.userId).toBe(userId);
        expect(typeof authUser.userId).toBe('number');
      });
    });

    it('should support different email formats', () => {
      const emails = [
        'simple@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company-name.com',
      ];

      emails.forEach(email => {
        const authUser: AuthUser = {
          userId: 1,
          email,
          provider: 'cognito',
        };

        expect(authUser.email).toBe(email);
      });
    });
  });

  describe('Usage Patterns', () => {
    it('should represent a new user correctly', () => {
      const newUserAuth: AuthUser = {
        userId: 1,
        email: 'newuser@example.com',
        provider: 'cognito',
        providerUserId: 'cognito_123456',
        isNewUser: true,
      };

      expect(newUserAuth.isNewUser).toBe(true);
      expect(newUserAuth.userId).toBeDefined();
      expect(newUserAuth.providerUserId).toBeDefined();
    });

    it('should represent an existing user correctly', () => {
      const existingUserAuth: AuthUser = {
        userId: 42,
        email: 'existing@example.com',
        provider: 'auth0',
        providerUserId: 'auth0_987654',
        isNewUser: false,
      };

      expect(existingUserAuth.isNewUser).toBe(false);
      expect(existingUserAuth.userId).toBe(42);
      expect(existingUserAuth.provider).toBe('auth0');
    });

    it('should support minimal auth info', () => {
      const minimalAuth: AuthUser = {
        userId: 1,
        email: 'minimal@example.com',
        provider: 'custom',
      };

      expect(minimalAuth.userId).toBe(1);
      expect(minimalAuth.email).toBe('minimal@example.com');
      expect(minimalAuth.provider).toBe('custom');
      expect(minimalAuth.providerUserId).toBeUndefined();
      expect(minimalAuth.isNewUser).toBeUndefined();
    });

    it('should be serializable to JSON', () => {
      const authUser: AuthUser = {
        userId: 1,
        email: 'test@example.com',
        provider: 'cognito',
        providerUserId: 'provider123',
        isNewUser: false,
      };

      const serialized = JSON.stringify(authUser);
      const deserialized = JSON.parse(serialized) as AuthUser;

      expect(deserialized).toEqual(authUser);
      expect(deserialized.userId).toBe(1);
      expect(deserialized.email).toBe('test@example.com');
      expect(deserialized.provider).toBe('cognito');
      expect(deserialized.providerUserId).toBe('provider123');
      expect(deserialized.isNewUser).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should enforce required fields at compile time', () => {
      // These should compile without errors
      const validAuth1: AuthUser = {
        userId: 1,
        email: 'test@example.com',
        provider: 'cognito',
      };

      const validAuth2: AuthUser = {
        userId: 2,
        email: 'test2@example.com',
        provider: 'auth0',
        providerUserId: 'provider456',
        isNewUser: true,
      };

      expect(validAuth1).toBeDefined();
      expect(validAuth2).toBeDefined();

      // TypeScript would catch these at compile time:
      // const invalidAuth1: AuthUser = { email: 'test@example.com' }; // Missing userId
      // const invalidAuth2: AuthUser = { userId: 1 }; // Missing email
      // const invalidAuth3: AuthUser = { userId: 1, email: 'test@example.com' }; // Missing provider
    });

    it('should preserve type information for optional fields', () => {
      const authUser: AuthUser = {
        userId: 1,
        email: 'test@example.com',
        provider: 'cognito',
        providerUserId: 'provider123',
        isNewUser: false,
      };

      // Type assertions should work correctly
      if (authUser.providerUserId) {
        expect(typeof authUser.providerUserId).toBe('string');
      }

      if (authUser.isNewUser !== undefined) {
        expect(typeof authUser.isNewUser).toBe('boolean');
      }
    });
  });
});

describe('UserService Extended Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findOrCreateUser - Additional Scenarios', () => {
    it('should handle provider users with long names', async () => {
      const longName = 'A'.repeat(50);
      const longSurname = 'B'.repeat(50);

      mockUser.findOne.mockResolvedValue(null);
      mockUser.create.mockResolvedValue({ id: 1 } as any);

      const providerUser = {
        id: 'provider123',
        email: 'longname@example.com',
        name: longName,
        surname: longSurname,
      };

      await UserService.findOrCreateUser(providerUser, 'cognito');

      expect(mockUser.create).toHaveBeenCalledWith({
        email: 'longname@example.com',
        name: longName,
        surname: longSurname,
        isActive: true,
      });
    });

    it('should handle provider users with special characters', async () => {
      mockUser.findOne.mockResolvedValue(null);
      mockUser.create.mockResolvedValue({ id: 1 } as any);

      const providerUser = {
        id: 'provider123',
        email: 'special@example.com',
        name: 'José María',
        surname: "O'Connor-Smith",
      };

      await UserService.findOrCreateUser(providerUser, 'auth0');

      expect(mockUser.create).toHaveBeenCalledWith({
        email: 'special@example.com',
        name: 'José María',
        surname: "O'Connor-Smith",
        isActive: true,
      });
    });

    it('should handle case-sensitive email matching', async () => {
      const mockExistingUser = { id: 1, email: 'Test@Example.Com' };
      mockUser.findOne.mockResolvedValue(mockExistingUser as any);

      const providerUser = {
        id: 'provider123',
        email: 'test@example.com', // Lowercase
        name: 'Test',
        surname: 'User',
      };

      const result = await UserService.findOrCreateUser(providerUser, 'cognito');

      expect(result.user).toBe(mockExistingUser);
      expect(result.isNewUser).toBe(false);
      expect(mockUser.findOne).toHaveBeenCalledWith({ 
        where: { email: 'test@example.com' } 
      });
    });

    it('should handle provider users with minimal information', async () => {
      mockUser.findOne.mockResolvedValue(null);
      mockUser.create.mockResolvedValue({ id: 1 } as any);

      const providerUser = {
        id: 'provider123',
        email: 'minimal@example.com',
        // No name or surname provided
      };

      await UserService.findOrCreateUser(providerUser, 'cognito');

      expect(mockUser.create).toHaveBeenCalledWith({
        email: 'minimal@example.com',
        name: 'Unknown',
        surname: 'User',
        isActive: true,
      });
    });

    it('should handle empty string names gracefully', async () => {
      mockUser.findOne.mockResolvedValue(null);
      mockUser.create.mockResolvedValue({ id: 1 } as any);

      const providerUser = {
        id: 'provider123',
        email: 'empty@example.com',
        name: '',
        surname: '',
      };

      await UserService.findOrCreateUser(providerUser, 'cognito');

      expect(mockUser.create).toHaveBeenCalledWith({
        email: 'empty@example.com',
        name: 'Unknown',
        surname: 'User',
        isActive: true,
      });
    });

    it('should preserve whitespace in names', async () => {
      mockUser.findOne.mockResolvedValue(null);
      mockUser.create.mockResolvedValue({ id: 1 } as any);

      const providerUser = {
        id: 'provider123',
        email: 'whitespace@example.com',
        name: ' John ',
        surname: ' Doe ',
      };

      await UserService.findOrCreateUser(providerUser, 'cognito');

      expect(mockUser.create).toHaveBeenCalledWith({
        email: 'whitespace@example.com',
        name: ' John ',
        surname: ' Doe ',
        isActive: true,
      });
    });

    it('should handle database errors during user creation', async () => {
      mockUser.findOne.mockResolvedValue(null);
      mockUser.create.mockRejectedValue(new Error('Database constraint violation'));

      const providerUser = {
        id: 'provider123',
        email: 'error@example.com',
        name: 'Error',
        surname: 'User',
      };

      await expect(
        UserService.findOrCreateUser(providerUser, 'cognito')
      ).rejects.toThrow('Database constraint violation');
    });

    it('should handle database errors during user lookup', async () => {
      mockUser.findOne.mockRejectedValue(new Error('Database connection failed'));

      const providerUser = {
        id: 'provider123',
        email: 'lookup-error@example.com',
        name: 'Lookup',
        surname: 'Error',
      };

      await expect(
        UserService.findOrCreateUser(providerUser, 'cognito')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getUserById - Additional Scenarios', () => {
    it('should handle very large user IDs', async () => {
      const largeId = 999999999999;
      const mockUser = { id: largeId, email: 'large@example.com' };
      
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const result = await UserService.getUserById(largeId);

      expect(result).toBe(mockUser);
      expect(User.findByPk).toHaveBeenCalledWith(largeId);
    });

    it('should handle database timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      timeoutError.name = 'SequelizeTimeoutError';
      
      (User.findByPk as jest.Mock).mockRejectedValue(timeoutError);

      await expect(UserService.getUserById(1)).rejects.toThrow('Query timeout');
    });

    it('should handle concurrent requests for same user', async () => {
      const mockUser = { id: 1, email: 'concurrent@example.com' };
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const promises = Array(10).fill(null).map(() => UserService.getUserById(1));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBe(mockUser);
      });
      expect(User.findByPk).toHaveBeenCalledTimes(10);
    });
  });

  describe('deactivateUser - Additional Scenarios', () => {
    it('should handle non-existent user gracefully', async () => {
      (User.update as jest.Mock).mockResolvedValue([0]); // No rows affected

      await expect(UserService.deactivateUser(999)).resolves.not.toThrow();
      expect(User.update).toHaveBeenCalledWith(
        { isActive: false },
        { where: { id: 999 } }
      );
    });

    it('should handle database constraint errors', async () => {
      const constraintError = new Error('Foreign key constraint violation');
      constraintError.name = 'SequelizeForeignKeyConstraintError';
      
      (User.update as jest.Mock).mockRejectedValue(constraintError);

      await expect(UserService.deactivateUser(1)).rejects.toThrow('Foreign key constraint violation');
    });

    it('should handle multiple concurrent deactivations', async () => {
      (User.update as jest.Mock).mockResolvedValue([1]);

      const promises = Array(5).fill(null).map(() => UserService.deactivateUser(1));
      await Promise.all(promises);

      expect(User.update).toHaveBeenCalledTimes(5);
    });

    it('should preserve other user data when deactivating', async () => {
      (User.update as jest.Mock).mockResolvedValue([1]);

      await UserService.deactivateUser(1);

      expect(User.update).toHaveBeenCalledWith(
        { isActive: false }, // Only isActive should be updated
        { where: { id: 1 } }
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle undefined provider user', async () => {
      const providerUser = undefined as any;

      await expect(
        UserService.findOrCreateUser(providerUser, 'cognito')
      ).rejects.toThrow();
    });

    it('should handle null user ID', async () => {
      await expect(UserService.getUserById(null as any)).rejects.toThrow();
    });

    it('should handle negative user ID', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await UserService.getUserById(-1);
      expect(result).toBeNull();
    });

    it('should handle zero user ID', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await UserService.getUserById(0);
      expect(result).toBeNull();
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(200) + '@' + 'b'.repeat(50) + '.com';
      mockUser.findOne.mockResolvedValue(null);
      mockUser.create.mockResolvedValue({ id: 1 } as any);

      const providerUser = {
        id: 'provider123',
        email: longEmail,
        name: 'Long',
        surname: 'Email',
      };

      await UserService.findOrCreateUser(providerUser, 'cognito');

      expect(mockUser.create).toHaveBeenCalledWith({
        email: longEmail,
        name: 'Long',
        surname: 'Email',
        isActive: true,
      });
    });
  });
});