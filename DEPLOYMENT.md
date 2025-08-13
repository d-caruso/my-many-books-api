# Deployment Guide

This guide covers deployment options for the My Many Books API Lambda handlers.

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Node.js 18+ installed
3. Environment variables set (copy `.env.example` to `.env`)

## Deployment Options

### Option 1: Serverless Framework (Recommended)

1. Install dependencies:
```bash
npm install
```

2. Deploy to AWS:
```bash
# Deploy to dev stage
npm run deploy:dev

# Deploy to prod stage  
npm run deploy:prod

# Remove deployment
npm run remove
```

3. Test locally:
```bash
npm run local
```

### Option 2: AWS SAM (Alternative)

If you prefer using AWS SAM, you can create a `template.yaml` file:

1. Install AWS SAM CLI
2. Build and deploy:
```bash
sam build
sam deploy --guided
```

## Environment Variables

Required environment variables (set in AWS Lambda environment):

- `DB_HOST`: Database host
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_SSL`: Enable SSL (default: true)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (info/debug)
- `OPEN_LIBRARY_BASE_URL`: Open Library API URL
- `GOOGLE_BOOKS_API_KEY`: Google Books API key
- `GOOGLE_BOOKS_BASE_URL`: Google Books API URL

## API Endpoints

After deployment, the following endpoints will be available:

### Health Checks
- `GET /health` - Basic health check
- `GET /readiness` - Readiness check with dependency status

### Books
- `GET /books` - List all books
- `POST /books` - Create a new book
- `GET /books/{id}` - Get book by ID
- `PUT /books/{id}` - Update book
- `DELETE /books/{id}` - Delete book
- `GET /books/search/isbn` - Search books by ISBN
- `POST /books/import/isbn` - Import book from ISBN

### Authors  
- `GET /authors` - List all authors
- `POST /authors` - Create a new author
- `GET /authors/{id}` - Get author by ID
- `PUT /authors/{id}` - Update author
- `DELETE /authors/{id}` - Delete author
- `GET /authors/{id}/books` - Get books by author

### Categories
- `GET /categories` - List all categories
- `POST /categories` - Create a new category
- `GET /categories/{id}` - Get category by ID
- `PUT /categories/{id}` - Update category
- `DELETE /categories/{id}` - Delete category
- `GET /categories/{id}/books` - Get books by category

### ISBN Service
- `GET /isbn/lookup` - Lookup book by ISBN
- `POST /isbn/lookup` - Batch lookup books by ISBNs
- `GET /isbn/search` - Search books by title
- `GET /isbn/health` - Check ISBN service health
- `GET /isbn/stats` - Get resilience statistics

## Monitoring

The API includes built-in logging and monitoring:

- Request/response logging
- Error handling with appropriate HTTP status codes
- CORS support for all endpoints
- Circuit breaker pattern for external API calls
- Retry logic with exponential backoff

## Security

- All endpoints include CORS headers
- Sensitive headers are redacted from logs
- Error messages are sanitized in production
- Input validation using Joi schemas