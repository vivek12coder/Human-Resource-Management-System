import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../../store/authStore'
import type { User } from '../../store/authStore'
import { server } from '../setup'
import { HttpResponse, http } from 'msw'

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { getState } = useAuthStore
    act(() => {
      getState().logout()
    })
    vi.clearAllMocks()
  })

  it('should have initial state', () => {
    const { result } = renderHook(() => useAuthStore())

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isInitializing).toBe(true)
  })

  it('should handle successful login', async () => {
    const { result } = renderHook(() => useAuthStore())

    const mockUser: User = {
      _id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'ADMIN'
    }

    // Mock successful login response
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.json({
          success: true,
          data: {
            user: mockUser,
            tokens: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token'
            }
          }
        })
      })
    )

    await act(async () => {
      await result.current.login('test@example.com', 'password123', { deviceId: 'test-123' })
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle login failure', async () => {
    const { result } = renderHook(() => useAuthStore())

    // Mock failed login response
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.json(
          {
            success: false,
            message: 'Invalid credentials'
          },
          { status: 401 }
        )
      })
    )

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrongpassword', { deviceId: 'test-123' })
      } catch (error) {
        // Expected to throw
      }
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle logout', () => {
    const { result } = renderHook(() => useAuthStore())

    // First set authenticated state
    act(() => {
      result.current.user = {
        _id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN'
      } as User
      result.current.isAuthenticated = true
    })

    // Then logout
    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('should check user roles correctly', () => {
    const { result } = renderHook(() => useAuthStore())

    // Set user with ADMIN role
    act(() => {
      result.current.user = {
        _id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN'
      } as User
      result.current.isAuthenticated = true
    })

    expect(result.current.hasRole('ADMIN')).toBe(true)
    expect(result.current.hasRole('SUPER_ADMIN')).toBe(false)
    expect(result.current.hasRole('ADMIN', 'HR')).toBe(true)
    expect(result.current.hasRole('EMPLOYEE')).toBe(false)
  })

  it('should check user permissions correctly', () => {
    const { result } = renderHook(() => useAuthStore())

    // Set user with specific permissions
    act(() => {
      result.current.user = {
        _id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'JUNIOR_ADMIN',
        permissions: ['EMPLOYEE_VIEW', 'ATTENDANCE_VIEW']
      } as User
      result.current.isAuthenticated = true
    })

    expect(result.current.hasPermission('EMPLOYEE_VIEW')).toBe(true)
    expect(result.current.hasPermission('EMPLOYEE_CREATE')).toBe(false)
    expect(result.current.hasPermission('ATTENDANCE_VIEW')).toBe(true)
  })

  it('should grant all permissions to ADMIN roles', () => {
    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.user = {
        _id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN'
      } as User
      result.current.isAuthenticated = true
    })

    // ADMIN should have all permissions
    expect(result.current.hasPermission('EMPLOYEE_VIEW')).toBe(true)
    expect(result.current.hasPermission('EMPLOYEE_CREATE')).toBe(true)
    expect(result.current.hasPermission('PAYROLL_GENERATE')).toBe(true)
  })

  it('should handle user switching for admins', async () => {
    const { result } = renderHook(() => useAuthStore())

    const originalUser: User = {
      _id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN'
    }

    const targetUser: User = {
      _id: 'employee-1',
      name: 'Employee User',
      email: 'employee@example.com',
      role: 'EMPLOYEE'
    }

    // Set initial admin user
    act(() => {
      result.current.user = originalUser
      result.current.isAuthenticated = true
    })

    // Mock switch user response
    server.use(
      http.post('/api/auth/switch-user/:userId', () => {
        return HttpResponse.json({
          success: true,
          data: {
            user: targetUser,
            tokens: {
              accessToken: 'switched-access-token',
              refreshToken: 'switched-refresh-token'
            }
          }
        })
      })
    )

    await act(async () => {
      await result.current.switchToUser('employee-1')
    })

    expect(result.current.user).toEqual(targetUser)
    expect(result.current.originalUser).toEqual(originalUser)
    expect(result.current.isSwitched).toBe(true)
  })

  it('should handle switch back to original user', () => {
    const { result } = renderHook(() => useAuthStore())

    const originalUser: User = {
      _id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN'
    }

    const switchedUser: User = {
      _id: 'employee-1',
      name: 'Employee User',
      email: 'employee@example.com',
      role: 'EMPLOYEE'
    }

    // Set switched state
    act(() => {
      result.current.user = switchedUser
      result.current.originalUser = originalUser
      result.current.isSwitched = true
      result.current.isAuthenticated = true
    })

    // Switch back
    act(() => {
      result.current.switchBack()
    })

    expect(result.current.user).toEqual(originalUser)
    expect(result.current.originalUser).toBeNull()
    expect(result.current.isSwitched).toBe(false)
  })

  it('should handle silent refresh', async () => {
    const { result } = renderHook(() => useAuthStore())

    const mockUser: User = {
      _id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'ADMIN'
    }

    // Mock successful me endpoint response
    server.use(
      http.get('/api/auth/me', () => {
        return HttpResponse.json({
          success: true,
          data: { user: mockUser }
        })
      })
    )

    await act(async () => {
      await result.current.silentRefresh()
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isInitializing).toBe(false)
  })

  it('should handle silent refresh failure', async () => {
    const { result } = renderHook(() => useAuthStore())

    // Mock failed me endpoint response
    server.use(
      http.get('/api/auth/me', () => {
        return HttpResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        )
      })
    )

    await act(async () => {
      await result.current.silentRefresh()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isInitializing).toBe(false)
  })
})