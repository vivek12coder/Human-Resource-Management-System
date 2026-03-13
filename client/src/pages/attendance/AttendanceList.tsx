import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  LogIn,
  LogOut,
  Download,
  UserCheck,
  UserX,
  Coffee,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button, Card, Input, Badge, Table, Select } from '../../components/ui';
import type { Attendance } from '../../types';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const AttendanceList = () => {
  const { hasRole, user } = useAuthStore();
  const [filters, setFilters] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    status: '',
  });
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);

  const isEmployee = user?.role === 'EMPLOYEE';

  const { data: attendances = [], isLoading: isLoadingAttendances, refetch: refetchAttendances } = useQuery({
    queryKey: ['attendances', filters.startDate, filters.endDate, filters.status, hasRole, isEmployee],
    queryFn: async () => {
      if (hasRole('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN')) {
        const params = new URLSearchParams({
          startDate: filters.startDate,
          endDate: filters.endDate,
          ...(filters.status && { status: filters.status }),
        });
        const response = await api.get(`/attendance?${params}`);
        return response.data.data.attendances || response.data.data.data || response.data.data || [];
      } else {
        const date = new Date(filters.startDate || new Date());
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const response = await api.get(`/attendance/my?month=${month}&year=${year}`);
        return response.data.data.attendances || [];
      }
    }
  });

  const { data: todayAttendance, refetch: refetchToday } = useQuery({
    queryKey: ['todayAttendance', isEmployee],
    queryFn: async () => {
      const response = await api.get('/attendance/today');
      return response.data.data;
    },
    enabled: isEmployee,
  });

  const isLoading = isLoadingAttendances;

  const handleCheckIn = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setCheckInLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          await api.post('/attendance/check-in', {
            checkInMethod: 'Web',
            checkInLocation: { latitude, longitude },
          });
          toast.success('Checked in successfully!');
          refetchToday();
          refetchAttendances();
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          toast.error(err.response?.data?.message || 'Failed to check in');
        } finally {
          setCheckInLoading(false);
        }
      },
      (_error) => {
        setCheckInLoading(false);
        toast.error('Please enable location services to check in');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleCheckOut = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setCheckOutLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          await api.post('/attendance/check-out', {
            checkOutMethod: 'Web',
            checkOutLocation: { latitude, longitude },
          });
          toast.success('Checked out successfully!');
          refetchToday();
          refetchAttendances();
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          toast.error(err.response?.data?.message || 'Failed to check out');
        } finally {
          setCheckOutLoading(false);
        }
      },
      (_error) => {
        setCheckOutLoading(false);
        toast.error('Please enable location services to check out');
      },
      { enableHighAccuracy: true }
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'primary'> = {
      Present: 'success',
      Absent: 'danger',
      'Half-Day': 'warning',
      Late: 'warning',
      'On-Leave': 'info',
      Holiday: 'primary',
      'Week-Off': 'primary',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (attendance: Attendance) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {attendance.employee?.firstName?.charAt(0)}
            {attendance.employee?.lastName?.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              {attendance.employee?.firstName} {attendance.employee?.lastName}
            </p>
            <p className="text-xs text-slate-500">
              {attendance.employee?.employeeId}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (attendance: Attendance) => (
        <span className="text-slate-700 dark:text-slate-300">{format(new Date(attendance.date), 'dd MMM yyyy')}</span>
      ),
    },
    {
      key: 'checkIn',
      header: 'Check In',
      render: (attendance: Attendance) => (
        <div className="flex items-center gap-2">
          <LogIn className="w-4 h-4 text-green-500" />
          <span className="text-slate-700 dark:text-slate-300">
            {attendance.checkIn
              ? format(new Date(attendance.checkIn), 'hh:mm a')
              : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'checkOut',
      header: 'Check Out',
      render: (attendance: Attendance) => (
        <div className="flex items-center gap-2">
          <LogOut className="w-4 h-4 text-danger" />
          <span className="text-slate-700 dark:text-slate-300">
            {attendance.checkOut
              ? format(new Date(attendance.checkOut), 'hh:mm a')
              : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'workingHours',
      header: 'Working Hours',
      render: (attendance: Attendance) => (
        <span className="text-slate-700 dark:text-slate-300 font-medium">
          {attendance.workingHours
            ? `${attendance.workingHours.toFixed(1)} hrs`
            : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (attendance: Attendance) => getStatusBadge(attendance.status),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-fadeIn">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Attendance
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Track and manage employee attendance
          </p>
        </div>
        <div className="flex items-center gap-3 animate-fadeIn" style={{ animationDelay: '100ms' }}>
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
            Export
          </Button>
        </div>
      </div>

      {isEmployee && (
        <Card className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Today's Attendance
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  {format(new Date(), 'EEEE, dd MMMM yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {todayAttendance ? (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Check In</p>
                    <p className="text-lg font-bold text-green-500">
                      {todayAttendance.checkIn
                        ? format(new Date(todayAttendance.checkIn), 'hh:mm a')
                        : '-'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Check Out</p>
                    <p className="text-lg font-bold text-danger">
                      {todayAttendance.checkOut
                        ? format(new Date(todayAttendance.checkOut), 'hh:mm a')
                        : '-'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                    {getStatusBadge(todayAttendance.status)}
                  </div>
                  {!todayAttendance.checkOut && todayAttendance.checkIn && (
                    <Button
                      variant="danger"
                      onClick={handleCheckOut}
                      isLoading={checkOutLoading}
                      leftIcon={<LogOut className="w-4 h-4" />}
                    >
                      Check Out
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleCheckIn}
                  isLoading={checkInLoading}
                  leftIcon={<LogIn className="w-4 h-4" />}
                  size="lg"
                >
                  Check In
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {attendances.filter((a: any) => a.status === 'Present').length}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Present</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center">
              <UserX className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {attendances.filter((a: any) => a.status === 'Absent').length}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Absent</p>
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
                {attendances.filter((a: any) => a.status === 'Late').length}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Late</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '350ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {attendances.filter((a: any) => a.status === 'On-Leave').length}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">On Leave</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & Table (Admin Only) */}
      {hasRole('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN') && (
        <>
          <Card className="animate-fadeIn" style={{ animationDelay: '400ms' }}>
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                type="date"
                label="Start Date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
              <Input
                type="date"
                label="End Date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
              <Select
                label="Status"
                options={[
                  { value: 'Present', label: 'Present' },
                  { value: 'Absent', label: 'Absent' },
                  { value: 'Half-Day', label: 'Half-Day' },
                  { value: 'Late', label: 'Late' },
                  { value: 'On-Leave', label: 'On Leave' },
                ]}
                placeholder="All Statuses"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              />
              <div className="flex items-end">
                <Button onClick={() => refetchAttendances()}>Apply Filters</Button>
              </div>
            </div>
          </Card>

          <div className="animate-fadeIn" style={{ animationDelay: '500ms' }}>
            <Table
              data={attendances}
              columns={columns}
              isLoading={isLoading}
              emptyMessage="No attendance records found"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceList;
