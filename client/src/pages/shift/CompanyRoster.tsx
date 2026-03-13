import { useState, useEffect, useCallback } from 'react';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Users,
    Clock,
    RefreshCw,
    Send,
    CheckSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay } from 'date-fns';
import { Card, Button, Modal } from '../../components/ui';
import type { Employee, Shift, Roster, Branch, Department } from '../../types';
import api from '../../lib/api';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_OFF_SHIFT_VALUE = '__WEEK_OFF__';
const WEEK_OFF_SHIFT_LABEL = 'Weekly Off (12:00 AM - 12:00 PM)';

const STATUS_STYLES: Record<string, string> = {
    Scheduled: 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400',
    'Week-Off': 'bg-slate-400/15 border border-slate-400/30 text-slate-500 dark:text-slate-400',
    'On-Leave': 'bg-amber-500/15 border border-amber-400/30 text-amber-600 dark:text-amber-400',
    Holiday: 'bg-rose-500/15 border border-rose-400/30 text-rose-600 dark:text-rose-400',
};

const STATUS_DOT: Record<string, string> = {
    Scheduled: 'bg-emerald-500',
    'Week-Off': 'bg-slate-400',
    'On-Leave': 'bg-amber-500',
    Holiday: 'bg-rose-500',
};

const CompanyRoster = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [rosters, setRosters] = useState<Roster[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedShift, setSelectedShift] = useState('');

    // Bulk assign modal
    const [bulkModal, setBulkModal] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [bulkShift, setBulkShift] = useState('');
    const [bulkStatus, setBulkStatus] = useState<'Scheduled' | 'Week-Off' | 'Holiday'>('Scheduled');
    const [bulkFromDate, setBulkFromDate] = useState('');
    const [bulkToDate, setBulkToDate] = useState('');

    // Cell edit modal
    const [cellModal, setCellModal] = useState<{ open: boolean; employee: Employee | null; date: Date | null; roster: Roster | null }>({
        open: false, employee: null, date: null, roster: null,
    });
    const [cellShift, setCellShift] = useState('');
    const [cellStatus, setCellStatus] = useState<'Scheduled' | 'Week-Off' | 'On-Leave' | 'Holiday'>('Scheduled');

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Fetch all required data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const start = format(monthStart, 'yyyy-MM-dd');
            const end = format(monthEnd, 'yyyy-MM-dd');

            const params: Record<string, string> = { startDate: start, endDate: end, limit: '200' };
            if (selectedBranch) params.branch = selectedBranch;

            const [rosterRes, empRes, shiftRes] = await Promise.all([
                api.get('/rosters', { params }),
                api.get('/employees', { params: { limit: '200', ...(selectedBranch ? { branch: selectedBranch } : {}), ...(selectedDept ? { department: selectedDept } : {}) } }),
                api.get('/shifts/dropdown'),
            ]);

            const rosterData = rosterRes.data.data;
            setRosters(Array.isArray(rosterData?.rosters) ? rosterData.rosters : Array.isArray(rosterData) ? rosterData : []);

            const empData = empRes.data.data;
            setEmployees(Array.isArray(empData?.employees) ? empData.employees : Array.isArray(empData) ? empData : []);

            setShifts(Array.isArray(shiftRes.data.data) ? shiftRes.data.data : []);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e.response?.data?.message || 'Failed to load roster data');
        } finally {
            setIsLoading(false);
        }
    }, [currentMonth, selectedBranch, selectedDept]);

    // Fetch branches and departments once
    useEffect(() => {
        const loadMeta = async () => {
            try {
                const [brRes, deptRes] = await Promise.all([
                    api.get('/branches', { params: { limit: '100' } }),
                    api.get('/departments', { params: { limit: '100' } }),
                ]);
                const brData = brRes.data.data;
                setBranches(Array.isArray(brData?.branches) ? brData.branches : Array.isArray(brData) ? brData : []);
                const deptData = deptRes.data.data;
                setDepartments(Array.isArray(deptData?.departments) ? deptData.departments : Array.isArray(deptData) ? deptData : []);
            } catch {
                // silently ignore
            }
        };
        loadMeta();
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Get roster for specific employee + date
    const getRoster = (employeeId: string, date: Date): Roster | null => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return rosters.find((r) => {
            const rDate = format(new Date(r.rosterDate), 'yyyy-MM-dd');
            const empId = typeof r.employee === 'string' ? r.employee : r.employee?._id;
            return empId === employeeId && rDate === dateStr;
        }) || null;
    };

    // Filter employees
    const filteredEmployees = employees.filter((emp) => {
        if (selectedShift) {
            const hasShift = rosters.some((r) => {
                const empId = typeof r.employee === 'string' ? r.employee : r.employee?._id;
                if (empId !== emp._id) return false;
                if (selectedShift === WEEK_OFF_SHIFT_VALUE) return r.status === 'Week-Off';
                const shiftId = typeof r.shift === 'string' ? r.shift : (r.shift as Shift)?._id;
                return shiftId === selectedShift;
            });
            if (!hasShift) return false;
        }
        return true;
    });

    const openCellEdit = (employee: Employee, date: Date) => {
        const roster = getRoster(employee._id, date);
        setCellModal({ open: true, employee, date, roster });
        setCellShift(typeof roster?.shift === 'string' ? roster.shift : (roster?.shift as Shift)?._id || '');
        setCellStatus((roster?.status as 'Scheduled' | 'Week-Off' | 'On-Leave' | 'Holiday') || 'Scheduled');
    };

    const saveCell = async () => {
        if (!cellModal.employee || !cellModal.date) return;
        try {
            const isWeeklyOffFromShift = cellShift === WEEK_OFF_SHIFT_VALUE;
            const resolvedStatus = isWeeklyOffFromShift ? 'Week-Off' : cellStatus;
            const payload = {
                employee: cellModal.employee._id,
                rosterDate: format(cellModal.date, 'yyyy-MM-dd'),
                shift: resolvedStatus === 'Scheduled' ? (cellShift || undefined) : undefined,
                status: resolvedStatus,
            };
            if (cellModal.roster) {
                await api.put(`/rosters/${cellModal.roster._id}`, payload);
            } else {
                await api.post('/rosters', payload);
            }
            toast.success('Roster updated!');
            setCellModal({ open: false, employee: null, date: null, roster: null });
            fetchData();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e.response?.data?.message || 'Failed to update roster');
        }
    };

    const handleBulkAssign = async () => {
        if (!selectedEmployees.length) return toast.error('Select at least one employee');
        if (!bulkFromDate || !bulkToDate) return toast.error('Select date range');
        try {
            const isWeeklyOffFromShift = bulkShift === WEEK_OFF_SHIFT_VALUE;
            const resolvedStatus = isWeeklyOffFromShift ? 'Week-Off' : bulkStatus;
            await api.post('/rosters/bulk', {
                employees: selectedEmployees,
                shift: resolvedStatus === 'Scheduled' ? (bulkShift || undefined) : undefined,
                fromDate: bulkFromDate,
                toDate: bulkToDate,
                status: resolvedStatus,
            });
            toast.success(`Roster assigned to ${selectedEmployees.length} employee(s)!`);
            setBulkModal(false);
            setSelectedEmployees([]);
            fetchData();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e.response?.data?.message || 'Failed to bulk assign');
        }
    };

    const toggleSelectEmployee = (id: string) => {
        setSelectedEmployees((prev) =>
            prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="animate-fadeIn">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Company Roster</h1>
                    <p className="text-slate-500 mt-1 text-sm">Monthly shift scheduling calendar</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap animate-fadeIn">
                    <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={fetchData}>
                        Refresh
                    </Button>
                    <Button leftIcon={<CheckSquare className="w-4 h-4" />} onClick={() => setBulkModal(true)}>
                        Bulk Assign
                    </Button>
                </div>
            </div>

            {/* Stats + Month Nav */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Employees', value: filteredEmployees.length, color: 'bg-primary/20', icon: <Users className="w-5 h-5 text-primary" /> },
                    { label: 'Shifts', value: shifts.length, color: 'bg-amber-500/20', icon: <Clock className="w-5 h-5 text-amber-500" /> },
                    { label: 'Scheduled', value: rosters.filter((r) => r.status === 'Scheduled').length, color: 'bg-emerald-500/20', icon: <Calendar className="w-5 h-5 text-emerald-500" /> },
                    { label: 'Week-Offs', value: rosters.filter((r) => r.status === 'Week-Off').length, color: 'bg-slate-500/20', icon: <Calendar className="w-5 h-5 text-slate-500" /> },
                ].map((stat, i) => (
                    <Card key={i} variant="stat" padding="sm" className="animate-fadeIn">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Filters + Month Navigator */}
            <Card className="animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center gap-4 flex-wrap">
                    {/* Month navigator */}
                    <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                        <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="px-3 min-w-[120px] text-center">
                            <p className="font-bold text-slate-900 dark:text-slate-100">{format(currentMonth, 'MMMM yyyy')}</p>
                        </div>
                        <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Branch filter */}
                    <div className="flex-1 min-w-[160px]">
                        <select
                            className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                        >
                            <option value="">All Branches</option>
                            {branches.map((b) => (
                                <option key={b._id} value={b._id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Department filter */}
                    <div className="flex-1 min-w-[160px]">
                        <select
                            className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Shift filter */}
                    <div className="flex-1 min-w-[160px]">
                        <select
                            className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            value={selectedShift}
                            onChange={(e) => setSelectedShift(e.target.value)}
                        >
                            <option value="">All Shifts</option>
                            <option value={WEEK_OFF_SHIFT_VALUE}>{WEEK_OFF_SHIFT_LABEL}</option>
                            {shifts.map((s) => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => { setSelectedBranch(''); setSelectedDept(''); setSelectedShift(''); }}
                        className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </Card>

            {/* Roster Calendar Grid */}
            <Card className="animate-fadeIn overflow-hidden p-0">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <table className="w-full text-sm border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    {/* Employee column */}
                                    <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-700 min-w-[180px]">
                                        Employee
                                    </th>
                                    {/* Date columns */}
                                    {allDays.map((day) => {
                                        const dayOfWeek = getDay(day);
                                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                        return (
                                            <th
                                                key={day.toISOString()}
                                                className={`px-1 py-3 text-center min-w-[52px] border-b border-slate-200 dark:border-slate-700 ${isWeekend ? 'bg-rose-50/60 dark:bg-rose-900/10' : ''
                                                    }`}
                                            >
                                                <p className={`text-xs font-bold ${isWeekend ? 'text-rose-500' : 'text-slate-500'}`}>
                                                    {DAY_LABELS[dayOfWeek]}
                                                </p>
                                                <p className={`text-sm font-bold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white' : 'text-slate-900 dark:text-slate-100'
                                                    }`}>
                                                    {format(day, 'd')}
                                                </p>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={allDays.length + 1} className="text-center py-12 text-slate-400">
                                            No employees found for the selected filters
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map((emp, rowIdx) => (
                                        <tr
                                            key={emp._id}
                                            className={`group transition-colors hover:bg-primary/5 ${rowIdx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}
                                        >
                                            {/* Employee info */}
                                            <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-primary/5 px-4 py-2 border-r border-b border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                                        {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">
                                                            {emp.firstName} {emp.lastName}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 truncate">{emp.employeeId}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Roster cells */}
                                            {allDays.map((day) => {
                                                const dayOfWeek = getDay(day);
                                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                                const roster = getRoster(emp._id, day);
                                                const shiftObj = roster?.shift as Shift | undefined;

                                                return (
                                                    <td
                                                        key={day.toISOString()}
                                                        className={`px-1 py-1.5 border-b border-slate-100 dark:border-slate-800 text-center cursor-pointer transition-all ${isWeekend ? 'bg-rose-50/40 dark:bg-rose-900/5' : ''
                                                            }`}
                                                        onClick={() => openCellEdit(emp, day)}
                                                        title={`${emp.firstName} ${emp.lastName} - ${format(day, 'dd MMM')}`}
                                                    >
                                                        {roster ? (
                                                            <div className={`rounded-md px-1 py-1 text-[10px] font-bold leading-tight ${STATUS_STYLES[roster.status]}`}>
                                                                {roster.status === 'Scheduled' && shiftObj ? (
                                                                    <span>{shiftObj.code || shiftObj.name?.slice(0, 4)}</span>
                                                                ) : (
                                                                    <span>{roster.status === 'Week-Off' ? 'WO' : roster.status === 'On-Leave' ? 'OL' : 'HOL'}</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-7 rounded-md border border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center">
                                                                <span className="text-slate-300 dark:text-slate-600 text-[10px]">+</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex-wrap">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Legend:</span>
                    {Object.entries(STATUS_DOT).map(([status, dot]) => (
                        <div key={status} className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                            <span className="text-xs text-slate-600 dark:text-slate-400">{status}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-300" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Weekend</span>
                    </div>
                </div>
            </Card>

            {/* Cell Edit Modal */}
            <Modal
                isOpen={cellModal.open}
                onClose={() => setCellModal({ open: false, employee: null, date: null, roster: null })}
                title={`Assign Roster — ${cellModal.employee ? `${cellModal.employee.firstName} ${cellModal.employee.lastName}` : ''}`}
                size="sm"
            >
                <div className="space-y-4">
                    {cellModal.date && (
                        <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-lg px-3 py-2">
                            <Calendar className="w-4 h-4" />
                            <span className="font-semibold text-sm">{format(cellModal.date, 'EEEE, dd MMMM yyyy')}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1.5">Status</label>
                        <select
                            className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                            value={cellStatus}
                            onChange={(e) => setCellStatus(e.target.value as typeof cellStatus)}
                        >
                            <option value="Scheduled">Scheduled</option>
                            <option value="Week-Off">Week Off</option>
                            <option value="On-Leave">On Leave</option>
                            <option value="Holiday">Holiday</option>
                        </select>
                    </div>

                    {cellStatus === 'Scheduled' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1.5">Shift</label>
                            <select
                                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                                value={cellShift}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setCellShift(value);
                                    if (value === WEEK_OFF_SHIFT_VALUE) setCellStatus('Week-Off');
                                }}
                            >
                                <option value="">-- Select Shift --</option>
                                <option value={WEEK_OFF_SHIFT_VALUE}>{WEEK_OFF_SHIFT_LABEL}</option>
                                {shifts.map((s) => (
                                    <option key={s._id} value={s._id}>
                                        {s.name} ({s.startTime} - {s.endTime})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setCellModal({ open: false, employee: null, date: null, roster: null })}>Cancel</Button>
                        <Button onClick={saveCell}>Save</Button>
                    </div>
                </div>
            </Modal>

            {/* Bulk Assign Modal */}
            <Modal isOpen={bulkModal} onClose={() => setBulkModal(false)} title="Bulk Assign Roster" size="lg">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1.5">From Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                                value={bulkFromDate}
                                onChange={(e) => setBulkFromDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1.5">To Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                                value={bulkToDate}
                                onChange={(e) => setBulkToDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1.5">Status</label>
                            <select
                                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                                value={bulkStatus}
                                onChange={(e) => setBulkStatus(e.target.value as typeof bulkStatus)}
                            >
                                <option value="Scheduled">Scheduled</option>
                                <option value="Week-Off">Week Off</option>
                                <option value="Holiday">Holiday</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1.5">Shift</label>
                            <select
                                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                                value={bulkShift}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setBulkShift(value);
                                    if (value === WEEK_OFF_SHIFT_VALUE) setBulkStatus('Week-Off');
                                }}
                            >
                                <option value="">-- No specific shift --</option>
                                <option value={WEEK_OFF_SHIFT_VALUE}>{WEEK_OFF_SHIFT_LABEL}</option>
                                {shifts.map((s) => (
                                    <option key={s._id} value={s._id}>{s.name} ({s.startTime} - {s.endTime})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Employee Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                Select Employees ({selectedEmployees.length} selected)
                            </label>
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedEmployees(
                                        selectedEmployees.length === filteredEmployees.length ? [] : filteredEmployees.map((e) => e._id)
                                    )
                                }
                                className="text-xs text-primary hover:underline font-medium"
                            >
                                {selectedEmployees.length === filteredEmployees.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto">
                            {filteredEmployees.map((emp) => (
                                <label
                                    key={emp._id}
                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0"
                                >
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-primary rounded"
                                        checked={selectedEmployees.includes(emp._id)}
                                        onChange={() => toggleSelectEmployee(emp._id)}
                                    />
                                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                                        {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                            {emp.firstName} {emp.lastName}
                                        </p>
                                        <p className="text-xs text-slate-500">{emp.employeeId}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setBulkModal(false)}>Cancel</Button>
                        <Button leftIcon={<Send className="w-4 h-4" />} onClick={handleBulkAssign}>
                            Assign ({selectedEmployees.length})
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CompanyRoster;
