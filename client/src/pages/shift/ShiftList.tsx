import { useState, useEffect } from 'react';
import {
    Clock,
    Plus,
    Edit2,
    Trash2,
    Moon,
    CheckCircle,
    XCircle,
    Coffee,
    Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Badge, Table, Modal, Input, Select } from '../../components/ui';
import type { Shift } from '../../types';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const shiftSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    code: z.string().min(2, 'Code is required'),
    description: z.string().optional(),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    gracePeriodMinutes: z.number().min(0).max(180),
    breakDurationMinutes: z.number().min(0).max(480),
    isNightShift: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    company: z.string().optional(),
});

type ShiftForm = z.infer<typeof shiftSchema>;

const ShiftList = () => {
    const { hasRole } = useAuthStore();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [companies, setCompanies] = useState<{ value: string; label: string }[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editShift, setEditShift] = useState<Shift | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; shift: Shift | null }>({
        open: false,
        shift: null,
    });
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<ShiftForm>({
        resolver: zodResolver(shiftSchema),
        defaultValues: {
            gracePeriodMinutes: 10,
            breakDurationMinutes: 60,
            isNightShift: false,
            isDefault: false,
        },
    });

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
        } catch {
            setCompanies([]);
        }
    };

    const fetchShifts = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/shifts');
            const data = res.data.data;
            if (data && Array.isArray(data.shifts)) setShifts(data.shifts);
            else if (Array.isArray(data)) setShifts(data);
            else setShifts([]);
        } catch {
            toast.error('Failed to fetch shifts');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchShifts();
        if (hasRole('SUPER_ADMIN')) {
            fetchCompanies();
        }
    }, []);

    const openCreate = () => {
        setEditShift(null);
        reset({
            gracePeriodMinutes: 10,
            breakDurationMinutes: 60,
            isNightShift: false,
            isDefault: false,
        });
        setModalOpen(true);
    };

    const openEdit = (shift: Shift) => {
        setEditShift(shift);
        reset({
            name: shift.name,
            code: shift.code,
            description: shift.description || '',
            startTime: shift.startTime,
            endTime: shift.endTime,
            gracePeriodMinutes: shift.gracePeriodMinutes,
            breakDurationMinutes: shift.breakDurationMinutes,
            isNightShift: shift.isNightShift,
            isDefault: shift.isDefault,
            company: typeof shift.company === 'object' ? shift.company._id : (shift.company as string),
        });
        setModalOpen(true);
    };

    const onSubmit = async (data: ShiftForm) => {
        try {
            const payload = { ...data };

            if (hasRole('SUPER_ADMIN')) {
                if (!payload.company) {
                    toast.error('Company is required');
                    return;
                }
            } else {
                // Company is derived from logged-in user on the backend for non-super-admins
                delete (payload as any).company;
            }
            if (editShift) {
                await api.put(`/shifts/${editShift._id}`, payload);
                toast.success('Shift updated successfully!');
            } else {
                await api.post('/shifts', payload);
                toast.success('Shift created successfully!');
            }
            setModalOpen(false);
            reset();
            fetchShifts();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e.response?.data?.message || 'Failed to save shift');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.shift) return;
        try {
            await api.delete(`/shifts/${deleteModal.shift._id}`);
            toast.success('Shift deleted successfully!');
            setDeleteModal({ open: false, shift: null });
            fetchShifts();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e.response?.data?.message || 'Failed to delete shift');
        }
    };

    const toggleStatus = async (shift: Shift) => {
        try {
            await api.patch(`/shifts/${shift._id}/status`, { isActive: !shift.isActive });
            toast.success(`Shift ${!shift.isActive ? 'activated' : 'deactivated'}!`);
            fetchShifts();
        } catch {
            toast.error('Failed to update status');
        }
    };

    const formatTime = (t: string) => {
        const [h, m] = t.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const display = hour % 12 || 12;
        return `${display}:${m} ${ampm}`;
    };

    const columns = [
        {
            key: 'name',
            header: 'Shift',
            render: (s: Shift) => (
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.isNightShift ? 'bg-indigo-500/20' : 'bg-amber-500/20'}`}>
                        {s.isNightShift ? <Moon className="w-5 h-5 text-indigo-500" /> : <Clock className="w-5 h-5 text-amber-500" />}
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            {s.name}
                            {s.isDefault && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">{s.code}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'timing',
            header: 'Timing',
            render: (s: Shift) => (
                <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatTime(s.startTime)} → {formatTime(s.endTime)}
                    </p>
                    <p className="text-xs text-slate-500">Grace: {s.gracePeriodMinutes} min</p>
                </div>
            ),
        },
        {
            key: 'break',
            header: 'Break',
            render: (s: Shift) => (
                <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.breakDurationMinutes} min</span>
                </div>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            render: (s: Shift) => (
                <Badge variant={s.isNightShift ? 'info' : 'warning'} size="sm">
                    {s.isNightShift ? 'Night' : 'Day'}
                </Badge>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (s: Shift) => (
                <button onClick={() => toggleStatus(s)}>
                    <Badge variant={s.isActive ? 'success' : 'danger'} size="sm">
                        {s.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                </button>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (s: Shift) =>
                hasRole('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN') ? (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => openEdit(s)}
                            className="p-2 rounded-lg hover:bg-primary/20 text-primary transition-colors"
                            title="Edit"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setDeleteModal({ open: true, shift: s })}
                            className="p-2 rounded-lg hover:bg-danger/20 text-danger transition-colors"
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Shift Management</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage work schedules and timings</p>
                </div>
                {hasRole('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN') && (
                    <Button onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
                        Create Shift
                    </Button>
                )}
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Shifts', value: shifts.length, color: 'bg-primary/20', icon: <Clock className="w-5 h-5 text-primary" /> },
                    { label: 'Active', value: shifts.filter((s) => s.isActive).length, color: 'bg-green-500/20', icon: <CheckCircle className="w-5 h-5 text-green-500" /> },
                    { label: 'Night Shifts', value: shifts.filter((s) => s.isNightShift).length, color: 'bg-indigo-500/20', icon: <Moon className="w-5 h-5 text-indigo-500" /> },
                    { label: 'Inactive', value: shifts.filter((s) => !s.isActive).length, color: 'bg-danger/20', icon: <XCircle className="w-5 h-5 text-danger" /> },
                ].map((stat, i) => (
                    <Card key={i} variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Shifts Table */}
            <Card className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
                <Table data={shifts} columns={columns} isLoading={isLoading} emptyMessage="No shifts found. Create your first shift!" />
            </Card>

            {/* Create / Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editShift ? 'Edit Shift' : 'Create Shift'} size="lg">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {hasRole('SUPER_ADMIN') && (
                        <Select
                            label="Company"
                            placeholder="Select company"
                            error={errors.company?.message}
                            options={companies}
                            {...register('company')}
                        />
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Shift Name" placeholder="e.g. Morning Shift" error={errors.name?.message} {...register('name')} />
                        <Input label="Shift Code" placeholder="e.g. MS-01" error={errors.code?.message} {...register('code')} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Start Time" type="time" error={errors.startTime?.message} {...register('startTime')} />
                        <Input label="End Time" type="time" error={errors.endTime?.message} {...register('endTime')} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Grace Period (minutes)" type="number" error={errors.gracePeriodMinutes?.message} {...register('gracePeriodMinutes', { valueAsNumber: true })} />
                        <Input label="Break Duration (minutes)" type="number" error={errors.breakDurationMinutes?.message} {...register('breakDurationMinutes', { valueAsNumber: true })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                            <input type="checkbox" className="w-4 h-4 text-primary rounded" {...register('isNightShift')} />
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Night Shift</p>
                                <p className="text-xs text-slate-500">Crosses midnight</p>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                            <input type="checkbox" className="w-4 h-4 text-primary rounded" {...register('isDefault')} />
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Default Shift</p>
                                <p className="text-xs text-slate-500">Used when no shift assigned</p>
                            </div>
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button type="submit">{editShift ? 'Update Shift' : 'Create Shift'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, shift: null })} title="Delete Shift" size="sm">
                <div className="space-y-4">
                    <p className="text-slate-500">
                        Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-slate-100">{deleteModal.shift?.name}</span>? This action cannot be undone.
                    </p>
                    <div className="flex items-center justify-end gap-3">
                        <Button variant="ghost" onClick={() => setDeleteModal({ open: false, shift: null })}>Cancel</Button>
                        <Button variant="danger" onClick={handleDelete}>Delete</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ShiftList;
