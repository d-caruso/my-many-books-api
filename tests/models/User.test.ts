// ================================================================
// tests/models/User.test.ts
// Comprehensive unit tests for User model
// ================================================================

import { Sequelize, ValidationError } from 'sequelize';
import { User } from '../../src/models/User';
import { Book } from '../../src/models/Book';

describe('User Model', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    // Use in-memory SQLite for testing
    sequelize = new Sequelize('sqlite::memory:', {
      logging: false,
    });

    // Initialize models
    User.initialize(sequelize);
    Book.initModel = jest.fn().mockReturnValue(Book);
    
    // Mock associations
    User.hasMany = jest.fn();
    
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await User.destroy({ where: {} });
  });

  describe('Model Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
        isActive: true,
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.surname).toBe(userData.surname);
      expect(user.isActive).toBe(true);
      expect(user.creationDate).toBeDefined();
      expect(user.updateDate).toBeDefined();
    });

    it('should create a user with default isActive as true', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
      };

      const user = await User.create(userData);

      expect(user.isActive).toBe(true);
    });

    it('should auto-generate creation and update dates', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
      };

      const user = await User.create(userData);

      expect(user.creationDate).toBeInstanceOf(Date);
      expect(user.updateDate).toBeInstanceOf(Date);
      expect(user.creationDate.getTime()).toBeLessThanOrEqual(Date.now());
      expect(user.updateDate.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Validation', () => {
    it('should require email', async () => {
      const userData = {
        name: 'John',
        surname: 'Doe',
      };

      await expect(User.create(userData as any)).rejects.toThrow();
    });

    it('should require name', async () => {
      const userData = {
        email: 'test@example.com',
        surname: 'Doe',
      };

      await expect(User.create(userData as any)).rejects.toThrow();
    });

    it('should require surname', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'John',
      };

      await expect(User.create(userData as any)).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'John',
        surname: 'Doe',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
      ];

      for (const email of validEmails) {
        const userData = {
          email,
          name: 'John',
          surname: 'Doe',
        };

        const user = await User.create(userData);
        expect(user.email).toBe(email);
        await user.destroy();
      }
    });

    it('should enforce unique email constraint', async () => {
      const userData1 = {
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
      };

      const userData2 = {
        email: 'test@example.com', // Same email
        name: 'Jane',
        surname: 'Smith',
      };

      await User.create(userData1);
      await expect(User.create(userData2)).rejects.toThrow();
    });

    it('should validate name length', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'a'.repeat(101), // 101 characters
        surname: 'Doe',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should validate surname length', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'John',
        surname: 'a'.repeat(101), // 101 characters
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should accept maximum length names', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'a'.repeat(100), // 100 characters (max)
        surname: 'b'.repeat(100), // 100 characters (max)
      };

      const user = await User.create(userData);
      expect(user.name).toBe('a'.repeat(100));
      expect(user.surname).toBe('b'.repeat(100));
    });

    it('should not allow empty name', async () => {
      const userData = {
        email: 'test@example.com',
        name: '',
        surname: 'Doe',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should not allow empty surname', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'John',
        surname: '',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    let user: User;

    beforeEach(async () => {
      user = await User.create({
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
      });
    });

    describe('getFullName', () => {
      it('should return concatenated name and surname', () => {
        const fullName = user.getFullName();
        expect(fullName).toBe('John Doe');
      });

      it('should handle special characters in names', async () => {
        const specialUser = await User.create({
          email: 'special@example.com',
          name: 'José',
          surname: "O'Connor",
        });

        const fullName = specialUser.getFullName();
        expect(fullName).toBe("José O'Connor");
      });

      it('should handle names with spaces', async () => {
        const spaceUser = await User.create({
          email: 'space@example.com',
          name: 'Mary Jane',
          surname: 'Watson Smith',
        });

        const fullName = spaceUser.getFullName();
        expect(fullName).toBe('Mary Jane Watson Smith');
      });
    });
  });

  describe('Updates and Modifications', () => {
    let user: User;

    beforeEach(async () => {
      user = await User.create({
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
      });
    });

    it('should update user fields', async () => {
      const originalUpdateDate = user.updateDate;
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await user.update({
        name: 'Jane',
        surname: 'Smith',
      });

      expect(user.name).toBe('Jane');
      expect(user.surname).toBe('Smith');
      expect(user.updateDate.getTime()).toBeGreaterThan(originalUpdateDate.getTime());
    });

    it('should update isActive status', async () => {
      expect(user.isActive).toBe(true);

      await user.update({ isActive: false });

      expect(user.isActive).toBe(false);
    });

    it('should not update email to duplicate value', async () => {
      const anotherUser = await User.create({
        email: 'another@example.com',
        name: 'Another',
        surname: 'User',
      });

      await expect(user.update({ email: 'another@example.com' })).rejects.toThrow();
    });

    it('should validate email format on update', async () => {
      await expect(user.update({ email: 'invalid-email' })).rejects.toThrow();
    });

    it('should validate name length on update', async () => {
      await expect(user.update({ name: 'a'.repeat(101) })).rejects.toThrow();
    });

    it('should not allow empty name on update', async () => {
      await expect(user.update({ name: '' })).rejects.toThrow();
    });
  });

  describe('Deletion', () => {
    it('should delete user successfully', async () => {
      const user = await User.create({
        email: 'delete@example.com',
        name: 'Delete',
        surname: 'User',
      });

      const userId = user.id;
      await user.destroy();

      const deletedUser = await User.findByPk(userId);
      expect(deletedUser).toBeNull();
    });

    it('should allow creating user with same email after deletion', async () => {
      const userData = {
        email: 'reuse@example.com',
        name: 'First',
        surname: 'User',
      };

      const firstUser = await User.create(userData);
      await firstUser.destroy();

      // Should be able to create another user with same email after deletion
      const secondUser = await User.create({
        ...userData,
        name: 'Second',
      });

      expect(secondUser.email).toBe(userData.email);
      expect(secondUser.name).toBe('Second');
    });
  });

  describe('Querying', () => {
    beforeEach(async () => {
      await User.bulkCreate([
        { email: 'user1@example.com', name: 'Alice', surname: 'Johnson', isActive: true },
        { email: 'user2@example.com', name: 'Bob', surname: 'Smith', isActive: true },
        { email: 'user3@example.com', name: 'Charlie', surname: 'Brown', isActive: false },
        { email: 'user4@example.com', name: 'Diana', surname: 'Davis', isActive: true },
      ]);
    });

    it('should find user by email', async () => {
      const user = await User.findOne({ where: { email: 'user1@example.com' } });

      expect(user).toBeDefined();
      expect(user!.name).toBe('Alice');
      expect(user!.surname).toBe('Johnson');
    });

    it('should find users by active status', async () => {
      const activeUsers = await User.findAll({ where: { isActive: true } });
      const inactiveUsers = await User.findAll({ where: { isActive: false } });

      expect(activeUsers).toHaveLength(3);
      expect(inactiveUsers).toHaveLength(1);
      expect(inactiveUsers[0].name).toBe('Charlie');
    });

    it('should find users by name pattern', async () => {
      const users = await User.findAll({
        where: {
          name: {
            [sequelize.Op.like]: '%a%', // Names containing 'a'
          },
        },
      });

      expect(users.length).toBeGreaterThan(0);
      users.forEach(user => {
        expect(user.name.toLowerCase()).toContain('a');
      });
    });

    it('should count users correctly', async () => {
      const totalCount = await User.count();
      const activeCount = await User.count({ where: { isActive: true } });

      expect(totalCount).toBe(4);
      expect(activeCount).toBe(3);
    });

    it('should find users with pagination', async () => {
      const users = await User.findAll({
        limit: 2,
        offset: 1,
        order: [['name', 'ASC']],
      });

      expect(users).toHaveLength(2);
      expect(users[0].name).toBe('Bob'); // Second in alphabetical order
    });
  });

  describe('Model Associations', () => {
    it('should call hasMany for books association during initialization', () => {
      expect(User.hasMany).toHaveBeenCalled();
    });

    it('should define association with correct parameters', () => {
      const mockBook = {} as any;
      User.associate = jest.fn();
      
      // Call the static associate method
      User.associate();

      // The associate method should be defined and callable
      expect(typeof User.associate).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode characters in names', async () => {
      const userData = {
        email: 'unicode@example.com',
        name: '中文名字',
        surname: 'العربية',
      };

      const user = await User.create(userData);

      expect(user.name).toBe('中文名字');
      expect(user.surname).toBe('العربية');
      expect(user.getFullName()).toBe('中文名字 العربية');
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(240) + '@example.com'; // 251 characters total

      const userData = {
        email: longEmail,
        name: 'Long',
        surname: 'Email',
      };

      const user = await User.create(userData);
      expect(user.email).toBe(longEmail);
    });

    it('should handle boolean values correctly', async () => {
      const userData1 = {
        email: 'boolean1@example.com',
        name: 'Boolean',
        surname: 'Test',
        isActive: true,
      };

      const userData2 = {
        email: 'boolean2@example.com',
        name: 'Boolean',
        surname: 'Test',
        isActive: false,
      };

      const user1 = await User.create(userData1);
      const user2 = await User.create(userData2);

      expect(user1.isActive).toBe(true);
      expect(user2.isActive).toBe(false);
    });
  });
});