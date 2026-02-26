import { useState, useEffect } from 'react';
import {
  Wallet,
  DollarSign,
  Download,
  Eye,
  CheckCircle,
  CreditCard,
  TrendingUp,
  Users,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Badge, Table, Modal, Select, Input } from '../../components/ui';
import type { Payroll } from '../../types';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const PayrollList = () => {
  const { hasRole, hasPermission } = useAuthStore();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [myPayslips, setMyPayslips] = useState<Payroll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generateModal, setGenerateModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [viewModal, setViewModal] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: '',
  });

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const fetchPayrolls = async () => {
    setIsLoading(true);
    try {
      if (hasRole('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN')) {
        const params = new URLSearchParams({
          month: filters.month.toString(),
          year: filters.year.toString(),
          ...(filters.status && { status: filters.status }),
        });
        const response = await api.get(`/payroll?${params}`);
        const payrollData = response.data?.data?.data ?? response.data?.data;
        setPayrolls(Array.isArray(payrollData) ? payrollData : []);
      }

      const myResponse = await api.get('/payroll/my');
      const myData = myResponse.data?.data?.data ?? myResponse.data?.data;
      setMyPayslips(Array.isArray(myData) ? myData : []);
    } catch {
      toast.error('Failed to fetch payroll data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [filters, hasRole]);

  const handleBulkGenerate = async () => {
    setBulkGenerating(true);
    try {
      await api.post('/payroll/bulk-generate', {
        month: filters.month,
        year: filters.year,
      });
      toast.success('Payroll generated successfully!');
      setGenerateModal(false);
      fetchPayrolls();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to generate payroll');
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleApprove = async (payroll: Payroll) => {
    try {
      await api.patch(`/payroll/${payroll._id}/approve`);
      toast.success('Payroll approved!');
      fetchPayrolls();
    } catch {
      toast.error('Failed to approve payroll');
    }
  };

  const handleMarkAsPaid = async (payroll: Payroll) => {
    try {
      await api.patch(`/payroll/${payroll._id}/paid`, {
        paymentMethod: 'Bank Transfer',
      });
      toast.success('Marked as paid!');
      fetchPayrolls();
    } catch {
      toast.error('Failed to update payment status');
    }
  };

  const handleDownloadPayslip = async (payroll: Payroll) => {
    const toastId = toast.loading('Generating PDF…');
    try {
      const response = await api.get(`/payroll/${payroll._id}/payslip`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      const empName = `${payroll.employee?.firstName || ''}_${payroll.employee?.lastName || ''}`.trim();
      const mon = months[payroll.month - 1]?.label || '';
      link.href = url;
      link.download = `Payslip_${empName}_${mon}_${payroll.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Payslip downloaded!', { id: toastId });
    } catch {
      toast.error('Failed to download payslip', { id: toastId });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'primary'> = {
      Draft: 'default' as 'info',
      Pending: 'warning',
      Approved: 'info',
      Paid: 'success',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (payroll: Payroll) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {payroll.employee?.firstName?.charAt(0)}
            {payroll.employee?.lastName?.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              {payroll.employee?.firstName} {payroll.employee?.lastName}
            </p>
            <p className="text-xs text-slate-500">
              {payroll.employee?.employeeId}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (payroll: Payroll) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {months[payroll.month - 1]?.label} {payroll.year}
        </span>
      ),
    },
    {
      key: 'basicSalary',
      header: 'Basic',
      render: (payroll: Payroll) => (
        <span className="text-slate-700 dark:text-slate-300">{formatCurrency(payroll.basicSalary)}</span>
      ),
    },
    {
      key: 'grossSalary',
      header: 'Gross',
      render: (payroll: Payroll) => (
        <span className="font-bold text-green-500">{formatCurrency(payroll.grossSalary)}</span>
      ),
    },
    {
      key: 'deductions',
      header: 'Deductions',
      render: (payroll: Payroll) => (
        <span className="font-bold text-danger">{formatCurrency(payroll.totalDeductions)}</span>
      ),
    },
    {
      key: 'netSalary',
      header: 'Net Salary',
      render: (payroll: Payroll) => (
        <span className="font-bold text-primary">
          {formatCurrency(payroll.netSalary)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (payroll: Payroll) => getStatusBadge(payroll.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (payroll: Payroll) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPayroll(payroll);
              setViewModal(true);
            }}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          {payroll.status === 'Pending' && hasRole('SUPER_ADMIN', 'ADMIN') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleApprove(payroll);
              }}
              className="p-2 rounded-lg hover:bg-green-500/20 text-green-500 transition-colors"
              title="Approve"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {payroll.status === 'Approved' && hasRole('SUPER_ADMIN', 'ADMIN') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMarkAsPaid(payroll);
              }}
              className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-500 transition-colors"
              title="Mark as Paid"
            >
              <CreditCard className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const myPayslipColumns = [
    {
      key: 'period',
      header: 'Period',
      render: (payroll: Payroll) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {months[payroll.month - 1]?.label} {payroll.year}
        </span>
      ),
    },
    {
      key: 'grossSalary',
      header: 'Gross Salary',
      render: (payroll: Payroll) => (
        <span className="font-bold text-green-500">{formatCurrency(payroll.grossSalary)}</span>
      ),
    },
    {
      key: 'deductions',
      header: 'Deductions',
      render: (payroll: Payroll) => (
        <span className="font-bold text-danger">{formatCurrency(payroll.totalDeductions)}</span>
      ),
    },
    {
      key: 'netSalary',
      header: 'Net Salary',
      render: (payroll: Payroll) => (
        <span className="font-bold text-primary">
          {formatCurrency(payroll.netSalary)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (payroll: Payroll) => getStatusBadge(payroll.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (payroll: Payroll) => (
        <button
          onClick={() => {
            setSelectedPayroll(payroll);
            setViewModal(true);
          }}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          title="View Payslip"
        >
          <FileText className="w-4 h-4" />
        </button>
      ),
    },
  ];

  // Calculate summary
  const totalPayroll = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
  const paidCount = payrolls.filter((p) => p.status === 'Paid').length;
  const pendingCount = payrolls.filter((p) => p.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-fadeIn">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Payroll Management
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage employee salaries and payslips
          </p>
        </div>
        <div className="flex items-center gap-3 animate-fadeIn" style={{ animationDelay: '100ms' }}>
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
            Export
          </Button>
          {hasPermission('PAYROLL_GENERATE') && (
            <Button
              onClick={() => setGenerateModal(true)}
              leftIcon={<Wallet className="w-4 h-4" />}
            >
              Generate Payroll
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalPayroll)}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Payroll</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{paidCount}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paid</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pendingCount}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending</p>
            </div>
          </div>
        </Card>
        <Card variant="stat" padding="sm" className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {payrolls.length}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employees</p>
            </div>
          </div>
        </Card>
      </div>

      {/* My Payslips */}
      <Card className="animate-fadeIn" style={{ animationDelay: '350ms' }}>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          My Payslips
        </h3>
        <Table
          data={myPayslips}
          columns={myPayslipColumns}
          isLoading={isLoading}
          emptyMessage="No payslips found"
        />
      </Card>

      {/* All Payrolls (Admin Only) */}
      {hasRole('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN') && (
        <>
          <Card className="animate-fadeIn" style={{ animationDelay: '400ms' }}>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <Select
                label="Month"
                options={months}
                value={filters.month.toString()}
                onChange={(e) =>
                  setFilters({ ...filters, month: parseInt(e.target.value) })
                }
              />
              <Input
                type="number"
                label="Year"
                value={filters.year}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters({ ...filters, year: parseInt(e.target.value) })
                }
              />
              <Select
                label="Status"
                options={[
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Approved', label: 'Approved' },
                  { value: 'Paid', label: 'Paid' },
                ]}
                placeholder="All Statuses"
                value={filters.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, status: e.target.value })}
              />
            </div>
          </Card>

          <div className="animate-fadeIn" style={{ animationDelay: '450ms' }}>
            <Table
              data={payrolls}
              columns={columns}
              isLoading={isLoading}
              emptyMessage="No payroll records found"
            />
          </div>
        </>
      )}

      {/* Generate Payroll Modal */}
      <Modal
        isOpen={generateModal}
        onClose={() => setGenerateModal(false)}
        title="Generate Payroll"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-500">
            Generate payroll for all employees for{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {months[filters.month - 1]?.label} {filters.year}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Month"
              options={months}
              value={filters.month.toString()}
              onChange={(e) =>
                setFilters({ ...filters, month: parseInt(e.target.value) })
              }
            />
            <Input
              type="number"
              label="Year"
              value={filters.year}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFilters({ ...filters, year: parseInt(e.target.value) })
              }
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setGenerateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkGenerate} isLoading={bulkGenerating}>
              Generate
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Payslip Modal */}
      <Modal
        isOpen={viewModal}
        onClose={() => {
          setViewModal(false);
          setSelectedPayroll(null);
        }}
        title="Payslip Details"
        size="lg"
      >
        {selectedPayroll && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedPayroll.employee?.firstName}{' '}
                  {selectedPayroll.employee?.lastName}
                </h4>
                <p className="text-sm text-slate-500">
                  {selectedPayroll.employee?.employeeId}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Period</p>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {months[selectedPayroll.month - 1]?.label} {selectedPayroll.year}
                </p>
              </div>
            </div>

            {/* Earnings */}
            <div>
              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                Earnings
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Basic Salary</span>
                  <span className="text-slate-900 dark:text-slate-100 font-medium">
                    {formatCurrency(selectedPayroll.basicSalary)}
                  </span>
                </div>
                {selectedPayroll.earnings?.hra && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">HRA</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">
                      {formatCurrency(selectedPayroll.earnings.hra)}
                    </span>
                  </div>
                )}
                {selectedPayroll.earnings?.conveyance && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Conveyance</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">
                      {formatCurrency(selectedPayroll.earnings.conveyance)}
                    </span>
                  </div>
                )}
                {selectedPayroll.earnings?.medical && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Medical</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">
                      {formatCurrency(selectedPayroll.earnings.medical)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-900 dark:text-slate-100">Gross Salary</span>
                  <span className="text-green-500">
                    {formatCurrency(selectedPayroll.grossSalary)}
                  </span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                Deductions
              </h5>
              <div className="space-y-2">
                {selectedPayroll.deductions?.pf && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">PF</span>
                    <span className="text-danger font-medium">
                      -{formatCurrency(selectedPayroll.deductions.pf)}
                    </span>
                  </div>
                )}
                {selectedPayroll.deductions?.esi && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">ESI</span>
                    <span className="text-danger font-medium">
                      -{formatCurrency(selectedPayroll.deductions.esi)}
                    </span>
                  </div>
                )}
                {selectedPayroll.deductions?.tds && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">TDS</span>
                    <span className="text-danger font-medium">
                      -{formatCurrency(selectedPayroll.deductions.tds)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-900 dark:text-slate-100">Total Deductions</span>
                  <span className="text-danger">
                    -{formatCurrency(selectedPayroll.totalDeductions)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Salary */}
            <div className="p-4 rounded-lg bg-primary">
              <div className="flex justify-between items-center">
                <span className="text-white/80 font-bold uppercase tracking-wider text-sm">Net Salary</span>
                <span className="text-2xl font-bold text-white">
                  {formatCurrency(selectedPayroll.netSalary)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={() => selectedPayroll && handleDownloadPayslip(selectedPayroll)}
              >
                Download PDF
              </Button>
              <Button onClick={() => setViewModal(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayrollList;
