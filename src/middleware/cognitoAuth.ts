// ================================================================
// src/middleware/cognitoAuth.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verify, JwtPayload } from 'jsonwebtoken';
import { promisify } from 'util';

export interface CognitoConfig {
  enabled: boolean;
  userPoolId: string;
  clientId: string;
  region: string;
  issuer: string;
  algorithms: string[];
  requiredScopes?: string[];
}

export interface CognitoUser {
  sub: string; // User ID
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  groups?: string[];
  scopes?: string[];
  token_use: string;
  aud: string; // Client ID
  iss: string; // Issuer
  exp: number; // Expiration
  iat: number; // Issued at
}

export interface CognitoAuthResult {
  isAuthenticated: boolean;
  user?: CognitoUser;
  error?: string;
  statusCode?: number;
}

export class CognitoAuthenticator {
  private config: CognitoConfig;
  private jwksClient: any;
  private publicKeys: Map<string, string> = new Map();

  constructor(config: CognitoConfig) {
    this.config = config;
    this.initializeJwksClient();
  }

  private initializeJwksClient(): void {
    // In production, you'd use a JWKS client library
    // For now, we'll simulate the key retrieval
  }

  public async authenticate(event: APIGatewayProxyEvent): Promise<CognitoAuthResult> {
    if (!this.config.enabled) {
      return { isAuthenticated: true };
    }

    const token = this.extractToken(event);
    if (!token) {
      return {
        isAuthenticated: false,
        error: 'Authorization token is required',
        statusCode: 401
      };
    }

    try {
      const decoded = await this.verifyToken(token);
      
      // Validate token structure
      if (!this.isValidCognitoToken(decoded)) {
        return {
          isAuthenticated: false,
          error: 'Invalid token format',
          statusCode: 401
        };
      }

      const user = this.extractUserFromToken(decoded);
      
      // Check required scopes if specified
      if (this.config.requiredScopes && this.config.requiredScopes.length > 0) {
        const hasRequiredScopes = this.validateScopes(user.scopes || [], this.config.requiredScopes);
        if (!hasRequiredScopes) {
          return {
            isAuthenticated: false,
            error: 'Insufficient permissions',
            statusCode: 403
          };
        }
      }

      return {
        isAuthenticated: true,
        user
      };

    } catch (error) {
      console.error('Token verification failed:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          return {
            isAuthenticated: false,
            error: 'Token has expired',
            statusCode: 401
          };
        }
        
        if (error.message.includes('signature')) {
          return {
            isAuthenticated: false,
            error: 'Invalid token signature',
            statusCode: 401
          };
        }
      }

      return {
        isAuthenticated: false,
        error: 'Token verification failed',
        statusCode: 401
      };
    }
  }

  private extractToken(event: APIGatewayProxyEvent): string | null {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null;
    }

    return parts[1];
  }

  private async verifyToken(token: string): Promise<JwtPayload> {
    // Extract the key ID from token header
    const decoded = this.decodeTokenHeader(token);
    const keyId = decoded.kid;

    if (!keyId) {
      throw new Error('Token does not have a key ID');
    }

    // Get the public key for verification
    const publicKey = await this.getPublicKey(keyId);
    
    // Verify the token
    const verifyPromise = promisify(verify);
    const payload = await verifyPromise(token, publicKey, {
      issuer: this.config.issuer,
      audience: this.config.clientId,
      algorithms: this.config.algorithms as any
    }) as JwtPayload;

    return payload;
  }

  private decodeTokenHeader(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const header = Buffer.from(parts[0], 'base64url').toString('utf8');
    return JSON.parse(header);
  }

  private async getPublicKey(keyId: string): Promise<string> {
    // Check cache first
    if (this.publicKeys.has(keyId)) {
      return this.publicKeys.get(keyId)!;
    }

    // In production, fetch from Cognito JWKS endpoint
    // https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json
    const jwksUrl = `https://cognito-idp.${this.config.region}.amazonaws.com/${this.config.userPoolId}/.well-known/jwks.json`;
    
    try {
      // Simulate fetching public key
      // In real implementation, you'd use a JWKS client
      const mockPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;

      // Cache the key
      this.publicKeys.set(keyId, mockPublicKey);
      return mockPublicKey;
      
    } catch (error) {
      throw new Error(`Failed to fetch public key for kid: ${keyId}`);
    }
  }

  private isValidCognitoToken(payload: JwtPayload): boolean {
    return !!(
      payload.sub &&
      payload.aud &&
      payload.iss &&
      payload.token_use &&
      payload.exp &&
      payload.iat
    );
  }

  private extractUserFromToken(payload: JwtPayload): CognitoUser {
    return {
      sub: payload.sub!,
      email: payload.email || '',
      email_verified: payload.email_verified === true,
      given_name: payload.given_name,
      family_name: payload.family_name,
      groups: payload['cognito:groups'] || [],
      scopes: this.extractScopes(payload),
      token_use: payload.token_use!,
      aud: payload.aud as string,
      iss: payload.iss!,
      exp: payload.exp!,
      iat: payload.iat!
    };
  }

  private extractScopes(payload: JwtPayload): string[] {
    // Scopes can be in 'scope' (space-separated) or 'scopes' (array)
    if (payload.scope) {
      return payload.scope.split(' ');
    }
    
    if (Array.isArray(payload.scopes)) {
      return payload.scopes;
    }

    return [];
  }

  private validateScopes(userScopes: string[], requiredScopes: string[]): boolean {
    return requiredScopes.every(required => userScopes.includes(required));
  }

  public extractUserContext(event: APIGatewayProxyEvent): CognitoUser | null {
    const context = (event as any).authContext;
    return context?.user || null;
  }

  public hasPermission(user: CognitoUser, permission: string): boolean {
    return user.scopes?.includes(permission) || false;
  }

  public isInGroup(user: CognitoUser, group: string): boolean {
    return user.groups?.includes(group) || false;
  }
}

// Permission constants
export const PERMISSIONS = {
  BOOKS_READ: 'books:read',
  BOOKS_WRITE: 'books:write',
  BOOKS_DELETE: 'books:delete',
  AUTHORS_READ: 'authors:read',
  AUTHORS_WRITE: 'authors:write',
  AUTHORS_DELETE: 'authors:delete',
  CATEGORIES_READ: 'categories:read',
  CATEGORIES_WRITE: 'categories:write',
  CATEGORIES_DELETE: 'categories:delete',
  ISBN_LOOKUP: 'isbn:lookup',
  ADMIN_ACCESS: 'admin:access'
} as const;

// User groups
export const USER_GROUPS = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  READER: 'reader'
} as const;

// Middleware wrapper
export const withCognitoAuth = (
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
  authenticator: CognitoAuthenticator,
  requiredPermissions?: string[]
) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const authResult = await authenticator.authenticate(event);
    
    if (!authResult.isAuthenticated) {
      return {
        statusCode: authResult.statusCode || 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: authResult.error,
          code: 'AUTHENTICATION_FAILED'
        })
      };
    }

    // Check specific permissions if required
    if (requiredPermissions && authResult.user) {
      const hasAllPermissions = requiredPermissions.every(permission =>
        authenticator.hasPermission(authResult.user!, permission)
      );

      if (!hasAllPermissions) {
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Insufficient permissions',
            code: 'AUTHORIZATION_FAILED',
            requiredPermissions
          })
        };
      }
    }

    // Add auth context to event
    (event as any).authContext = {
      user: authResult.user,
      isAuthenticated: true
    };

    return handler(event);
  };
};

// Utility function to create authenticator from environment
export const createCognitoAuthenticator = (): CognitoAuthenticator => {
  const config: CognitoConfig = {
    enabled: process.env['COGNITO_ENABLED'] === 'true',
    userPoolId: process.env['COGNITO_USER_POOL_ID'] || '',
    clientId: process.env['COGNITO_CLIENT_ID'] || '',
    region: process.env['AWS_REGION'] || 'us-east-1',
    issuer: `https://cognito-idp.${process.env['AWS_REGION'] || 'us-east-1'}.amazonaws.com/${process.env['COGNITO_USER_POOL_ID'] || ''}`,
    algorithms: ['RS256']
  };

  return new CognitoAuthenticator(config);
};