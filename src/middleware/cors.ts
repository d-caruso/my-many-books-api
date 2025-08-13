// ================================================================
// src/middleware/cors.ts
// ================================================================

import { APIGatewayProxyResult } from 'aws-lambda';

export interface CorsOptions {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
}

const DEFAULT_CORS_OPTIONS: CorsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'X-Amz-Date',
    'Authorization',
    'X-Api-Key',
    'X-Amz-Security-Token',
    'X-Requested-With',
  ],
  maxAge: 86400, // 24 hours
  credentials: false,
};

export const getCorsHeaders = (options: CorsOptions = {}): Record<string, string> => {
  const config = { ...DEFAULT_CORS_OPTIONS, ...options };
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': Array.isArray(config.methods) 
      ? config.methods.join(',') 
      : 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': Array.isArray(config.allowedHeaders)
      ? config.allowedHeaders.join(',')
      : 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  };

  // Handle origin
  if (typeof config.origin === 'string') {
    headers['Access-Control-Allow-Origin'] = config.origin;
  } else if (Array.isArray(config.origin)) {
    // For multiple origins, you'd typically check the request origin
    // For now, just use the first one or '*'
    headers['Access-Control-Allow-Origin'] = config.origin[0] || '*';
  }

  // Handle credentials
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Handle max age
  if (config.maxAge) {
    headers['Access-Control-Max-Age'] = config.maxAge.toString();
  }

  return headers;
};

export const createCorsResponse = (
  statusCode: number = 200,
  body: string = '',
  additionalHeaders: Record<string, string> = {},
  corsOptions: CorsOptions = {}
): APIGatewayProxyResult => {
  const corsHeaders = getCorsHeaders(corsOptions);
  
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...additionalHeaders,
    },
    body,
  };
};

export const handleOptionsRequest = (corsOptions: CorsOptions = {}): APIGatewayProxyResult => {
  return createCorsResponse(200, '', {}, corsOptions);
};

export const addCorsToResponse = (
  response: APIGatewayProxyResult,
  corsOptions: CorsOptions = {}
): APIGatewayProxyResult => {
  const corsHeaders = getCorsHeaders(corsOptions);
  
  return {
    ...response,
    headers: {
      ...response.headers,
      ...corsHeaders,
    },
  };
};