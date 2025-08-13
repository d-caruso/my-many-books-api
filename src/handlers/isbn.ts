// ================================================================
// src/handlers/isbn.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { isbnController } from '../controllers/IsbnController';
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

export const lookupBook = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return isbnController.lookupBook(event);
});

export const batchLookupBooks = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return isbnController.batchLookupBooks(event);
});

export const searchByTitle = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return isbnController.searchByTitle(event);
});

export const getServiceHealth = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return isbnController.getServiceHealth(event);
});

export const getResilienceStats = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return isbnController.getResilienceStats(event);
});

export const resetResilience = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return isbnController.resetResilience(event);
});

export const clearCache = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return isbnController.clearCache(event);
});

export const getCacheStats = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return isbnController.getCacheStats(event);
});

export const addFallbackBook = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return isbnController.addFallbackBook(event);
});

export const validateIsbn = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return isbnController.validateIsbn(event);
});

export const formatIsbn = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return isbnController.formatIsbn(event);
});