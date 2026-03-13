import { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Edit,
  Trash2,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Badge, Table, Modal, Select } from '../../components/ui';
import type { Designation, Company } from '../../types';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const baseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  level: z.string().optional(),
  description: z.string().optional(),
});

const superAdminSchema = baseSchema.extend({
  company: z.string().min(1, 'Company is required'),
});

type DesignationForm = z.infer<typeof superAdminSchema>;

const DesignationList = () => {
  const { hasRole } = useAuthStore();
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formModal, setFormModal] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; designation: Designation | null }>({
    open: false,
    designation: null,
  });

  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const schema = isSuperAdmin ? superAdminSchema : baseSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<DesignationForm>({
    resolver: zodResolver(schema) as any,
  });

  const fetchDesignations = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/designations');
      const payload = response.data?.data;

      if (Array.isArray(payload?.designations)) {
        setDesignations(payload.designations);
      } else if (Array.isArray(payload)) {
        setDesignations(payload);
      } else if (Array.isArray(payload?.data)) {
        setDesignations(payload.data);
      } else {
        setDesignations([]);
      }
    } catch {
      console.error('Failed to fetch designations');
      setDesignations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    if (!isSuperAdmin) return;
    try {
      const response = await api.get('/companies');
      const payload = response.data?.data;
      if (Array.isArray(payload?.companies)) {
        setCompanies(payload.companies);
      } else if (Array.isArray(payload)) {
        setCompanies(payload);
      }
    } catch {
      console.error('Failed to fetch companies');
    }
  };

  useEffect(() => {
    fetchDesignations();
    fetchCompanies();
  }, [isSuperAdmin]);

  const openEditModal = (designation: Designation) => {
    setEditingDesignation(designation);
    setValue('title', designation.title);
    setValue('code', designation.code);
    setValue('level', designation.level?.toString() || '');
    setValue('description', designation.description || '');
    if (designation.company && typeof designation.company === 'object' && '_id' in designation.company) {
      setValue('company', designation.company._id);
    } else if (typeof designation.company === 'string') {
      setValue('company', designation.company);
    }
    setFormModal(true);
  };

  const closeFormModal = () => {
    setFormModal(false);
    setEditingDesignation(null);
    reset();
  };

  const onSubmit = async (data: DesignationForm) => {
    try {
      const payload = {
        ...data,
        level: data.level ? parseInt(data.level) : undefined,
      };

      if (editingDesignation) {
        await api.put(`/designations/${editingDesignation._id}`, payload);
        toast.success('Designation updated successfully');
      } else {
        await api.post('/designations', payload);
        toast.success('Designation created successfully');
      }
      closeFormModal();
      fetchDesignations();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save designation');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.designation) return;
    try {
      await api.delete(`/designations/${deleteModal.designation._id}`);
      toast.success('Designation deleted successfully');
      setDeleteModal({ open: false, designation: null });
      fetchDesignations();
    } catch {
      toast.error('Failed to delete designation');
    }
  };

  const filteredDesignations = designations.filter(
    (desig) =>
      desig.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desig.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'designation',
      header: 'Designation',
      render: (designation: Designation) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{designation.title}</p>
            <p className="text-xs text-slate-500">{designation.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      render: (designation: Designation) => (
        <Badge variant="primary" size="sm">
          Level {designation.level || '-'}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (designation: Designation) => (
        <p className="text-sm text-slate-500 truncate max-w-xs">
          {designation.description || '-'}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (designation: Designation) => (
        <Badge variant={designation.isActive ? 'success' : 'danger'} size="sm">
          {designation.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (designation: Designation) =>
        hasRole('SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'JUNIOR_ADMIN') ? (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(designation);
              }}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteModal({ open: true, designation });
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
            Designations
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage job designations
          </p>
        </div>
        {hasRole('SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'JUNIOR_ADMIN') && (
          <Button
            onClick={() => setFormModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="animate-fadeIn"
            style={{ animationDelay: '100ms' }}
          >
            Add Designation
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {designations.length}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Designations</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {designations.filter((d) => d.isActive).length}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="animate-fadeIn" style={{ animationDelay: '250ms' }}>
        <Input
          placeholder="Search designations..."
          leftIcon={<Search className="w-5 h-5" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Card>

      {/* Table */}
      <div className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
        <Table
          data={filteredDesignations}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No designations found"
        />
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={formModal}
        onClose={closeFormModal}
        title={editingDesignation ? 'Edit Designation' : 'Add Designation'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isSuperAdmin && (
            <Select
              label="Company"
              options={companies.map((c) => ({ value: c._id, label: c.name }))}
              placeholder="Select company"
              error={errors.company?.message}
              {...register('company')}
            />
          )}
          <Input
            label="Designation Title"
            placeholder="Enter designation title"
            error={errors.title?.message}
            {...register('title')}
          />
          <Input
            label="Designation Code"
            placeholder="Enter designation code"
            error={errors.code?.message}
            {...register('code')}
          />
          <Select
            label="Level"
            options={[
              { value: '1', label: 'Level 1 (Entry)' },
              { value: '2', label: 'Level 2' },
              { value: '3', label: 'Level 3' },
              { value: '4', label: 'Level 4' },
              { value: '5', label: 'Level 5 (Mid)' },
              { value: '6', label: 'Level 6' },
              { value: '7', label: 'Level 7' },
              { value: '8', label: 'Level 8 (Senior)' },
              { value: '9', label: 'Level 9' },
              { value: '10', label: 'Level 10 (Executive)' },
            ]}
            placeholder="Select level"
            {...register('level')}
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
              {editingDesignation ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, designation: null })}
        title="Delete Designation"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-500">
            Are you sure you want to delete{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {deleteModal.designation?.title}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ open: false, designation: null })}
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

export default DesignationList;
