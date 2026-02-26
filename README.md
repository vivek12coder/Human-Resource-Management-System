# 🏢 HRM — Human Resource Management System

A full-stack **Human Resource Management System** built with a **React + TypeScript** frontend and a **Node.js + Express + TypeScript** backend, powered by **MongoDB**. The system supports multi-company, multi-branch organizations with granular role-based access control (RBAC).

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Roles & Permissions](#roles--permissions)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Models](#database-models)
- [Scripts](#scripts)
- [Postman Collections](#postman-collections)

---

## Overview

This HRM system enables organizations to manage their entire HR lifecycle — from onboarding employees to tracking attendance, processing payroll, managing leaves, and generating reports. It supports multi-tenant setups where a **Super Admin** manages multiple companies, each with their own branches, departments, and employees.

---

## Features

### 🔐 Authentication & Security
- JWT-based authentication (Access Token)
- Refresh token support
- Password hashing with bcrypt
- Role-based access control (RBAC) with 4 user roles
- Granular permission system for `JUNIOR_ADMIN`
- Account deactivation support

### 👔 Employee Management
- Full employee lifecycle management (onboarding → offboarding)
- Employee profiles with personal, contact, and emergency info
- Employment type tracking (Full-Time, Part-Time, Contract, Intern, Probation)
- Employment status (Active, Resigned, Terminated, On-Notice, Absconding)
- Bank details, PAN, PF, ESI, UAN number storage
- Document management (Aadhar, Passport, Driving License, Voter ID)
- Geofence and mobile attendance settings per employee
- Leave balance tracking per employee
- Reporting manager hierarchy
- Auto-generated Employee IDs

### 🏢 Organization Management
- Multi-company support (SUPER_ADMIN manages multiple companies)
- Branch management per company
- Department management
- Designation management
- Company-scoped data isolation

### ⏰ Attendance Management
- Daily attendance tracking
- Clock-in / Clock-out support
- Biometric integration support
- Attendance reports

### 📅 Shift & Roster Management
- Shift definition (General, Morning, Evening, Night, etc.)
- Roster/schedule assignment for employees
- Weekly-off configuration per employee

### 🏖️ Leave Management
- Multiple leave types (Casual, Sick, Earned, Unpaid)
- Leave application and approval workflow
- Leave balance management

### 💰 Payroll Management
- Monthly payroll processing
- Basic, gross salary, and CTC tracking
- Payroll reports

### 📊 Dashboard & Reports
- Real-time statistics for admins
- Employee stats and counts
- Audit logs for all system actions
- Role-specific dashboard views

### ⚙️ Settings & Administration
- System-level settings management
- User account management
- Notification system

---

## Tech Stack

### Frontend (`/client`)
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite 7** | Build tool & dev server |
| **Tailwind CSS 4** | Styling |
| **React Router DOM 7** | Client-side routing |
| **TanStack Query (React Query)** | Server state management & caching |
| **Zustand** | Client state management (auth store) |
| **React Hook Form + Zod** | Form handling & validation |
| **Axios** | HTTP client |
| **Recharts** | Charts & data visualization |
| **Lucide React** | Icon library |
| **React Hot Toast** | Notifications/toasts |
| **date-fns** | Date utilities |

### Backend (`/server`)
| Technology | Purpose |
|---|---|
| **Node.js** | Runtime environment |
| **Express 5** | Web framework |
| **TypeScript** | Type safety |
| **MongoDB** | Database |
| **Mongoose 9** | ODM for MongoDB |
| **JWT (jsonwebtoken)** | Authentication tokens |
| **bcrypt / bcryptjs** | Password hashing |
| **Zod** | Schema validation |
| **Joi** | Additional validation |
| **CORS** | Cross-origin resource sharing |
| **dotenv** | Environment configuration |
| **ts-node-dev** | Development hot-reload |

---

## Project Structure

```
HRM/
├── client/                          # React Frontend
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── assets/                  # Images, fonts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.tsx  # Main layout wrapper
│   │   │   │   ├── Header.tsx           # Top navigation bar
│   │   │   │   └── Sidebar.tsx          # Side navigation
│   │   │   ├── ui/                  # Reusable UI components
│   │   │   └── UserSwitchModal.tsx  # Role/user switching
│   │   ├── lib/                     # Utilities (axios instance, helpers)
│   │   ├── pages/
│   │   │   ├── auth/                # Login page
│   │   │   ├── dashboard/           # Dashboard page
│   │   │   ├── employees/           # Employee list, form, self-dashboard
│   │   │   ├── attendance/          # Attendance management
│   │   │   ├── leave/               # Leave management
│   │   │   ├── payroll/             # Payroll management
│   │   │   ├── organization/        # Companies, branches, departments, designations
│   │   │   ├── users/               # User management (admin accounts)
│   │   │   └── settings/            # System settings
│   │   ├── store/
│   │   │   └── authStore.ts         # Zustand auth state store
│   │   ├── types/                   # TypeScript type definitions
│   │   ├── App.tsx                  # Root component with routing
│   │   └── main.tsx                 # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── server/                          # Node.js Backend
│   ├── src/
│   │   ├── app/
│   │   │   ├── config/              # Environment config, DB config
│   │   │   ├── errors/              # Custom AppError class
│   │   │   ├── middleware/
│   │   │   │   ├── jwtAuth.middleware.ts    # JWT verify, role auth, permission check
│   │   │   │   ├── auth.middleware.ts       # Request validation middleware
│   │   │   │   └── validateRequest.ts      # Zod request validator
│   │   │   ├── modules/             # Feature modules (MVC pattern)
│   │   │   │   ├── auth/            # Login, logout, token refresh
│   │   │   │   ├── user/            # Admin user accounts
│   │   │   │   ├── employee/        # Employee CRUD & profile
│   │   │   │   ├── company/         # Company management
│   │   │   │   ├── branch/          # Branch management
│   │   │   │   ├── department/      # Department management
│   │   │   │   ├── designation/     # Designation management
│   │   │   │   ├── attendence/      # Attendance tracking
│   │   │   │   ├── leave/           # Leave applications
│   │   │   │   ├── payroll/         # Payroll processing
│   │   │   │   ├── shift/           # Work shifts
│   │   │   │   ├── roster/          # Employee rosters
│   │   │   │   ├── dashboard/       # Dashboard statistics
│   │   │   │   ├── reports/         # HR reports
│   │   │   │   ├── biometric/       # Biometric integration
│   │   │   │   ├── audit/           # Audit logs
│   │   │   │   ├── notifications/   # System notifications
│   │   │   │   └── settings/        # System settings
│   │   │   ├── routes/
│   │   │   │   └── index.ts         # Central router
│   │   │   └── utils/               # Helper utilities
│   │   ├── scripts/
│   │   │   ├── seedSuperAdmin.ts    # Seed initial super admin
│   │   │   └── resetSuperAdmin.ts   # Reset super admin credentials
│   │   ├── app.ts                   # Express app setup
│   │   └── server.ts                # Server entry point
│   ├── HRM_API_Postman_Collection.json
│   ├── HRM_Role_Based_Postman_Collection.json
│   ├── Shift_Roster_Postman_Collection.json
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

Each backend module follows a consistent **MVC pattern**:
```
module/
├── module.model.ts        # Mongoose schema & model
├── module.controller.ts   # Request handlers
├── module.service.ts      # Business logic
├── module.routes.ts       # Express routes with middleware
├── module.types.ts        # TypeScript interfaces
└── module.validation.ts   # Zod validation schemas
```

---

## Roles & Permissions

The system has 4 user roles with hierarchical access:

| Role | Description | Capabilities |
|---|---|---|
| `SUPER_ADMIN` | Platform-level administrator | Full access to everything, including company management |
| `ADMIN` | Company administrator | Manages employees, departments, payroll, attendance, leaves for their company |
| `JUNIOR_ADMIN` | Limited admin | Configurable granular permissions (READ, CREATE, UPDATE on specific modules) |
| `EMPLOYEE` | Regular employee | Access to own profile, attendance, leaves, payslips only |

### JUNIOR_ADMIN Permissions
`JUNIOR_ADMIN` users can be granted specific permissions such as:
- `EMPLOYEE_VIEW`, `EMPLOYEE_CREATE`, `EMPLOYEE_UPDATE`
- `ALL` (grants all permissions)

### Frontend Role Guards
Routes are protected using `RoleRoute` components:
- `/employees` — `SUPER_ADMIN`, `ADMIN`, `JUNIOR_ADMIN`
- `/companies` — `SUPER_ADMIN` only
- `/users` — `SUPER_ADMIN`, `ADMIN`, `JUNIOR_ADMIN`
- `/my-profile` — `EMPLOYEE` only

---

## Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** (local or Atlas)
- **npm** or **yarn**

### 1. Clone the Repository
```bash
git clone <repository-url>
cd HRM
```

### 2. Setup the Backend (Server)
```bash
cd server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables section)

# Seed the initial Super Admin account
npm run seed

# Start development server
npm run dev
```
The backend will run at **http://localhost:5000**

### 3. Setup the Frontend (Client)
```bash
cd client

# Install dependencies
npm install

# Configure frontend environment
# Edit .env if needed (API base URL)

# Start development server
npm run dev
```
The frontend will run at **http://localhost:5173**

### 4. Login
Use the seeded Super Admin credentials (set in your seed script) to log in at `http://localhost:5173/login`.

---

## Environment Variables

### Server (`server/.env`)
```env
DATABASE_URL=mongodb://localhost:27017/hrm
PORT=5000
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
```

### Client (`client/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

> ⚠️ **Security Note:** Never commit your `.env` files to version control. Use strong, random secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET` in production.

---

## API Reference

**Base URL:** `http://localhost:5000/api`

### Health Check
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check if API is running |

### Authentication (`/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/auth/login` | Login and get JWT token | No |
| POST | `/auth/logout` | Logout / invalidate session | Yes |
| POST | `/auth/refresh-token` | Refresh access token | Yes |
| GET | `/auth/me` | Get current user profile | Yes |

### User Management (`/users`)
| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/users` | List all admin users | SUPER_ADMIN, ADMIN |
| POST | `/users` | Create a new admin user | SUPER_ADMIN |
| GET | `/users/:id` | Get user by ID | SUPER_ADMIN, ADMIN |
| PUT | `/users/:id` | Update user | SUPER_ADMIN |
| DELETE | `/users/:id` | Delete user | SUPER_ADMIN |
| PATCH | `/users/:id/status` | Activate/deactivate user | SUPER_ADMIN |

### Employee Management (`/employees`)
| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `/employees` | Create new employee | SUPER_ADMIN, ADMIN, JUNIOR_ADMIN |
| GET | `/employees` | Get all employees | Permission: EMPLOYEE_VIEW |
| GET | `/employees/me` | Get my own profile | EMPLOYEE |
| PATCH | `/employees/me` | Update my own profile | EMPLOYEE |
| GET | `/employees/dropdown` | Get employees list for dropdown | Any authenticated |
| GET | `/employees/stats` | Get employee statistics | SUPER_ADMIN, ADMIN |
| GET | `/employees/count` | Get employee count | SUPER_ADMIN, ADMIN |
| GET | `/employees/generate-id` | Generate next employee ID | SUPER_ADMIN, ADMIN |
| GET | `/employees/:id` | Get employee by ID | Permission: EMPLOYEE_VIEW |
| PUT | `/employees/:id` | Update employee | Permission: EMPLOYEE_UPDATE |
| DELETE | `/employees/:id` | Delete employee | SUPER_ADMIN, ADMIN |
| PATCH | `/employees/:id/status` | Toggle employee active status | SUPER_ADMIN, ADMIN |

### Company Management (`/companies`)
| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/companies` | List all companies | SUPER_ADMIN |
| POST | `/companies` | Create a company | SUPER_ADMIN |
| GET | `/companies/:id` | Get company by ID | SUPER_ADMIN |
| PUT | `/companies/:id` | Update company | SUPER_ADMIN |
| DELETE | `/companies/:id` | Delete company | SUPER_ADMIN |

### Branch Management (`/branches`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/branches` | List all branches |
| POST | `/branches` | Create a branch |
| GET | `/branches/:id` | Get branch by ID |
| PUT | `/branches/:id` | Update branch |
| DELETE | `/branches/:id` | Delete branch |

### Department Management (`/departments`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/departments` | List all departments |
| POST | `/departments` | Create a department |
| GET | `/departments/:id` | Get department by ID |
| PUT | `/departments/:id` | Update department |
| DELETE | `/departments/:id` | Delete department |

### Designation Management (`/designations`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/designations` | List all designations |
| POST | `/designations` | Create a designation |
| GET | `/designations/:id` | Get designation by ID |
| PUT | `/designations/:id` | Update designation |
| DELETE | `/designations/:id` | Delete designation |

### Attendance Management (`/attendance`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/attendance` | Get attendance records |
| POST | `/attendance` | Mark attendance |
| GET | `/attendance/:id` | Get attendance by ID |
| PUT | `/attendance/:id` | Update attendance record |

### Leave Management (`/leaves`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/leaves` | Get leave applications |
| POST | `/leaves` | Apply for leave |
| GET | `/leaves/:id` | Get leave by ID |
| PUT | `/leaves/:id` | Update leave status (approve/reject) |

### Payroll (`/payroll`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/payroll` | Get payroll records |
| POST | `/payroll` | Process payroll |
| GET | `/payroll/:id` | Get payroll record by ID |
| PUT | `/payroll/:id` | Update payroll record |

### Shift Management (`/shifts`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/shifts` | List all shifts |
| POST | `/shifts` | Create a shift |
| GET | `/shifts/:id` | Get shift by ID |
| PUT | `/shifts/:id` | Update shift |

### Roster Management (`/rosters`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/rosters` | Get roster assignments |
| POST | `/rosters` | Assign roster to employee |
| GET | `/rosters/:id` | Get roster by ID |
| PUT | `/rosters/:id` | Update roster |

### Dashboard (`/dashboard`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard` | Get dashboard statistics |

---

## Database Models

### User Model
```
User {
  name, email, password (hashed), role (SUPER_ADMIN|ADMIN|JUNIOR_ADMIN|EMPLOYEE),
  company, branch, permissions[], isActive, isDeleted
}
```

### Employee Model
```
Employee {
  employeeId, firstName, lastName, email, phone, alternatePhone,
  dateOfBirth, gender, maritalStatus, bloodGroup, profileImage,
  company, branch, department, designation, reportingManager,
  employmentType, joiningDate, confirmationDate, employmentStatus,
  basicSalary, grossSalary, ctc,
  bankName, accountNumber, ifscCode, panNumber, pfNumber, esiNumber, uanNumber,
  currentAddress, permanentAddress, emergencyContact, documents,
  user (linked User account), workShift, weekOff[],
  allowMobileAttendance, geofenceEnabled, geofenceRadius,
  leaveBalance { casual, sick, earned, unpaid },
  isActive, isDeleted, createdBy
}
```

### Company Model
```
Company { name, logo, address, phone, email, gstin, pan, isActive, isDeleted }
```

### Branch Model
```
Branch { name, company, address, phone, email, isActive, isDeleted }
```

### Department Model
```
Department { name, company, branch, head (Employee), isActive }
```

### Designation Model
```
Designation { title, company, department, isActive }
```

---

## Scripts

### Server Scripts
```bash
# Start development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Seed initial Super Admin user
npm run seed

# Reset Super Admin credentials
npm run reset-admin
```

### Client Scripts
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## Postman Collections

Three Postman collections are provided in the `/server` directory for API testing:

| File | Description |
|---|---|
| `HRM_API_Postman_Collection.json` | Full API collection with all endpoints |
| `HRM_Role_Based_Postman_Collection.json` | Role-based access testing scenarios |
| `Shift_Roster_Postman_Collection.json` | Shift and roster-specific API tests |

### Importing into Postman
1. Open Postman
2. Click **Import**
3. Select the `.json` file from the `server/` directory
4. Set the `baseUrl` environment variable to `http://localhost:5000/api`
5. Use the login endpoint to get a JWT token and set it as a Bearer token

---

## Error Handling

The API uses a centralized error handler that gracefully handles:

| Error Type | Status Code | Description |
|---|---|---|
| `AppError` | Custom | Application-level business errors |
| `ValidationError` | 400 | Mongoose model validation failures |
| Duplicate Key (`code: 11000`) | 400 | MongoDB unique constraint violations |
| `CastError` | 400 | Invalid MongoDB ObjectId |
| `JsonWebTokenError` | 401 | Invalid JWT token |
| `TokenExpiredError` | 401 | Expired JWT token |
| Unauthorized | 401 | No token or user not found |
| Forbidden | 403 | Insufficient role/permissions |
| Not Found | 404 | Route does not exist |
| Server Error | 500 | Unhandled internal errors |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)                     │
│  Zustand Auth Store ──► Protected Routes ──► Role Guards     │
│  TanStack Query ──────► Axios ──────────────► API Calls      │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP (REST)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Express + TS)                      │
│  CORS ──► Body Parser ──► JWT Middleware ──► Role Auth       │
│                             │                                │
│           ┌─────────────────┼──────────────────┐            │
│        Routes            Routes              Routes          │
│           │                 │                  │             │
│      Controllers       Controllers         Controllers       │
│           │                 │                  │             │
│       Services          Services           Services          │
│           │                 │                  │             │
└───────────┼─────────────────┼──────────────────┼────────────┘
            │                 │                  │
            └─────────────────▼──────────────────┘
                        MongoDB via Mongoose
```

---

## License

This project is private and proprietary.

---

*Built with ❤️ — HRM System v1.0.0*
