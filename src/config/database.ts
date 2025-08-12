// ================================================================
// src/config/database.ts
// ================================================================

import { Sequelize } from 'sequelize';
import { DATABASE_CONFIG } from '@/utils/constants';

class DatabaseConnection {
  private static instance: Sequelize | null = null;

  static getInstance(): Sequelize {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = DatabaseConnection.createConnection();
    }
    return DatabaseConnection.instance;
  }

  private static createConnection(): Sequelize {
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL, NODE_ENV } = process.env;

    if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
      throw new Error('Missing required database environment variables');
    }

    const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: parseInt(DB_PORT || '3306', 10),
      dialect: DATABASE_CONFIG.DIALECT,
      timezone: DATABASE_CONFIG.TIMEZONE,
      pool: DATABASE_CONFIG.POOL,
      dialectOptions: {
        ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      },
      logging: NODE_ENV === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: true,
        createdAt: 'creation_date',
        updatedAt: 'update_date',
      },
    });

    return sequelize;
  }

  static async testConnection(): Promise<boolean> {
    try {
      const sequelize = DatabaseConnection.getInstance();
      await sequelize.authenticate();
      console.log('Database connection established successfully');
      return true;
    } catch (error) {
      console.error('Unable to connect to database:', error);
      return false;
    }
  }

  static async closeConnection(): Promise<void> {
    if (DatabaseConnection.instance) {
      await DatabaseConnection.instance.close();
      DatabaseConnection.instance = null;
    }
  }
}

export default DatabaseConnection;
