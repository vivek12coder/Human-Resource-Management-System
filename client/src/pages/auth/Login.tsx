import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { cn } from '@/lib/utils';
import { getDeviceFingerprint } from '../../lib/deviceFingerprint';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const deviceData = await getDeviceFingerprint();
      await login(data.email, data.password, deviceData);
      toast.success('Login successful');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/25 mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            HRM<span className="text-teal-400">Pro</span>
          </h1>
          <p className="text-slate-400 mt-1.5 text-sm">Human Resource Management</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-100">Welcome back</CardTitle>
            <CardDescription className="text-slate-400">Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    className={cn(
                      'pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500',
                      'focus-visible:ring-teal-500/50 focus-visible:border-teal-500',
                      errors.email && 'border-red-500 focus-visible:ring-red-500/20'
                    )}
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn(
                      'pl-10 pr-10 bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500',
                      'focus-visible:ring-teal-500/50 focus-visible:border-teal-500',
                      errors.password && 'border-red-500 focus-visible:ring-red-500/20'
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className={cn(
                      'absolute right-2.5 top-1/2 -translate-y-1/2',
                      'w-7 h-7 rounded-md flex items-center justify-center',
                      'text-slate-500 transition-all duration-200',
                      'hover:text-teal-400 hover:bg-teal-500/10 hover:scale-110',
                      'active:scale-95',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50'
                    )}
                  >
                    <span className="relative w-4 h-4 block">
                      <Eye
                        className={cn(
                          'w-4 h-4 absolute inset-0 transition-all duration-200',
                          showPassword
                            ? 'opacity-0 scale-50 rotate-90'
                            : 'opacity-100 scale-100 rotate-0'
                        )}
                      />
                      <EyeOff
                        className={cn(
                          'w-4 h-4 absolute inset-0 transition-all duration-200',
                          showPassword
                            ? 'opacity-100 scale-100 rotate-0'
                            : 'opacity-0 scale-50 -rotate-90'
                        )}
                      />
                    </span>
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold border-0 shadow-lg shadow-teal-500/20"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-slate-600 text-xs mt-6">
          &copy; {new Date().getFullYear()} HRMPro. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
