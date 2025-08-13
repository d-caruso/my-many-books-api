// ================================================================
// src/models/Category.ts
// ================================================================
import { DataTypes, Sequelize } from 'sequelize';
import { IdBaseModel } from './base/IdBaseModel';
import { CategoryAttributes, CategoryCreationAttributes } from './interfaces/ModelInterfaces';
import { TABLE_NAMES } from '@/utils/constants';

export class Category extends IdBaseModel<CategoryAttributes> implements CategoryAttributes {
  public name!: string;

  static override getTableName(): string {
    return TABLE_NAMES.CATEGORIES;
  }

  static override getModelName(): string {
    return 'Category';
  }

  static initModel(sequelize: Sequelize): typeof Category {
    Category.init(
      {
        ...this.getBaseAttributes(),
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          validate: {
            notEmpty: true,
            len: [1, 255],
          },
        },
      },
      {
        ...this.getBaseOptions(sequelize, TABLE_NAMES.CATEGORIES),
        indexes: [
          ...this.getBaseOptions(sequelize, TABLE_NAMES.CATEGORIES).indexes,
          {
            fields: ['name'],
            unique: true,
            name: 'idx_category_name_unique',
          },
        ],
      }
    );

    return Category;
  }

  // Instance methods
  public override toJSON(): CategoryAttributes {
    return {
      id: this.id,
      name: this.name,
      creationDate: this.creationDate,
      updateDate: this.updateDate,
    };
  }

  // Static query methods
  static async findByName(name: string): Promise<Category | null> {
    return await Category.findOne({
      where: {
        name: name.trim(),
      },
    });
  }

  static async searchByName(searchTerm: string): Promise<Category[]> {
    const { Op } = require('sequelize');

    return await Category.findAll({
      where: {
        name: {
          [Op.like]: `%${searchTerm}%`,
        },
      },
      order: [['name', 'ASC']],
    });
  }

  static async getAllCategories(): Promise<Category[]> {
    return await Category.findAll({
      order: [['name', 'ASC']],
    });
  }

  static async createCategory(categoryData: CategoryCreationAttributes): Promise<Category> {
    // Normalize category name (trim and proper case)
    const normalizedName = categoryData.name.trim();

    // Check if category already exists
    const existingCategory = await Category.findByName(normalizedName);

    if (existingCategory) {
      return existingCategory;
    }

    return await Category.create({
      ...categoryData,
      name: normalizedName,
    } as any);
  }

  static async findOrCreateCategory(
    categoryData: CategoryCreationAttributes
  ): Promise<[Category, boolean]> {
    const normalizedName = categoryData.name.trim();

    return await Category.findOrCreate({
      where: {
        name: normalizedName,
      },
      defaults: {
        ...categoryData,
        name: normalizedName,
      },
    } as any);
  }
}
