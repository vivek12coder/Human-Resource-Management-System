import { useEffect, useMemo, useState } from 'react';
import { Building2, GitBranch, ShieldCheck, Users, UserCheck, CalendarOff, DollarSign, Briefcase } from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import EmployeeSelfDashboard from '../employees/EmployeeSelfDashboard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DashboardPayload = Record<string, any>;

const StatCard = ({ title, value, icon, colorClass = "bg-primary/20 text-primary" }: { title: string; value: string | number; icon: React.ReactNode, colorClass?: string }) => (
  <Card padding="sm" variant="stat">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      </div>
    </div>
  </Card>
);

const Dashboard = () => {
  const { user, hasRole } = useAuthStore();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const endpoint = hasRole('SUPER_ADMIN')
          ? '/dashboard/super-admin'
          : hasRole('ADMIN')
            ? '/dashboard/admin'
            : hasRole('JUNIOR_ADMIN')
              ? '/dashboard/branch-admin'
              : '/dashboard/employee';

        const response = await api.get(endpoint);
        setData(response.data.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [hasRole]);

  const stats = useMemo(() => data?.stats || {}, [data]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 animate-pulse">Loading dashboard components...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Card className="max-w-md w-full text-center border-danger/50 bg-danger/10">
          <p className="text-red-500 dark:text-red-400 font-bold">Failed to load dashboard data. Please refresh the page.</p>
        </Card>
      </div>
    );
  }

  if (hasRole('EMPLOYEE')) {
    return <EmployeeSelfDashboard />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          {hasRole('SUPER_ADMIN') ? 'Super Admin Dashboard' : hasRole('ADMIN') ? 'Company Admin Dashboard' : 'Branch Admin Dashboard'}
        </h1>
        <p className="text-slate-500 text-sm">Welcome back, {user?.name}</p>
      </div>

      {hasRole('SUPER_ADMIN') && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <StatCard title="Companies" value={stats.totalCompanies || 0} icon={<Building2 className="w-5 h-5" />} colorClass="bg-blue-500/20 text-blue-500 dark:text-blue-400" />
          <StatCard title="Active Companies" value={stats.activeCompanies || 0} icon={<ShieldCheck className="w-5 h-5" />} colorClass="bg-green-500/20 text-green-500 dark:text-green-400" />
          <StatCard title="Branches" value={stats.totalBranches || 0} icon={<GitBranch className="w-5 h-5" />} colorClass="bg-purple-500/20 text-purple-500 dark:text-purple-400" />
          <StatCard title="Employees" value={stats.totalEmployees || 0} icon={<Users className="w-5 h-5" />} colorClass="bg-orange-500/20 text-orange-500 dark:text-orange-400" />
          <StatCard title="Company Admins" value={stats.totalCompanyAdmins || 0} icon={<ShieldCheck className="w-5 h-5" />} colorClass="bg-pink-500/20 text-pink-500 dark:text-pink-400" />
          <StatCard title="Branch Admins" value={stats.totalBranchAdmins || 0} icon={<ShieldCheck className="w-5 h-5" />} colorClass="bg-indigo-500/20 text-indigo-500 dark:text-indigo-400" />
        </div>
      )}

      {hasRole('ADMIN') && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <StatCard title="Employees" value={stats.totalEmployees || 0} icon={<Users className="w-5 h-5" />} colorClass="bg-blue-500/20 text-blue-500 dark:text-blue-400" />
          <StatCard title="Active Employees" value={stats.activeEmployees || 0} icon={<UserCheck className="w-5 h-5" />} colorClass="bg-green-500/20 text-green-500 dark:text-green-400" />
          <StatCard title="Branches" value={stats.totalBranches || 0} icon={<GitBranch className="w-5 h-5" />} colorClass="bg-purple-500/20 text-purple-500 dark:text-purple-400" />
          <StatCard title="Departments" value={stats.totalDepartments || 0} icon={<Briefcase className="w-5 h-5" />} colorClass="bg-orange-500/20 text-orange-500 dark:text-orange-400" />
          <StatCard title="Branch Admins" value={stats.totalBranchAdmins || 0} icon={<ShieldCheck className="w-5 h-5" />} colorClass="bg-indigo-500/20 text-indigo-500 dark:text-indigo-400" />
          <StatCard title="Pending Leaves" value={stats.pendingLeaves || 0} icon={<CalendarOff className="w-5 h-5" />} colorClass="bg-rose-500/20 text-rose-500 dark:text-rose-400" />
        </div>
      )}

      {hasRole('JUNIOR_ADMIN') && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard title="Employees" value={stats.totalEmployees || 0} icon={<Users className="w-5 h-5" />} colorClass="bg-blue-500/20 text-blue-500 dark:text-blue-400" />
          <StatCard title="Active Employees" value={stats.activeEmployees || 0} icon={<UserCheck className="w-5 h-5" />} colorClass="bg-green-500/20 text-green-500 dark:text-green-400" />
          <StatCard title="Present Today" value={stats.todayAttendance?.present || 0} icon={<UserCheck className="w-5 h-5" />} colorClass="bg-teal-500/20 text-teal-500 dark:text-teal-400" />
          <StatCard title="Absent Today" value={stats.todayAttendance?.absent || 0} icon={<CalendarOff className="w-5 h-5" />} colorClass="bg-rose-500/20 text-rose-500 dark:text-rose-400" />
          <StatCard title="Pending Leaves" value={stats.pendingLeaves || 0} icon={<CalendarOff className="w-5 h-5" />} colorClass="bg-orange-500/20 text-orange-500 dark:text-orange-400" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.isArray(data.recentCompanyAdmins) && (
          <Card>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Company Admins</h3>
            <div className="space-y-3">
              {data.recentCompanyAdmins.length === 0 && <p className="text-sm text-slate-500">No records</p>}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.recentCompanyAdmins.map((admin: any) => (
                <Card key={admin._id} variant="list-item" padding="sm" className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{admin.name}</p>
                    <p className="text-xs text-slate-500">{admin.email}</p>
                  </div>
                  <Badge variant={admin.isActive ? 'success' : 'danger'} size="sm">{admin.isActive ? 'Active' : 'Inactive'}</Badge>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {Array.isArray(data.recentBranchAdmins) && (
          <Card>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Branch Admins</h3>
            <div className="space-y-3">
              {data.recentBranchAdmins.length === 0 && <p className="text-sm text-slate-500">No records</p>}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.recentBranchAdmins.map((admin: any) => (
                <Card key={admin._id} variant="list-item" padding="sm" className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{admin.name}</p>
                    <p className="text-xs text-slate-500">{admin.email}</p>
                  </div>
                  <Badge variant={admin.isActive ? 'success' : 'danger'} size="sm">{admin.isActive ? 'Active' : 'Inactive'}</Badge>
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>

      {stats.monthlyPayroll && (
        <Card>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Monthly Payroll</h3>
          <p className="text-slate-500 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Total: <span className="font-bold text-slate-900 dark:text-slate-100">${stats.monthlyPayroll.totalAmount || 0}</span> | Employees: <span className="font-bold text-slate-900 dark:text-slate-100">{stats.monthlyPayroll.employeesCount || 0}</span>
          </p>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
