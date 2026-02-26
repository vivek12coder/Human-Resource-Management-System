import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar, LogIn, LogOut, Save, UserCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, Input, Select } from '../../components/ui';
import type { Attendance, Employee } from '../../types';
import api from '../../lib/api';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  alternatePhone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']),
  maritalStatus: z.union([z.enum(['Single', 'Married', 'Divorced', 'Widowed']), z.literal('')]).optional(),
  bloodGroup: z.string().optional(),
  currentAddressStreet: z.string().optional(),
  currentAddressCity: z.string().optional(),
  currentAddressState: z.string().optional(),
  currentAddressPincode: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

type AttendanceSummary = {
  totalDays: number;
  present: number;
  absent: number;
  halfDay: number;
  late: number;
  onLeave: number;
  holiday: number;
  weekOff: number;
  totalHours: number;
  averageHours: number;
};

const sanitize = <T extends Record<string, unknown>>(obj: T): T => {
  const entries = Object.entries(obj).map(([key, value]) => {
    if (typeof value === 'string' && value.trim() === '') return [key, undefined];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return [key, sanitize(value as Record<string, unknown>)];
    }
    return [key, value];
  });
  return Object.fromEntries(entries) as T;
};

const EmployeeSelfDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckInLoading, setIsCheckInLoading] = useState(false);
  const [isCheckOutLoading, setIsCheckOutLoading] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      gender: 'Male',
    },
  });

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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [profileRes, todayRes, attendanceRes] = await Promise.all([
        api.get('/employees/me'),
        api.get('/attendance/today').catch(() => ({ data: { data: null } })),
        api.get(`/attendance/my?month=${month}&year=${year}`),
      ]);

      const profile: Employee = profileRes.data.data;
      setEmployee(profile);
      setTodayAttendance(todayRes.data.data);
      setAttendanceSummary(attendanceRes.data.data.summary);
      setAttendanceList(attendanceRes.data.data.attendances || []);

      reset({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        alternatePhone: profile.alternatePhone || '',
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
        gender: profile.gender || 'Male',
        maritalStatus: profile.maritalStatus || undefined,
        bloodGroup: profile.bloodGroup || '',
        currentAddressStreet: profile.currentAddress?.street || '',
        currentAddressCity: profile.currentAddress?.city || '',
        currentAddressState: profile.currentAddress?.state || '',
        currentAddressPincode: profile.currentAddress?.pincode || '',
        emergencyContactName: profile.emergencyContact?.name || '',
        emergencyContactRelationship: profile.emergencyContact?.relationship || '',
        emergencyContactPhone: profile.emergencyContact?.phone || '',
      });
    } catch {
      toast.error('Failed to load employee dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onSubmit = async (data: ProfileForm) => {
    setIsSaving(true);
    try {
      const payload = sanitize({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        alternatePhone: data.alternatePhone,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        maritalStatus: data.maritalStatus || undefined,
        bloodGroup: data.bloodGroup,
        currentAddress: {
          street: data.currentAddressStreet,
          city: data.currentAddressCity,
          state: data.currentAddressState,
          pincode: data.currentAddressPincode,
        },
        emergencyContact: {
          name: data.emergencyContactName,
          relationship: data.emergencyContactRelationship,
          phone: data.emergencyContactPhone,
        },
      });

      await api.patch('/employees/me', payload);
      toast.success('Profile updated successfully');
      await loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckIn = async () => {
    setIsCheckInLoading(true);
    try {
      const response = await api.post('/attendance/check-in', { checkInMethod: 'Web' });
      setTodayAttendance(response.data.data);
      toast.success('Checked in successfully');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to check in');
    } finally {
      setIsCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsCheckOutLoading(true);
    try {
      const response = await api.post('/attendance/check-out', { checkOutMethod: 'Web' });
      setTodayAttendance(response.data.data);
      toast.success('Checked out successfully');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to check out');
    } finally {
      setIsCheckOutLoading(false);
    }
  };

  const latestAttendance = useMemo(
    () => [...attendanceList].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 6),
    [attendanceList]
  );

  if (isLoading) {
    return <div className="text-slate-500">Loading employee dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Employee Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {employee ? `${employee.firstName} ${employee.lastName}` : 'Profile'}
          </p>
        </div>

        <Card padding="sm" className="w-full md:w-auto">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {!todayAttendance?.checkIn && (
              <Button onClick={handleCheckIn} isLoading={isCheckInLoading} leftIcon={<LogIn className="w-4 h-4" />}>
                Check In
              </Button>
            )}
            {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
              <Button
                variant="danger"
                onClick={handleCheckOut}
                isLoading={isCheckOutLoading}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Check Out
              </Button>
            )}
            {todayAttendance && getStatusBadge(todayAttendance.status)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="stat" padding="sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Present</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{attendanceSummary?.present || 0}</p>
        </Card>
        <Card variant="stat" padding="sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Absent</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{attendanceSummary?.absent || 0}</p>
        </Card>
        <Card variant="stat" padding="sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Late</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{attendanceSummary?.late || 0}</p>
        </Card>
        <Card variant="stat" padding="sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Avg Hours</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{attendanceSummary?.averageHours || 0}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <UserCircle2 className="w-5 h-5" />
          My Profile
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="First Name" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Last Name" error={errors.lastName?.message} {...register('lastName')} />
            <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
            <Input label="Alternate Phone" error={errors.alternatePhone?.message} {...register('alternatePhone')} />
            <Input label="Date of Birth" type="date" error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />
            <Select
              label="Gender"
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
              ]}
              error={errors.gender?.message}
              {...register('gender')}
            />
            <Select
              label="Marital Status"
              placeholder="Select status"
              options={[
                { value: 'Single', label: 'Single' },
                { value: 'Married', label: 'Married' },
                { value: 'Divorced', label: 'Divorced' },
                { value: 'Widowed', label: 'Widowed' },
              ]}
              error={errors.maritalStatus?.message}
              {...register('maritalStatus')}
            />
            <Input label="Blood Group" error={errors.bloodGroup?.message} {...register('bloodGroup')} />
            <Input label="Address Street" error={errors.currentAddressStreet?.message} {...register('currentAddressStreet')} />
            <Input label="Address City" error={errors.currentAddressCity?.message} {...register('currentAddressCity')} />
            <Input label="Address State" error={errors.currentAddressState?.message} {...register('currentAddressState')} />
            <Input label="Address Pincode" error={errors.currentAddressPincode?.message} {...register('currentAddressPincode')} />
            <Input label="Emergency Contact Name" {...register('emergencyContactName')} />
            <Input label="Emergency Relationship" {...register('emergencyContactRelationship')} />
            <Input label="Emergency Contact Phone" {...register('emergencyContactPhone')} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
              Save Profile
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Attendance</h2>
        <div className="space-y-3">
          {latestAttendance.length === 0 && <p className="text-sm text-slate-500">No attendance records found</p>}
          {latestAttendance.map((item) => (
            <Card key={item._id} variant="list-item" padding="sm" className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{format(new Date(item.date), 'dd MMM yyyy')}</p>
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-500 font-bold tracking-wide">
                  {item.checkIn ? format(new Date(item.checkIn), 'hh:mm a') : '-'} -{' '}
                  {item.checkOut ? format(new Date(item.checkOut), 'hh:mm a') : '-'}
                </p>
                {getStatusBadge(item.status)}
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default EmployeeSelfDashboard;
