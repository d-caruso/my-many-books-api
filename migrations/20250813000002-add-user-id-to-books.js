'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add userId column to books table
    await queryInterface.addColumn('books', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add index for user_id
    await queryInterface.addIndex('books', ['user_id'], {
      name: 'idx_books_user_id'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('books', 'idx_books_user_id');
    
    // Remove the column
    await queryInterface.removeColumn('books', 'user_id');
  }
};