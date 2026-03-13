import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock server for API requests
export const server = setupServer(
  // Mock auth endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          _id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: 'ADMIN'
        },
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token'
        }
      }
    })
  }),

  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          _id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: 'ADMIN'
        }
      }
    })
  }),

  // Mock employee endpoints
  http.get('/api/employees', () => {
    return HttpResponse.json({
      success: true,
      data: {
        data: [
          {
            _id: 'employee-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@test.com',
            employeeId: 'EMP001',
            company: { name: 'Test Company' },
            branch: { name: 'Test Branch' }
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      }
    })
  }),

  http.post('/api/employees', () => {
    return HttpResponse.json({
      success: true,
      data: {
        _id: 'new-employee-id',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        employeeId: 'EMP002'
      }
    })
  }),

  // Mock dropdown endpoints
  http.get('/api/companies/dropdown', () => {
    return HttpResponse.json({
      success: true,
      data: [{ _id: 'company-1', name: 'Test Company' }]
    })
  }),

  http.get('/api/branches/dropdown', () => {
    return HttpResponse.json({
      success: true,
      data: [{ _id: 'branch-1', name: 'Test Branch' }]
    })
  }),

  http.get('/api/departments/dropdown', () => {
    return HttpResponse.json({
      success: true,
      data: [{ _id: 'dept-1', name: 'Engineering' }]
    })
  }),

  http.get('/api/designations/dropdown', () => {
    return HttpResponse.json({
      success: true,
      data: [{ _id: 'design-1', title: 'Software Developer' }]
    })
  })
)

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Close server after all tests
afterAll(() => server.close())

// Reset handlers after each test
afterEach(() => server.resetHandlers())

// Mock Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      pathname: '/',
      search: '',
      hash: '',
      state: null,
      key: 'test'
    }),
    useParams: () => ({}),
  }
})

// Mock React Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
    })),
  }
})

// Mock Zustand store
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: {
      _id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'ADMIN'
    },
    isAuthenticated: true,
    isLoading: false,
    isInitializing: false,
    hasRole: vi.fn(() => true),
    hasPermission: vi.fn(() => true),
    login: vi.fn(),
    logout: vi.fn(),
    silentRefresh: vi.fn(),
  }))
}))

// Mock hot toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}))

// Mock face-api.js
vi.mock('face-api.js', () => ({
  nets: {
    ssdMobilenetv1: {
      loadFromUri: vi.fn().mockResolvedValue(true),
    },
    faceRecognitionNet: {
      loadFromUri: vi.fn().mockResolvedValue(true),
    },
    faceLandmark68Net: {
      loadFromUri: vi.fn().mockResolvedValue(true),
    },
  },
  detectAllFaces: vi.fn().mockResolvedValue([]),
  resizeResults: vi.fn(),
  draw: {
    drawDetections: vi.fn(),
  },
}))

// Mock leaflet
vi.mock('leaflet', () => ({
  map: vi.fn(() => ({
    setView: vi.fn(),
    on: vi.fn(),
    remove: vi.fn(),
  })),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn(),
  })),
  marker: vi.fn(() => ({
    addTo: vi.fn(),
    bindPopup: vi.fn(),
  })),
  icon: vi.fn(),
}))

// Global test utilities
global.testUtils = {
  mockUser: {
    _id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'ADMIN',
  },

  mockEmployee: {
    _id: 'employee-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    employeeId: 'EMP001',
  },

  // Helper to render component with providers
  renderWithProviders: async (ui: React.ReactElement, options = {}) => {
    const { render } = await import('@testing-library/react')
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
    const { BrowserRouter } = await import('react-router-dom')

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const AllProviders = ({ children }: { children: React.ReactNode }) => {
      return (
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </QueryClientProvider>
      )
    }

    return render(ui, { wrapper: AllProviders, ...options })
  },
}

// Types for global utilities
declare global {
  var testUtils: {
    mockUser: {
      _id: string
      name: string
      email: string
      role: string
    }
    mockEmployee: {
      _id: string
      firstName: string
      lastName: string
      email: string
      employeeId: string
    }
    renderWithProviders: (ui: React.ReactElement, options?: any) => Promise<any>
  }
}