// ================================================================
// src/models/Author.ts
// ================================================================

import { DataTypes, Sequelize } from 'sequelize';
import { IdBaseModel } from './base/IdBaseModel';
import { AuthorAttributes, AuthorCreationAttributes } from './interfaces/ModelInterfaces';
import { TABLE_NAMES } from '@/utils/constants';

export class Author extends IdBaseModel<AuthorAttributes> implements AuthorAttributes {
  public name!: string;
  public surname!: string;
  public nationality?: string;

  static override getTableName(): string {
    return TABLE_NAMES.AUTHORS;
  }

  static override getModelName(): string {
    return 'Author';
  }

  static initModel(sequelize: Sequelize): typeof Author {
    Author.init(
      {
        ...this.getBaseAttributes(),
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [1, 255],
          },
        },
        surname: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [1, 255],
          },
        },
        nationality: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            len: [0, 255],
          },
        },
      },
      {
        ...this.getBaseOptions(sequelize, TABLE_NAMES.AUTHORS),
        indexes: [
          ...this.getBaseOptions(sequelize, TABLE_NAMES.AUTHORS).indexes,
          {
            fields: ['name', 'surname'],
            name: 'idx_author_name_surname',
          },
          {
            fields: ['surname'],
            name: 'idx_author_surname',
          },
          {
            fields: ['nationality'],
            name: 'idx_author_nationality',
          },
        ],
      }
    );

    return Author;
  }

  // Instance methods
  public getFullName(): string {
    return `${this.name} ${this.surname}`;
  }

  public override toJSON(): AuthorAttributes {
    return {
      id: this.id,
      name: this.name,
      surname: this.surname,
      nationality: this.nationality || null,
      creationDate: this.creationDate,
      updateDate: this.updateDate,
    };
  }

  // Static query methods
  static async findByFullName(name: string, surname: string): Promise<Author | null> {
    return await Author.findOne({
      where: {
        name,
        surname,
      },
    });
  }

  static async findByNationality(nationality: string): Promise<Author[]> {
    return await Author.findAll({
      where: {
        nationality,
      },
      order: [['surname', 'ASC'], ['name', 'ASC']],
    });
  }

  static async searchByName(searchTerm: string): Promise<Author[]> {
    const { Op } = require('sequelize');
    
    return await Author.findAll({
      where: {
        [Op.or]: [
          {
            name: {
              [Op.like]: `%${searchTerm}%`,
            },
          },
          {
            surname: {
              [Op.like]: `%${searchTerm}%`,
            },
          },
        ],
      },
      order: [['surname', 'ASC'], ['name', 'ASC']],
    });
  }

  static async createAuthor(authorData: AuthorCreationAttributes): Promise<Author> {
    // Check if author already exists
    const existingAuthor = await Author.findByFullName(authorData.name, authorData.surname);
    
    if (existingAuthor) {
      return existingAuthor;
    }

    return await Author.create(authorData as any);
  }

  static async findOrCreateAuthor(authorData: AuthorCreationAttributes): Promise<[Author, boolean]> {
    return await Author.findOrCreate({
      where: {
        name: authorData.name,
        surname: authorData.surname,
      },
      defaults: authorData,
    } as any);
  }
}