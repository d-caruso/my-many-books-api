# My Many Books API - Postman Testing Collection

This directory contains a comprehensive Postman collection for testing the My Many Books API, along with environment configurations and utility scripts.

## 📁 Contents

### Collections
- **`My-Many-Books-API.postman_collection.json`** - Main testing collection with all API endpoints

### Environments
- **`environments/Local-Development.postman_environment.json`** - Local development environment
- **`environments/AWS-Development.postman_environment.json`** - AWS development environment  
- **`environments/AWS-Production.postman_environment.json`** - AWS production environment

### Utility Scripts
- **`scripts/authentication-helper.js`** - Authentication utilities for API keys and Cognito
- **`scripts/test-data-generator.js`** - Generate random test data for books, authors, categories
- **`scripts/validation-helpers.js`** - Response validation utilities

## 🚀 Quick Start

1. **Import Collection**
   - Open Postman
   - Click "Import" > Select `My-Many-Books-API.postman_collection.json`

2. **Import Environment**
   - Import one of the environment files from the `environments/` folder
   - Choose based on your testing target:
     - `Local-Development` for local testing
     - `AWS-Development` for dev environment testing
     - `AWS-Production` for production testing (use carefully!)

3. **Configure Environment**
   - Update `baseUrl` in your selected environment
   - Set authentication credentials if required (`apiKey`, `cognitoToken`)

4. **Start Testing**
   - Select your environment in Postman
   - Run individual requests or the entire collection

## 📋 API Endpoints Covered

### Health Check
- `GET /health` - API health status

### Books Management
- `GET /books` - List all books (with pagination and filtering)
- `POST /books` - Create new book
- `GET /books/{id}` - Get book by ID
- `PUT /books/{id}` - Update book
- `DELETE /books/{id}` - Delete book
- `GET /books/search/isbn` - Search books by ISBN
- `POST /books/import/isbn` - Import book from ISBN

### Authors Management
- `GET /authors` - List all authors
- `POST /authors` - Create new author
- `GET /authors/{id}` - Get author by ID
- `PUT /authors/{id}` - Update author
- `DELETE /authors/{id}` - Delete author
- `GET /authors/{id}/books` - Get author's books

### Categories Management
- `GET /categories` - List all categories
- `POST /categories` - Create new category
- `GET /categories/{id}` - Get category by ID
- `PUT /categories/{id}` - Update category
- `DELETE /categories/{id}` - Delete category
- `GET /categories/{id}/books` - Get category's books

### ISBN Services
- `GET /isbn/lookup/{isbn}` - Lookup book by ISBN (path param)
- `GET /isbn/lookup?isbn=...` - Lookup book by ISBN (query param)
- `POST /isbn/lookup` - Batch lookup multiple books
- `GET /isbn/search` - Search books by title
- `GET /isbn/validate/{isbn}` - Validate ISBN format
- `GET /isbn/format` - Format ISBN to different representations
- `GET /isbn/health` - ISBN service health check
- `GET /isbn/stats` - Get resilience statistics
- `GET /isbn/cache` - Get cache statistics
- `DELETE /isbn/cache` - Clear cache
- `DELETE /isbn/resilience` - Reset resilience counters
- `POST /isbn/fallback` - Add fallback book data

### Error Testing
- Invalid ISBN formats
- Non-existent resource IDs
- Invalid API routes
- Missing required fields

## 🔧 Environment Variables

### Base Configuration
- `baseUrl` - API base URL (e.g., `http://localhost:3000` or AWS API Gateway URL)
- `apiVersion` - API version
- `environment` - Environment name
- `timeout` - Request timeout in milliseconds

### Authentication
- `authEnabled` - Enable/disable authentication
- `apiKey` - API key for X-API-Key header
- `cognitoToken` - JWT token for Cognito authentication
- `cognitoUserPoolId` - Cognito User Pool ID
- `cognitoClientId` - Cognito Client ID

### Dynamic Test Data
- `createdBookId` - ID of recently created book
- `createdAuthorId` - ID of recently created author
- `createdCategoryId` - ID of recently created category
- `createdBookIsbn` - ISBN of recently created book

### Search Parameters
- `searchTitle` - Default title for search tests
- `searchAuthor` - Default author for search tests
- `searchName` - Default name for author search
- `searchNationality` - Default nationality filter
- `searchCategoryName` - Default category name search

## 🔍 Testing Features

### Pre-request Scripts
- Automatic timestamp generation
- Random test data generation
- Authentication header injection
- Request logging

### Test Scripts
- Response time validation
- CORS header validation
- Response structure validation
- Error handling validation
- Success criteria checking

### Collection-level Features
- Global error handling
- Automatic variable management
- Cross-request data sharing
- Environment-specific configurations

## 🛡️ Authentication Testing

The collection supports multiple authentication methods:

### API Key Authentication
```javascript
// Set in environment variables
"apiKey": "your-api-key-here"
"authEnabled": "true"
```

### Cognito JWT Authentication
```javascript
// Set in environment variables
"cognitoToken": "your-jwt-token-here"
"authEnabled": "true"
```

### Testing Without Authentication
```javascript
// Set in environment variables
"authEnabled": "false"
```

## 📊 Test Data Generation

The collection includes utilities for generating realistic test data:

### Random Book Data
- Valid ISBN-13 codes with proper checksums
- Realistic titles and publication dates
- Various book statuses (available, reading, read, wishlist)

### Random Author Data
- Diverse names and nationalities
- Proper author object structure

### Random Category Data
- Variety of literary categories
- Unique category names with test suffixes

## 🔄 Running Collection Tests

### Individual Request Testing
1. Select environment
2. Choose specific request
3. Click "Send"
4. Review response and test results

### Collection Runner
1. Click "Runner" in Postman
2. Select collection and environment
3. Configure iterations and delay
4. Run entire test suite

### Automated Testing
- Use Newman CLI for CI/CD integration
- Export collection and environment
- Run automated tests in pipeline

## 🐛 Error Scenarios

The collection includes comprehensive error testing:

- **400 Bad Request** - Invalid request data
- **401 Unauthorized** - Missing/invalid authentication
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Non-existent resources
- **422 Unprocessable Entity** - Validation errors
- **500 Internal Server Error** - Server errors

## 📈 Monitoring and Analytics

### Response Time Testing
- All requests include response time validation
- Configurable timeout thresholds per environment

### Success Rate Tracking
- Automatic success/failure tracking
- Error response structure validation

### Performance Monitoring
- Response time logging
- Request/response size tracking
- Cache hit/miss analysis (for ISBN services)

## 🔧 Customization

### Adding New Endpoints
1. Create new request in appropriate folder
2. Add environment variables if needed
3. Include validation tests
4. Update documentation

### Custom Validation
- Use validation helper functions in `scripts/validation-helpers.js`
- Add custom assertions in test scripts
- Implement domain-specific validations

### Environment Setup
- Copy existing environment file
- Modify base URL and credentials
- Adjust timeout and retry settings
- Configure authentication methods

## 📚 Best Practices

1. **Environment Management**
   - Use separate environments for different stages
   - Never commit production credentials
   - Use meaningful variable names

2. **Test Organization**
   - Group related tests in folders
   - Use descriptive request names
   - Include comprehensive descriptions

3. **Data Management**
   - Clean up test data after tests
   - Use environment variables for dynamic data
   - Implement proper test isolation

4. **Authentication**
   - Test both authenticated and unauthenticated scenarios
   - Handle token expiration gracefully
   - Validate permission boundaries

5. **Error Testing**
   - Test all possible error scenarios
   - Validate error response structure
   - Include edge cases and boundary conditions

## 🤝 Contributing

When adding new tests or modifying existing ones:

1. Follow existing naming conventions
2. Include comprehensive test assertions
3. Add appropriate documentation
4. Test in multiple environments
5. Validate authentication scenarios

## 🔗 Related Documentation

- [API Specification](../docs/api-specification.yml)
- [API Gateway Guide](../docs/API_GATEWAY_GUIDE.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Security Configuration](../config/security.yml)