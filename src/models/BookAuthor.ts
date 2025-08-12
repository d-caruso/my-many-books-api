// ================================================================
// src/models/BookAuthor.ts
// ================================================================

import { DataTypes, Sequelize } from 'sequelize';
import { Model } from 'sequelize';
import { BookAuthorAttributes, BookAuthorCreationAttributes } from './interfaces/ModelInterfaces';
import { TABLE_NAMES } from '@/utils/constants';
import { Book } from './Book';
import { Author } from './Author';

export class BookAuthor
  extends Model<BookAuthorAttributes, BookAuthorCreationAttributes>
  implements BookAuthorAttributes
{
  public bookId!: number;
  public authorId!: number;
  public readonly creationDate!: Date;
  public updateDate?: Date | undefined;

  // Associations
  public book?: Book;
  public author?: Author;

  static override getTableName(): string {
    return TABLE_NAMES.BOOK_AUTHORS;
  }

  static getModelName(): string {
    return 'BookAuthor';
  }

  static initModel(sequelize: Sequelize): typeof BookAuthor {
    BookAuthor.init(
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
        authorId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          field: 'author_id',
          references: {
            model: TABLE_NAMES.AUTHORS,
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
        tableName: TABLE_NAMES.BOOK_AUTHORS,
        timestamps: true,
        underscored: true,
        createdAt: 'creation_date',
        updatedAt: 'update_date',
        indexes: [
          {
            fields: ['book_id'],
            name: 'idx_book_author_book',
          },
          {
            fields: ['author_id'],
            name: 'idx_book_author_author',
          },
        ],
      }
    );

    return BookAuthor;
  }

  public override toJSON(): BookAuthorAttributes {
    return {
      bookId: this.bookId,
      authorId: this.authorId,
      creationDate: this.creationDate,
      updateDate: this.updateDate,
    };
  }

  static async addAuthorToBook(bookId: number, authorId: number): Promise<BookAuthor> {
    return await BookAuthor.create({
      bookId,
      authorId,
    } as any);
  }

  static async removeAuthorFromBook(bookId: number, authorId: number): Promise<boolean> {
    const rowsDeleted = await BookAuthor.destroy({
      where: {
        bookId,
        authorId,
      },
    });
    return rowsDeleted > 0;
  }

  static async getBooksByAuthor(authorId: number): Promise<BookAuthor[]> {
    return await BookAuthor.findAll({
      where: { authorId },
      include: [{ model: Book, as: 'book' }],
    });
  }

  static async getAuthorsByBook(bookId: number): Promise<BookAuthor[]> {
    return await BookAuthor.findAll({
      where: { bookId },
      include: [{ model: Author, as: 'author' }],
    });
  }
}
