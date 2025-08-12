// ================================================================
// src/models/index.ts
// ================================================================
import { Sequelize } from 'sequelize';
import { ModelAssociations } from './associations/ModelAssociations';

export * from './interfaces/ModelInterfaces';
export * from './base/BaseModel';
export * from './associations/ModelAssociations';

export class ModelManager {
  private static sequelize: Sequelize | null = null;
  private static initialized = false;

  static initialize(sequelize: Sequelize): void {
    if (ModelManager.initialized) {
      return;
    }

    ModelManager.sequelize = sequelize;

    // Models will be imported and registered here in future commits
    // This is the central initialization point

    ModelManager.initialized = true;
    console.log('Model manager initialized successfully');
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
}
