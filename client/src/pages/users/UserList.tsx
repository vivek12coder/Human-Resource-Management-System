import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Badge, Table, Modal, Select } from '../../components/ui';
import type { User, Company, Branch, Employee } from '../../types';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['ADMIN', 'JUNIOR_ADMIN', 'EMPLOYEE']),
  company: z.string().optional(),
  branch: z.string().optional(),
  employee: z.string().optional(),
});

type UserForm = z.infer<typeof userSchema>;

const UserList = () => {
  const { user: currentUser, hasRole } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formModal, setFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });

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
      role: hasRole('SUPER_ADMIN') ? 'ADMIN' : hasRole('ADMIN') ? 'JUNIOR_ADMIN' : 'EMPLOYEE',
    },
  });

  const selectedRole = watch('role');
  const selectedCompany = watch('company');
  const selectedEmployeeId = watch('employee');

  const getEntityId = (value: unknown) =>
    typeof value === 'object' && value !== null ? (value as { _id?: string })._id : (value as string | undefined);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const query = hasRole('SUPER_ADMIN') ? '?role=ADMIN' : '';
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
    if (!hasRole('JUNIOR_ADMIN')) return;
    try {
      const response = await api.get('/employees/dropdown');
      setEmployees(response.data.data || []);
    } catch {
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
    fetchBranches();
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasRole('SUPER_ADMIN')) return;
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany]);

  const selectedEmployee = employees.find((e) => e._id === selectedEmployeeId);

  useEffect(() => {
    if (!hasRole('JUNIOR_ADMIN') || !selectedEmployee) return;
    setValue('name', `${selectedEmployee.firstName} ${selectedEmployee.lastName}`);
    setValue('email', selectedEmployee.email);
    setValue('role', 'EMPLOYEE');
  }, [hasRole, selectedEmployee, setValue]);

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setValue('name', u.name);
    setValue('email', u.email);
    setValue('role', u.role as 'ADMIN' | 'JUNIOR_ADMIN' | 'EMPLOYEE');
    setValue('company', getEntityId(u.company as unknown));
    setValue('branch', getEntityId((u as User & { branch?: unknown }).branch));
    setValue('employee', getEntityId((u as User & { employee?: unknown }).employee));
    setFormModal(true);
  };

  const closeFormModal = () => {
    setFormModal(false);
    setEditingUser(null);
    reset({ role: hasRole('SUPER_ADMIN') ? 'ADMIN' : hasRole('ADMIN') ? 'JUNIOR_ADMIN' : 'EMPLOYEE' });
  };

  const onSubmit = async (data: UserForm) => {
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        role: data.role,
      };

      if (!editingUser || data.password) payload.password = data.password;

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
        if (!data.branch) {
          toast.error('Please select a branch');
          return;
        }
        payload.role = 'JUNIOR_ADMIN';
        payload.branch = data.branch;
        payload.permissions = ['EMPLOYEE_CREATE', 'EMPLOYEE_VIEW', 'EMPLOYEE_UPDATE', 'ATTENDANCE_VIEW', 'ATTENDANCE_MARK'];
      }

      if (hasRole('JUNIOR_ADMIN')) {
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
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;
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
    if (hasRole('ADMIN')) return [{ value: 'JUNIOR_ADMIN', label: 'Branch Admin' }];
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
        <Badge variant={u.role === 'ADMIN' ? 'primary' : u.role === 'JUNIOR_ADMIN' ? 'info' : 'success'} size="sm">
          {u.role === 'ADMIN' ? 'Company Admin' : u.role === 'JUNIOR_ADMIN' ? 'Branch Admin' : 'Employee'}
        </Badge>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (u: User) => <span className="font-medium text-slate-700 dark:text-slate-300">{typeof u.company === 'object' ? u.company?.name : '-'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (u: User) => <Badge variant={u.isActive ? 'success' : 'danger'} size="sm">{u.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u: User) =>
        u._id !== currentUser?._id ? (
          <div className="flex items-center gap-2">
            <button onClick={() => openEditModal(u)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={() => setDeleteModal({ open: true, user: u })} className="p-2 rounded-lg hover:bg-danger/10 text-danger transition-colors">
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
              : hasRole('JUNIOR_ADMIN')
                ? 'Create employee login credentials'
                : 'Create and manage admin users'}
          </p>
        </div>
        {(hasRole('SUPER_ADMIN') || hasRole('ADMIN') || hasRole('JUNIOR_ADMIN')) && (
          <Button
            onClick={() => setFormModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="animate-fadeIn"
            style={{ animationDelay: '100ms' }}
          >
            Create User
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
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{users.filter((u) => u.role === 'ADMIN').length}</p>
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
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{users.filter((u) => u.role === 'JUNIOR_ADMIN').length}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Admins</p>
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

      <Modal isOpen={formModal} onClose={closeFormModal} title={editingUser ? 'Edit User' : 'Create User'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full Name" error={errors.name?.message} {...register('name')} readOnly={hasRole('JUNIOR_ADMIN')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} readOnly={hasRole('JUNIOR_ADMIN')} />
          <Input
            label={editingUser ? 'Password (optional)' : 'Password'}
            type="password"
            error={errors.password?.message}
            {...register('password')}
          />

          <Select label="Role" options={getRoleOptions()} error={errors.role?.message} {...register('role')} />

          {hasRole('JUNIOR_ADMIN') && (
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
              label="Branch"
              options={branchOptions}
              placeholder="Select branch"
              error={errors.branch?.message}
              {...register('branch')}
            />
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeFormModal}>Cancel</Button>
            <Button type="submit">{editingUser ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, user: null })} title="Delete User" size="sm">
        <div className="space-y-4">
          <p className="text-slate-500">
            Delete <span className="font-bold text-slate-900 dark:text-slate-100">{deleteModal.user?.name}</span>?
          </p>
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setDeleteModal({ open: false, user: null })}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserList;
