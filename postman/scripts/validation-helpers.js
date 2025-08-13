/**
 * Validation Helper Script for Postman
 * 
 * This script contains utility functions for validating API responses
 * in the My Many Books API testing collection.
 */

/**
 * Validate standard API response structure
 */
function validateAPIResponse() {
    const jsonData = pm.response.json();
    
    pm.test("Response has success property", function () {
        pm.expect(jsonData).to.have.property('success');
        pm.expect(jsonData.success).to.be.a('boolean');
    });
    
    if (jsonData.success) {
        pm.test("Successful response has data property", function () {
            pm.expect(jsonData).to.have.property('data');
        });
        
        pm.test("Successful response has message property", function () {
            pm.expect(jsonData).to.have.property('message');
            pm.expect(jsonData.message).to.be.a('string');
        });
    } else {
        pm.test("Error response has error property", function () {
            pm.expect(jsonData).to.have.property('error');
        });
        
        pm.test("Error response has error message", function () {
            pm.expect(jsonData.error).to.have.property('message');
            pm.expect(jsonData.error.message).to.be.a('string');
        });
    }
}

/**
 * Validate pagination structure
 */
function validatePagination() {
    const jsonData = pm.response.json();
    
    if (jsonData.success && jsonData.data) {
        pm.test("Response has pagination info", function () {
            pm.expect(jsonData.data).to.have.property('pagination');
            
            const pagination = jsonData.data.pagination;
            pm.expect(pagination).to.have.property('page');
            pm.expect(pagination).to.have.property('limit');
            pm.expect(pagination).to.have.property('total');
            pm.expect(pagination).to.have.property('totalPages');
            
            pm.expect(pagination.page).to.be.a('number');
            pm.expect(pagination.limit).to.be.a('number');
            pm.expect(pagination.total).to.be.a('number');
            pm.expect(pagination.totalPages).to.be.a('number');
        });
        
        pm.test("Pagination values are logical", function () {
            const pagination = jsonData.data.pagination;
            pm.expect(pagination.page).to.be.at.least(1);
            pm.expect(pagination.limit).to.be.at.least(1);
            pm.expect(pagination.total).to.be.at.least(0);
            pm.expect(pagination.totalPages).to.be.at.least(0);
            
            if (pagination.total > 0) {
                pm.expect(pagination.totalPages).to.be.at.least(1);
            }
        });
    }
}

/**
 * Validate book object structure
 */
function validateBookObject(book) {
    pm.test("Book object has required properties", function () {
        pm.expect(book).to.have.property('id');
        pm.expect(book).to.have.property('isbnCode');
        pm.expect(book).to.have.property('title');
        pm.expect(book).to.have.property('status');
        pm.expect(book).to.have.property('creationDate');
        pm.expect(book).to.have.property('updateDate');
        
        pm.expect(book.id).to.be.a('number');
        pm.expect(book.isbnCode).to.be.a('string');
        pm.expect(book.title).to.be.a('string');
        pm.expect(book.status).to.be.a('string');
    });
    
    pm.test("Book status is valid", function () {
        const validStatuses = ['available', 'reading', 'read', 'wishlist'];
        pm.expect(validStatuses).to.include(book.status);
    });
    
    if (book.authors) {
        pm.test("Book authors is an array", function () {
            pm.expect(book.authors).to.be.an('array');
        });
    }
    
    if (book.categories) {
        pm.test("Book categories is an array", function () {
            pm.expect(book.categories).to.be.an('array');
        });
    }
}

/**
 * Validate author object structure
 */
function validateAuthorObject(author) {
    pm.test("Author object has required properties", function () {
        pm.expect(author).to.have.property('id');
        pm.expect(author).to.have.property('name');
        pm.expect(author).to.have.property('surname');
        pm.expect(author).to.have.property('creationDate');
        pm.expect(author).to.have.property('updateDate');
        
        pm.expect(author.id).to.be.a('number');
        pm.expect(author.name).to.be.a('string');
        pm.expect(author.surname).to.be.a('string');
    });
    
    if (author.nationality) {
        pm.test("Author nationality is a string", function () {
            pm.expect(author.nationality).to.be.a('string');
        });
    }
}

/**
 * Validate category object structure
 */
function validateCategoryObject(category) {
    pm.test("Category object has required properties", function () {
        pm.expect(category).to.have.property('id');
        pm.expect(category).to.have.property('name');
        pm.expect(category).to.have.property('creationDate');
        pm.expect(category).to.have.property('updateDate');
        
        pm.expect(category.id).to.be.a('number');
        pm.expect(category.name).to.be.a('string');
    });
}

/**
 * Validate ISBN format
 */
function validateISBNFormat(isbn) {
    const isbn10Pattern = /^[0-9]{9}[0-9X]$/;
    const isbn13Pattern = /^[0-9]{13}$/;
    
    pm.test("ISBN format is valid", function () {
        const cleanISBN = isbn.replace(/[-\s]/g, '');
        const isValidISBN10 = isbn10Pattern.test(cleanISBN);
        const isValidISBN13 = isbn13Pattern.test(cleanISBN);
        
        pm.expect(isValidISBN10 || isValidISBN13).to.be.true;
    });
}

/**
 * Validate timestamp format
 */
function validateTimestamp(timestamp, fieldName) {
    pm.test(`${fieldName} is a valid timestamp`, function () {
        pm.expect(timestamp).to.be.a('string');
        const date = new Date(timestamp);
        pm.expect(date.getTime()).to.not.be.NaN;
        pm.expect(date.toISOString()).to.equal(timestamp);
    });
}

/**
 * Validate ID is positive integer
 */
function validateID(id, fieldName) {
    pm.test(`${fieldName} is a valid ID`, function () {
        pm.expect(id).to.be.a('number');
        pm.expect(id).to.be.at.least(1);
        pm.expect(Number.isInteger(id)).to.be.true;
    });
}

/**
 * Validate health check response
 */
function validateHealthCheck() {
    const jsonData = pm.response.json();
    
    pm.test("Health check has required properties", function () {
        pm.expect(jsonData).to.have.property('success');
        pm.expect(jsonData).to.have.property('message');
        pm.expect(jsonData).to.have.property('timestamp');
        pm.expect(jsonData).to.have.property('version');
        pm.expect(jsonData).to.have.property('uptime');
        
        pm.expect(jsonData.success).to.be.true;
        pm.expect(jsonData.message).to.be.a('string');
        pm.expect(jsonData.version).to.be.a('string');
        pm.expect(jsonData.uptime).to.be.a('number');
    });
    
    validateTimestamp(jsonData.timestamp, 'Health check timestamp');
}

/**
 * Validate error response structure
 */
function validateErrorResponse(expectedStatusCode) {
    pm.test(`Status code is ${expectedStatusCode}`, function () {
        pm.response.to.have.status(expectedStatusCode);
    });
    
    const jsonData = pm.response.json();
    
    pm.test("Error response structure is correct", function () {
        pm.expect(jsonData).to.have.property('success');
        pm.expect(jsonData).to.have.property('error');
        pm.expect(jsonData.success).to.be.false;
        
        pm.expect(jsonData.error).to.have.property('message');
        pm.expect(jsonData.error.message).to.be.a('string');
        
        if (jsonData.error.code) {
            pm.expect(jsonData.error.code).to.be.a('string');
        }
        
        if (jsonData.error.details) {
            pm.expect(jsonData.error.details).to.be.an('object');
        }
    });
}

// Export functions for use in test scripts
if (typeof module !== 'undefined') {
    module.exports = {
        validateAPIResponse,
        validatePagination,
        validateBookObject,
        validateAuthorObject,
        validateCategoryObject,
        validateISBNFormat,
        validateTimestamp,
        validateID,
        validateHealthCheck,
        validateErrorResponse
    };
}