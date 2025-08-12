// ================================================================
// src/models/base/BaseModel.ts
// ================================================================

import { Model, DataTypes, Sequelize } from 'sequelize';

// Base interface with only timestamps
export interface BaseModelAttributes {
  creationDate: Date;
  updateDate?: Date | undefined;
}

// Base model with only timestamps (for junction tables)
export abstract class BaseModel<T extends BaseModelAttributes> extends Model<T> {
  public readonly creationDate!: Date;
  public updateDate?: Date;

  protected static getBaseAttributes() {
    return {
      creationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'creation_date',
      },
      updateDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'update_date',
      },
    };
  }

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
      ],
    };
  }
}