import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import Login from '../../pages/auth/Login'

// Mock the auth store
const mockLogin = vi.fn()
const mockUseAuthStore = vi.fn()

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore()
}))

const renderLogin = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthStore.mockReturnValue({
      isLoading: false,
      login: mockLogin,
      isAuthenticated: false,
    })
  })

  it('should render login form elements', () => {
    renderLogin()

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup()
    renderLogin()

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup()
    renderLogin()

    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it('should show validation error for short password', async () => {
    const user = userEvent.setup()
    renderLogin()

    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(passwordInput, '123')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  it('should call login function with correct credentials', async () => {
    const user = userEvent.setup()
    renderLogin()

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })

  it('should show loading state when authenticating', () => {
    mockUseAuthStore.mockReturnValue({
      isLoading: true,
      login: mockLogin,
      isAuthenticated: false,
    })

    renderLogin()

    expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })

  it('should toggle password visibility', async () => {
    const user = userEvent.setup()
    renderLogin()

    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i })

    // Initially password should be hidden
    expect(passwordInput.type).toBe('password')

    // Click to show password
    await user.click(toggleButton)
    expect(passwordInput.type).toBe('text')

    // Click to hide password again
    await user.click(toggleButton)
    expect(passwordInput.type).toBe('password')
  })

  it('should redirect authenticated users', () => {
    mockUseAuthStore.mockReturnValue({
      isLoading: false,
      login: mockLogin,
      isAuthenticated: true,
    })

    renderLogin()

    // Should not render login form for authenticated users
    expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument()
  })

  it('should handle login errors gracefully', async () => {
    const mockLoginWithError = vi.fn().mockRejectedValue(new Error('Invalid credentials'))
    mockUseAuthStore.mockReturnValue({
      isLoading: false,
      login: mockLoginWithError,
      isAuthenticated: false,
    })

    const user = userEvent.setup()
    renderLogin()

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockLoginWithError).toHaveBeenCalled()
    })
  })
})