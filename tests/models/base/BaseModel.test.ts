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
    it('should return correct base attributes without id', () => {
      class TestJunctionModel extends BaseModel<any> {
        static testGetBaseAttributes() {
          return super.getBaseAttributes();
        }
      }

      const attributes = TestJunctionModel.testGetBaseAttributes();

      expect(attributes).not.toHaveProperty('id');
      expect(attributes).toHaveProperty('creationDate');
      expect(attributes).toHaveProperty('updateDate');

      expect(attributes.creationDate.type).toBe(DataTypes.DATE);
      expect(attributes.updateDate.type).toBe(DataTypes.DATE);
    });
  });

  describe('getBaseOptions', () => {
    it('should return correct base options', () => {
      class TestJunctionModel extends BaseModel<any> {
        static testGetBaseOptions(sequelize: Sequelize, tableName: string) {
          return super.getBaseOptions(sequelize, tableName);
        }
      }

      const options = TestJunctionModel.testGetBaseOptions(sequelize, 'test_junction');

      expect(options.sequelize).toBe(sequelize);
      expect(options.tableName).toBe('test_junction');
      expect(options.timestamps).toBe(true);
      expect(options.underscored).toBe(true);
      expect(options.createdAt).toBe('creation_date');
      expect(options.updatedAt).toBe('update_date');
    });
  });
});