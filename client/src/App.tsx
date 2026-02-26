import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeForm from './pages/employees/EmployeeForm';
import EmployeeSelfDashboard from './pages/employees/EmployeeSelfDashboard';
import AttendanceList from './pages/attendance/AttendanceList';
import LeaveList from './pages/leave/LeaveList';
import PayrollList from './pages/payroll/PayrollList';
import DepartmentList from './pages/organization/DepartmentList';
import DesignationList from './pages/organization/DesignationList';
import CompanyList from './pages/organization/CompanyList';
import BranchList from './pages/organization/BranchList';
import UserList from './pages/users/UserList';
import Settings from './pages/settings/Settings';
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
                <RoleRoute roles={['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN']}>
                  <EmployeeList />
                </RoleRoute>
              }
            />
            <Route
              path="employees/new"
              element={
                <RoleRoute roles={['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN']}>
                  <EmployeeForm />
                </RoleRoute>
              }
            />
            <Route
              path="employees/:id"
              element={
                <RoleRoute roles={['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN']}>
                  <EmployeeForm />
                </RoleRoute>
              }
            />
            <Route
              path="employees/:id/edit"
              element={
                <RoleRoute roles={['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN']}>
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
            <Route path="payroll" element={<PayrollList />} />

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
                <RoleRoute roles={['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN']}>
                  <UserList />
                </RoleRoute>
              }
            />

            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>

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
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { Toaster } from 'react-hot-toast';

// import DashboardLayout from './components/layout/DashboardLayout';
// import Login from './pages/auth/Login';
// import Dashboard from './pages/dashboard/Dashboard';
// import EmployeeList from './pages/employees/EmployeeList';
// import EmployeeForm from './pages/employees/EmployeeForm';
// import AttendanceList from './pages/attendance/AttendanceList';
// import LeaveList from './pages/leave/LeaveList';
// import PayrollList from './pages/payroll/PayrollList';
// import DepartmentList from './pages/organization/DepartmentList';
// import DesignationList from './pages/organization/DesignationList';
// import CompanyList from './pages/organization/CompanyList';
// import BranchList from './pages/organization/BranchList';
// import UserList from './pages/users/UserList';
// import Settings from './pages/settings/Settings';
// import { useAuthStore } from './store/authStore';

// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       refetchOnWindowFocus: false,
//       retry: 1,
//     },
//   },
// });

// const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
//   const { isAuthenticated } = useAuthStore();

//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace />;
//   }

//   return <>{children}</>;
// };

// const RoleRoute = ({
//   children,
//   roles,
// }: {
//   children: React.ReactNode;
//   roles: string[];
// }) => {
//   const { user, hasRole } = useAuthStore();

//   if (!user || !hasRole(...roles)) {
//     return <Navigate to="/dashboard" replace />;
//   }

//   return <>{children}</>;
// };

// function App() {
//   return (
//     <QueryClientProvider client={queryClient}>
//       <Router>
//         <Routes>
//           <Route path="/login" element={<Login />} />

//           {/* Dashboard + sidebar routes */}
//           <Route
//             path="/"
//             element={
//               <ProtectedRoute>
//                 <DashboardLayout />
//               </ProtectedRoute>
//             }
//           >
//             <Route index element={<Navigate to="/dashboard" replace />} />
//             <Route path="dashboard" element={<Dashboard />} />
//             <Route path="employees" element={<EmployeeList />} />
//             <Route path="attendance" element={<AttendanceList />} />
//             <Route path="leave" element={<LeaveList />} />
//             <Route path="payroll" element={<PayrollList />} />
//             <Route path="departments" element={<DepartmentList />} />
//             <Route path="designations" element={<DesignationList />} />
//             <Route
//               path="companies"
//               element={
//                 <RoleRoute roles={['SUPER_ADMIN']}>
//                   <CompanyList />
//                 </RoleRoute>
//               }
//             />
//             <Route path="branches" element={<BranchList />} />
//             <Route
//               path="users"
//               element={
//                 <RoleRoute roles={['SUPER_ADMIN', 'ADMIN']}>
//                   <UserList />
//                 </RoleRoute>
//               }
//             />
//             <Route path="settings" element={<Settings />} />
//           </Route>

//           {/* Full-screen employee forms (no sidebar) */}
//           <Route
//             path="/employees/new"
//             element={
//               <ProtectedRoute>
//                 <EmployeeForm />
//               </ProtectedRoute>
//             }
//           />
//           <Route
//             path="/employees/:id/edit"
//             element={
//               <ProtectedRoute>
//                 <EmployeeForm />
//               </ProtectedRoute>
//             }
//           />

//           <Route path="*" element={<Navigate to="/dashboard" replace />} />
//         </Routes>
//       </Router>

//       <Toaster
//         position="top-right"
//         toastOptions={{
//           duration: 4000,
//           style: {
//             background: 'var(--color-bg-card)',
//             color: 'var(--color-text)',
//             border: '1px solid var(--color-border)',
//           },
//         }}
//       />
//     </QueryClientProvider>
//   );
// }

// export default App;
