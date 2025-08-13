// ================================================================
// src/handlers/categories.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { categoryController } from '../controllers/CategoryController';
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

export const createCategory = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return categoryController.createCategory(event);
});

export const getCategory = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return categoryController.getCategory(event);
});

export const updateCategory = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return categoryController.updateCategory(event);
});

export const deleteCategory = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return categoryController.deleteCategory(event);
});

export const listCategories = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return categoryController.listCategories(event);
});

export const getCategoryBooks = withMiddleware(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return categoryController.getCategoryBooks(event);
});

