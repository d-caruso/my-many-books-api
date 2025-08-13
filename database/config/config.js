// ================================================================
// database/config/config.js - Sequelize CLI Environment Configuration
// ================================================================

require('dotenv').config();

const baseConfig = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  dialect: 'mysql',
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false,
    createdAt: 'creationDate',
    updatedAt: 'updateDate',
    freezeTableName: true
  }
};

module.exports = {
  development: {
    ...baseConfig,
    database: process.env.DB_NAME || 'my_many_books_dev',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  test: {
    ...baseConfig,
    database: process.env.DB_NAME_TEST || 'my_many_books_test',
    logging: false,
    pool: {
      max: 2,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  staging: {
    ...baseConfig,
    database: process.env.DB_NAME || 'my_many_books_staging',
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  },
  
  production: {
    ...baseConfig,
    database: process.env.DB_NAME || 'my_many_books',
    logging: false,
    dialectOptions: {
      ...baseConfig.dialectOptions,
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 300000
    }
  }
};