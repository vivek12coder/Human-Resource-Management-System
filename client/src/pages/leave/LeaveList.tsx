import { useState, useEffect } from 'react';
import {
  CalendarOff,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Badge, Table, Modal, Input, Select } from '../../components/ui';
import type { Leave } from '../../types';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const leaveSchema = z.object({
  leaveType: z.enum([
    'Casual',
    'Sick',
    'Earned',
    'Unpaid',
    'Maternity',
    'Paternity',
    'Compensatory',
    'Other',
  ]),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  isHalfDay: z.boolean().optional(),
});

type LeaveForm = z.infer<typeof leaveSchema>;

const LeaveList = () => {
  const { hasRole, hasPermission } = useAuthStore();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [myLeaves, setMyLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applyModal, setApplyModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    action: 'approve' | 'reject';
    leave: Leave | null;
  }>({ open: false, action: 'approve', leave: null });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeaveForm>({
    resolver: zodResolver(leaveSchema),
  });

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      if (hasRole('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN')) {
        const response = await api.get('/leaves');
        if (response.data.data) {
          setLeaves(response.data.data);
        } else {
          setLeaves([]);
        }
      }

      const myResponse = await api.get('/leaves/my');
      if (myResponse.data.data) {
        setMyLeaves(myResponse.data.data);
      } else {
        setMyLeaves([]);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to fetch leaves');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [hasRole]);

  const handleApplyLeave = async (data: LeaveForm) => {
    try {
      await api.post('/leaves/apply', data);
      toast.success('Leave application submitted successfully!');
      setApplyModal(false);
      reset();
      fetchLeaves();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to apply for leave');
    }
  };

  const handleApprove = async () => {
    if (!actionModal.leave) return;
    try {
      await api.patch(`/leaves/${actionModal.leave._id}/approve`);
      toast.success('Leave approved successfully!');
      setActionModal({ open: false, action: 'approve', leave: null });
      fetchLeaves();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to approve leave');
    }
  };

  const handleReject = async () => {
    if (!actionModal.leave || rejectionReason.length < 10) {
      toast.error('Rejection reason must be at least 10 characters');
      return;
    }
    try {
      await api.patch(`/leaves/${actionModal.leave._id}/reject`, {
        rejectionReason,
      });
      toast.success('Leave rejected');
      setActionModal({ open: false, action: 'reject', leave: null });
      setRejectionReason('');
      fetchLeaves();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to reject leave');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
      Pending: 'warning',
      Approved: 'success',
      Rejected: 'danger',
      Cancelled: 'info',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getLeaveTypeBadge = (type: string) => {
    const variants: Record<string, 'primary' | 'info' | 'warning' | 'danger'> = {
      Casual: 'primary',
      Sick: 'danger',
      Earned: 'info',
      Unpaid: 'warning',
    };
    return (
      <Badge variant={variants[type] || 'default'} size="sm">
        {type}
      </Badge>
    );
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (leave: Leave) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold">
            {leave.employee?.firstName?.charAt(0)}
            {leave.employee?.lastName?.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              {leave.employee?.firstName} {leave.employee?.lastName}
            </p>
            <p className="text-xs text-slate-500">
              {leave.employee?.employeeId}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'leaveType',
      header: 'Type',
      render: (leave: Leave) => getLeaveTypeBadge(leave.leaveType),
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (leave: Leave) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {format(new Date(leave.startDate), 'dd MMM')} -{' '}
            {format(new Date(leave.endDate), 'dd MMM yyyy')}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            {leave.totalDays} day{leave.totalDays > 1 ? 's' : ''}
            {leave.isHalfDay && ' (Half Day)'}
          </p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (leave: Leave) => (
        <p className="text-sm text-slate-500 truncate max-w-xs">
          {leave.reason}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (leave: Leave) => getStatusBadge(leave.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (leave: Leave) =>
        leave.status === 'Pending' && hasPermission('LEAVE_APPROVE') ? (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActionModal({ open: true, action: 'approve', leave });
              }}
              className="p-2 rounded-lg hover:bg-green-500/20 text-green-500 transition-colors"
              title="Approve"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActionModal({ open: true, action: 'reject', leave });
              }}
              className="p-2 rounded-lg hover:bg-danger/20 text-danger transition-colors"
              title="Reject"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        ) : null,
    },
  ];

  const myLeaveColumns = columns.filter(
    (col) => col.key !== 'employee' && col.key !== 'actions'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-fadeIn">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Leave Management
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Apply and manage leave requests
          </p>
        </div>
        <div className="flex items-center gap-3 animate-fadeIn" style={{ animationDelay: '100ms' }}>
          <Button
            onClick={() => setApplyModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Apply Leave
          </Button>
        </div>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">12</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Casual Leave</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center">
              <CalendarOff className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">6</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sick Leave</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">15</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Earned Leave</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {myLeaves.filter((l) => l.status === 'Pending').length}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending</p>
            </div>
          </div>
        </Card>
      </div>

      {/* My Leaves */}
      <Card className="animate-fadeIn" style={{ animationDelay: '350ms' }}>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          My Leave Applications
        </h3>
        <Table
          data={myLeaves}
          columns={myLeaveColumns}
          isLoading={isLoading}
          emptyMessage="No leave applications found"
        />
      </Card>

      {/* All Leaves (Admin Only) */}
      {hasRole('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN') && (
        <Card className="animate-fadeIn" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              All Leave Requests
            </h3>
            <Badge variant="warning">
              {leaves.filter((l) => l.status === 'Pending').length} Pending
            </Badge>
          </div>
          <Table
            data={leaves}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No leave requests found"
          />
        </Card>
      )}

      {/* Apply Leave Modal */}
      <Modal
        isOpen={applyModal}
        onClose={() => setApplyModal(false)}
        title="Apply for Leave"
        size="md"
      >
        <form onSubmit={handleSubmit(handleApplyLeave)} className="space-y-4">
          <Select
            label="Leave Type"
            options={[
              { value: 'Casual', label: 'Casual Leave' },
              { value: 'Sick', label: 'Sick Leave' },
              { value: 'Earned', label: 'Earned Leave' },
              { value: 'Unpaid', label: 'Unpaid Leave' },
              { value: 'Maternity', label: 'Maternity Leave' },
              { value: 'Paternity', label: 'Paternity Leave' },
              { value: 'Compensatory', label: 'Compensatory Leave' },
              { value: 'Other', label: 'Other' },
            ]}
            placeholder="Select leave type"
            error={errors.leaveType?.message}
            {...register('leaveType')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              error={errors.startDate?.message}
              {...register('startDate')}
            />
            <Input
              label="End Date"
              type="date"
              error={errors.endDate?.message}
              {...register('endDate')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1.5">
              Reason
            </label>
            <textarea
              className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              rows={4}
              placeholder="Explain your reason for leave..."
              {...register('reason')}
            />
            {errors.reason && (
              <p className="mt-1.5 text-sm text-danger">
                {errors.reason.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isHalfDay"
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-primary"
              {...register('isHalfDay')}
            />
            <label
              htmlFor="isHalfDay"
              className="text-sm text-slate-500 dark:text-slate-400"
            >
              Half Day Leave
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setApplyModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Submit Application</Button>
          </div>
        </form>
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal
        isOpen={actionModal.open}
        onClose={() =>
          setActionModal({ open: false, action: 'approve', leave: null })
        }
        title={actionModal.action === 'approve' ? 'Approve Leave' : 'Reject Leave'}
        size="sm"
      >
        <div className="space-y-4">
          {actionModal.action === 'approve' ? (
            <p className="text-slate-500">
              Are you sure you want to approve this leave request for{' '}
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {actionModal.leave?.employee?.firstName}{' '}
                {actionModal.leave?.employee?.lastName}
              </span>
              ?
            </p>
          ) : (
            <>
              <p className="text-slate-500 text-sm">
                Please provide a reason for rejecting this leave request.
              </p>
              <textarea
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                rows={3}
                placeholder="Rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </>
          )}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() =>
                setActionModal({ open: false, action: 'approve', leave: null })
              }
            >
              Cancel
            </Button>
            <Button
              variant={actionModal.action === 'approve' ? 'primary' : 'danger'}
              onClick={
                actionModal.action === 'approve' ? handleApprove : handleReject
              }
            >
              {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LeaveList;
