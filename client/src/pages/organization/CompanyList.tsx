import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Badge, Table, Modal } from '../../components/ui';
import LocationPicker from '../../components/LocationPicker';
import type { Company } from '../../types';
import api from '../../lib/api';

const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  code: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  adminName: z.string().optional(),
  adminRole: z.literal('ADMIN').optional(),
  adminEmail: z.string().optional(),
  adminPassword: z.string().optional(),
});

type CompanyForm = z.infer<typeof companySchema>;

const parseLatLng = (value?: string | null) => {
  if (!value) return null;
  const matches = value.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return null;
  const lat = Number(matches[0]);
  const lng = Number(matches[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const formatLatLng = (lat: number, lng: number) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

const CompanyList = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formModal, setFormModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; company: Company | null }>({
    open: false,
    company: null,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      adminRole: 'ADMIN',
    },
  });

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/companies');
      const payload = response.data?.data;

      // Backend shape:
      // { success, message, data: { companies, total, page, totalPages } }
      // Keep fallback for older shapes.
      if (Array.isArray(payload?.companies)) {
        setCompanies(payload.companies);
      } else if (Array.isArray(payload)) {
        setCompanies(payload);
      } else if (Array.isArray(payload?.data)) {
        setCompanies(payload.data);
      } else {
        setCompanies([]);
      }
    } catch {
      console.error('Failed to fetch companies');
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanyAdmin = async (companyId: string) => {
    try {
      const response = await api.get(
        `/users?role=ADMIN&company=${encodeURIComponent(companyId)}&limit=1`
      );
      const users = response.data?.data?.users || [];
      const adminUser = users[0];

      setValue('adminName', adminUser?.name || '');
      setValue('adminRole', 'ADMIN');
      setValue('adminEmail', adminUser?.email || '');
      setValue('adminPassword', '');
    } catch {
      setValue('adminName', '');
      setValue('adminRole', 'ADMIN');
      setValue('adminEmail', '');
      setValue('adminPassword', '');
      toast.error('Unable to fetch company admin details');
    }
  };

  const openEditModal = async (company: Company) => {
    setEditingCompany(company);
    setValue('name', company.name);
    setValue('code', company.code);
    setValue('phone', company.phone || '');
    setValue('address', company.address || '');
    setLocation(parseLatLng(company.address));
    setFormModal(true);
    await fetchCompanyAdmin(company._id);
  };

  const closeFormModal = () => {
    setFormModal(false);
    setEditingCompany(null);
    setLocation(null);
    reset({
      adminRole: 'ADMIN',
    });
  };

  const handleLocationChange = (coords: { lat: number; lng: number }) => {
    setLocation(coords);
    setValue('address', formatLatLng(coords.lat, coords.lng), { shouldDirty: true });
  };

  const handleAddressChange = (address: string) => {
    setValue('address', address, { shouldDirty: true });
  };

  const onSubmit = async (data: CompanyForm) => {
    try {
      if (!data.adminName || data.adminName.trim().length < 2) {
        toast.error('Admin name is required');
        return;
      }
      if (!data.adminEmail) {
        toast.error('Admin email is required');
        return;
      }

      if (editingCompany) {
        const updatePayload = {
          name: data.name,
          ...(data.code?.trim() ? { code: data.code.trim() } : {}),
          phone: data.phone,
          address: data.address,
          adminName: data.adminName.trim(),
          adminRole: 'ADMIN' as const,
          adminEmail: data.adminEmail.trim(),
          ...(data.adminPassword ? { adminPassword: data.adminPassword } : {}),
        };
        await api.put(`/companies/${editingCompany._id}`, updatePayload);
        toast.success('Company updated successfully');
      } else {
        if (!data.adminPassword || data.adminPassword.length < 6) {
          toast.error('Admin password must be at least 6 characters');
          return;
        }

        const createPayload = {
          name: data.name,
          phone: data.phone,
          address: data.address,
          adminName: data.adminName.trim(),
          adminRole: 'ADMIN' as const,
          adminEmail: data.adminEmail.trim(),
          adminPassword: data.adminPassword,
          ...(data.code?.trim() ? { code: data.code.trim() } : {}),
        };
        await api.post('/companies', createPayload);
        toast.success('Company created successfully');
      }
      closeFormModal();
      fetchCompanies();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save company');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.company) return;
    try {
      await api.delete(`/companies/${deleteModal.company._id}`);
      toast.success('Company deleted successfully');
      setDeleteModal({ open: false, company: null });
      fetchCompanies();
    } catch {
      toast.error('Failed to delete company');
    }
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'company',
      header: 'Company',
      render: (company: Company) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{company.name}</p>
            <p className="text-xs text-slate-500">{company.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (company: Company) => (
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{company.email || '-'}</p>
          <p className="text-xs text-slate-500">{company.phone || '-'}</p>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (company: Company) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-500" />
          <p className="text-sm text-slate-500 truncate max-w-xs">
            {company.address || '-'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (company: Company) => (
        <Badge variant={company.isActive ? 'success' : 'danger'} size="sm">
          {company.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (company: Company) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(company);
            }}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal({ open: true, company });
            }}
            className="p-2 rounded-lg hover:bg-danger/10 text-slate-500 hover:text-danger transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
            Companies
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage organizations in the system
          </p>
        </div>
        <Button
          onClick={() => setFormModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="animate-fadeIn"
          style={{ animationDelay: '100ms' }}
        >
          Add Company
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-500">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {companies.length}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Companies</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {companies.filter((c) => c.isActive).length}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="animate-fadeIn" style={{ animationDelay: '250ms' }}>
        <Input
          placeholder="Search companies..."
          leftIcon={<Search className="w-5 h-5" />}
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
        />
      </Card>

      {/* Table */}
      <div className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
        <Table
          data={filteredCompanies}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No companies found"
        />
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={formModal}
        onClose={closeFormModal}
        title={editingCompany ? 'Edit Company' : 'Add Company'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Company Name"
            placeholder="Enter company name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Company Code"
            placeholder="Enter company code (optional)"
            error={errors.code?.message}
            {...register('code')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              placeholder="+91 XXXXXXXXXX"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>
          <div className="pt-2">
            <p className="text-sm font-medium text-[var(--color-text)]">
              Company Admin Details
            </p>
          </div>
          <Input
            label="Admin Name"
            placeholder="Enter admin name"
            error={errors.adminName?.message}
            {...register('adminName')}
          />
          <Input
            label="Role"
            value="Company Admin"
            readOnly
          />
          <Input
            label="Admin Email"
            type="email"
            placeholder="admin@company.com"
            error={errors.adminEmail?.message}
            {...register('adminEmail')}
          />
          <Input
            label={editingCompany ? 'Admin Password (Optional)' : 'Admin Password'}
            type="password"
            placeholder={editingCompany ? 'Leave blank to keep same password' : 'Enter password'}
            error={errors.adminPassword?.message}
            {...register('adminPassword')}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Address
            </label>
            <textarea
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              rows={3}
              placeholder="Enter company address"
              {...register('address')}
            />
          </div>
          <LocationPicker
            value={location}
            onChange={handleLocationChange}
            onAddressChange={handleAddressChange}
            label="Live Location"
            helperText="Live location will auto-fill the address."
          />
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={closeFormModal}>
              Cancel
            </Button>
            <Button type="submit">
              {editingCompany ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, company: null })}
        title="Delete Company"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-500">
            Are you sure you want to delete{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {deleteModal.company?.name}
            </span>
            ? This will also delete all associated branches, employees, and data.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ open: false, company: null })}
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

export default CompanyList;

