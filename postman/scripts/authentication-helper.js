/**
 * Authentication Helper Script for Postman
 * 
 * This script contains utility functions for handling authentication
 * in the My Many Books API testing collection.
 */

/**
 * Generate API Key Authorization Header
 */
function generateApiKeyAuth() {
    const apiKey = pm.environment.get('apiKey');
    if (apiKey && pm.environment.get('authEnabled') === 'true') {
        pm.request.headers.add({
            key: 'X-API-Key',
            value: apiKey
        });
        console.log('✅ Added API Key authentication header');
    }
}

/**
 * Generate Cognito JWT Authorization Header
 */
function generateCognitoAuth() {
    const cognitoToken = pm.environment.get('cognitoToken');
    if (cognitoToken && pm.environment.get('authEnabled') === 'true') {
        pm.request.headers.add({
            key: 'Authorization',
            value: `Bearer ${cognitoToken}`
        });
        console.log('✅ Added Cognito JWT authentication header');
    }
}

/**
 * Mock Cognito Login (for testing purposes)
 * In real scenarios, you would integrate with AWS Cognito SDK
 */
function mockCognitoLogin() {
    // This is a mock implementation
    // In production, you would use AWS Cognito SDK to authenticate
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.mock-token-for-testing';
    
    pm.environment.set('cognitoToken', mockToken);
    console.log('🔐 Mock Cognito token set for testing');
}

/**
 * Clear Authentication Headers
 */
function clearAuthHeaders() {
    pm.environment.unset('cognitoToken');
    console.log('🧹 Cleared authentication tokens');
}

/**
 * Validate Authentication Response
 */
function validateAuthResponse() {
    if (pm.response.code === 401) {
        console.log('❌ Authentication failed - check API key or token');
        pm.test("Authentication should be valid", function () {
            pm.expect(pm.response.code).to.not.equal(401);
        });
    } else if (pm.response.code === 403) {
        console.log('❌ Authorization failed - insufficient permissions');
        pm.test("Authorization should be sufficient", function () {
            pm.expect(pm.response.code).to.not.equal(403);
        });
    }
}

// Export functions for use in pre-request and test scripts
if (typeof module !== 'undefined') {
    module.exports = {
        generateApiKeyAuth,
        generateCognitoAuth,
        mockCognitoLogin,
        clearAuthHeaders,
        validateAuthResponse
    };
}