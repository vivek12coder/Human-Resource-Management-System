import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, LogIn, LogOut, UserCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card } from '../../components/ui';
import type { Attendance, Employee } from '../../types';
import api from '../../lib/api';type AttendanceSummary = {
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



const EmployeeSelfDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckInLoading, setIsCheckInLoading] = useState(false);
  const [isCheckOutLoading, setIsCheckOutLoading] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);



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
      setAttendanceSummary(attendanceRes.data.data.summary || null);
      setAttendanceList(attendanceRes.data.data.attendances || []);
    } catch {
      toast.error('Failed to load employee dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckIn = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsCheckInLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await api.post('/attendance/check-in', {
            checkInMethod: 'Web',
            checkInLocation: { latitude, longitude },
          });
          setTodayAttendance(response.data.data);
          toast.success('Checked in successfully');
          loadData(); // Re-fetch to update summary
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          toast.error(err.response?.data?.message || 'Failed to check in');
        } finally {
          setIsCheckInLoading(false);
        }
      },
      (_error) => {
        setIsCheckInLoading(false);
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

    setIsCheckOutLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await api.post('/attendance/check-out', {
            checkOutMethod: 'Web',
            checkOutLocation: { latitude, longitude },
          });
          setTodayAttendance(response.data.data);
          toast.success('Checked out successfully');
          loadData(); // Re-fetch to update summary
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          toast.error(err.response?.data?.message || 'Failed to check out');
        } finally {
          setIsCheckOutLoading(false);
        }
      },
      (_error) => {
        setIsCheckOutLoading(false);
        toast.error('Please enable location services to check out');
      },
      { enableHighAccuracy: true }
    );
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCircle2 className="w-5 h-5" />
            My Profile
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            Edit Profile
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-6">
          {employee?.firstName && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">First Name</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{employee.firstName}</p>
            </div>
          )}
          {employee?.lastName && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{employee.lastName}</p>
            </div>
          )}
          {employee?.email && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{employee.email}</p>
            </div>
          )}
          {employee?.phone && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{employee.phone}</p>
            </div>
          )}
          {employee?.dateOfBirth && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date of Birth</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{format(new Date(employee.dateOfBirth), 'dd MMM yyyy')}</p>
            </div>
          )}
          {employee?.gender && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gender</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{employee.gender}</p>
            </div>
          )}
          {employee?.department && typeof employee.department === 'object' && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{'name' in employee.department ? employee.department.name : '-'}</p>
            </div>
          )}
          {employee?.designation && typeof employee.designation === 'object' && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Designation</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{'title' in employee.designation ? employee.designation.title : '-'}</p>
            </div>
          )}
          {employee?.maritalStatus && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Marital Status</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{employee.maritalStatus}</p>
            </div>
          )}
          {employee?.bloodGroup && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Blood Group</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{employee.bloodGroup}</p>
            </div>
          )}
          {(employee?.currentAddress?.street || employee?.currentAddress?.city) && (
            <div className="md:col-span-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Address</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium">
                {[
                  employee.currentAddress?.street,
                  employee.currentAddress?.city,
                  employee.currentAddress?.state,
                  employee.currentAddress?.pincode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}
          {employee?.emergencyContact?.name && (
            <div className="md:col-span-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Emergency Contact</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium">
                {employee.emergencyContact.name} ({employee.emergencyContact.relationship}) - {employee.emergencyContact.phone}
              </p>
            </div>
          )}
        </div>
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
