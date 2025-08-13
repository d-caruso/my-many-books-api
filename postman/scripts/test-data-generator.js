/**
 * Test Data Generator Script for Postman
 * 
 * This script contains utility functions for generating test data
 * for the My Many Books API testing collection.
 */

/**
 * Generate random ISBN-13
 */
function generateRandomISBN13() {
    const prefix = '978';
    const group = Math.floor(Math.random() * 9) + 1; // 1-9
    const publisher = String(Math.floor(Math.random() * 900) + 100); // 100-999
    const title = String(Math.floor(Math.random() * 9000) + 1000); // 1000-9999
    
    const partial = prefix + group + publisher + title;
    const checkDigit = calculateISBN13CheckDigit(partial);
    
    return partial + checkDigit;
}

/**
 * Calculate ISBN-13 check digit
 */
function calculateISBN13CheckDigit(partial) {
    let sum = 0;
    for (let i = 0; i < partial.length; i++) {
        const digit = parseInt(partial[i]);
        sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Generate random book data
 */
function generateRandomBookData() {
    const titles = [
        'The Great Adventure', 'Mystery of the Lost City', 'Dreams and Reality',
        'The Last Journey', 'Secrets of the Universe', 'Beyond the Horizon',
        'The Magic Forest', 'Whispers in the Wind', 'The Golden Key',
        'Tales of Tomorrow'
    ];
    
    const statuses = ['available', 'reading', 'read', 'wishlist'];
    
    const bookData = {
        isbnCode: generateRandomISBN13(),
        title: titles[Math.floor(Math.random() * titles.length)] + ` (Test ${Date.now()})`,
        editionNumber: Math.floor(Math.random() * 5) + 1,
        editionDate: generateRandomDate(),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        notes: `Test book created at ${new Date().toISOString()}`
    };
    
    return bookData;
}

/**
 * Generate random author data
 */
function generateRandomAuthorData() {
    const firstNames = [
        'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma',
        'James', 'Lisa', 'Robert', 'Maria', 'William', 'Anna'
    ];
    
    const lastNames = [
        'Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson',
        'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White'
    ];
    
    const nationalities = [
        'American', 'British', 'Canadian', 'Australian', 'German',
        'French', 'Italian', 'Spanish', 'Japanese', 'Indian'
    ];
    
    const authorData = {
        name: firstNames[Math.floor(Math.random() * firstNames.length)],
        surname: lastNames[Math.floor(Math.random() * lastNames.length)],
        nationality: nationalities[Math.floor(Math.random() * nationalities.length)]
    };
    
    return authorData;
}

/**
 * Generate random category data
 */
function generateRandomCategoryData() {
    const categories = [
        'Science Fiction', 'Fantasy', 'Mystery', 'Thriller', 'Romance',
        'Historical Fiction', 'Biography', 'Self-Help', 'Technology',
        'Philosophy', 'Poetry', 'Drama', 'Adventure', 'Horror'
    ];
    
    const suffix = Math.random().toString(36).substring(2, 8);
    const categoryData = {
        name: categories[Math.floor(Math.random() * categories.length)] + ` Test ${suffix}`
    };
    
    return categoryData;
}

/**
 * Generate random date in the past
 */
function generateRandomDate() {
    const start = new Date(1950, 0, 1);
    const end = new Date();
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Generate test ISBN variations
 */
function generateTestISBNs() {
    return {
        valid: {
            isbn13: '9780451524935',
            isbn10: '0451524934',
            withHyphens: '978-0-451-52493-5'
        },
        invalid: {
            tooShort: '123456789',
            tooLong: '12345678901234',
            invalidFormat: 'ABC-123-456-789',
            invalidChecksum: '9780451524936'
        }
    };
}

/**
 * Store generated data in environment variables
 */
function storeTestData() {
    const bookData = generateRandomBookData();
    const authorData = generateRandomAuthorData();
    const categoryData = generateRandomCategoryData();
    
    pm.environment.set('testBookData', JSON.stringify(bookData));
    pm.environment.set('testAuthorData', JSON.stringify(authorData));
    pm.environment.set('testCategoryData', JSON.stringify(categoryData));
    
    console.log('📊 Generated and stored test data:');
    console.log('📚 Book:', bookData.title);
    console.log('✍️ Author:', authorData.name, authorData.surname);
    console.log('🏷️ Category:', categoryData.name);
}

/**
 * Clean up test data from environment
 */
function cleanupTestData() {
    const keysToClean = [
        'createdBookId', 'createdAuthorId', 'createdCategoryId',
        'createdBookIsbn', 'testBookData', 'testAuthorData', 'testCategoryData'
    ];
    
    keysToClean.forEach(key => {
        pm.environment.unset(key);
    });
    
    console.log('🧹 Cleaned up test data from environment');
}

// Export functions for use in pre-request and test scripts
if (typeof module !== 'undefined') {
    module.exports = {
        generateRandomISBN13,
        generateRandomBookData,
        generateRandomAuthorData,
        generateRandomCategoryData,
        generateTestISBNs,
        storeTestData,
        cleanupTestData
    };
}