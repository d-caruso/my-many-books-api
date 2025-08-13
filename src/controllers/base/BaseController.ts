// ================================================================
// src/controllers/base/BaseController.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Joi from 'joi';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export abstract class BaseController {
  protected static readonly MAX_LIMIT = 100;
  protected static readonly DEFAULT_LIMIT = 20;
  protected static readonly DEFAULT_PAGE = 1;

  protected createSuccessResponse<T>(
    data: T,
    message?: string,
    meta?: any,
    statusCode: number = 200
  ): APIGatewayProxyResult {
    const response: ApiResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
      ...(meta && { meta }),
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
  }

  protected createErrorResponse(
    error: string,
    statusCode: number = 400,
    details?: any
  ): APIGatewayProxyResult {
    const response: ApiResponse = {
      success: false,
      error,
      ...(details && { details }),
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
  }

  protected parseBody<T>(event: APIGatewayProxyEvent): T | null {
    if (!event.body) {
      return null;
    }

    try {
      return JSON.parse(event.body) as T;
    } catch {
      return null;
    }
  }

  protected validateRequest<T>(
    data: any,
    schema: Joi.ObjectSchema<T>
  ): { isValid: boolean; value?: T; errors?: string[] } {
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return { isValid: false, errors };
    }

    return { isValid: true, value: value as T };
  }

  protected getPaginationParams(event: APIGatewayProxyEvent): PaginationParams {
    const queryParams = event.queryStringParameters || {};
    
    const page = Math.max(1, parseInt(queryParams['page'] || '1', 10));
    const limit = Math.min(
      BaseController.MAX_LIMIT,
      Math.max(1, parseInt(queryParams['limit'] || BaseController.DEFAULT_LIMIT.toString(), 10))
    );
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  protected getPathParameter(event: APIGatewayProxyEvent, paramName: string): string | null {
    return event.pathParameters?.[paramName] || null;
  }

  protected getQueryParameter(event: APIGatewayProxyEvent, paramName: string): string | null {
    return event.queryStringParameters?.[paramName] || null;
  }

  protected async handleRequest(
    event: APIGatewayProxyEvent,
    handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
  ): Promise<APIGatewayProxyResult> {
    try {
      return await handler(event);
    } catch (error) {
      console.error('Controller error:', error);
      
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      
      return this.createErrorResponse('Internal server error', 500);
    }
  }

  protected createPaginationMeta(
    page: number,
    limit: number,
    total: number
  ): { page: number; limit: number; total: number; totalPages: number } {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}