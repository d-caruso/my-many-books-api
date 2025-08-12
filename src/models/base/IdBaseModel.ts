import { DataTypes, Sequelize } from 'sequelize';
import { BaseModel, BaseModelAttributes } from './BaseModel';

// Base interface with ID extends BaseModelAttributes
export interface IdBaseModelAttributes extends BaseModelAttributes {
  id: number;
}

// Entity base model with ID (for main entities)
export abstract class IdBaseModel<T extends IdBaseModelAttributes> extends BaseModel<T> {
  public id!: number;

  static override getTableName(): string {
    throw new Error('getTableName must be implemented by subclass');
  }

  static getModelName(): string {
    throw new Error('getModelName must be implemented by subclass');
  }

  protected static override getBaseAttributes() {
    return {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      ...super.getBaseAttributes(),
    };
  }

  protected static override getBaseOptions(sequelize: Sequelize, tableName: string) {
    const baseOptions = super.getBaseOptions(sequelize, tableName);
    return {
      ...baseOptions,
      indexes: [
        ...baseOptions.indexes,
        {
          fields: ['update_date'],
        },
      ],
    };
  }
}