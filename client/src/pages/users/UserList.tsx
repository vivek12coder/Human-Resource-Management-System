import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Plus, Edit, Trash2, Search, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Badge, Table, Modal, Select } from '../../components/ui';
import type { User, Company, Branch, Employee } from '../../types';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Intern', 'Probation'] as const;
const STAFF_PERMISSION_OPTIONS = [
  { value: 'EMPLOYEE_CREATE', label: 'Employee Create' },
  { value: 'EMPLOYEE_VIEW', label: 'Employee View' },
  { value: 'EMPLOYEE_UPDATE', label: 'Employee Update' },
  { value: 'ATTENDANCE_VIEW', label: 'Attendance View' },
  { value: 'ATTENDANCE_MARK', label: 'Attendance Mark' },
  { value: 'LEAVE_VIEW', label: 'Leave View' },
  { value: 'LEAVE_APPROVE', label: 'Leave Approve' },
  { value: 'PAYROLL_VIEW', label: 'Payroll View' },
  { value: 'REPORTS_VIEW', label: 'Reports View' },
] as const;

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Phone must be at least 7 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['ADMIN', 'JUNIOR_ADMIN', 'HR', 'EMPLOYEE']),
  company: z.string().optional(),
  branch: z.string().optional(),
  employee: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  employeeDepartment: z.string().optional(),
  employeeDesignation: z.string().optional(),
  employeeJoiningDate: z.string().optional(),
  employeeBasicSalary: z.string().optional(),
  employeeEmploymentType: z.enum(EMPLOYMENT_TYPES).optional(),
});

type UserForm = z.infer<typeof userSchema>;

interface OptionItem {
  value: string;
  label: string;
}

const getEntityId = (value: unknown) =>
  typeof value === 'object' && value !== null ? (value as { _id?: string })._id : (value as string | undefined);

const getRoleLabel = (role: string) => {
  if (role === 'ADMIN') return 'Company Admin';
  if (role === 'JUNIOR_ADMIN') return 'Junior Admin';
  if (role === 'BRANCH_ADMIN') return 'Branch Admin';
  if (role === 'HR') return 'HR';
  return 'Employee';
};

const getRoleBadgeVariant = (role: string): 'primary' | 'info' | 'success' => {
  if (role === 'ADMIN') return 'primary';
  if (role === 'JUNIOR_ADMIN' || role === 'BRANCH_ADMIN') return 'info';
  return 'success';
};

const UserList = () => {
  const { user: currentUser, hasRole } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const isBranchAdmin = hasRole('BRANCH_ADMIN', 'JUNIOR_ADMIN');
  const isJuniorAdmin = hasRole('JUNIOR_ADMIN');

  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<OptionItem[]>([]);
  const [designationOptions, setDesignationOptions] = useState<OptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formModal, setFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: hasRole('SUPER_ADMIN')
        ? 'ADMIN'
        : hasRole('ADMIN')
          ? 'JUNIOR_ADMIN'
          : hasRole('BRANCH_ADMIN', 'JUNIOR_ADMIN')
            ? 'HR'
            : 'EMPLOYEE',
      employeeEmploymentType: 'Full-Time',
      permissions: [],
    },
  });

  const selectedRole = watch('role');
  const selectedCompany = watch('company');
  const selectedEmployeeId = watch('employee');
  const selectedPermissions = watch('permissions') || [];

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const query = hasRole('SUPER_ADMIN')
        ? '?role=ADMIN'
        : hasRole('ADMIN')
          ? '?role=JUNIOR_ADMIN'
          : '';
      const response = await api.get(`/users${query}`);
      setUsers(response.data.data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    if (!hasRole('SUPER_ADMIN')) return;
    try {
      const response = await api.get('/companies');
      setCompanies(response.data.data.companies || []);
    } catch {
      setCompanies([]);
    }
  };

  const fetchBranches = async () => {
    try {
      const query = hasRole('SUPER_ADMIN') && selectedCompany ? `?company=${selectedCompany}` : '';
      const response = await api.get(`/branches${query}`);
      setBranches(response.data.data.branches || []);
    } catch {
      setBranches([]);
    }
  };

  const fetchEmployees = async () => {
    if (isBranchAdmin) return;
    if (!isJuniorAdmin) return;
    try {
      const response = await api.get('/employees/dropdown');
      setEmployees(response.data.data || []);
    } catch {
      setEmployees([]);
    }
  };

  const fetchDepartmentsDropdown = async () => {
    if (!isBranchAdmin) return;
    try {
      const response = await api.get('/departments/dropdown');
      const departments = (response.data.data || []) as Array<{ _id: string; name: string; code: string }>;
      setDepartmentOptions(departments.map((item) => ({ value: item._id, label: `${item.name} (${item.code})` })));
    } catch {
      setDepartmentOptions([]);
    }
  };

  const fetchDesignationsDropdown = async () => {
    if (!isBranchAdmin) return;
    try {
      const response = await api.get('/designations/dropdown');
      const designations = (response.data.data || []) as Array<{ _id: string; title: string; code: string }>;
      setDesignationOptions(designations.map((item) => ({ value: item._id, label: `${item.title} (${item.code})` })));
    } catch {
      setDesignationOptions([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
    fetchBranches();
    fetchEmployees();
    fetchDepartmentsDropdown();
    fetchDesignationsDropdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const shouldOpenCreate = searchParams.get('create') === '1';
    if (isBranchAdmin && shouldOpenCreate) {
      setFormModal(true);
      const params = new URLSearchParams(searchParams);
      params.delete('create');
      setSearchParams(params, { replace: true });
    }
  }, [isBranchAdmin, searchParams, setSearchParams]);

  useEffect(() => {
    if (!hasRole('SUPER_ADMIN')) return;
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany]);

  // Designations are company-wide (department field is optional on designations).
  // No need to re-fetch on department change.

  const selectedEmployee = employees.find((e) => e._id === selectedEmployeeId);

  useEffect(() => {
    if (isBranchAdmin || !isJuniorAdmin || !selectedEmployee) return;
    setValue('name', `${selectedEmployee.firstName} ${selectedEmployee.lastName}`);
    setValue('email', selectedEmployee.email);
    setValue('phone', selectedEmployee.phone);
    setValue('role', 'EMPLOYEE');
  }, [isJuniorAdmin, selectedEmployee, setValue]);

  const openEditModal = (u: User) => {
    if (isBranchAdmin) return;

    setEditingUser(u);
    setValue('name', u.name);
    setValue('email', u.email);
    setValue('phone', '');
    setValue('role', u.role as 'ADMIN' | 'JUNIOR_ADMIN' | 'HR' | 'EMPLOYEE');
    setValue('company', getEntityId(u.company as unknown));
    setValue('branch', getEntityId((u as User & { branch?: unknown }).branch));
    setValue('employee', getEntityId((u as User & { employee?: unknown }).employee));
    setFormModal(true);
  };

  const closeFormModal = () => {
    setFormModal(false);
    setEditingUser(null);
    reset({
      role: hasRole('SUPER_ADMIN')
        ? 'ADMIN'
        : hasRole('ADMIN')
          ? 'JUNIOR_ADMIN'
          : hasRole('BRANCH_ADMIN', 'JUNIOR_ADMIN')
            ? 'HR'
            : 'EMPLOYEE',
      employeeEmploymentType: 'Full-Time',
      permissions: [],
    });
  };

  const onSubmit = async (data: UserForm) => {
    try {
      if (!editingUser && !data.password) {
        toast.error('Password is required');
        return;
      }

      if (isBranchAdmin) {
        if (editingUser) {
          toast.error('Branch admin can only create staff from this screen');
          return;
        }

        const payload: Record<string, unknown> = {
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: data.role,
        };

        if (data.role === 'HR' || data.role === 'JUNIOR_ADMIN') {
          if (!data.permissions || data.permissions.length === 0) {
            toast.error('Please select at least one permission');
            return;
          }
          payload.permissions = data.permissions;
        }

        if (data.role === 'EMPLOYEE') {
          if (
            !data.employeeDepartment ||
            !data.employeeDesignation ||
            !data.employeeJoiningDate ||
            !data.employeeBasicSalary ||
            !data.employeeEmploymentType
          ) {
            toast.error('Please fill all employee profile fields');
            return;
          }

          const basicSalary = Number(data.employeeBasicSalary);
          if (Number.isNaN(basicSalary) || basicSalary < 0) {
            toast.error('Basic salary must be a valid number');
            return;
          }

          const nameParts = data.name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ' ';

          payload.employee = {
            firstName,
            lastName,
            email: data.email,
            phone: data.phone,
            department: data.employeeDepartment,
            designation: data.employeeDesignation,
            joiningDate: data.employeeJoiningDate,
            basicSalary,
            employmentType: data.employeeEmploymentType,
          };
        }

        const response = await api.post('/branch-admin/create-staff', payload);
        const createdUser = response.data?.data?.user as User | undefined;

        if (createdUser) {
          setUsers((prev) => [createdUser, ...prev]);
        }

        toast.success('Staff created successfully');
        closeFormModal();
        return;
      }

      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        role: data.role,
      };

      if (!editingUser || data.password) payload.password = data.password;
      if (data.phone) payload.phone = data.phone;

      if (hasRole('SUPER_ADMIN')) {
        if (data.role !== 'ADMIN') {
          toast.error('Super admin can create only company admin (ADMIN)');
          return;
        }
        if (!data.company) {
          toast.error('Please select a company');
          return;
        }
        payload.company = data.company;
      }

      if (hasRole('ADMIN')) {
        if (data.role !== 'JUNIOR_ADMIN' && data.role !== 'HR') {
          toast.error('Company admin can create only Junior Admin or HR');
          return;
        }
        if (!data.permissions || data.permissions.length === 0) {
          toast.error('Please select at least one permission');
          return;
        }
        payload.role = data.role;
        if (data.branch) payload.branch = data.branch;
        payload.permissions = data.permissions;
      }

      if (isJuniorAdmin) {
        if (!data.employee) {
          toast.error('Please select an employee');
          return;
        }
        payload.role = 'EMPLOYEE';
        payload.employee = data.employee;
      }

      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', payload);
        toast.success('User created successfully');
      }

      closeFormModal();
      fetchUsers();
      fetchEmployees();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;

    if (isBranchAdmin) {
      toast.error('Branch admin cannot delete users from this screen');
      return;
    }

    try {
      await api.delete(`/users/${deleteModal.user._id}`);
      toast.success('User deleted successfully');
      setDeleteModal({ open: false, user: null });
      fetchUsers();
      fetchEmployees();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const getRoleOptions = () => {
    if (hasRole('SUPER_ADMIN')) return [{ value: 'ADMIN', label: 'Company Admin' }];
    if (hasRole('ADMIN')) {
      return [
        { value: 'JUNIOR_ADMIN', label: 'Junior Admin' },
        { value: 'HR', label: 'HR' },
      ];
    }
    if (isBranchAdmin) {
      return [
        { value: 'HR', label: 'HR' },
        { value: 'JUNIOR_ADMIN', label: 'Junior Admin' },
        { value: 'EMPLOYEE', label: 'Employee' },
      ];
    }
    return [{ value: 'EMPLOYEE', label: 'Employee' }];
  };

  const companyOptions = companies.map((c) => ({ value: c._id, label: `${c.name} (${c.code})` }));
  const branchOptions = branches.map((b) => ({ value: b._id, label: `${b.name} (${b.code})` }));
  const employeeOptions = employees.map((e) => ({ value: e._id, label: `${e.employeeId} - ${e.firstName} ${e.lastName}` }));

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (u: User) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{u.name}</p>
            <p className="text-xs text-slate-500 font-medium">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u: User) => (
        <Badge variant={getRoleBadgeVariant(u.role)} size="sm">
          {getRoleLabel(u.role)}
        </Badge>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (u: User) => (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {typeof u.company === 'object' ? u.company?.name : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u: User) => (
        <Badge variant={u.isActive ? 'success' : 'danger'} size="sm">
          {u.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u: User) =>
        !isBranchAdmin && u._id !== currentUser?._id ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openEditModal(u)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeleteModal({ open: true, user: u })}
              className="p-2 rounded-lg hover:bg-danger/10 text-danger transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-fadeIn">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Management</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {hasRole('SUPER_ADMIN')
              ? 'View company admin users'
              : hasRole('ADMIN')
                ? 'Create and manage Junior Admin and HR users'
                : isBranchAdmin
                  ? 'Create HR, Junior Admin, and Employee staff accounts'
                  : 'Create employee login credentials'}
          </p>
        </div>
        {(hasRole('SUPER_ADMIN') || hasRole('ADMIN') || isJuniorAdmin || isBranchAdmin) && (
          <Button
            onClick={() => setFormModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="animate-fadeIn"
            style={{ animationDelay: '100ms' }}
          >
            {isBranchAdmin ? 'Create Staff' : 'Create User'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{users.length}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Users</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {users.filter((u) => u.role === 'ADMIN').length}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Admins</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {users.filter((u) => u.role === 'JUNIOR_ADMIN').length}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Junior Admins</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
        <Input
          placeholder="Search users by name or email"
          leftIcon={<Search className="w-5 h-5" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Card>

      <div className="animate-fadeIn" style={{ animationDelay: '350ms' }}>
        <Table data={filteredUsers} columns={columns} isLoading={isLoading} emptyMessage="No users found" />
      </div>

      <Modal
        isOpen={formModal}
        onClose={closeFormModal}
        title={editingUser ? 'Edit User' : isBranchAdmin ? 'Create Staff' : 'Create User'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full Name" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
          <Input
            label={editingUser ? 'Password (optional)' : 'Password'}
            type="password"
            error={errors.password?.message}
            {...register('password')}
          />

          <Select label="Role" options={getRoleOptions()} error={errors.role?.message} {...register('role')} />

          {(isBranchAdmin || hasRole('ADMIN')) && (selectedRole === 'HR' || selectedRole === 'JUNIOR_ADMIN') && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Access Permissions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STAFF_PERMISSION_OPTIONS.map((permission) => (
                  <label
                    key={permission.value}
                    className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <input
                      type="checkbox"
                      value={permission.value}
                      checked={selectedPermissions.includes(permission.value)}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      {...register('permissions')}
                    />
                    {permission.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {!isBranchAdmin && isJuniorAdmin && (
            <Select
              label="Employee"
              options={employeeOptions}
              placeholder="Select employee"
              error={errors.employee?.message}
              {...register('employee')}
            />
          )}

          {hasRole('SUPER_ADMIN') && selectedRole === 'ADMIN' && (
            <Select
              label="Company"
              options={companyOptions}
              placeholder="Select company"
              error={errors.company?.message}
              {...register('company')}
            />
          )}

          {hasRole('ADMIN') && (
            <Select
              label="Branch (optional)"
              options={branchOptions}
              placeholder={branchOptions.length ? 'Select branch' : 'No branches available'}
              error={errors.branch?.message}
              {...register('branch')}
            />
          )}

          {isBranchAdmin && selectedRole === 'EMPLOYEE' && (
            <>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Employee Profile Configuration</p>
                <div className="space-y-4">
                  <Select
                    label="Department"
                    options={departmentOptions}
                    placeholder="Select department"
                    error={errors.employeeDepartment?.message}
                    {...register('employeeDepartment')}
                  />
                  <Select
                    label="Designation"
                    options={designationOptions}
                    placeholder="Select designation"
                    error={errors.employeeDesignation?.message}
                    {...register('employeeDesignation')}
                  />
                  <Input
                    label="Joining Date"
                    type="date"
                    error={errors.employeeJoiningDate?.message}
                    {...register('employeeJoiningDate')}
                  />
                  <Input
                    label="Basic Salary"
                    type="number"
                    min="0"
                    step="0.01"
                    error={errors.employeeBasicSalary?.message}
                    {...register('employeeBasicSalary')}
                  />
                  <Select
                    label="Employment Type"
                    options={EMPLOYMENT_TYPES.map((value) => ({ value, label: value }))}
                    error={errors.employeeEmploymentType?.message}
                    {...register('employeeEmploymentType')}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeFormModal}>
              Cancel
            </Button>
            <Button type="submit">{editingUser ? 'Update' : isBranchAdmin ? 'Create Staff' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, user: null })}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-500">
            Delete <span className="font-bold text-slate-900 dark:text-slate-100">{deleteModal.user?.name}</span>?
          </p>
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setDeleteModal({ open: false, user: null })}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserList;
