// Common types
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Employee types
export interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  bloodGroup?: string;
  company?: Company;
  branch?: Branch;
  department?: Department;
  designation?: Designation;
  joiningDate: string;
  basicSalary: number;
  employmentType: 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern' | 'Probation';
  employmentStatus?: 'Active' | 'Resigned' | 'Terminated' | 'On-Notice' | 'Absconding';
  currentAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  permanentAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Company types
export interface Company {
  _id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  isActive: boolean;
  createdAt: string;
}

// Branch types
export interface Branch {
  _id: string;
  name: string;
  code: string;
  company: string | Company;
  address?: string;
  phone?: string;
  email?: string;
  isHeadOffice?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  isActive: boolean;
}

// Department types
export interface Department {
  _id: string;
  name: string;
  code: string;
  company?: string | Company;
  branch?: string | Branch;
  description?: string;
  isActive: boolean;
}

// Designation types
export interface Designation {
  _id: string;
  title: string;
  code: string;
  company?: string | Company;
  department?: string | Department;
  level?: number;
  description?: string;
  isActive: boolean;
}

// Attendance types
export interface Attendance {
  _id: string;
  employee: Employee;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'Present' | 'Absent' | 'Half-Day' | 'Late' | 'On-Leave' | 'Holiday' | 'Week-Off';
  workingHours?: number;
  totalHours?: number;
  overtime?: number;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  checkInMethod?: 'Mobile' | 'Biometric' | 'Web' | 'Manual';
  checkOutMethod?: 'Mobile' | 'Biometric' | 'Web' | 'Manual';
  notes?: string;
  createdAt: string;
}

// Leave types
export interface Leave {
  _id: string;
  employee: Employee;
  leaveType: 'Casual' | 'Sick' | 'Earned' | 'Unpaid' | 'Maternity' | 'Paternity' | 'Compensatory' | 'Other';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approvedBy?: string;
  rejectionReason?: string;
  isHalfDay?: boolean;
  halfDayType?: 'First-Half' | 'Second-Half';
  createdAt: string;
}

// Payroll types
export interface Payroll {
  _id: string;
  employee: Employee;
  month: number;
  year: number;
  basicSalary: number;
  earnings: {
    hra?: number;
    conveyance?: number;
    medical?: number;
    special?: number;
    bonus?: number;
    overtime?: number;
    other?: number;
  };
  deductions: {
    pf?: number;
    esi?: number;
    professionalTax?: number;
    tds?: number;
    loanRecovery?: number;
    other?: number;
  };
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Paid';
  paymentMethod?: 'Bank Transfer' | 'Cash' | 'Cheque';
  paymentDate?: string;
  transactionId?: string;
  createdAt: string;
}

// User types
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'BRANCH_ADMIN' | 'JUNIOR_ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';
  company?: Company;
  branch?: Branch;
  employee?: Employee;
  permissions?: string[];
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: string;
}

// Shift types
export interface Shift {
  _id: string;
  company: string | Company;
  branch?: string | Branch;
  name: string;
  code: string;
  description?: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  breakDurationMinutes: number;
  weeklyOff: string[];
  isNightShift: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

// Roster types
export interface Roster {
  _id: string;
  company: string | Company;
  branch?: string | Branch;
  employee: Employee;
  shift?: Shift;
  rosterDate: string;
  status: 'Scheduled' | 'Week-Off' | 'On-Leave' | 'Holiday';
  notes?: string;
  isPublished: boolean;
  createdAt: string;
}

// Dashboard types
export interface DashboardStats {
  totalEmployees: number;
  totalDepartments: number;
  totalCompanies?: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingLeaves: number;
  totalPayroll?: number;
}
