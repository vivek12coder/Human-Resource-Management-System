import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  UserPlus,
} from 'lucide-react';
import { Button, Card, Input, Badge, Table, Modal, Select } from '../../components/ui';
import type { Employee } from '../../types';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

const EmployeeList = () => {
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; employee: Employee | null }>({
    open: false,
    employee: null,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    employmentType: '',
  });

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(filters.department && { department: filters.department }),
        ...(filters.status && { isActive: filters.status }),
        ...(filters.employmentType && { employmentType: filters.employmentType }),
      });

      const response = await api.get(`/employees?${params}`);
      const payload = response.data?.data;

      if (Array.isArray(payload?.employees)) {
        setEmployees(payload.employees);
        setPagination((prev) => ({
          ...prev,
          total: payload.total || 0,
          page: payload.page || prev.page,
          totalPages: payload.totalPages || 0,
        }));
      } else if (Array.isArray(payload)) {
        setEmployees(payload);
      } else if (Array.isArray(payload?.data)) {
        setEmployees(payload.data);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      toast.error('Failed to load employees');
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [pagination.page, filters]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchEmployees();
  };

  const handleDelete = async () => {
    if (!deleteModal.employee) return;

    try {
      await api.delete(`/employees/${deleteModal.employee._id}`);
      toast.success('Employee deleted successfully');
      setDeleteModal({ open: false, employee: null });
      fetchEmployees();
    } catch {
      toast.error('Failed to delete employee');
    }
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (employee: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 via-emerald-500 to-green-500 flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/25">
            {employee.firstName.charAt(0).toUpperCase()}
            {employee.lastName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              {employee.firstName} {employee.lastName}
            </p>
            <p className="text-xs text-slate-500">
              {employee.employeeId}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (employee: Employee) => (
        <span className="text-slate-500">{employee.email}</span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (employee: Employee) => (
        <span>
          {typeof employee.department === 'object'
            ? employee.department?.name
            : '-'}
        </span>
      ),
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (employee: Employee) => (
        <span>
          {typeof employee.designation === 'object'
            ? employee.designation?.title
            : '-'}
        </span>
      ),
    },
    {
      key: 'employmentType',
      header: 'Type',
      render: (employee: Employee) => (
        <Badge
          variant={
            employee.employmentType === 'Full-Time'
              ? 'primary'
              : employee.employmentType === 'Part-Time'
                ? 'info'
                : employee.employmentType === 'Contract'
                  ? 'warning'
                  : 'default'
          }
          size="sm"
        >
          {employee.employmentType}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (employee: Employee) => (
        <Badge variant={employee.isActive ? 'success' : 'danger'} size="sm">
          {employee.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (employee: Employee) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/employees/${employee._id}`);
            }}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          {hasPermission('EMPLOYEE_UPDATE') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/employees/${employee._id}/edit`);
              }}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {hasRole('SUPER_ADMIN', 'ADMIN') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteModal({ open: true, employee });
              }}
              className="p-2 rounded-lg hover:bg-danger/10 text-slate-500 hover:text-danger transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-fadeIn">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Employees
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage your organization's employees
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-fadeIn w-full md:w-auto" style={{ animationDelay: '100ms' }}>
          <Button variant="outline" className="w-full sm:w-auto" leftIcon={<Download className="w-4 h-4" />}>
            Export
          </Button>
          {hasPermission('EMPLOYEE_CREATE') && (
            <Button
              className="w-full sm:w-auto"
              onClick={() => navigate('/employees/new')}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name, email, or employee ID..."
              leftIcon={<Search className="w-5 h-5" />}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="flex flex-row gap-3">
            <Button
              className="flex-1 sm:flex-none"
              variant="outline"
              leftIcon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={handleSearch}>Search</Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <Select
              label="Status"
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
              placeholder="All Statuses"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            />
            <Select
              label="Employment Type"
              options={[
                { value: 'Full-Time', label: 'Full-Time' },
                { value: 'Part-Time', label: 'Part-Time' },
                { value: 'Contract', label: 'Contract' },
                { value: 'Intern', label: 'Intern' },
                { value: 'Probation', label: 'Probation' },
              ]}
              placeholder="All Types"
              value={filters.employmentType}
              onChange={(e) =>
                setFilters({ ...filters, employmentType: e.target.value })
              }
            />
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() =>
                  setFilters({ department: '', status: '', employmentType: '' })
                }
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Employees</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {pagination.total || employees.length}
          </p>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '350ms' }}>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-green-500 mt-1">
            {employees.filter((e) => e.isActive).length}
          </p>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '400ms' }}>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Full-Time</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {employees.filter((e) => e.employmentType === 'Full-Time').length}
          </p>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '450ms' }}>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">New This Month</p>
          <p className="text-2xl font-bold text-blue-500 mt-1">
            {
              employees.filter(
                (e) =>
                  new Date(e.createdAt).getMonth() === new Date().getMonth()
              ).length
            }
          </p>
        </Card>
      </div>

      {/* Table */}
      <div className="animate-fadeIn" style={{ animationDelay: '500ms' }}>
        <Table
          data={employees}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No employees found"
          onRowClick={(employee: Employee) => navigate(`/employees/${employee._id}`)}
        />
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn" style={{ animationDelay: '600ms' }}>
          <p className="text-sm text-slate-500 text-center sm:text-left">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} employees
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={pagination.page === page ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page }))}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, employee: null })}
        title="Delete Employee"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-500">
            Are you sure you want to delete{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {deleteModal.employee?.firstName} {deleteModal.employee?.lastName}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ open: false, employee: null })}
            >
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

export default EmployeeList;
