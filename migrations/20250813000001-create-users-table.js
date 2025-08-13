'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        validate: {
          len: [1, 100]
        }
      },
      surname: {
        type: Sequelize.STRING(100),
        allowNull: false,
        validate: {
          len: [1, 100]
        }
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
      },
      creationDate: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        field: 'creation_date'
      },
      updateDate: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        field: 'update_date'
      }
    });

    // Add indexes
    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'idx_users_email_unique'
    });

    await queryInterface.addIndex('users', ['is_active'], {
      name: 'idx_users_is_active'
    });

    await queryInterface.addIndex('users', ['name', 'surname'], {
      name: 'idx_users_name_surname'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};