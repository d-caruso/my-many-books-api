// ================================================================
// src/middleware/errorHandler.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  isOperational = true;

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  isOperational = true;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error implements AppError {
  statusCode = 401;
  isOperational = true;

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error implements AppError {
  statusCode = 403;
  isOperational = true;

  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ServiceUnavailableError extends Error implements AppError {
  statusCode = 503;
  isOperational = true;

  constructor(message: string = 'Service temporarily unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

export const createErrorResponse = (
  error: Error | AppError,
  event?: APIGatewayProxyEvent
): APIGatewayProxyResult => {
  const appError = error as AppError;
  const statusCode = appError.statusCode || 500;
  const isOperational = appError.isOperational || false;

  // Log error details
  console.error('Error occurred:', {
    name: error.name,
    message: error.message,
    statusCode,
    isOperational,
    stack: error.stack,
    path: event?.resource,
    method: event?.httpMethod,
    requestId: event?.requestContext?.requestId,
  });

  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  const errorMessage = isOperational || !isProduction ? error.message : 'Internal server error';

  const response = {
    success: false,
    error: errorMessage,
    ...(error instanceof ValidationError && error.details && { details: error.details }),
    ...(event?.requestContext?.requestId && { requestId: event.requestContext.requestId }),
    ...(!isProduction && !isOperational && { stack: error.stack }),
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(response),
  };
};

export const asyncHandler = (
  fn: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      return await fn(event);
    } catch (error) {
      return createErrorResponse(error as Error, event);
    }
  };
};