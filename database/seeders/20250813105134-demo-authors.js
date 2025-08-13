'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    
    return queryInterface.bulkInsert('authors', [
      {
        name: 'George',
        surname: 'Orwell',
        nationality: 'British',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Jane',
        surname: 'Austen', 
        nationality: 'British',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Mark',
        surname: 'Twain',
        nationality: 'American',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Gabriel',
        surname: 'García Márquez',
        nationality: 'Colombian',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Virginia',
        surname: 'Woolf',
        nationality: 'British',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Franz',
        surname: 'Kafka',
        nationality: 'Czech',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Ernest',
        surname: 'Hemingway',
        nationality: 'American',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Toni',
        surname: 'Morrison',
        nationality: 'American',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Haruki',
        surname: 'Murakami',
        nationality: 'Japanese',
        creationDate: now,
        updateDate: now
      },
      {
        name: 'Isabel',
        surname: 'Allende',
        nationality: 'Chilean',
        creationDate: now,
        updateDate: now
      }
    ], {
      ignoreDuplicates: true
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('authors', null, {});
  }
};
