// ================================================================
// src/handlers/books.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { bookController } from '../controllers/BookController';
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

export const createBook = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return bookController.createBook(event);
});

export const getBook = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return bookController.getBook(event);
});

export const updateBook = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return bookController.updateBook(event);
});

export const deleteBook = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return bookController.deleteBook(event);
});

export const listBooks = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return bookController.listBooks(event);
});

export const searchBooksByIsbn = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return bookController.searchBooksByIsbn(event);
});

export const importBookFromIsbn = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return bookController.importBookFromIsbn(event);
});