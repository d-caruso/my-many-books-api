// ================================================================
// src/handlers/authors.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authorController } from '../controllers/AuthorController';
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

export const createAuthor = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return authorController.createAuthor(event);
});

export const getAuthor = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return authorController.getAuthor(event);
});

export const updateAuthor = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return authorController.updateAuthor(event);
});

export const deleteAuthor = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return authorController.deleteAuthor(event);
});

export const listAuthors = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return authorController.listAuthors(event);
});

export const getAuthorBooks = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return authorController.getAuthorBooks(event);
});