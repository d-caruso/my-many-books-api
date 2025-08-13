// ================================================================
// src/models/User.ts
// User model for managing application users
// ================================================================

import { DataTypes, Association } from 'sequelize';
import { IdBaseModel } from './base/IdBaseModel';
import { UserAttributes } from './interfaces/ModelInterfaces';
import { Book } from './Book';

export class User extends IdBaseModel<UserAttributes> implements UserAttributes {
  public email!: string;
  public name!: string;
  public surname!: string;
  public isActive!: boolean;

  // Associations
  public books?: Book[];

  // Association definitions
  public static override associations: {
    books: Association<User, Book>;
  };

  public getFullName(): string {
    return `${this.name} ${this.surname}`;
  }

  public static initialize(sequelize: any): typeof User {
    User.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
            notEmpty: true,
          },
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [1, 100],
          },
        },
        surname: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [1, 100],
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        creationDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updateDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
        createdAt: 'creationDate',
        updatedAt: 'updateDate',
        indexes: [
          {
            unique: true,
            fields: ['email'],
          },
          {
            fields: ['isActive'],
          },
          {
            fields: ['name', 'surname'],
          },
        ],
      }
    );

    return User;
  }

  public static associate(): void {
    // User has many books
    User.hasMany(Book, {
      foreignKey: 'userId',
      as: 'books',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  }
}