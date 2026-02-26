import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Input, Select } from '../../components/ui';
import api from '../../lib/api';

const employeeSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  gender: z.enum(['Male', 'Female', 'Other']),
  joiningDate: z.string().min(1, 'Joining date is required'),
  basicSalary: z.string().min(1, 'Basic salary is required'),
  employmentType: z.enum(['Full-Time', 'Part-Time', 'Contract', 'Intern', 'Probation']),
  department: z.string().optional(),
  designation: z.string().optional(),
  branch: z.string().optional(),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

const EmployeeFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<{ value: string; label: string }[]>([]);
  const [designations, setDesignations] = useState<{ value: string; label: string }[]>([]);
  const [branches, setBranches] = useState<{ value: string; label: string }[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employmentType: 'Full-Time',
      gender: 'Male',
    },
  });

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [deptRes, desigRes, branchRes] = await Promise.all([
          api.get('/departments/dropdown'),
          api.get('/designations/dropdown'),
          api.get('/branches/dropdown'),
        ]);

        setDepartments(
          (deptRes.data.data || []).map((d: { _id: string; name: string }) => ({
            value: d._id,
            label: d.name,
          }))
        );
        setDesignations(
          (desigRes.data.data || []).map((d: { _id: string; title: string }) => ({
            value: d._id,
            label: d.title,
          }))
        );
        setBranches(
          (branchRes.data.data || []).map((b: { _id: string; name: string }) => ({
            value: b._id,
            label: b.name,
          }))
        );
      } catch {
        console.error('Failed to fetch dropdowns');
      }
    };

    fetchDropdowns();

    if (isEditing) {
      const fetchEmployee = async () => {
        try {
          const response = await api.get(`/employees/${id}`);
          const employee = response.data.data;
          reset({
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            phone: employee.phone,
            gender: employee.gender,
            joiningDate: employee.joiningDate?.split('T')[0],
            basicSalary: employee.basicSalary?.toString(),
            employmentType: employee.employmentType,
            department: employee.department?._id || employee.department,
            designation: employee.designation?._id || employee.designation,
            branch: employee.branch?._id || employee.branch,
          });
        } catch {
          toast.error('Failed to fetch employee details');
          navigate('/employees');
        }
      };
      fetchEmployee();
    }
  }, [id, isEditing, reset, navigate]);

  const onSubmit = async (data: EmployeeForm) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        basicSalary: parseFloat(data.basicSalary),
      };

      if (isEditing) {
        await api.put(`/employees/${id}`, payload);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/employees', payload);
        toast.success('Employee created successfully');
      }
      navigate('/employees');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 px-1 sm:px-2">
      {/* Header */}
      <div className="flex items-center gap-4 animate-fadeIn">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isEditing ? 'Edit Employee' : 'Add New Employee'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isEditing
              ? 'Update employee information'
              : 'Fill in the details to create a new employee'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-3xl mx-auto space-y-6">
        {/* Personal Information */}
        <Card className="animate-fadeIn" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Personal Information
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Basic details about the employee
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Input
              label="First Name"
              placeholder="Enter first name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last Name"
              placeholder="Enter last name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="Enter email address"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Phone"
              placeholder="Enter phone number"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Select
              label="Gender"
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
              ]}
              error={errors.gender?.message}
              {...register('gender')}
            />
          </div>
        </Card>

        {/* Employment Details */}
        <Card className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Employment Details
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Job-related information
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Select
              label="Department"
              options={departments}
              placeholder="Select department"
              error={errors.department?.message}
              {...register('department')}
            />
            <Select
              label="Designation"
              options={designations}
              placeholder="Select designation"
              error={errors.designation?.message}
              {...register('designation')}
            />
            <Select
              label="Branch"
              options={branches}
              placeholder="Select branch"
              error={errors.branch?.message}
              {...register('branch')}
            />
            <Select
              label="Employment Type"
              options={[
                { value: 'Full-Time', label: 'Full-Time' },
                { value: 'Part-Time', label: 'Part-Time' },
                { value: 'Contract', label: 'Contract' },
                { value: 'Intern', label: 'Intern' },
                { value: 'Probation', label: 'Probation' },
              ]}
              error={errors.employmentType?.message}
              {...register('employmentType')}
            />
            <Input
              label="Joining Date"
              type="date"
              error={errors.joiningDate?.message}
              {...register('joiningDate')}
            />
            <Input
              label="Basic Salary"
              type="number"
              placeholder="Enter basic salary"
              error={errors.basicSalary?.message}
              {...register('basicSalary')}
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 animate-fadeIn" style={{ animationDelay: '300ms' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/employees')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isEditing ? 'Update Employee' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeFormPage;

