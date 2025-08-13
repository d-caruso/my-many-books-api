// ================================================================
// tests/middleware/auth.test.ts
// Comprehensive unit tests for authentication middleware
// ================================================================

import { Request, Response, NextFunction } from 'express';
import {
  authMiddleware,
  optionalAuthMiddleware,
  requirePermission,
  AuthProviderFactory,
  CognitoAuthProvider,
  Auth0Provider,
  UserService,
  AuthenticatedRequest,
  AuthProvider,
  AuthProviderUser,
} from '../../src/middleware/auth';
import { User } from '../../src/models/User';

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('jsonwebtoken');

const mockUser = User as jest.Mocked<typeof User>;

describe('Authentication Middleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should reject request without Authorization header', async () => {
      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Missing or invalid authorization header' 
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid Authorization header format', async () => {
      req.headers!.authorization = 'InvalidFormat token';

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Missing or invalid authorization header' 
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should process valid token successfully', async () => {
      const mockToken = 'valid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;

      const mockProviderUser: AuthProviderUser = {
        id: 'provider123',
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
      };

      const mockDbUser = {
        id: 1,
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
        isActive: true,
      };

      // Mock AuthProviderFactory and provider
      const mockProvider: jest.Mocked<AuthProvider> = {
        verifyToken: jest.fn().mockResolvedValue(mockProviderUser),
        getProviderName: jest.fn().mockReturnValue('cognito'),
      };

      jest.spyOn(AuthProviderFactory, 'createProvider').mockReturnValue(mockProvider);
      jest.spyOn(UserService, 'findOrCreateUser').mockResolvedValue({
        user: mockDbUser as any,
        isNewUser: false,
      });

      process.env.AUTH_PROVIDER = 'cognito';

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(mockProvider.verifyToken).toHaveBeenCalledWith(mockToken);
      expect(UserService.findOrCreateUser).toHaveBeenCalledWith(mockProviderUser, 'cognito');
      expect(req.user).toEqual({
        userId: 1,
        email: 'test@example.com',
        provider: 'cognito',
        providerUserId: 'provider123',
        isNewUser: false,
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject deactivated user', async () => {
      const mockToken = 'valid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;

      const mockProviderUser: AuthProviderUser = {
        id: 'provider123',
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
      };

      const mockDbUser = {
        id: 1,
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
        isActive: false, // Deactivated user
      };

      const mockProvider: jest.Mocked<AuthProvider> = {
        verifyToken: jest.fn().mockResolvedValue(mockProviderUser),
        getProviderName: jest.fn().mockReturnValue('cognito'),
      };

      jest.spyOn(AuthProviderFactory, 'createProvider').mockReturnValue(mockProvider);
      jest.spyOn(UserService, 'findOrCreateUser').mockResolvedValue({
        user: mockDbUser as any,
        isNewUser: false,
      });

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account is deactivated' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle token verification failure', async () => {
      const mockToken = 'invalid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;

      const mockProvider: jest.Mocked<AuthProvider> = {
        verifyToken: jest.fn().mockRejectedValue(new Error('Token verification failed')),
        getProviderName: jest.fn().mockReturnValue('cognito'),
      };

      jest.spyOn(AuthProviderFactory, 'createProvider').mockReturnValue(mockProvider);

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        details: 'Token verification failed',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle new user creation', async () => {
      const mockToken = 'valid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;

      const mockProviderUser: AuthProviderUser = {
        id: 'provider123',
        email: 'newuser@example.com',
        name: 'New',
        surname: 'User',
      };

      const mockDbUser = {
        id: 2,
        email: 'newuser@example.com',
        name: 'New',
        surname: 'User',
        isActive: true,
      };

      const mockProvider: jest.Mocked<AuthProvider> = {
        verifyToken: jest.fn().mockResolvedValue(mockProviderUser),
        getProviderName: jest.fn().mockReturnValue('cognito'),
      };

      jest.spyOn(AuthProviderFactory, 'createProvider').mockReturnValue(mockProvider);
      jest.spyOn(UserService, 'findOrCreateUser').mockResolvedValue({
        user: mockDbUser as any,
        isNewUser: true, // New user
      });

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(req.user).toEqual({
        userId: 2,
        email: 'newuser@example.com',
        provider: 'cognito',
        providerUserId: 'provider123',
        isNewUser: true,
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should continue without authentication when no header provided', async () => {
      await optionalAuthMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should continue without authentication when invalid header provided', async () => {
      req.headers!.authorization = 'InvalidFormat token';

      await optionalAuthMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should authenticate when valid header provided', async () => {
      const mockToken = 'valid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;

      const mockProviderUser: AuthProviderUser = {
        id: 'provider123',
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
      };

      const mockDbUser = {
        id: 1,
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
        isActive: true,
      };

      const mockProvider: jest.Mocked<AuthProvider> = {
        verifyToken: jest.fn().mockResolvedValue(mockProviderUser),
        getProviderName: jest.fn().mockReturnValue('cognito'),
      };

      jest.spyOn(AuthProviderFactory, 'createProvider').mockReturnValue(mockProvider);
      jest.spyOn(UserService, 'findOrCreateUser').mockResolvedValue({
        user: mockDbUser as any,
        isNewUser: false,
      });

      await optionalAuthMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user when authentication fails', async () => {
      const mockToken = 'invalid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;

      const mockProvider: jest.Mocked<AuthProvider> = {
        verifyToken: jest.fn().mockRejectedValue(new Error('Token verification failed')),
        getProviderName: jest.fn().mockReturnValue('cognito'),
      };

      jest.spyOn(AuthProviderFactory, 'createProvider').mockReturnValue(mockProvider);

      await optionalAuthMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should require authentication', async () => {
      const permissionMiddleware = requirePermission('read');

      await permissionMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow authenticated user through', async () => {
      req.user = {
        userId: 1,
        email: 'test@example.com',
        provider: 'cognito',
        providerUserId: 'provider123',
      };

      const permissionMiddleware = requirePermission('read');

      await permissionMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

describe('AuthProviderFactory', () => {
  beforeEach(() => {
    // Clear environment variables
    delete process.env.AWS_REGION;
    delete process.env.COGNITO_USER_POOL_ID;
    delete process.env.AUTH0_DOMAIN;
    delete process.env.AUTH0_AUDIENCE;
  });

  it('should create Cognito provider', () => {
    process.env.AWS_REGION = 'us-east-1';
    process.env.COGNITO_USER_POOL_ID = 'us-east-1_123456789';

    const provider = AuthProviderFactory.createProvider('cognito');

    expect(provider).toBeInstanceOf(CognitoAuthProvider);
    expect(provider.getProviderName()).toBe('cognito');
  });

  it('should create Auth0 provider', () => {
    process.env.AUTH0_DOMAIN = 'test.auth0.com';
    process.env.AUTH0_AUDIENCE = 'test-audience';

    const provider = AuthProviderFactory.createProvider('auth0');

    expect(provider).toBeInstanceOf(Auth0Provider);
    expect(provider.getProviderName()).toBe('auth0');
  });

  it('should throw error for unsupported provider', () => {
    expect(() => {
      AuthProviderFactory.createProvider('unsupported');
    }).toThrow('Unsupported auth provider: unsupported');
  });
});

describe('CognitoAuthProvider', () => {
  let provider: CognitoAuthProvider;

  beforeEach(() => {
    provider = new CognitoAuthProvider('us-east-1', 'us-east-1_123456789');
  });

  it('should return correct provider name', () => {
    expect(provider.getProviderName()).toBe('cognito');
  });

  it('should decode JWT token successfully', async () => {
    const jwt = require('jsonwebtoken');
    const mockDecodedToken = {
      sub: 'user-123',
      email: 'test@example.com',
      given_name: 'John',
      family_name: 'Doe',
    };

    jwt.decode = jest.fn().mockReturnValue(mockDecodedToken);

    const result = await provider.verifyToken('mock.jwt.token');

    expect(result).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: 'John',
      surname: 'Doe',
    });
  });

  it('should throw error for invalid token format', async () => {
    const jwt = require('jsonwebtoken');
    jwt.decode = jest.fn().mockReturnValue(null);

    await expect(provider.verifyToken('invalid-token')).rejects.toThrow('Token verification failed');
  });

  it('should throw error for token missing required fields', async () => {
    const jwt = require('jsonwebtoken');
    const mockDecodedToken = {
      sub: 'user-123',
      // Missing email
      given_name: 'John',
      family_name: 'Doe',
    };

    jwt.decode = jest.fn().mockReturnValue(mockDecodedToken);

    await expect(provider.verifyToken('incomplete-token')).rejects.toThrow('Token verification failed');
  });
});

describe('Auth0Provider', () => {
  let provider: Auth0Provider;

  beforeEach(() => {
    provider = new Auth0Provider('test.auth0.com', 'test-audience');
  });

  it('should return correct provider name', () => {
    expect(provider.getProviderName()).toBe('auth0');
  });

  it('should throw error for unimplemented verification', async () => {
    await expect(provider.verifyToken('mock.jwt.token')).rejects.toThrow('Auth0 provider not yet implemented');
  });
});

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findOrCreateUser', () => {
    it('should return existing user', async () => {
      const mockExistingUser = {
        id: 1,
        email: 'existing@example.com',
        name: 'Existing',
        surname: 'User',
      };

      mockUser.findOne.mockResolvedValue(mockExistingUser as any);

      const providerUser: AuthProviderUser = {
        id: 'provider123',
        email: 'existing@example.com',
        name: 'Existing',
        surname: 'User',
      };

      const result = await UserService.findOrCreateUser(providerUser, 'cognito');

      expect(result.user).toBe(mockExistingUser);
      expect(result.isNewUser).toBe(false);
      expect(mockUser.findOne).toHaveBeenCalledWith({ where: { email: 'existing@example.com' } });
      expect(mockUser.create).not.toHaveBeenCalled();
    });

    it('should create new user when not found', async () => {
      const mockNewUser = {
        id: 2,
        email: 'new@example.com',
        name: 'New',
        surname: 'User',
        isActive: true,
      };

      mockUser.findOne.mockResolvedValue(null);
      mockUser.create.mockResolvedValue(mockNewUser as any);

      const providerUser: AuthProviderUser = {
        id: 'provider123',
        email: 'new@example.com',
        name: 'New',
        surname: 'User',
      };

      const result = await UserService.findOrCreateUser(providerUser, 'cognito');

      expect(result.user).toBe(mockNewUser);
      expect(result.isNewUser).toBe(true);
      expect(mockUser.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: 'New',
        surname: 'User',
        isActive: true,
      });
    });

    it('should handle missing name/surname with defaults', async () => {
      mockUser.findOne.mockResolvedValue(null);
      mockUser.create.mockResolvedValue({ id: 3 } as any);

      const providerUser: AuthProviderUser = {
        id: 'provider123',
        email: 'minimal@example.com',
        // name and surname are optional
      };

      await UserService.findOrCreateUser(providerUser, 'cognito');

      expect(mockUser.create).toHaveBeenCalledWith({
        email: 'minimal@example.com',
        name: 'Unknown',
        surname: 'User',
        isActive: true,
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const result = await UserService.getUserById(1);

      expect(result).toBe(mockUser);
      expect(User.findByPk).toHaveBeenCalledWith(1);
    });

    it('should return null when user not found', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await UserService.getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      (User.update as jest.Mock).mockResolvedValue([1]);

      await UserService.deactivateUser(1);

      expect(User.update).toHaveBeenCalledWith(
        { isActive: false },
        { where: { id: 1 } }
      );
    });
  });
});