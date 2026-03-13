import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/auth/Login';
import { ErrorBoundary } from './components/ui';

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const EmployeeList = lazy(() => import('./pages/employees/EmployeeList'));
const EmployeeForm = lazy(() => import('./pages/employees/EmployeeForm'));
const EmployeeSelfDashboard = lazy(() => import('./pages/employees/EmployeeSelfDashboard'));
const AttendanceList = lazy(() => import('./pages/attendance/AttendanceList'));
const LeaveList = lazy(() => import('./pages/leave/LeaveList'));
const ShiftList = lazy(() => import('./pages/shift/ShiftList'));
const CompanyRoster = lazy(() => import('./pages/shift/CompanyRoster'));
const FaceEnrollment = lazy(() => import('./pages/employees/FaceEnrollment'));
const PayrollList = lazy(() => import('./pages/payroll/PayrollList'));
const DepartmentList = lazy(() => import('./pages/organization/DepartmentList'));
const DesignationList = lazy(() => import('./pages/organization/DesignationList'));
const CompanyList = lazy(() => import('./pages/organization/CompanyList'));
const BranchList = lazy(() => import('./pages/organization/BranchList'));
const UserList = lazy(() => import('./pages/users/UserList'));
const Settings = lazy(() => import('./pages/settings/Settings'));
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RoleRoute = ({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: string[];
}) => {
  const { user, hasRole } = useAuthStore();

  if (!user || !hasRole(...roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { isInitializing, silentRefresh } = useAuthStore();

  React.useEffect(() => {
    silentRefresh();
  }, [silentRefresh]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Reconnecting secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                <Route
                  path="employees"
                  element={
                    <RoleRoute roles={['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN', 'HR']}>
                      <EmployeeList />
                    </RoleRoute>
                  }
                />
                <Route
                  path="employees/new"
                  element={
                    <RoleRoute roles={['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN', 'HR']}>
                      <EmployeeForm />
                    </RoleRoute>
                  }
                />
                <Route
                  path="employees/:id"
                  element={
                    <RoleRoute roles={['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN', 'HR']}>
                      <EmployeeForm />
                    </RoleRoute>
                  }
                />
                <Route
                  path="employees/:id/edit"
                  element={
                    <RoleRoute roles={['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN', 'HR']}>
                      <EmployeeForm />
                    </RoleRoute>
                  }
                />
                <Route
                  path="my-profile"
                  element={
                    <RoleRoute roles={['EMPLOYEE']}>
                      <EmployeeSelfDashboard />
                    </RoleRoute>
                  }
                />

                <Route path="attendance" element={<AttendanceList />} />
                <Route path="leave" element={<LeaveList />} />
                <Route
                  path="face-enrollment"
                  element={
                    <RoleRoute roles={['EMPLOYEE']}>
                      <FaceEnrollment />
                    </RoleRoute>
                  }
                />
                <Route path="payroll" element={<PayrollList />} />

                <Route
                  path="shifts"
                  element={
                    <RoleRoute roles={['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN', 'HR']}>
                      <ShiftList />
                    </RoleRoute>
                  }
                />
                <Route
                  path="roster"
                  element={
                    <RoleRoute roles={['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN', 'HR']}>
                      <CompanyRoster />
                    </RoleRoute>
                  }
                />

                <Route path="departments" element={<DepartmentList />} />
                <Route path="designations" element={<DesignationList />} />


                <Route
                  path="companies"
                  element={
                    <RoleRoute roles={['SUPER_ADMIN']}>
                      <CompanyList />
                    </RoleRoute>
                  }
                />
                <Route path="branches" element={<BranchList />} />

                <Route
                  path="users"
                  element={
                    <RoleRoute roles={['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN']}>
                      <UserList />
                    </RoleRoute>
                  }
                />

                <Route path="settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </Suspense>
      </ErrorBoundary>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-bg-card)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
