// ================================================================
// src/handlers/health.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requestLogger } from '../middleware/requestLogger';
import { corsHandler } from '../middleware/cors';
import { errorHandler } from '../middleware/errorHandler';

const withMiddleware = (handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      // Apply CORS first
      if (event.httpMethod === 'OPTIONS') {
        return corsHandler(event);
      }

      // Log request
      requestLogger(event);

      // Execute handler
      const result = await handler(event);

      // Apply CORS to response
      return {
        ...result,
        headers: {
          ...result.headers,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
      };
    } catch (error) {
      return errorHandler(error as Error);
    }
  };
};

export const healthCheck = withMiddleware(async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env['NODE_ENV'] || 'development',
      version: process.env['APP_VERSION'] || '1.0.0',
      uptime: process.uptime(),
      services: {
        database: 'healthy', // TODO: Add actual DB health check
        isbnService: 'healthy', // TODO: Add actual service health check
      },
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: health,
      }),
    };
  } catch (error) {
    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Service Unavailable',
        message: 'Health check failed',
      }),
    };
  }
});

export const readinessCheck = withMiddleware(async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Perform more thorough readiness checks
    const readiness = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: true, // TODO: Add actual DB connection check
        isbnService: true, // TODO: Add actual service connectivity check
        memory: process.memoryUsage(),
      },
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: readiness,
      }),
    };
  } catch (error) {
    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Service Unavailable',
        message: 'Readiness check failed',
      }),
    };
  }
});