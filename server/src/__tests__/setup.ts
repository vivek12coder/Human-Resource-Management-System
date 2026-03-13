import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Test database connection
const connectTestDB = async () => {
  try {
    const testDbUrl = process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/hrm_test';
    await mongoose.connect(testDbUrl);
    console.log('Test Database Connected');
  } catch (error) {
    console.error('Test DB connection failed:', error);
    process.exit(1);
  }
};

// Clean up database after each test
const clearTestDB = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('Error clearing test database:', error);
  }
};

// Close database connection
const closeTestDB = async () => {
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error closing test database:', error);
  }
};

// Setup before all tests
beforeAll(async () => {
  await connectTestDB();
});

// Clean up after each test
afterEach(async () => {
  await clearTestDB();
});

// Cleanup after all tests
afterAll(async () => {
  await closeTestDB();
});

// Extend Jest matchers
expect.extend({
  toBeValidObjectId(received) {
    const pass = mongoose.Types.ObjectId.isValid(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid ObjectId`
          : `expected ${received} to be a valid ObjectId`,
      pass,
    };
  },
});

// Global test utilities
global.testUtils = {
  connectTestDB,
  clearTestDB,
  closeTestDB,

  // Helper to create test user
  createTestUser: async (userData = {}) => {
    const User = mongoose.model('User');
    const defaultUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'ADMIN',
      ...userData
    };
    return await User.create(defaultUser);
  },

  // Helper to create test company
  createTestCompany: async (companyData = {}) => {
    const Company = mongoose.model('Company');
    const defaultCompany = {
      name: 'Test Company',
      code: 'TEST001',
      email: 'company@test.com',
      ...companyData
    };
    return await Company.create(defaultCompany);
  },

  // Helper to create test employee
  createTestEmployee: async (employeeData = {}) => {
    const Employee = mongoose.model('Employee');
    const Company = mongoose.model('Company');

    let company = employeeData.company;
    if (!company) {
      company = (await testUtils.createTestCompany())._id;
    }

    const defaultEmployee = {
      employeeId: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      phone: '1234567890',
      company,
      employmentType: 'Full-Time',
      joiningDate: new Date(),
      basicSalary: 50000,
      ...employeeData
    };
    return await Employee.create(defaultEmployee);
  },

  // Helper to generate JWT token for testing
  generateTestToken: (payload = {}) => {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../app/config/env');

    const defaultPayload = {
      id: new mongoose.Types.ObjectId(),
      role: 'ADMIN',
      ...payload
    };

    return jwt.sign(defaultPayload, JWT_SECRET, { expiresIn: '1h' });
  }
};

// Types for global utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidObjectId(): R;
    }
  }

  var testUtils: {
    connectTestDB: () => Promise<void>;
    clearTestDB: () => Promise<void>;
    closeTestDB: () => Promise<void>;
    createTestUser: (userData?: any) => Promise<any>;
    createTestCompany: (companyData?: any) => Promise<any>;
    createTestEmployee: (employeeData?: any) => Promise<any>;
    generateTestToken: (payload?: any) => string;
  };
}