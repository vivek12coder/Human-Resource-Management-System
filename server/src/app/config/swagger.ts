import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Human Resource Management System API',
      version: '1.0.0',
      description: `
        A comprehensive HR management system API with enterprise-grade security, performance optimizations, and comprehensive functionality.

        ## Features
        - 🔐 **JWT Authentication** with refresh token rotation
        - 🛡️ **Role-based Access Control** with granular permissions
        - ⚡ **Performance Optimized** with MongoDB aggregation pipelines
        - 🚦 **Rate Limited** for security and abuse prevention
        - 🔍 **Input Sanitized** to prevent NoSQL injection
        - 📊 **Full CRUD Operations** for all HR entities
        - 🎯 **Face Recognition** for biometric attendance
        - 📍 **Geolocation Support** for location-based attendance

        ## Security
        All endpoints are protected with appropriate authentication and authorization.
        Rate limiting is enforced to prevent abuse.
      `,
      contact: {
        name: 'HRM API Support',
        email: 'support@hrm.example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.hrm.example.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /auth/login endpoint'
        },
        RefreshToken: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'Refresh token stored in httpOnly cookie'
        }
      },
      schemas: {
        // Common response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Request failed'
            },
            error: {
              type: 'string',
              example: 'Detailed error message'
            }
          }
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Validation failed'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: {
                    type: 'string',
                    example: 'body.email'
                  },
                  message: {
                    type: 'string',
                    example: 'Invalid email format'
                  }
                }
              }
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: {
                    type: 'object'
                  }
                },
                pagination: {
                  $ref: '#/components/schemas/PaginationInfo'
                }
              }
            }
          }
        },
        PaginationInfo: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1
            },
            limit: {
              type: 'integer',
              example: 10
            },
            total: {
              type: 'integer',
              example: 100
            },
            totalPages: {
              type: 'integer',
              example: 10
            }
          }
        },

        // User and Authentication schemas
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              format: 'uuid',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              example: 'John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com'
            },
            role: {
              type: 'string',
              enum: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'JUNIOR_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
              example: 'ADMIN'
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['EMPLOYEE_VIEW', 'EMPLOYEE_CREATE']
            },
            company: {
              oneOf: [
                { type: 'string', example: '507f1f77bcf86cd799439011' },
                { $ref: '#/components/schemas/Company' }
              ]
            },
            branch: {
              oneOf: [
                { type: 'string', example: '507f1f77bcf86cd799439011' },
                { $ref: '#/components/schemas/Branch' }
              ]
            },
            employee: {
              oneOf: [
                { type: 'string', example: '507f1f77bcf86cd799439011' },
                { $ref: '#/components/schemas/Employee' }
              ]
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@example.com',
              description: 'User email address'
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'password123',
              description: 'User password (minimum 6 characters)'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Login successful'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: {
                      type: 'string',
                      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    },
                    refreshToken: {
                      type: 'string',
                      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                  }
                }
              }
            }
          }
        },

        // Company schema
        Company: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              example: 'Acme Corporation'
            },
            code: {
              type: 'string',
              example: 'ACME001'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'info@acme.com'
            },
            phone: {
              type: 'string',
              example: '+1234567890'
            },
            address: {
              $ref: '#/components/schemas/Address'
            },
            gstNumber: {
              type: 'string',
              example: '12ABCDE3456F7GH'
            },
            panNumber: {
              type: 'string',
              example: 'ABCDE1234F'
            },
            isActive: {
              type: 'boolean',
              example: true
            }
          }
        },

        // Employee schema
        Employee: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            employeeId: {
              type: 'string',
              example: 'EMP2024001'
            },
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@acme.com'
            },
            phone: {
              type: 'string',
              example: '1234567890'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date-time',
              example: '1990-01-01T00:00:00.000Z'
            },
            gender: {
              type: 'string',
              enum: ['Male', 'Female', 'Other'],
              example: 'Male'
            },
            company: {
              oneOf: [
                { type: 'string', example: '507f1f77bcf86cd799439011' },
                { $ref: '#/components/schemas/Company' }
              ]
            },
            branch: {
              oneOf: [
                { type: 'string', example: '507f1f77bcf86cd799439011' },
                { $ref: '#/components/schemas/Branch' }
              ]
            },
            department: {
              oneOf: [
                { type: 'string', example: '507f1f77bcf86cd799439011' },
                { $ref: '#/components/schemas/Department' }
              ]
            },
            designation: {
              oneOf: [
                { type: 'string', example: '507f1f77bcf86cd799439011' },
                { $ref: '#/components/schemas/Designation' }
              ]
            },
            employmentType: {
              type: 'string',
              enum: ['Full-Time', 'Part-Time', 'Contract', 'Intern', 'Probation'],
              example: 'Full-Time'
            },
            employmentStatus: {
              type: 'string',
              enum: ['Active', 'Resigned', 'Terminated', 'On-Notice', 'Absconding'],
              example: 'Active'
            },
            joiningDate: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z'
            },
            basicSalary: {
              type: 'number',
              example: 50000
            },
            faceRegistered: {
              type: 'boolean',
              example: false
            },
            allowMobileAttendance: {
              type: 'boolean',
              example: true
            }
          }
        },
        CreateEmployeeRequest: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'phone', 'employmentType', 'joiningDate', 'basicSalary', 'company'],
          properties: {
            employeeId: {
              type: 'string',
              example: 'EMP2024001',
              description: 'Auto-generated if not provided'
            },
            firstName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              example: 'John'
            },
            lastName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              example: 'Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com'
            },
            phone: {
              type: 'string',
              minLength: 10,
              maxLength: 15,
              example: '1234567890'
            },
            gender: {
              type: 'string',
              enum: ['Male', 'Female', 'Other'],
              example: 'Male'
            },
            company: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            branch: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            department: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            designation: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            employmentType: {
              type: 'string',
              enum: ['Full-Time', 'Part-Time', 'Contract', 'Intern', 'Probation']
            },
            joiningDate: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z'
            },
            basicSalary: {
              type: 'number',
              minimum: 0,
              example: 50000
            }
          }
        },

        // Additional schemas
        Address: {
          type: 'object',
          properties: {
            street: {
              type: 'string',
              example: '123 Main Street'
            },
            city: {
              type: 'string',
              example: 'New York'
            },
            state: {
              type: 'string',
              example: 'NY'
            },
            country: {
              type: 'string',
              example: 'USA'
            },
            pincode: {
              type: 'string',
              example: '10001'
            }
          }
        },
        Branch: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              example: 'New York Office'
            },
            code: {
              type: 'string',
              example: 'NYC001'
            },
            company: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            }
          }
        },
        Department: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              example: 'Engineering'
            },
            code: {
              type: 'string',
              example: 'ENG'
            }
          }
        },
        Designation: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            title: {
              type: 'string',
              example: 'Senior Software Developer'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                message: 'Authentication required',
                error: 'Please provide a valid access token'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access denied - insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                message: 'Access denied',
                error: 'You do not have permission to perform this action'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationErrorResponse'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                message: 'Too many requests',
                error: 'Rate limit exceeded. Please try again after 15 minutes.'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                message: 'Not found',
                error: 'The requested resource was not found'
              }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User management (Admin users)'
      },
      {
        name: 'Employees',
        description: 'Employee management operations'
      },
      {
        name: 'Companies',
        description: 'Company management operations'
      },
      {
        name: 'Branches',
        description: 'Branch management operations'
      },
      {
        name: 'Departments',
        description: 'Department management operations'
      },
      {
        name: 'Designations',
        description: 'Designation management operations'
      },
      {
        name: 'Attendance',
        description: 'Employee attendance tracking'
      },
      {
        name: 'Leave',
        description: 'Leave management and approval workflow'
      },
      {
        name: 'Payroll',
        description: 'Payroll processing and salary management'
      },
      {
        name: 'Face Recognition',
        description: 'Biometric face recognition for attendance'
      },
      {
        name: 'Health',
        description: 'API health and status endpoints'
      }
    ]
  },
  apis: [
    './src/app/modules/*/routes.ts',
    './src/app/modules/*/*.routes.ts',
    './src/app.ts'
  ]
};

export default swaggerJsdoc(options);