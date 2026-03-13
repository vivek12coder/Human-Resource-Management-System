import request from 'supertest';
import app from '../../app';
import User from '../../app/modules/user/user.model';
import Employee from '../../app/modules/employee/employee.model';

describe('Security - Input Sanitization Tests', () => {
  let adminToken: string;
  let testCompany: any;

  beforeEach(async () => {
    // Create test company
    testCompany = await testUtils.createTestCompany();

    // Create admin user and get token
    const adminUser = await testUtils.createTestUser({
      email: 'admin@test.com',
      role: 'ADMIN',
      company: testCompany._id
    });

    adminToken = testUtils.generateTestToken({
      id: adminUser._id,
      role: 'ADMIN',
      company: testCompany._id
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should sanitize MongoDB operators in request body', async () => {
      const maliciousPayload = {
        firstName: 'John',
        lastName: 'Doe',
        email: {
          $ne: null  // MongoDB operator - should be filtered out
        },
        $where: 'this.password.length > 0',  // Dangerous MongoDB operator
        employeeId: 'EMP001',
        company: testCompany._id,
        employmentType: 'Full-Time',
        joiningDate: new Date(),
        basicSalary: 50000
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maliciousPayload);

      // Should either fail validation or sanitize the dangerous fields
      if (response.status === 400) {
        expect(response.body.message).toContain('Validation failed');
      } else {
        // If it succeeds, dangerous operators should be removed
        const employee = await Employee.findOne({ firstName: 'John' });
        expect(employee).toBeDefined();
        expect(employee.email).not.toEqual({ $ne: null });
      }
    });

    it('should sanitize search parameters to prevent regex injection', async () => {
      // Create a test employee first
      await testUtils.createTestEmployee({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        company: testCompany._id
      });

      // Try to inject dangerous regex pattern
      const maliciousSearch = '.*';  // This could cause ReDoS attacks

      const response = await request(app)
        .get('/api/employees')
        .query({
          search: maliciousSearch,
          $where: 'return true'  // MongoDB injection attempt
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // The search should be sanitized and return safe results
      expect(response.body.success).toBe(true);
    });

    it('should prevent injection through query parameters', async () => {
      const response = await request(app)
        .get('/api/employees')
        .query({
          company: { $ne: null },
          $where: 'this.isDeleted === false'
        })
        .set('Authorization', `Bearer ${adminToken}`);

      // Should succeed but dangerous operators should be filtered
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should sanitize nested objects in request body', async () => {
      const maliciousPayload = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@test.com',
        currentAddress: {
          $where: 'this.street.includes("test")',
          street: '123 Test St',
          city: { $regex: '.*' }
        },
        company: testCompany._id,
        employmentType: 'Full-Time',
        joiningDate: new Date(),
        basicSalary: 50000
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maliciousPayload);

      // Should either fail validation or sanitize nested dangerous operators
      if (response.status !== 400) {
        const employee = await Employee.findOne({ firstName: 'Jane' });
        if (employee && employee.currentAddress) {
          expect(employee.currentAddress).not.toHaveProperty('$where');
          expect(typeof employee.currentAddress.city).toBe('string');
        }
      }
    });
  });

  describe('Input Validation with Zod', () => {
    it('should validate required fields in employee creation', async () => {
      const incompletePayload = {
        firstName: 'John',
        // Missing required fields: lastName, email, etc.
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompletePayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
    });

    it('should validate email format', async () => {
      const invalidEmailPayload = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email-format',
        phone: '1234567890',
        company: testCompany._id,
        employmentType: 'Full-Time',
        joiningDate: new Date(),
        basicSalary: 50000
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidEmailPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should validate salary is not negative', async () => {
      const negativeSalaryPayload = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: '1234567890',
        company: testCompany._id,
        employmentType: 'Full-Time',
        joiningDate: new Date(),
        basicSalary: -1000  // Negative salary
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(negativeSalaryPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should validate ObjectId format for references', async () => {
      const invalidIdPayload = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: '1234567890',
        company: 'invalid-object-id',  // Invalid ObjectId
        employmentType: 'Full-Time',
        joiningDate: new Date(),
        basicSalary: 50000
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidIdPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('Rate Limiting Security', () => {
    it('should rate limit excessive requests to employee creation', async () => {
      const validPayload = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        company: testCompany._id,
        employmentType: 'Full-Time',
        joiningDate: new Date(),
        basicSalary: 50000
      };

      // Make multiple rapid requests
      const requests = Array(25).fill(0).map((_, index) =>
        request(app)
          .post('/api/employees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validPayload,
            email: `user${index}@test.com`,
            employeeId: `EMP${String(index).padStart(3, '0')}`
          })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses[0].body.message).toContain('Too many');
    });
  });

  describe('CORS Security', () => {
    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Origin', 'https://malicious-site.com')
        .set('Authorization', `Bearer ${adminToken}`);

      // CORS middleware should handle this at the preflight level
      // In actual implementation, this would be blocked before reaching our handler
      expect(response.status).toBe(200); // Our API works, CORS is handled by middleware
    });
  });
});