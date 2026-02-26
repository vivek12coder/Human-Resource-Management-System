import { useState, useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Edit,
  Trash2,
  Search,
  MapPin,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Badge, Table, Modal, Select } from '../../components/ui';
import type { Branch } from '../../types';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const branchSchema = z.object({
  name: z.string().min(2, 'Branch name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  company: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  isHeadOffice: z.boolean().optional(),
  adminName: z.string().optional(),
  adminPassword: z.string().optional(),
});

type BranchForm = z.infer<typeof branchSchema>;

const BranchList = () => {
  const { user, hasRole } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formModal, setFormModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; branch: Branch | null }>({
    open: false,
    branch: null,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
  });

  const currentCompanyId =
    typeof user?.company === 'object' ? user.company?._id : user?.company;
  const currentCompanyName =
    typeof user?.company === 'object' ? user.company?.name : 'Your Company';

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/branches');
      const payload = response.data?.data;

      if (Array.isArray(payload?.branches)) {
        setBranches(payload.branches);
      } else if (Array.isArray(payload)) {
        setBranches(payload);
      } else if (Array.isArray(payload?.data)) {
        setBranches(payload.data);
      } else {
        setBranches([]);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to fetch branches');
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies');
      const payload = response.data?.data;
      const data = Array.isArray(payload?.companies)
        ? payload.companies
        : Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
      setCompanies(
        data.map((c: { _id: string; name: string }) => ({
          value: c._id,
          label: c.name,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompanies([]);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchBranches();

    if (user.role === 'SUPER_ADMIN') {
      fetchCompanies();
    } else {
      setCompanies([]);
    }
  }, [user?._id, user?.role]);

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setValue('name', branch.name);
    setValue('code', branch.code);
    setValue('company', typeof branch.company === 'object' ? branch.company._id : branch.company);
    setValue('email', branch.email || '');
    setValue('phone', branch.phone || '');
    setValue('address', branch.address || '');
    setValue('isHeadOffice', branch.isHeadOffice || false);
    setValue('adminName', '');
    setValue('adminPassword', '');
    setFormModal(true);
  };

  const closeFormModal = () => {
    setFormModal(false);
    setEditingBranch(null);
    reset({
      company: hasRole('SUPER_ADMIN') ? '' : currentCompanyId || '',
    });
  };

  const onSubmit = async (data: BranchForm) => {
    try {
      const payload: BranchForm = {
        ...data,
        company: hasRole('SUPER_ADMIN') ? data.company : currentCompanyId || data.company,
      };

      if (!payload.company) {
        toast.error('Company is required');
        return;
      }

      if (editingBranch) {
        await api.put(`/branches/${editingBranch._id}`, payload);
        toast.success('Branch updated successfully');
      } else {
        await api.post('/branches', payload);
        toast.success('Branch created successfully');
      }
      closeFormModal();
      fetchBranches();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save branch');
    }
  };

  useEffect(() => {
    if (!formModal || !user || editingBranch) return;

    if (hasRole('SUPER_ADMIN')) {
      setValue('company', '');
    } else {
      setValue('company', currentCompanyId || '');
    }
  }, [formModal, user?._id, user?.company, editingBranch, hasRole, setValue, currentCompanyId]);

  const handleDelete = async () => {
    if (!deleteModal.branch) return;
    try {
      await api.delete(`/branches/${deleteModal.branch._id}`);
      toast.success('Branch deleted successfully');
      setDeleteModal({ open: false, branch: null });
      fetchBranches();
    } catch {
      toast.error('Failed to delete branch');
    }
  };

  const filteredBranches = branches.filter(
    (branch) =>
      branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'branch',
      header: 'Branch',
      render: (branch: Branch) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-900 dark:text-slate-100">{branch.name}</p>
              {branch.isHeadOffice && (
                <Badge variant="primary" size="sm">
                  HQ
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500">{branch.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (branch: Branch) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span className="text-slate-900 dark:text-slate-100 text-sm font-medium">
            {typeof branch.company === 'object' ? branch.company.name : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (branch: Branch) => (
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{branch.email || '-'}</p>
          <p className="text-xs text-slate-500">{branch.phone || '-'}</p>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (branch: Branch) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-500" />
          <p className="text-sm text-slate-500 truncate max-w-xs">
            {branch.address || '-'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (branch: Branch) => (
        <Badge variant={branch.isActive ? 'success' : 'danger'} size="sm">
          {branch.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (branch: Branch) =>
        hasRole('SUPER_ADMIN', 'ADMIN') ? (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(branch);
              }}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteModal({ open: true, branch });
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
            Branches
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage organization branches
          </p>
        </div>
        {hasRole('SUPER_ADMIN', 'ADMIN') && (
          <Button
            onClick={() => setFormModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="animate-fadeIn"
            style={{ animationDelay: '100ms' }}
          >
            Add Branch
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {branches.length}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Branches</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {branches.filter((b) => b.isActive).length}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-500">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {branches.filter((b) => b.isHeadOffice).length}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Head Offices</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
        <Input
          placeholder="Search branches..."
          leftIcon={<Search className="w-5 h-5" />}
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
        />
      </Card>

      {/* Table */}
      <div className="animate-fadeIn" style={{ animationDelay: '350ms' }}>
        <Table
          data={filteredBranches}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No branches found"
        />
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={formModal}
        onClose={closeFormModal}
        title={editingBranch ? 'Edit Branch' : 'Add Branch'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Branch Name"
            placeholder="Enter branch name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Branch Code"
            placeholder="Enter branch code"
            error={errors.code?.message}
            {...register('code')}
          />
          {hasRole('SUPER_ADMIN') ? (
            <Select
              label="Company"
              options={companies}
              placeholder="Select company"
              error={errors.company?.message}
              {...register('company')}
            />
          ) : (
            <>
              <Input
                label="Company"
                value={currentCompanyName || 'Your Company'}
                readOnly
              />
              <input type="hidden" {...register('company')} />
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="branch@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Phone"
              placeholder="+91 XXXXXXXXXX"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          {/* Branch Admin Credentials */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Branch Admin Credentials
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Admin Name (Optional)"
                placeholder="Manager Name"
                error={errors.adminName?.message}
                {...register('adminName')}
              />
              <Input
                label="Admin Password (Optional)"
                type="password"
                placeholder="Default: Password@123"
                error={errors.adminPassword?.message}
                {...register('adminPassword')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1.5">
              Address
            </label>
            <textarea
              className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              rows={2}
              placeholder="Enter branch address"
              {...register('address')}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isHeadOffice"
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-primary"
              {...register('isHeadOffice')}
            />
            <label
              htmlFor="isHeadOffice"
              className="text-sm text-slate-500 dark:text-slate-400"
            >
              This is the head office
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={closeFormModal}>
              Cancel
            </Button>
            <Button type="submit">
              {editingBranch ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, branch: null })}
        title="Delete Branch"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-500">
            Are you sure you want to delete{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {deleteModal.branch?.name}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ open: false, branch: null })}
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

export default BranchList;
