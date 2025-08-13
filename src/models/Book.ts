// ================================================================
// src/models/Book.ts
// ================================================================

import { DataTypes, Sequelize, Association } from 'sequelize';
import { IdBaseModel } from './base/IdBaseModel';
import { BookAttributes, BookCreationAttributes, BookStatus } from './interfaces/ModelInterfaces';
import { TABLE_NAMES, BOOK_STATUS } from '@/utils/constants';
import { Author } from './Author';
import { Category } from './Category';

export class Book extends IdBaseModel<BookAttributes> implements BookAttributes {
  public isbnCode!: string;
  public title!: string;
  public editionNumber?: number;
  public editionDate?: Date;
  public status?: BookStatus;
  public notes?: string;
  public userId?: number;

  // Associations
  public authors?: Author[];
  public categories?: Category[];

  // Association definitions
  static override associations: {
    authors: Association<Book, Author>;
    categories: Association<Book, Category>;
  };

  static override getTableName(): string {
    return TABLE_NAMES.BOOKS;
  }

  static override getModelName(): string {
    return 'Book';
  }

  static initModel(sequelize: Sequelize): typeof Book {
    Book.init(
      {
        ...this.getBaseAttributes(),
        isbnCode: {
          type: DataTypes.STRING(20),
          allowNull: false,
          unique: true,
          field: 'isbn_code',
          validate: {
            notEmpty: true,
            len: [10, 13],
            isISBN(value: string) {
              // Basic ISBN validation (digits and hyphens only)
              if (!/^[\d-]+$/.test(value)) {
                throw new Error('ISBN must contain only digits and hyphens');
              }
            },
          },
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [1, 255],
          },
        },
        editionNumber: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'edition_number',
          validate: {
            min: 1,
          },
        },
        editionDate: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'edition_date',
        },
        status: {
          type: DataTypes.ENUM(...Object.values(BOOK_STATUS)),
          allowNull: true,
          validate: {
            isIn: {
              args: [Object.values(BOOK_STATUS)],
              msg: 'Status must be one of: in progress, paused, finished',
            },
          },
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
          validate: {
            len: [0, 2000],
          },
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'user_id',
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
      },
      {
        ...this.getBaseOptions(sequelize, TABLE_NAMES.BOOKS),
        indexes: [
          ...this.getBaseOptions(sequelize, TABLE_NAMES.BOOKS).indexes,
          {
            fields: ['isbn_code'],
            unique: true,
            name: 'idx_book_isbn_unique',
          },
          {
            fields: ['title'],
            name: 'idx_book_title',
          },
          {
            fields: ['status'],
            name: 'idx_book_status',
          },
          {
            fields: ['edition_date'],
            name: 'idx_book_edition_date',
          },
          {
            fields: ['user_id'],
            name: 'idx_book_user_id',
          },
        ],
      }
    );

    return Book;
  }

  // Instance methods
  public override toJSON(): BookAttributes {
    return {
      id: this.id,
      isbnCode: this.isbnCode,
      title: this.title,
      editionNumber: this.editionNumber,
      editionDate: this.editionDate,
      status: this.status,
      notes: this.notes,
      userId: this.userId,
      creationDate: this.creationDate,
      updateDate: this.updateDate,
    };
  }

  public getDisplayTitle(): string {
    if (this.editionNumber && this.editionNumber > 1) {
      return `${this.title} (${this.editionNumber}${this.getOrdinalSuffix(this.editionNumber)} Edition)`;
    }
    return this.title;
  }

  private getOrdinalSuffix(num: number): string {
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }

    switch (lastDigit) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  public isCompleted(): boolean {
    return this.status === BOOK_STATUS.FINISHED;
  }

  public isInProgress(): boolean {
    return this.status === BOOK_STATUS.IN_PROGRESS;
  }

  public isPaused(): boolean {
    return this.status === BOOK_STATUS.PAUSED;
  }

  // Static query methods
  static async findByISBN(isbn: string): Promise<Book | null> {
    return await Book.findOne({
      where: {
        isbnCode: isbn,
      },
      include: [
        { model: Author, as: 'authors' },
        { model: Category, as: 'categories' },
      ],
    });
  }

  static async searchByTitle(searchTerm: string): Promise<Book[]> {
    const { Op } = require('sequelize');

    return await Book.findAll({
      where: {
        title: {
          [Op.like]: `%${searchTerm}%`,
        },
      },
      include: [
        { model: Author, as: 'authors' },
        { model: Category, as: 'categories' },
      ],
      order: [['title', 'ASC']],
    });
  }

  static async findByStatus(status: BookStatus): Promise<Book[]> {
    return await Book.findAll({
      where: {
        status,
      },
      include: [
        { model: Author, as: 'authors' },
        { model: Category, as: 'categories' },
      ],
      order: [['title', 'ASC']],
    });
  }

  static async findByAuthor(authorId: number): Promise<Book[]> {
    return await Book.findAll({
      include: [
        {
          model: Author,
          as: 'authors',
          where: { id: authorId },
        },
        { model: Category, as: 'categories' },
      ],
      order: [['title', 'ASC']],
    });
  }

  static async findByCategory(categoryId: number): Promise<Book[]> {
    return await Book.findAll({
      include: [
        { model: Author, as: 'authors' },
        {
          model: Category,
          as: 'categories',
          where: { id: categoryId },
        },
      ],
      order: [['title', 'ASC']],
    });
  }

  static async createBook(bookData: BookCreationAttributes): Promise<Book> {
    // Check if book already exists
    const existingBook = await Book.findByISBN(bookData.isbnCode);

    if (existingBook) {
      throw new Error(`Book with ISBN ${bookData.isbnCode} already exists`);
    }

    return await Book.create(bookData as any);
  }

  public async addAuthors(authors: Author[]): Promise<void> {
    const { BookAuthor } = require('./BookAuthor');

    for (const author of authors) {
      await BookAuthor.addAuthorToBook(this.id, author.id);
    }
  }

  public async addAuthor(author: Author): Promise<void> {
    await this.addAuthors([author]);
  }

  public async addCategories(categories: Category[]): Promise<void> {
    const { BookCategory } = require('./BookCategory');

    for (const category of categories) {
      await BookCategory.addCategoryToBook(this.id, category.id);
    }
  }

  public async addCategory(category: Category): Promise<void> {
    await this.addCategories([category]);
  }

  public async removeAuthors(authors: Author[]): Promise<void> {
    const { BookAuthor } = require('./BookAuthor');

    for (const author of authors) {
      await BookAuthor.removeAuthorFromBook(this.id, author.id);
    }
  }

  public async removeCategories(categories: Category[]): Promise<void> {
    const { BookCategory } = require('./BookCategory');

    for (const category of categories) {
      await BookCategory.removeCategoryFromBook(this.id, category.id);
    }
  }
}
