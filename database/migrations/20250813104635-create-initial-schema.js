'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create Authors table
    await queryInterface.createTable('authors', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      surname: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      nationality: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      creationDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updateDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create Categories table
    await queryInterface.createTable('categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      creationDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updateDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create Books table
    await queryInterface.createTable('books', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      isbnCode: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      editionNumber: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      editionDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('available', 'reading', 'read', 'wishlist'),
        allowNull: true,
        defaultValue: 'available'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      creationDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updateDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create BookAuthor junction table
    await queryInterface.createTable('book_authors', {
      bookId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'books',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      authorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'authors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      creationDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updateDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create BookCategory junction table
    await queryInterface.createTable('book_categories', {
      bookId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'books',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      creationDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updateDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('authors', ['name', 'surname'], {
      name: 'idx_author_name_surname'
    });

    await queryInterface.addIndex('categories', ['name'], {
      name: 'idx_category_name_unique',
      unique: true
    });

    await queryInterface.addIndex('books', ['isbnCode'], {
      name: 'idx_book_isbn_unique',
      unique: true
    });

    await queryInterface.addIndex('books', ['title'], {
      name: 'idx_book_title'
    });

    await queryInterface.addIndex('books', ['status'], {
      name: 'idx_book_status'
    });

    // Add composite primary keys for junction tables
    await queryInterface.addConstraint('book_authors', {
      fields: ['bookId', 'authorId'],
      type: 'primary key',
      name: 'pk_book_authors'
    });

    await queryInterface.addConstraint('book_categories', {
      fields: ['bookId', 'categoryId'],
      type: 'primary key',
      name: 'pk_book_categories'
    });
  },

  async down (queryInterface, Sequelize) {
    // Drop tables in reverse order to avoid foreign key constraints
    await queryInterface.dropTable('book_categories');
    await queryInterface.dropTable('book_authors');
    await queryInterface.dropTable('books');
    await queryInterface.dropTable('categories');
    await queryInterface.dropTable('authors');
  }
};
