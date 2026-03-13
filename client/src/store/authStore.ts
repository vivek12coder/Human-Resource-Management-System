import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'BRANCH_ADMIN' | 'JUNIOR_ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';
  company?: string | { _id: string; name?: string };
  branch?: string | { _id: string; name?: string };
  permissions?: string[];
  isActive?: boolean;
  devices?: {
    deviceId: string;
    deviceName?: string;
    signature: string;
    lastLogin: string;
    ipAddress?: string;
    details?: {
      os: string;
      browser: string;
      resolution: string;
      gpu: string;
      timezone: string;
      memory: string;
      cores: string | number;
    };
  }[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  originalUser: User | null;
  isSwitched: boolean;
  login: (email: string, password: string, deviceData?: any) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  silentRefresh: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
  switchToUser: (userId: string) => Promise<void>;
  switchBack: () => void;
  clearAuth: () => void;
  _refreshPromise?: Promise<boolean> | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: true,
      originalUser: null,
      isSwitched: false,

      login: async (email: string, password: string, deviceData: any) => {
        try {
          set({ isLoading: true });
          const payload = { email, password, device: deviceData };
          const response = await api.post('/auth/login', payload);

          const { tokens, user } = response.data.data;

          // Store only the short-lived access token in sessionStorage
          // Refresh token is automatically stored in httpOnly cookie by the server
          sessionStorage.setItem('accessToken', tokens.accessToken);

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      clearAuth: () => {
        sessionStorage.removeItem('accessToken');
        set({
          user: null,
          isAuthenticated: false,
          originalUser: null,
          isSwitched: false,
          isLoading: false,
          isInitializing: false,
        });
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // ignore errors
        } finally {
          get().clearAuth();
        }
      },

      fetchMe: async () => {
        try {
          const response = await api.get('/auth/me');
          set({ user: response.data.data.user, isAuthenticated: true });
        } catch {
          get().clearAuth();
        }
      },

      // Define a module-level variable to hold the refresh promise
      // outside the store state to prevent reactivity issues
      silentRefresh: async () => {
        // If there's an ongoing API call for refresh, return its result to prevent concurrent rotation
        if (get()._refreshPromise) {
          return get()._refreshPromise as Promise<boolean>;
        }

        const refreshPromise = (async () => {
          try {
            const response = await api.post('/auth/refresh-token', {});
            const { accessToken } = response.data.data.tokens;
            sessionStorage.setItem('accessToken', accessToken);

            const meResponse = await api.get('/auth/me');
            set({ user: meResponse.data.data.user, isAuthenticated: true, isInitializing: false });
            return true;
          } catch {
            get().clearAuth();
            return false;
          } finally {
            set({ _refreshPromise: null });
          }
        })();

        set({ _refreshPromise: refreshPromise });
        return refreshPromise;
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
        return user.permissions?.includes(permission) || user.permissions?.includes('ALL') || false;
      },

      hasRole: (...roles: string[]) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },

      switchToUser: async (userId: string) => {
        const { user } = get();
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
          throw new Error('Only super admin or company admin can switch accounts');
        }

        set({ isLoading: true });
        try {
          const response = await api.post(`/auth/switch-user/${userId}`);
          const switchedUser = response.data?.data?.user as User | undefined;
          const accessToken = response.data?.data?.accessToken as string | undefined;

          if (!switchedUser || !accessToken) {
            throw new Error('Selected account not found');
          }

          // Save current access token to restore on switchBack
          const currentAccessToken = sessionStorage.getItem('accessToken');
          sessionStorage.setItem('originalAccessToken', currentAccessToken || '');

          // Set new access token
          sessionStorage.setItem('accessToken', accessToken);
          // Note: new refresh token cookie is set automatically by server

          set({
            originalUser: user,
            user: switchedUser,
            isSwitched: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      switchBack: async () => {
        const { originalUser } = get();
        if (!originalUser) return;

        // Restore original access token
        const originalAccessToken = sessionStorage.getItem('originalAccessToken');
        if (originalAccessToken) {
          sessionStorage.setItem('accessToken', originalAccessToken);
        } else {
          sessionStorage.removeItem('accessToken');
        }
        sessionStorage.removeItem('originalAccessToken');

        set({
          user: originalUser,
          originalUser: null,
          isSwitched: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist user info for display; authentication is re-validated via cookie on load
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        originalUser: state.originalUser,
        isSwitched: state.isSwitched,
      }),
    }
  )
);
