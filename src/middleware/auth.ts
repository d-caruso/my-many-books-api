// ================================================================
// src/middleware/auth.ts
// Authentication middleware with provider abstraction
// ================================================================

import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../models/interfaces/ModelInterfaces';
import { User } from '../models/User';

// Extended Request interface to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Auth provider interface
export interface AuthProvider {
  verifyToken(token: string): Promise<AuthProviderUser>;
  getProviderName(): string;
}

export interface AuthProviderUser {
  id: string;
  email: string;
  name?: string;
  surname?: string;
}

// AWS Cognito provider implementation
export class CognitoAuthProvider implements AuthProvider {
  private region: string;
  private userPoolId: string;

  constructor(region: string, userPoolId: string) {
    this.region = region;
    this.userPoolId = userPoolId;
  }

  async verifyToken(token: string): Promise<AuthProviderUser> {
    // TODO: Implement AWS Cognito JWT verification
    // This is a placeholder implementation
    try {
      // In real implementation, verify JWT with AWS Cognito
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token) as any;
      
      if (!decoded || !decoded.sub || !decoded.email) {
        throw new Error('Invalid token format');
      }

      return {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.given_name,
        surname: decoded.family_name,
      };
    } catch (error) {
      throw new Error('Token verification failed');
    }
  }

  getProviderName(): string {
    return 'cognito';
  }
}

// Auth0 provider implementation (placeholder)
export class Auth0Provider implements AuthProvider {
  private domain: string;
  private audience: string;

  constructor(domain: string, audience: string) {
    this.domain = domain;
    this.audience = audience;
  }

  async verifyToken(token: string): Promise<AuthProviderUser> {
    // TODO: Implement Auth0 JWT verification
    throw new Error('Auth0 provider not yet implemented');
  }

  getProviderName(): string {
    return 'auth0';
  }
}

// Provider factory
export class AuthProviderFactory {
  static createProvider(providerType: string): AuthProvider {
    switch (providerType.toLowerCase()) {
      case 'cognito':
        return new CognitoAuthProvider(
          process.env.AWS_REGION || 'us-east-1',
          process.env.COGNITO_USER_POOL_ID || ''
        );
      case 'auth0':
        return new Auth0Provider(
          process.env.AUTH0_DOMAIN || '',
          process.env.AUTH0_AUDIENCE || ''
        );
      default:
        throw new Error(`Unsupported auth provider: ${providerType}`);
    }
  }
}

// User service for database operations
export class UserService {
  static async findOrCreateUser(providerUser: AuthProviderUser, provider: string): Promise<{ user: User; isNewUser: boolean }> {
    let user = await User.findOne({ where: { email: providerUser.email } });
    let isNewUser = false;

    if (!user) {
      // Create new user
      user = await User.create({
        email: providerUser.email,
        name: providerUser.name || 'Unknown',
        surname: providerUser.surname || 'User',
        isActive: true,
      });
      isNewUser = true;
    }

    return { user, isNewUser };
  }

  static async getUserById(userId: number): Promise<User | null> {
    return await User.findByPk(userId);
  }

  static async deactivateUser(userId: number): Promise<void> {
    await User.update({ isActive: false }, { where: { id: userId } });
  }
}

// Main authentication middleware
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Get auth provider from environment
    const providerType = process.env.AUTH_PROVIDER || 'cognito';
    const provider = AuthProviderFactory.createProvider(providerType);

    // Verify token with auth provider
    const providerUser = await provider.verifyToken(token);

    // Find or create user in database
    const { user, isNewUser } = await UserService.findOrCreateUser(providerUser, provider.getProviderName());

    // Check if user is active
    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    // Create AuthUser object for request context
    const authUser: AuthUser = {
      userId: user.id,
      email: user.email,
      provider: provider.getProviderName(),
      providerUserId: providerUser.id,
      isNewUser,
    };

    // Attach user to request
    req.user = authUser;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Optional middleware - allows requests without authentication
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth provided, continue without user
      next();
      return;
    }

    // Authentication provided, process it
    await authMiddleware(req, res, next);
  } catch (error) {
    // Auth failed, but continue without user for optional auth
    console.warn('Optional authentication failed:', error);
    next();
  }
};

// Middleware to require specific roles or permissions (extensible)
export const requirePermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // TODO: Implement permission checking logic
    // For now, all authenticated users have all permissions
    next();
  };
};