'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    
    return queryInterface.bulkInsert('categories', [
      {
        name: 'Fiction',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Classic Literature',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Dystopian Fiction',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Romance',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Adventure',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Magical Realism',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Modernist Literature',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Existential Fiction',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'War Fiction',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Contemporary Fiction',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Science Fiction',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Mystery',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Historical Fiction',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Biography',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Non-Fiction',
        creationDate: now,
        updateDate: now
      }
    ], {
      ignoreDuplicates: true
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('categories', null, {});
  }
};
