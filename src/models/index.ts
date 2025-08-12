// ================================================================
// src/models/index.ts
// ================================================================

import { Sequelize } from 'sequelize';
import { ModelAssociations } from './associations/ModelAssociations';
import { Author } from './Author';
import { Category } from './Category';
import { Book } from './Book';
import { BookAuthor } from './BookAuthor';
import { BookCategory } from './BookCategory';

export * from './interfaces/ModelInterfaces';
export * from './base/BaseModel';
export * from './associations/ModelAssociations';
export * from './Author';
export * from './Category';
export * from './Book';
export * from './BookAuthor';
export * from './BookCategory';

export class ModelManager {
  private static sequelize: Sequelize | null = null;
  private static initialized = false;

  static initialize(sequelize: Sequelize): void {
    if (ModelManager.initialized) {
      return;
    }

    ModelManager.sequelize = sequelize;

    // Initialize models in dependency order
    Author.initModel(sequelize);
    Category.initModel(sequelize);
    Book.initModel(sequelize);
    BookAuthor.initModel(sequelize);
    BookCategory.initModel(sequelize);

    // Register models for associations
    ModelAssociations.registerModel('Author', Author);
    ModelAssociations.registerModel('Category', Category);
    ModelAssociations.registerModel('Book', Book);
    ModelAssociations.registerModel('BookAuthor', BookAuthor);
    ModelAssociations.registerModel('BookCategory', BookCategory);

    // Define associations
    ModelAssociations.defineAssociations();

    ModelManager.initialized = true;
    console.log('Model manager initialized with all models and associations');
  }

  static getSequelize(): Sequelize {
    if (!ModelManager.sequelize) {
      throw new Error('ModelManager not initialized. Call initialize() first.');
    }
    return ModelManager.sequelize;
  }

  static async syncDatabase(force = false): Promise<void> {
    if (!ModelManager.sequelize) {
      throw new Error('ModelManager not initialized');
    }

    await ModelAssociations.syncModels(ModelManager.sequelize, force);
  }

  static isInitialized(): boolean {
    return ModelManager.initialized;
  }

  static async close(): Promise<void> {
    if (ModelManager.sequelize) {
      await ModelManager.sequelize.close();
      ModelManager.sequelize = null;
      ModelManager.initialized = false;
    }
  }

  static getModels() {
    return {
      Author,
      Category,
      Book,
      BookAuthor,
      BookCategory,
    };
  }
}
