// ================================================================
// tests/models/base/BaseModel.test.ts
// ================================================================

import { BaseModel } from '@/models/base/BaseModel';
import { Sequelize, DataTypes } from 'sequelize';

describe('BaseModel', () => {
  let sequelize: Sequelize;

  beforeAll(() => {
    sequelize = new Sequelize('sqlite://memory:', { logging: false });
  });

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }
  });

  describe('getBaseAttributes', () => {
    it('should return correct base attributes', () => {
      // Mock model for testing that extends BaseModel to access protected methods
      class TestModel extends BaseModel<any> {
        static override getTableName(): string {
          return 'test_table';
        }

        static override getModelName(): string {
          return 'TestModel';
        }

        static testGetBaseAttributes() {
          return this.getBaseAttributes();
        }
      }

      const attributes = TestModel.testGetBaseAttributes();

      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('creationDate');
      expect(attributes).toHaveProperty('updateDate');

      expect(attributes.id.type).toBe(DataTypes.INTEGER);
      expect(attributes.id.primaryKey).toBe(true);
      expect(attributes.id.autoIncrement).toBe(true);
    });
  });

  describe('getBaseOptions', () => {
    it('should return correct base options', () => {
      class TestModel extends BaseModel<any> {
        static override getTableName(): string {
          return 'test_table';
        }

        static override getModelName(): string {
          return 'TestModel';
        }

        static testGetBaseOptions(sequelize: Sequelize, tableName: string) {
          return this.getBaseOptions(sequelize, tableName);
        }
      }

      const options = TestModel.testGetBaseOptions(sequelize, 'test_table');

      expect(options.sequelize).toBe(sequelize);
      expect(options.tableName).toBe('test_table');
      expect(options.timestamps).toBe(true);
      expect(options.underscored).toBe(true);
      expect(options.createdAt).toBe('creation_date');
      expect(options.updatedAt).toBe('update_date');
    });
  });

  describe('abstract methods', () => {
    it('should throw error when getTableName is not implemented', () => {
      class IncompleteModel extends BaseModel<any> {
        // Intentionally not implementing getTableName
      }

      expect(() => {
        IncompleteModel.getTableName();
      }).toThrow('getTableName must be implemented by subclass');
    });

    it('should throw error when getModelName is not implemented', () => {
      class IncompleteModel extends BaseModel<any> {
        // Intentionally not implementing getModelName
      }

      expect(() => {
        IncompleteModel.getModelName();
      }).toThrow('getModelName must be implemented by subclass');
    });
  });
});
