// ================================================================
// src/middleware/requestLogger.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export interface RequestLogEntry {
  requestId: string;
  method: string;
  resource: string;
  path: string;
  queryStringParameters: Record<string, string> | null;
  pathParameters: Record<string, string> | null;
  headers: Record<string, string>;
  sourceIp: string;
  userAgent: string;
  timestamp: string;
  responseTime?: number;
  statusCode?: number;
  responseSize?: number;
  userId?: string;
}

export class RequestLogger {
  private static instance: RequestLogger;
  private logLevel: 'none' | 'basic' | 'detailed';

  private constructor() {
    this.logLevel = (process.env['LOG_LEVEL'] as any) || 'basic';
  }

  public static getInstance(): RequestLogger {
    if (!RequestLogger.instance) {
      RequestLogger.instance = new RequestLogger();
    }
    return RequestLogger.instance;
  }

  public logRequest(event: APIGatewayProxyEvent): RequestLogEntry {
    
    const logEntry: RequestLogEntry = {
      requestId: event.requestContext.requestId,
      method: event.httpMethod,
      resource: event.resource,
      path: event.path,
      queryStringParameters: event.queryStringParameters as Record<string, string> | null,
      pathParameters: event.pathParameters as Record<string, string> | null,
      headers: this.sanitizeHeaders(event.headers as Record<string, string>),
      sourceIp: event.requestContext.identity.sourceIp,
      userAgent: event.headers['User-Agent'] || event.headers['user-agent'] || 'Unknown',
      timestamp: new Date().toISOString(),
    };

    if (this.logLevel !== 'none') {
      console.log('Incoming request:', {
        requestId: logEntry.requestId,
        method: logEntry.method,
        resource: logEntry.resource,
        sourceIp: logEntry.sourceIp,
        ...(this.logLevel === 'detailed' && {
          queryStringParameters: logEntry.queryStringParameters,
          pathParameters: logEntry.pathParameters,
          userAgent: logEntry.userAgent,
        }),
      });
    }

    return logEntry;
  }

  public logResponse(
    logEntry: RequestLogEntry,
    response: APIGatewayProxyResult,
    startTime: number
  ): void {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    logEntry.responseTime = responseTime;
    logEntry.statusCode = response.statusCode;
    logEntry.responseSize = response.body ? Buffer.byteLength(response.body, 'utf8') : 0;

    if (this.logLevel !== 'none') {
      const logLevel = this.getLogLevelForStatus(response.statusCode);
      
      console[logLevel]('Request completed:', {
        requestId: logEntry.requestId,
        method: logEntry.method,
        resource: logEntry.resource,
        statusCode: logEntry.statusCode,
        responseTime: `${responseTime}ms`,
        responseSize: `${logEntry.responseSize} bytes`,
        ...(this.logLevel === 'detailed' && {
          sourceIp: logEntry.sourceIp,
          userAgent: logEntry.userAgent,
        }),
      });
    }

    // Log slow requests (over 5 seconds)
    if (responseTime > 5000) {
      console.warn('Slow request detected:', {
        requestId: logEntry.requestId,
        method: logEntry.method,
        resource: logEntry.resource,
        responseTime: `${responseTime}ms`,
      });
    }
  }

  public logError(logEntry: RequestLogEntry, error: Error): void {
    console.error('Request error:', {
      requestId: logEntry.requestId,
      method: logEntry.method,
      resource: logEntry.resource,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    
    // Remove or mask sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'x-amz-security-token',
      'cookie',
    ];

    sensitiveHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      Object.keys(sanitized).forEach(key => {
        if (key.toLowerCase() === lowerHeader) {
          sanitized[key] = '[REDACTED]';
        }
      });
    });

    return sanitized;
  }

  private getLogLevelForStatus(statusCode: number): 'log' | 'warn' | 'error' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'log';
  }
}

export const withRequestLogging = (
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const logger = RequestLogger.getInstance();
    const startTime = Date.now();
    const logEntry = logger.logRequest(event);

    try {
      const response = await handler(event);
      logger.logResponse(logEntry, response, startTime);
      return response;
    } catch (error) {
      logger.logError(logEntry, error as Error);
      throw error;
    }
  };
};

// Convenience function for simple request logging
export const requestLogger = (event: APIGatewayProxyEvent): RequestLogEntry => {
  const logger = RequestLogger.getInstance();
  return logger.logRequest(event);
};