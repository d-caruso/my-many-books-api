import { IdBaseModel } from '@/models/base/IdBaseModel';
import { Sequelize, DataTypes } from 'sequelize';

describe('IdBaseModel', () => {
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
    it('should return correct base attributes with id', () => {
      class TestEntityModel extends IdBaseModel<any> {
        static override getTableName(): string {
          return 'test_entity';
        }

        static override getModelName(): string {
          return 'TestEntity';
        }

        static testGetBaseAttributes() {
          return super.getBaseAttributes();
        }
      }

      const attributes = TestEntityModel.testGetBaseAttributes();

      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('creationDate');
      expect(attributes).toHaveProperty('updateDate');

      expect(attributes.id.type).toBe(DataTypes.INTEGER);
      expect(attributes.id.primaryKey).toBe(true);
      expect(attributes.id.autoIncrement).toBe(true);
    });
  });
});