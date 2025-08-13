// ================================================================
// src/handlers/router.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda';
import { bookController } from '../controllers/BookController';
import { authorController } from '../controllers/AuthorController';
import { categoryController } from '../controllers/CategoryController';
import { isbnController } from '../controllers/IsbnController';
import { requestLogger } from '../middleware/requestLogger';
import { corsHandler } from '../middleware/cors';
import { errorHandler } from '../middleware/errorHandler';

// Main router function for single Lambda deployment
export const routeRequest = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return corsHandler(event);
    }

    // Log request
    requestLogger(event);

    const { httpMethod, resource } = event;

    // Book routes
    if (resource.startsWith('/books')) {
      switch (resource) {
        case '/books':
          if (httpMethod === 'GET') return await bookController.listBooks(event);
          if (httpMethod === 'POST') return await bookController.createBook(event);
          break;
        case '/books/{id}':
          if (httpMethod === 'GET') return await bookController.getBook(event);
          if (httpMethod === 'PUT') return await bookController.updateBook(event);
          if (httpMethod === 'DELETE') return await bookController.deleteBook(event);
          break;
        case '/books/search/isbn':
          if (httpMethod === 'GET') return await bookController.searchBooksByIsbn(event);
          break;
        case '/books/import/isbn':
          if (httpMethod === 'POST') return await bookController.importBookFromIsbn(event);
          break;
      }
    }

    // Author routes
    if (resource.startsWith('/authors')) {
      switch (resource) {
        case '/authors':
          if (httpMethod === 'GET') return await authorController.listAuthors(event);
          if (httpMethod === 'POST') return await authorController.createAuthor(event);
          break;
        case '/authors/{id}':
          if (httpMethod === 'GET') return await authorController.getAuthor(event);
          if (httpMethod === 'PUT') return await authorController.updateAuthor(event);
          if (httpMethod === 'DELETE') return await authorController.deleteAuthor(event);
          break;
        case '/authors/{id}/books':
          if (httpMethod === 'GET') return await authorController.getAuthorBooks(event);
          break;
      }
    }

    // Category routes
    if (resource.startsWith('/categories')) {
      switch (resource) {
        case '/categories':
          if (httpMethod === 'GET') return await categoryController.listCategories(event);
          if (httpMethod === 'POST') return await categoryController.createCategory(event);
          break;
        case '/categories/{id}':
          if (httpMethod === 'GET') return await categoryController.getCategory(event);
          if (httpMethod === 'PUT') return await categoryController.updateCategory(event);
          if (httpMethod === 'DELETE') return await categoryController.deleteCategory(event);
          break;
        case '/categories/{id}/books':
          if (httpMethod === 'GET') return await categoryController.getCategoryBooks(event);
          break;
      }
    }

    // ISBN service routes
    if (resource.startsWith('/isbn')) {
      switch (resource) {
        case '/isbn/lookup/{isbn}':
          if (httpMethod === 'GET') return await isbnController.lookupBook(event);
          break;
        case '/isbn/lookup':
          if (httpMethod === 'GET') return await isbnController.lookupBook(event);
          if (httpMethod === 'POST') return await isbnController.batchLookupBooks(event);
          break;
        case '/isbn/search':
          if (httpMethod === 'GET') return await isbnController.searchByTitle(event);
          break;
        case '/isbn/validate/{isbn}':
          if (httpMethod === 'GET') return await isbnController.validateIsbn(event);
          break;
        case '/isbn/validate':
          if (httpMethod === 'GET') return await isbnController.validateIsbn(event);
          break;
        case '/isbn/format':
          if (httpMethod === 'GET') return await isbnController.formatIsbn(event);
          break;
        case '/isbn/health':
          if (httpMethod === 'GET') return await isbnController.getServiceHealth(event);
          break;
        case '/isbn/stats':
          if (httpMethod === 'GET') return await isbnController.getResilienceStats(event);
          break;
        case '/isbn/cache':
          if (httpMethod === 'DELETE') return await isbnController.clearCache(event);
          if (httpMethod === 'GET') return await isbnController.getCacheStats(event);
          break;
        case '/isbn/resilience':
          if (httpMethod === 'DELETE') return await isbnController.resetResilience(event);
          break;
        case '/isbn/fallback':
          if (httpMethod === 'POST') return await isbnController.addFallbackBook(event);
          break;
      }
    }

    // Health check route
    if (resource === '/health' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          message: 'API is healthy',
          timestamp: new Date().toISOString(),
          version: process.env['API_VERSION'] || '1.0.0',
          uptime: process.uptime(),
        }),
      };
    }

    // Route not found
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Route not found',
        resource,
        method: httpMethod,
      }),
    };

  } catch (error) {
    return errorHandler(error as Error);
  }
};

// Export as default handler for single Lambda deployment
export const handler: APIGatewayProxyHandler = routeRequest;