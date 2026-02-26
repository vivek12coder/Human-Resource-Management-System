import { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Badge, Table, Modal } from '../../components/ui';
import type { Department } from '../../types';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const departmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  description: z.string().optional(),
});

type DepartmentForm = z.infer<typeof departmentSchema>;

const DepartmentList = () => {
  const { hasRole } = useAuthStore();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formModal, setFormModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; department: Department | null }>({ open: false, department: null });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<DepartmentForm>({
    resolver: zodResolver(departmentSchema),
  });

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/departments');
      const payload = response.data?.data;

      if (Array.isArray(payload?.departments)) {
        setDepartments(payload.departments);
      } else if (Array.isArray(payload)) {
        setDepartments(payload);
      } else if (Array.isArray(payload?.data)) {
        setDepartments(payload.data);
      } else {
        setDepartments([]);
      }
    } catch {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openEditModal = (department: Department) => {
    setEditingDepartment(department);
    setValue('name', department.name);
    setValue('code', department.code);
    setValue('description', department.description || '');
    setFormModal(true);
  };

  const closeFormModal = () => {
    setFormModal(false);
    setEditingDepartment(null);
    reset();
  };

  const onSubmit = async (data: DepartmentForm) => {
    try {
      if (editingDepartment) {
        await api.put(`/departments/${editingDepartment._id}`, data);
        toast.success('Department updated successfully');
      } else {
        await api.post('/departments', data);
        toast.success('Department created successfully');
      }
      closeFormModal();
      fetchDepartments();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save department');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.department) return;
    try {
      await api.delete(`/departments/${deleteModal.department._id}`);
      toast.success('Department deleted successfully');
      setDeleteModal({ open: false, department: null });
      fetchDepartments();
    } catch {
      toast.error('Failed to delete department');
    }
  };

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'department',
      header: 'Department',
      render: (department: Department) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-500">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{department.name}</p>
            <p className="text-xs text-slate-500">{department.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (department: Department) => (
        <p className="text-sm text-slate-500 truncate max-w-xs">
          {department.description || '-'}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (department: Department) => (
        <Badge variant={department.isActive ? 'success' : 'danger'} size="sm">
          {department.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (department: Department) =>
        hasRole('SUPER_ADMIN', 'ADMIN') ? (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(department);
              }}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteModal({ open: true, department });
              }}
              className="p-2 rounded-lg hover:bg-danger/10 text-slate-500 hover:text-danger transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-fadeIn">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Departments
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage organization departments
          </p>
        </div>
        {hasRole('SUPER_ADMIN', 'ADMIN') && (
          <Button
            onClick={() => setFormModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="animate-fadeIn"
            style={{ animationDelay: '100ms' }}
          >
            Add Department
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-500">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {departments.length}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Departments</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {departments.filter((d) => d.isActive).length}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="animate-fadeIn" style={{ animationDelay: '250ms' }}>
        <Input
          placeholder="Search departments..."
          leftIcon={<Search className="w-5 h-5" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Card>

      {/* Table */}
      <div className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
        <Table
          data={filteredDepartments}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No departments found"
        />
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={formModal}
        onClose={closeFormModal}
        title={editingDepartment ? 'Edit Department' : 'Add Department'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Department Name"
            placeholder="Enter department name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Department Code"
            placeholder="Enter department code"
            error={errors.code?.message}
            {...register('code')}
          />
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1.5">
              Description
            </label>
            <textarea
              className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              rows={3}
              placeholder="Enter description (optional)"
              {...register('description')}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={closeFormModal}>
              Cancel
            </Button>
            <Button type="submit">
              {editingDepartment ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, department: null })}
        title="Delete Department"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-500">
            Are you sure you want to delete{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {deleteModal.department?.name}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ open: false, department: null })}
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

export default DepartmentList;
