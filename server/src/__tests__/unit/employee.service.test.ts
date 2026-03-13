import { EmployeeService } from '../../app/modules/employee/employee.service';
import Employee from '../../app/modules/employee/employee.model';
import mongoose from 'mongoose';

describe('Employee Service - Unit Tests', () => {
  let testCompany: any;
  let testBranch: any;
  let testDepartment: any;
  let testDesignation: any;

  beforeEach(async () => {
    // Create test data
    testCompany = await testUtils.createTestCompany();

    const Branch = mongoose.model('Branch');
    testBranch = await Branch.create({
      name: 'Test Branch',
      code: 'TB001',
      company: testCompany._id
    });

    const Department = mongoose.model('Department');
    testDepartment = await Department.create({
      name: 'Engineering',
      code: 'ENG',
      company: testCompany._id
    });

    const Designation = mongoose.model('Designation');
    testDesignation = await Designation.create({
      title: 'Software Developer',
      code: 'SD',
      company: testCompany._id
    });
  });

  describe('getAllEmployees - Aggregation Pipeline Optimization', () => {
    beforeEach(async () => {
      // Create test employees with relationships
      const employees = [
        {
          employeeId: 'EMP001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '1234567890',
          company: testCompany._id,
          branch: testBranch._id,
          department: testDepartment._id,
          designation: testDesignation._id,
          employmentType: 'Full-Time',
          joiningDate: new Date(),
          basicSalary: 50000
        },
        {
          employeeId: 'EMP002',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@test.com',
          phone: '0987654321',
          company: testCompany._id,
          branch: testBranch._id,
          department: testDepartment._id,
          designation: testDesignation._id,
          employmentType: 'Part-Time',
          joiningDate: new Date(),
          basicSalary: 30000
        }
      ];

      await Employee.insertMany(employees);
    });

    it('should return employees with populated relationships using aggregation', async () => {
      const result = await EmployeeService.getAllEmployees({}, { page: 1, limit: 10 });

      expect(result.employees).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);

      const employee = result.employees[0];

      // Verify populated relationships
      expect(employee.company).toBeDefined();
      expect(employee.company.name).toBe('Test Company');
      expect(employee.company.code).toBe('TEST001');

      expect(employee.branch).toBeDefined();
      expect(employee.branch.name).toBe('Test Branch');

      expect(employee.department).toBeDefined();
      expect(employee.department.name).toBe('Engineering');

      expect(employee.designation).toBeDefined();
      expect(employee.designation.title).toBe('Software Developer');
    });

    it('should filter employees by employment type', async () => {
      const result = await EmployeeService.getAllEmployees(
        { employmentType: 'Full-Time' },
        { page: 1, limit: 10 }
      );

      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].firstName).toBe('John');
      expect(result.employees[0].employmentType).toBe('Full-Time');
    });

    it('should paginate results correctly', async () => {
      // Test pagination
      const page1 = await EmployeeService.getAllEmployees({}, { page: 1, limit: 1 });
      const page2 = await EmployeeService.getAllEmployees({}, { page: 2, limit: 1 });

      expect(page1.employees).toHaveLength(1);
      expect(page2.employees).toHaveLength(1);
      expect(page1.employees[0]._id).not.toEqual(page2.employees[0]._id);
      expect(page1.totalPages).toBe(2);
    });

    it('should sort employees by creation date (newest first)', async () => {
      const result = await EmployeeService.getAllEmployees({}, { page: 1, limit: 10 });

      expect(result.employees).toHaveLength(2);

      // Should be sorted by createdAt descending (newest first)
      const firstEmployee = result.employees[0];
      const secondEmployee = result.employees[1];

      expect(new Date(firstEmployee.createdAt).getTime())
        .toBeGreaterThanOrEqual(new Date(secondEmployee.createdAt).getTime());
    });

    it('should handle empty results', async () => {
      const result = await EmployeeService.getAllEmployees(
        { employmentType: 'Contract' },  // No contract employees
        { page: 1, limit: 10 }
      );

      expect(result.employees).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should exclude deleted employees', async () => {
      // Mark one employee as deleted
      await Employee.updateOne(
        { employeeId: 'EMP001' },
        { isDeleted: true }
      );

      const result = await EmployeeService.getAllEmployees({}, { page: 1, limit: 10 });

      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].firstName).toBe('Jane');
    });
  });

  describe('getEmployeeById - Aggregation Pipeline Optimization', () => {
    let testEmployee: any;

    beforeEach(async () => {
      testEmployee = await Employee.create({
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: '1234567890',
        company: testCompany._id,
        branch: testBranch._id,
        department: testDepartment._id,
        designation: testDesignation._id,
        employmentType: 'Full-Time',
        joiningDate: new Date(),
        basicSalary: 50000
      });
    });

    it('should return employee with populated relationships using aggregation', async () => {
      const employee = await EmployeeService.getEmployeeById(testEmployee._id);

      expect(employee).toBeDefined();
      expect(employee.firstName).toBe('John');

      // Verify populated relationships from aggregation
      expect(employee.company).toBeDefined();
      expect(employee.company.name).toBe('Test Company');

      expect(employee.branch).toBeDefined();
      expect(employee.branch.name).toBe('Test Branch');

      expect(employee.department).toBeDefined();
      expect(employee.department.name).toBe('Engineering');

      expect(employee.designation).toBeDefined();
      expect(employee.designation.title).toBe('Software Developer');
    });

    it('should throw error for non-existent employee', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(EmployeeService.getEmployeeById(nonExistentId))
        .rejects.toThrow('Employee not found!');
    });

    it('should throw error for deleted employee', async () => {
      // Mark employee as deleted
      await Employee.updateOne(
        { _id: testEmployee._id },
        { isDeleted: true }
      );

      await expect(EmployeeService.getEmployeeById(testEmployee._id))
        .rejects.toThrow('Employee not found!');
    });

    it('should handle invalid ObjectId format', async () => {
      await expect(EmployeeService.getEmployeeById('invalid-id'))
        .rejects.toThrow();
    });
  });

  describe('createEmployee', () => {
    it('should create employee successfully with valid data', async () => {
      const employeeData = {
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: '1234567890',
        company: testCompany._id,
        employmentType: 'Full-Time',
        joiningDate: new Date(),
        basicSalary: 50000
      };

      const createdBy = new mongoose.Types.ObjectId();
      const employee = await EmployeeService.createEmployee(employeeData, createdBy);

      expect(employee).toBeDefined();
      expect(employee.firstName).toBe('John');
      expect(employee.email).toBe('john@test.com');
      expect(employee.isDeleted).toBe(false);
      expect(employee.createdBy).toEqual(createdBy);
    });

    it('should throw error for duplicate employee ID in same company', async () => {
      const employeeData = {
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: '1234567890',
        company: testCompany._id,
        employmentType: 'Full-Time',
        joiningDate: new Date(),
        basicSalary: 50000
      };

      const createdBy = new mongoose.Types.ObjectId();

      // Create first employee
      await EmployeeService.createEmployee(employeeData, createdBy);

      // Try to create another with same employee ID and company
      await expect(EmployeeService.createEmployee({
        ...employeeData,
        email: 'john2@test.com'  // Different email
      }, createdBy)).rejects.toThrow('Employee with this ID already exists');
    });

    it('should throw error for duplicate email', async () => {
      const employeeData = {
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: '1234567890',
        company: testCompany._id,
        employmentType: 'Full-Time',
        joiningDate: new Date(),
        basicSalary: 50000
      };

      const createdBy = new mongoose.Types.ObjectId();

      // Create first employee
      await EmployeeService.createEmployee(employeeData, createdBy);

      // Try to create another with same email
      await expect(EmployeeService.createEmployee({
        ...employeeData,
        employeeId: 'EMP002'  // Different employee ID
      }, createdBy)).rejects.toThrow('Employee with this email already exists');
    });

    it('should normalize email to lowercase', async () => {
      const employeeData = {
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'JOHN@TEST.COM',  // Uppercase
        phone: '1234567890',
        company: testCompany._id,
        employmentType: 'Full-Time',
        joiningDate: new Date(),
        basicSalary: 50000
      };

      const createdBy = new mongoose.Types.ObjectId();
      const employee = await EmployeeService.createEmployee(employeeData, createdBy);

      expect(employee.email).toBe('john@test.com');  // Should be lowercase
    });
  });
});