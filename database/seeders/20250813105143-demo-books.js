'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    
    const books = await queryInterface.bulkInsert('books', [
      {
        isbnCode: '9780451524935',
        title: '1984',
        editionNumber: 1,
        editionDate: '1949-06-08',
        status: 'available',
        notes: 'A powerful dystopian novel about totalitarianism and surveillance',
        creationDate: now,
        updateDate: now
      },
      {
        isbnCode: '9780486284736',
        title: 'Pride and Prejudice',
        editionNumber: 1,
        editionDate: '1813-01-28',
        status: 'reading',
        notes: 'Classic romance novel with wit and social commentary',
        creationDate: now,
        updateDate: now
      },
      {
        isbnCode: '9780486400778',
        title: 'The Adventures of Huckleberry Finn',
        editionNumber: 1,
        editionDate: '1884-12-10',
        status: 'available',
        notes: 'American classic about friendship and adventure along the Mississippi',
        creationDate: now,
        updateDate: now
      },
      {
        isbnCode: '9780060883287',
        title: 'One Hundred Years of Solitude',
        editionNumber: 1,
        editionDate: '1967-06-05',
        status: 'wishlist',
        notes: 'Magical realism masterpiece about the Buendía family',
        creationDate: now,
        updateDate: now
      },
      {
        isbnCode: '9780156907392',
        title: 'To the Lighthouse',
        editionNumber: 1,
        editionDate: '1927-05-05',
        status: 'available',
        notes: 'Modernist novel exploring consciousness and time',
        creationDate: now,
        updateDate: now
      },
      {
        isbnCode: '9780805210040',
        title: 'The Trial',
        editionNumber: 1,
        editionDate: '1925-04-26',
        status: 'read',
        notes: 'Kafka\'s existential masterpiece about bureaucracy and alienation',
        creationDate: now,
        updateDate: now
      },
      {
        isbnCode: '9780684800107',
        title: 'The Old Man and the Sea',
        editionNumber: 1,
        editionDate: '1952-09-01',
        status: 'read',
        notes: 'Hemingway\'s Nobel Prize-winning novella',
        creationDate: now,
        updateDate: now
      },
      {
        isbnCode: '9780452284234',
        title: 'Beloved',
        editionNumber: 1,
        editionDate: '1987-09-16',
        status: 'available',
        notes: 'Powerful novel about slavery and its lasting impact',
        creationDate: now,
        updateDate: now
      },
      {
        isbnCode: '9780679723431',
        title: 'Norwegian Wood',
        editionNumber: 1,
        editionDate: '1987-08-04',
        status: 'reading',
        notes: 'Coming-of-age story set in 1960s Tokyo',
        creationDate: now,
        updateDate: now
      },
      {
        isbnCode: '9780553383904',
        title: 'The House of the Spirits',
        editionNumber: 1,
        editionDate: '1982-01-01',
        status: 'available',
        notes: 'Multi-generational saga with magical realism elements',
        creationDate: now,
        updateDate: now
      }
    ], {
      ignoreDuplicates: true,
      returning: true
    });

    const authors = await queryInterface.sequelize.query(
      'SELECT id, name, surname FROM authors',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const categories = await queryInterface.sequelize.query(
      'SELECT id, name FROM categories',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const getBooksIds = await queryInterface.sequelize.query(
      'SELECT id, isbnCode FROM books',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const findAuthor = (name, surname) => authors.find(a => a.name === name && a.surname === surname);
    const findCategory = (name) => categories.find(c => c.name === name);
    const findBook = (isbn) => getBooksIds.find(b => b.isbnCode === isbn);

    const bookAuthors = [];
    const bookCategories = [];

    const bookAuthorMappings = [
      { isbn: '9780451524935', authors: [['George', 'Orwell']] },
      { isbn: '9780486284736', authors: [['Jane', 'Austen']] },
      { isbn: '9780486400778', authors: [['Mark', 'Twain']] },
      { isbn: '9780060883287', authors: [['Gabriel', 'García Márquez']] },
      { isbn: '9780156907392', authors: [['Virginia', 'Woolf']] },
      { isbn: '9780805210040', authors: [['Franz', 'Kafka']] },
      { isbn: '9780684800107', authors: [['Ernest', 'Hemingway']] },
      { isbn: '9780452284234', authors: [['Toni', 'Morrison']] },
      { isbn: '9780679723431', authors: [['Haruki', 'Murakami']] },
      { isbn: '9780553383904', authors: [['Isabel', 'Allende']] }
    ];

    const bookCategoryMappings = [
      { isbn: '9780451524935', categories: ['Fiction', 'Dystopian Fiction', 'Classic Literature'] },
      { isbn: '9780486284736', categories: ['Fiction', 'Romance', 'Classic Literature'] },
      { isbn: '9780486400778', categories: ['Fiction', 'Adventure', 'Classic Literature'] },
      { isbn: '9780060883287', categories: ['Fiction', 'Magical Realism', 'Classic Literature'] },
      { isbn: '9780156907392', categories: ['Fiction', 'Modernist Literature', 'Classic Literature'] },
      { isbn: '9780805210040', categories: ['Fiction', 'Existential Fiction', 'Classic Literature'] },
      { isbn: '9780684800107', categories: ['Fiction', 'War Fiction', 'Classic Literature'] },
      { isbn: '9780452284234', categories: ['Fiction', 'Contemporary Fiction', 'Historical Fiction'] },
      { isbn: '9780679723431', categories: ['Fiction', 'Contemporary Fiction', 'Romance'] },
      { isbn: '9780553383904', categories: ['Fiction', 'Magical Realism', 'Historical Fiction'] }
    ];

    bookAuthorMappings.forEach(mapping => {
      const book = findBook(mapping.isbn);
      if (book) {
        mapping.authors.forEach(([name, surname]) => {
          const author = findAuthor(name, surname);
          if (author) {
            bookAuthors.push({
              bookId: book.id,
              authorId: author.id,
              creationDate: now,
              updateDate: now
            });
          }
        });
      }
    });

    bookCategoryMappings.forEach(mapping => {
      const book = findBook(mapping.isbn);
      if (book) {
        mapping.categories.forEach(categoryName => {
          const category = findCategory(categoryName);
          if (category) {
            bookCategories.push({
              bookId: book.id,
              categoryId: category.id,
              creationDate: now,
              updateDate: now
            });
          }
        });
      }
    });

    if (bookAuthors.length > 0) {
      await queryInterface.bulkInsert('book_authors', bookAuthors, { ignoreDuplicates: true });
    }

    if (bookCategories.length > 0) {
      await queryInterface.bulkInsert('book_categories', bookCategories, { ignoreDuplicates: true });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('book_categories', null, {});
    await queryInterface.bulkDelete('book_authors', null, {});
    await queryInterface.bulkDelete('books', null, {});
  }
};
