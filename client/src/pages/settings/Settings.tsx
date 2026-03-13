import { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Bell,
  Palette,
  Save,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Button, Card, Input, Select } from '../../components/ui';
import { Separator } from '../../components/ui/separator';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { cn } from '@/lib/utils';

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

/* ── Schemas ─────────────────────────────────────────────── */
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional(),
  alternatePhone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
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

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Minimum 6 characters'),
    newPassword: z.string().min(6, 'Minimum 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

/* ── Notification prefs stored in localStorage ───────────── */
const NOTIF_KEY = 'hrm_notif_prefs';
const defaultNotifPrefs = {
  email: true,
  leave: true,
  attendance: true,
  payroll: true,
};

/* ── Appearance prefs stored in localStorage ─────────────── */
const APPEARANCE_KEY = 'hrm_appearance';
const defaultAppearance = { theme: 'light', language: 'en', dateFormat: 'DD/MM/YYYY' };

function applyTheme(theme: string) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
  } else if (theme === 'light') {
    html.classList.remove('dark');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.classList.toggle('dark', prefersDark);
  }
}

/* ═══════════════════════════════════════════════════════════ */
const Settings = () => {
  const { user, hasRole } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);

  /* password visibility */
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* notification prefs */
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(NOTIF_KEY) || 'null') ?? defaultNotifPrefs;
    } catch {
      return defaultNotifPrefs;
    }
  });

  /* appearance */
  const [appearance, setAppearance] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(APPEARANCE_KEY) || 'null') ?? defaultAppearance;
    } catch {
      return defaultAppearance;
    }
  });

  /* apply saved theme on mount */
  useEffect(() => {
    applyTheme(appearance.theme);
  }, []);

  /* ── Profile form ─────────────── */
  const {
    register: regProfile,
    handleSubmit: submitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', email: user?.email || '', phone: '' },
  });

  const isEmployee = hasRole('EMPLOYEE');

  useEffect(() => {
    if (isEmployee) {
      api.get('/employees/me').then((res) => {
        const profile = res.data.data;
        resetProfile({
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
      }).catch((err) => console.error('Failed to load employee profile', err));
    }
  }, [isEmployee, resetProfile]);

  /* ── Password form ────────────── */
  const {
    register: regPassword,
    handleSubmit: submitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  /* ══ Handlers ══════════════════════════════════════════════ */

  const onProfileSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    try {
      if (isEmployee) {
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
      } else {
        await api.put('/auth/me', { name: data.name, phone: data.phone });
      }
      toast.success('Profile updated successfully ✓');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Profile update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setIsLoading(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully ✓');
      resetPassword();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotifPrefs = () => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifPrefs));
    toast.success('Notification preferences saved ✓');
  };

  const saveAppearance = () => {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
    applyTheme(appearance.theme);
    toast.success('Appearance settings saved ✓');
  };

  const handleThemeChange = (theme: string) => {
    setAppearance((prev: typeof defaultAppearance) => ({ ...prev, theme }));
    applyTheme(theme);
  };

  /* ══ Tabs config ══════════════════════════════════════════ */
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const notifItems = [
    { key: 'email' as const, label: 'Email Notifications', desc: 'Receive notifications via email' },
    { key: 'leave' as const, label: 'Leave Updates', desc: 'Approvals and rejection alerts' },
    { key: 'attendance' as const, label: 'Attendance Reminders', desc: 'Daily check-in / check-out reminders' },
    { key: 'payroll' as const, label: 'Payroll Notifications', desc: 'Salary credit and payslip alerts' },
  ];

  const themeOptions = [
    { id: 'light', label: 'Light', icon: Sun, preview: 'bg-slate-100 border-slate-200' },
    { id: 'dark', label: 'Dark', icon: Moon, preview: 'bg-slate-900 border-slate-700' },
    { id: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-br from-slate-900 to-slate-100' },
  ];

  /* ── Shared eye-toggle button ─── */
  const EyeToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-teal-400 hover:bg-teal-500/10 transition-all hover:scale-110 active:scale-95"
    >
      <span className="relative w-4 h-4 block">
        <Eye className={cn('w-4 h-4 absolute inset-0 transition-all duration-200', show ? 'opacity-0 scale-50 rotate-90' : 'opacity-100 scale-100 rotate-0')} />
        <EyeOff className={cn('w-4 h-4 absolute inset-0 transition-all duration-200', show ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90')} />
      </span>
    </button>
  );

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fadeIn">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar tabs */}
        <Card padding="sm" className="lg:col-span-1 h-fit animate-fadeIn" style={{ animationDelay: '100ms' }}>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-left text-sm font-medium',
                  activeTab === tab.id
                    ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/25'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Content panel */}
        <div className="lg:col-span-3">

          {/* ── Profile ──────────────────────────────────── */}
          {activeTab === 'profile' && (
            <Card className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
              {/* header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-500/20">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Profile Information</h2>
                  <p className="text-xs text-muted-foreground">Update your personal details</p>
                </div>
              </div>

              <form onSubmit={submitProfile(onProfileSubmit)} className="space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-5">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {user?.name.charAt(0).toUpperCase()}
                    </div>
                    <button
                      type="button"
                      onClick={() => toast('Avatar upload coming soon', { icon: '🖼️' })}
                      className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user?.role?.replace('_', ' ')}</p>
                    <button
                      type="button"
                      onClick={() => toast('Avatar upload coming soon', { icon: '🖼️' })}
                      className="text-xs text-teal-500 hover:text-teal-400 mt-1 transition-colors"
                    >
                      Change avatar →
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isEmployee ? (
                    <>
                      <Input label="First Name" error={profileErrors.firstName?.message} {...regProfile('firstName')} />
                      <Input label="Last Name" error={profileErrors.lastName?.message} {...regProfile('lastName')} />
                      <Input label="Phone" error={profileErrors.phone?.message} {...regProfile('phone')} />
                      <Input label="Alternate Phone" error={profileErrors.alternatePhone?.message} {...regProfile('alternatePhone')} />
                      <Input label="Date of Birth" type="date" error={profileErrors.dateOfBirth?.message} {...regProfile('dateOfBirth')} />
                      <Select
                        label="Gender"
                        options={[
                          { value: 'Male', label: 'Male' },
                          { value: 'Female', label: 'Female' },
                          { value: 'Other', label: 'Other' },
                        ]}
                        error={profileErrors.gender?.message}
                        {...regProfile('gender')}
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
                        error={profileErrors.maritalStatus?.message}
                        {...regProfile('maritalStatus')}
                      />
                      <Input label="Blood Group" error={profileErrors.bloodGroup?.message} {...regProfile('bloodGroup')} />
                      <Input label="Address Street" error={profileErrors.currentAddressStreet?.message} {...regProfile('currentAddressStreet')} />
                      <Input label="Address City" error={profileErrors.currentAddressCity?.message} {...regProfile('currentAddressCity')} />
                      <Input label="Address State" error={profileErrors.currentAddressState?.message} {...regProfile('currentAddressState')} />
                      <Input label="Address Pincode" error={profileErrors.currentAddressPincode?.message} {...regProfile('currentAddressPincode')} />
                      <Input label="Emergency Contact Name" {...regProfile('emergencyContactName')} />
                      <Input label="Emergency Relationship" {...regProfile('emergencyContactRelationship')} />
                      <Input label="Emergency Contact Phone" {...regProfile('emergencyContactPhone')} />
                    </>
                  ) : (
                    <>
                      <Input label="Full Name" placeholder="Enter your name" error={profileErrors.name?.message} {...regProfile('name')} />
                      <Input label="Email Address" type="email" placeholder="you@company.com" disabled value={user?.email || ''} />
                      <Input label="Phone Number" type="tel" placeholder="+91 XXXXX XXXXX" {...regProfile('phone')} />
                    </>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" isLoading={isLoading} leftIcon={<Save className="w-4 h-4" />}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* ── Security ─────────────────────────────────── */}
          {activeTab === 'security' && (
            <Card className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Change Password</h2>
                  <p className="text-xs text-muted-foreground">Update your security credentials</p>
                </div>
              </div>

              {/* security tips banner */}
              <div className="mb-4 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-sm text-teal-600 dark:text-teal-400 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Use a strong password of at least 8 characters with letters, numbers and symbols.</span>
              </div>

              <form onSubmit={submitPassword(onPasswordSubmit)} className="space-y-4">
                {/* current password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="Enter current password"
                      error={passwordErrors.currentPassword?.message}
                      {...regPassword('currentPassword')}
                      className="pr-10"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <EyeToggle show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} />
                    </div>
                  </div>
                  {passwordErrors.currentPassword && <p className="text-xs text-destructive">{passwordErrors.currentPassword.message}</p>}
                </div>

                <Separator />

                {/* new password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">New Password</label>
                  <div className="relative">
                    <Input
                      type={showNew ? 'text' : 'password'}
                      placeholder="Enter new password"
                      error={passwordErrors.newPassword?.message}
                      {...regPassword('newPassword')}
                      className="pr-10"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <EyeToggle show={showNew} onToggle={() => setShowNew(!showNew)} />
                    </div>
                  </div>
                  {passwordErrors.newPassword && <p className="text-xs text-destructive">{passwordErrors.newPassword.message}</p>}
                </div>

                {/* confirm password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      error={passwordErrors.confirmPassword?.message}
                      {...regPassword('confirmPassword')}
                      className="pr-10"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
                    </div>
                  </div>
                  {passwordErrors.confirmPassword && <p className="text-xs text-destructive">{passwordErrors.confirmPassword.message}</p>}
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" isLoading={isLoading} leftIcon={<Lock className="w-4 h-4" />}>
                    Update Password
                  </Button>
                </div>
              </form>

              <Separator className="my-8" />

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Monitor className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Recognized Devices</h2>
                  <p className="text-xs text-muted-foreground">Devices that have logged into your account recently</p>
                </div>
              </div>

              {user?.devices && user.devices.length > 0 ? (
                <div className="space-y-4">
                  {user.devices.map((device, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div>
                        <p className="font-medium text-sm text-foreground flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-muted-foreground" />
                          {device.deviceName || 'Unknown Device'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                          {device.ipAddress ? (
                            <>
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{device.ipAddress}</span>
                              <span>•</span>
                            </>
                          ) : null}
                          <span>Last login: {new Date(device.lastLogin).toLocaleString()}</span>
                        </p>
                      </div>
                      <div className="mt-3 sm:mt-0">
                         <span className="inline-flex items-center px-2 py-1 space-x-1.5 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                           <CheckCircle2 className="w-3.5 h-3.5" />
                           <span>Active</span>
                         </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-border rounded-xl bg-muted/10">
                  <Monitor className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No recognized devices tracked yet.</p>
                </div>
              )}
            </Card>
          )}

          {/* ── Notifications ────────────────────────────── */}
          {activeTab === 'notifications' && (
            <Card className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Notification Preferences</h2>
                  <p className="text-xs text-muted-foreground">Choose how you receive alerts</p>
                </div>
              </div>

              <div className="space-y-3">
                {notifItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>

                    {/* Accessible toggle switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifPrefs[item.key]}
                      onClick={() =>
                        setNotifPrefs((prev: typeof defaultNotifPrefs) => ({ ...prev, [item.key]: !prev[item.key] }))
                      }
                      className={cn(
                        'relative w-11 h-6 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
                        notifPrefs[item.key] ? 'bg-teal-500' : 'bg-muted-foreground/30'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300',
                          notifPrefs[item.key] ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-6">
                <Button onClick={saveNotifPrefs} leftIcon={<Save className="w-4 h-4" />}>
                  Save Preferences
                </Button>
              </div>
            </Card>
          )}

          {/* ── Appearance ───────────────────────────────── */}
          {activeTab === 'appearance' && (
            <Card className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-500/20">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Appearance Settings</h2>
                  <p className="text-xs text-muted-foreground">Customize the look and feel</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Theme selector */}
                <div>
                  <label className="text-sm font-medium block mb-3">Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleThemeChange(t.id)}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-95 group',
                          appearance.theme === t.id
                            ? 'border-teal-500 shadow-md shadow-teal-500/20 bg-teal-500/5'
                            : 'border-border hover:border-teal-500/40'
                        )}
                      >
                        <div className={cn('w-full h-12 rounded-lg mb-3', t.preview)} />
                        <div className="flex items-center justify-center gap-2">
                          <t.icon
                            className={cn(
                              'w-3.5 h-3.5 transition-colors',
                              appearance.theme === t.id ? 'text-teal-500' : 'text-muted-foreground'
                            )}
                          />
                          <span
                            className={cn(
                              'text-xs font-semibold transition-colors',
                              appearance.theme === t.id ? 'text-teal-500' : 'text-muted-foreground'
                            )}
                          >
                            {t.label}
                          </span>
                          {appearance.theme === t.id && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Language */}
                <Select
                  label="Language"
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'hi', label: 'हिन्दी (Hindi)' },
                    { value: 'ur', label: 'اردو (Urdu)' },
                  ]}
                  value={appearance.language}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setAppearance((prev: typeof defaultAppearance) => ({ ...prev, language: e.target.value }))
                  }
                />

                {/* Date Format */}
                <Select
                  label="Date Format"
                  options={[
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
                  ]}
                  value={appearance.dateFormat}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setAppearance((prev: typeof defaultAppearance) => ({ ...prev, dateFormat: e.target.value }))
                  }
                />
              </div>

              <div className="flex justify-end pt-6">
                <Button onClick={saveAppearance} leftIcon={<Save className="w-4 h-4" />}>
                  Save Changes
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
