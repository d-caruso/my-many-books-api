// ================================================================
// src/config/index.ts
// ================================================================

import DatabaseConnection from './database';

export { DatabaseConnection };

export const dbConfig = {
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '3306', 10),
  database: process.env['DB_NAME'] || 'my_many_books',
  username: process.env['DB_USER'] || 'admin',
  password: process.env['DB_PASSWORD'] || '',
  ssl: process.env['DB_SSL'] === 'true',
};

export const awsConfig = {
  region: process.env['AWS_REGION'] || 'us-east-1',
  rdsInstanceId: process.env['RDS_INSTANCE_ID'] || 'my-many-books-db',
};

export const apiConfig = {
  openLibraryUrl: process.env['OPEN_LIBRARY_API_URL'] || 'https://openlibrary.org/api/books',
  corsOrigins: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000'],
};
