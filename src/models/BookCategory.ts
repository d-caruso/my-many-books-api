// ================================================================
// src/models/BookCategory.ts
// ================================================================

import { DataTypes, Sequelize } from 'sequelize';
import { Model } from 'sequelize';
import { BookCategoryAttributes, BookCategoryCreationAttributes } from './interfaces/ModelInterfaces';
import { TABLE_NAMES } from '@/utils/constants';
import { Book } from './Book';
import { Category } from './Category';

export class BookCategory extends Model<BookCategoryAttributes, BookCategoryCreationAttributes> implements BookCategoryAttributes {
  public bookId!: number;
  public categoryId!: number;
  public readonly creationDate!: Date;
  public updateDate?: Date;

  // Associations
  public book?: Book;
  public category?: Category;

  static override getTableName(): string {
    return TABLE_NAMES.BOOK_CATEGORIES;
  }

  static getModelName(): string {
    return 'BookCategory';
  }

  static initModel(sequelize: Sequelize): typeof BookCategory {
    BookCategory.init(
      {
        bookId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          field: 'book_id',
          references: {
            model: TABLE_NAMES.BOOKS,
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        categoryId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          field: 'category_id',
          references: {
            model: TABLE_NAMES.CATEGORIES,
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
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
      },
      {
        sequelize,
        tableName: TABLE_NAMES.BOOK_CATEGORIES,
        timestamps: true,
        underscored: true,
        createdAt: 'creation_date',
        updatedAt: 'update_date',
        indexes: [
          {
            fields: ['book_id'],
            name: 'idx_book_category_book',
          },
          {
            fields: ['category_id'],
            name: 'idx_book_category_category',
          },
        ],
      }
    );

    return BookCategory;
  }

  public override toJSON(): BookCategoryAttributes {
    return {
      bookId: this.bookId,
      categoryId: this.categoryId,
      creationDate: this.creationDate,
      updateDate: this.updateDate,
    };
  }

  static async addCategoryToBook(bookId: number, categoryId: number): Promise<BookCategory> {
    return await BookCategory.create({
      bookId,
      categoryId,
    } as any);
  }

  static async removeCategoryFromBook(bookId: number, categoryId: number): Promise<boolean> {
    const rowsDeleted = await BookCategory.destroy({
      where: {
        bookId,
        categoryId,
      },
    });
    return rowsDeleted > 0;
  }

  static async getBooksByCategory(categoryId: number): Promise<BookCategory[]> {
    return await BookCategory.findAll({
      where: { categoryId },
      include: [{ model: Book, as: 'book' }],
    });
  }

  static async getCategoriesByBook(bookId: number): Promise<BookCategory[]> {
    return await BookCategory.findAll({
      where: { bookId },
      include: [{ model: Category, as: 'category' }],
    });
  }
}