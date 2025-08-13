# API Gateway Configuration Guide

This guide explains the comprehensive API Gateway setup for the My Many Books API, including security, authentication, rate limiting, and monitoring.

## Overview

The API Gateway configuration provides:
- **Request/Response validation** with JSON schemas  
- **Multiple authentication methods** (API keys, AWS Cognito)
- **Rate limiting** with different tiers
- **CORS configuration** for cross-origin requests
- **Comprehensive logging** and monitoring
- **API documentation** with OpenAPI 3.0 specification

## Architecture

```
Client Request → API Gateway → Lambda Function → Business Logic → Database
     ↓              ↓              ↓               ↓
  CORS Check → Auth Check → Rate Limit → Request Processing
```

## Configuration Files

### Core Configuration
- `serverless.yml` - Main deployment configuration
- `config/api-gateway.yml` - API Gateway specific settings
- `config/cors.yml` - CORS policies for different environments
- `config/security.yml` - Security and authentication settings

### Schema Definitions  
- `config/schemas/book-request.json` - Book request validation
- `config/schemas/author-request.json` - Author request validation
- `config/schemas/category-request.json` - Category request validation

### Documentation
- `docs/api-specification.yml` - Complete OpenAPI 3.0 spec
- `docs/API_GATEWAY_GUIDE.md` - This guide

## Authentication & Authorization

### 1. API Key Authentication

**Setup:**
```bash
# Generate API keys
npm run generate:api-keys -- --count 5 --tier premium --format env
```

**Configuration:**
```yaml
# serverless.yml
provider:
  environment:
    API_KEYS_ENABLED: true
```

**Usage:**
```http
GET /api/books
X-Api-Key: mmb_your_generated_api_key_here
```

**Rate Limits by Tier:**
- **Basic**: 100 requests/minute, 10K/month
- **Premium**: 500 requests/minute, 100K/month  
- **Enterprise**: 1000 requests/minute, 1M/month

### 2. AWS Cognito Authentication

**Setup:**
```yaml
# serverless.yml
provider:
  environment:
    COGNITO_ENABLED: true
    COGNITO_USER_POOL_ID: your_user_pool_id
    COGNITO_CLIENT_ID: your_client_id
```

**Usage:**
```http
GET /api/books
Authorization: Bearer your_jwt_token_here
```

**Permissions:**
- `books:read` - Read books
- `books:write` - Create/update books
- `books:delete` - Delete books
- `admin:access` - Administrative access

## Rate Limiting

### Global Limits
- **1000 requests/minute** per IP address
- **Burst limit**: 200 requests

### Endpoint Specific Limits
- `/books`: 100 requests/minute per IP
- `/isbn/lookup`: 50 requests/minute per IP (external API calls)
- `/isbn/search`: 30 requests/minute per IP (search operations)

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
Retry-After: 30
```

## CORS Configuration

### Development Environment
```yaml
origins:
  - http://localhost:3000
  - http://localhost:3001
  - http://127.0.0.1:3000
credentials: true
maxAge: 3600
```

### Production Environment
```yaml
origins:
  - https://app.mymanybooks.com
  - https://admin.mymanybooks.com
credentials: true
maxAge: 86400
```

## Request Validation

### Automatic Validation
All requests are validated against JSON schemas:

**Book Request:**
```json
{
  "type": "object",
  "required": ["isbnCode", "title"],
  "properties": {
    "isbnCode": {
      "type": "string",
      "pattern": "^(97[89])?\\d{9}[\\dX]$"
    },
    "title": {
      "type": "string",
      "maxLength": 500
    }
  }
}
```

**Validation Errors:**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "isbnCode",
    "message": "Invalid ISBN format"
  }
}
```

## Security Features

### Input Sanitization
- **SQL injection protection** - Pattern detection and blocking
- **XSS protection** - HTML sanitization
- **Request size limits** - Max 10MB request body
- **Content type validation** - Only allow specific MIME types

### Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### IP Filtering (Optional)
```yaml
# config/security.yml
ipFiltering:
  enabled: true
  whitelist:
    - 192.168.1.0/24
    - 10.0.0.0/8
```

## Monitoring & Logging

### Request Logging
Every request is logged with:
- Request ID, method, path
- Source IP, User Agent
- Response time and status code
- Authentication context

### CloudWatch Metrics
- Request count per endpoint
- Error rates by status code
- Response times (P50, P95, P99)
- Authentication failures
- Rate limit violations

### Custom Metrics
```typescript
// Example: Track ISBN lookup performance
console.log('ISBN_LOOKUP_PERFORMANCE', {
  isbn: '9780123456789',
  responseTime: 245,
  source: 'openLibrary',
  success: true
});
```

## Deployment

### Development
```bash
# Deploy to dev stage
npm run deploy:dev

# Test locally
npm run local
```

### Production
```bash
# Deploy to production
npm run deploy:prod

# With custom domain
export DOMAIN_NAME=api.mymanybooks.com
export SSL_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/abc123
npm run deploy:prod
```

### Environment Variables
```bash
# Required for deployment
export DB_HOST=your-db-host
export DB_USER=your-db-user
export DB_PASSWORD=your-db-password

# Optional: Enable authentication
export API_KEYS_ENABLED=true
export COGNITO_ENABLED=true
export COGNITO_USER_POOL_ID=us-east-1_ABC123DEF
```

## Usage Examples

### Basic Book Operations
```bash
# List books with API key
curl -X GET "https://api.mymanybooks.com/books" \
  -H "X-Api-Key: mmb_your_api_key"

# Create book with validation
curl -X POST "https://api.mymanybooks.com/books" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: mmb_your_api_key" \
  -d '{
    "isbnCode": "9780123456789",
    "title": "Example Book"
  }'
```

### With Cognito Authentication
```bash
# Get JWT token first (outside scope of API)
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use JWT for authenticated requests
curl -X GET "https://api.mymanybooks.com/books" \
  -H "Authorization: Bearer $TOKEN"
```

### ISBN Lookup (Rate Limited)
```bash
# Single lookup
curl -X GET "https://api.mymanybooks.com/isbn/lookup?isbn=9780123456789" \
  -H "X-Api-Key: mmb_your_api_key"

# Batch lookup (max 10 ISBNs)
curl -X POST "https://api.mymanybooks.com/isbn/lookup" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: mmb_your_api_key" \
  -d '{
    "isbns": ["9780123456789", "9780987654321"]
  }'
```

## Error Handling

### Standard Error Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {},
  "requestId": "abc123-def456-ghi789"
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_FAILED` - Invalid credentials
- `AUTHORIZATION_FAILED` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `CONFLICT` - Resource already exists
- `SERVICE_UNAVAILABLE` - External service unavailable

## Performance Optimization

### Caching Strategy
- **API Gateway caching** - 5 minute TTL for GET requests
- **Lambda response caching** - In-memory caching for database queries
- **External API caching** - 1 hour TTL for ISBN lookups

### Connection Pooling
```typescript
// Database connection pooling
const sequelize = new Sequelize(connectionString, {
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});
```

### Cold Start Optimization
- **Provisioned concurrency** for production functions
- **Connection reuse** across Lambda invocations
- **Minimal dependencies** in Lambda packages

## Troubleshooting

### Common Issues

**1. CORS Errors**
```
Access to fetch at 'https://api.mymanybooks.com/books' from origin 'http://localhost:3000' has been blocked by CORS policy
```
- Check `config/cors.yml` for correct origin configuration
- Ensure OPTIONS preflight requests are handled

**2. Rate Limit Exceeded**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 30
}
```
- Implement exponential backoff in client
- Check API key tier limits
- Consider caching responses

**3. Authentication Failures**
```json
{
  "error": "Invalid API key",
  "code": "AUTHENTICATION_FAILED"
}
```
- Verify API key format: `mmb_[base64url_string]`
- Check key hasn't expired
- Ensure API_KEYS_ENABLED=true in environment

### Debug Mode
```bash
# Enable detailed logging
export LOG_LEVEL=debug
npm run local
```

### Health Checks
```bash
# Basic health check
curl https://api.mymanybooks.com/health

# Detailed readiness check
curl https://api.mymanybooks.com/readiness

# ISBN service health
curl https://api.mymanybooks.com/isbn/health
```

## Security Best Practices

1. **API Key Management**
   - Rotate keys regularly (every 90 days)
   - Use different keys for different environments
   - Store keys securely (AWS Secrets Manager, etc.)

2. **JWT Token Security**
   - Implement proper token expiration (1-24 hours)
   - Use refresh tokens for long-lived sessions
   - Validate token signatures against Cognito JWKS

3. **Network Security**
   - Use HTTPS only (TLS 1.2+)
   - Implement IP whitelisting for admin endpoints
   - Configure Web Application Firewall (WAF)

4. **Data Protection**
   - Sanitize all inputs
   - Never log sensitive data (passwords, tokens)
   - Implement field-level encryption for PII

5. **Monitoring & Alerting**
   - Set up CloudWatch alarms for high error rates
   - Monitor for suspicious patterns (repeated failures)
   - Implement automated response to security incidents

## Cost Optimization

### API Gateway Pricing
- **REST API**: $3.50 per million requests
- **Data transfer**: $0.09 per GB
- **Caching**: $0.020 per hour per GB

### Lambda Pricing
- **Requests**: $0.20 per 1M requests
- **Duration**: $0.0000166667 per GB-second

### Optimization Tips
1. **Enable caching** for frequently accessed endpoints
2. **Use smaller Lambda memory** if CPU isn't bottleneck
3. **Implement connection pooling** to reduce database costs
4. **Bundle dependencies** to reduce cold start time
5. **Monitor usage patterns** and optimize high-traffic endpoints

## Conclusion

This API Gateway configuration provides a production-ready, secure, and scalable foundation for the My Many Books API. The combination of authentication, rate limiting, validation, and monitoring ensures reliable service while protecting against common security threats and abuse.

For additional support or questions, refer to the troubleshooting section or check the API specification at `docs/api-specification.yml`.