import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarOff,
  Wallet,
  Building2,
  GitBranch,
  Briefcase,
  Award,
  Settings,
  Clock,
  CalendarDays,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../ui/sidebar';

const AppSidebar = () => {
  const { hasRole } = useAuthStore();

  const menuSections = [
    {
      title: 'Main',
      items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' }],
    },
    {
      title: 'Workforce',
      items: [
        ...(hasRole('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN', 'HR')
          ? [{ icon: Users, label: 'Employees', path: '/employees' }]
          : []),

        { icon: UserCheck, label: 'Attendance', path: '/attendance' },
        { icon: CalendarOff, label: 'Leave', path: '/leave' },
        { icon: Wallet, label: 'Payroll', path: '/payroll' },
      ],
    },
    {
      title: 'Scheduling',
      items: [
        ...(hasRole('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN', 'HR')
          ? [
            { icon: Clock, label: 'Shifts', path: '/shifts' },
            { icon: CalendarDays, label: 'Company Roster', path: '/roster' },
          ]
          : []),
      ],
    },
    {
      title: 'Organization',
      items: [
        ...(hasRole('SUPER_ADMIN') ? [{ icon: Building2, label: 'Companies', path: '/companies' }] : []),
        ...(hasRole('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN', 'HR')
          ? [{ icon: GitBranch, label: 'Branches', path: '/branches' }]
          : []),
        ...(hasRole('SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_ADMIN', 'JUNIOR_ADMIN')
          ? [
            { icon: Briefcase, label: 'Departments', path: '/departments' },
            { icon: Award, label: 'Designations', path: '/designations' },
          ]
          : []),
      ],
    },
    {
      title: 'Administration',
      items: [
        ...(hasRole('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN')
          ? [{ icon: Users, label: 'Users', path: '/users' }]
          : []),
        { icon: Settings, label: 'Settings', path: '/settings' },
      ],
    },
  ];

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 via-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-teal-500/30 shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight">
              HRM<span className="text-teal-500">Pro</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dashboard</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuSections.map((section, idx) =>
          section.items.length > 0 ? (
            <SidebarGroup key={idx}>
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <NavLink to={item.path}>
                      {({ isActive }) => (
                        <SidebarMenuButton isActive={isActive} tooltip={item.label}>
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ) : null
        )}
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
};

export default AppSidebar;
