// ================================================================
// src/models/base/BaseModel.ts
// ================================================================

import { Model, DataTypes, Sequelize } from 'sequelize';

export interface BaseModelAttributes {
  id?: number;
  creationDate?: Date;
  updateDate?: Date;
}

export abstract class BaseModel<T extends BaseModelAttributes> extends Model<T> {
  public id!: number;
  public readonly creationDate!: Date;
  public readonly updateDate!: Date;

  // Common model methods that all models will inherit
  public static override getTableName(): string {
    throw new Error('getTableName must be implemented by subclass');
  }

  public static getModelName(): string {
    throw new Error('getModelName must be implemented by subclass');
  }

  // Helper method to define common attributes
  protected static getBaseAttributes() {
    return {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      creationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'creation_date',
      },
      updateDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'update_date',
      },
    };
  }

  // Helper method to define common model options
  protected static getBaseOptions(sequelize: Sequelize, tableName: string) {
    return {
      sequelize,
      tableName,
      timestamps: true,
      underscored: true,
      createdAt: 'creation_date',
      updatedAt: 'update_date',
      indexes: [
        {
          fields: ['creation_date'],
        },
        {
          fields: ['update_date'],
        },
      ],
    };
  }
}