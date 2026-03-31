import { useState, useEffect, useCallback } from 'react';
import { attendanceService, staffService } from '../../services/api';
import { showAlert } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { StatusBadge } from '../../components/ui/status-badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, UserCheck, UserX, AlertTriangle, Watch } from 'lucide-react';
import DataTable, { TableColumn } from 'react-data-table-component';

interface StaffMember {
  id: number;
  full_name: string;
}

interface SummaryData {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  half_days: number;
  total_hours: number;
  average_hours_per_day: number;
}

interface ShiftInfo {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  is_night_shift: boolean;
}

interface WorkLog {
  id: number;
  staff_member_id: number;
  staff_member?: {
    full_name: string;
    staff_code?: string;
    email?: string;
  };
  log_date: string;
  log_date_formatted?: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_time?: string | null;
  clock_out_time?: string | null;
  status: string;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  break_minutes: number;
  notes: string | null;
  total_hours?: number;
  shift?: ShiftInfo;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  role_display: string;
  roles: string[];
  permissions: string[];
  primary_role: string;
  primary_role_icon: string;
  primary_role_hierarchy: number;
  staff_member_id: number | null;
}

export default function AttendanceSummary() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Pagination for Work Logs
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(1);

  // Load user data from localStorage on component mount
  useEffect(() => {
    const loadUserData = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData: UserData = JSON.parse(userStr);
          setCurrentUser(userData);

          // Check if user has admin role (admin, org, company, hr)
          const adminRoles = ['admin', 'org', 'company', 'hr'];
          const userRoles = userData.roles || [userData.role];
          const hasAdminRole = userRoles.some(role =>
            adminRoles.includes(role.toLowerCase())
          );
          setIsAdminUser(hasAdminRole);

          // If it's a staff user (non-admin), set their staff ID
          if (!hasAdminRole && userData.staff_member_id) {
            setSelectedStaff(userData.staff_member_id.toString());
          }
        }
      } catch (error) {
        console.error('Failed to parse user data from localStorage:', error);
      }
    };

    loadUserData();
  }, []);

  // Fetch staff list only for admin users
  useEffect(() => {
    const fetchStaff = async () => {
      if (!isAdminUser) {
        return;
      }

      setIsLoadingStaff(true);
      try {
        const response = await staffService.getAll({ per_page: 100 });
        setStaff(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        showAlert('error', 'Error', 'Failed to fetch staff');
      } finally {
        setIsLoadingStaff(false);
      }
    };

    if (isAdminUser) {
      fetchStaff();
    }
  }, [isAdminUser]);

  // Set default date range
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const safeNumberFormat = (value: any, decimals: number = 1): string => {
    if (value === undefined || value === null || isNaN(Number(value))) {
      return '0.0';
    }
    return Number(value).toFixed(decimals);
  };

  // Helper function to extract time from ISO string or use formatted time
  const formatTime = (time: string | null, formattedTime?: string | null): string => {
    // If we have a pre-formatted time from backend, use it
    if (formattedTime) return formattedTime;

    if (!time) return '--:--';

    try {
      // If it's already in HH:MM:SS format
      if (time.match(/^\d{2}:\d{2}:\d{2}$/)) {
        return time.substring(0, 5); // Return HH:MM
      }

      // If it's an ISO datetime string
      if (time.includes('T')) {
        const date = new Date(time);
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      }

      return time;
    } catch (error) {
      console.error('Error formatting time:', error);
      return time;
    }
  };

  // Format date from log_date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Calculate total hours for a work log
  const calculateTotalHours = (clockIn: string | null, clockOut: string | null): number => {
    if (!clockIn || !clockOut) return 0;

    try {
      const inTime = new Date(clockIn);
      const outTime = new Date(clockOut);

      // Handle cases where clock_in/clock_out might be on different days
      const diffMs = outTime.getTime() - inTime.getTime();

      // Convert milliseconds to hours
      return diffMs / (1000 * 60 * 60);
    } catch (error) {
      console.error('Error calculating total hours:', error);
      return 0;
    }
  };

  const fetchSummary = async () => {
    if (!startDate || !endDate) return;
    if (isAdminUser && !selectedStaff) return;

    setIsLoading(true);
    try {
      // Prepare params based on user role
      const params: Record<string, unknown> = {
        start_date: startDate,
        end_date: endDate,
      };

      // Only include staff_member_id for admin users
      if (isAdminUser && selectedStaff) {
        params.staff_member_id = Number(selectedStaff);
      }

      // For non-admin users, the backend will use their own staff_member_id automatically

      const response = await attendanceService.getSummary(params);
      setSummary(response.data.data);

      // Also fetch logs
      setPage(1); // Reset to page 1
      fetchLogs();
    } catch (error: any) {
      console.error('Failed to fetch summary:', error);

      // Show appropriate error message
      if (error.response?.data?.message) {
        showAlert('error', 'Error', error.response.data.message);
      } else {
        showAlert('error', 'Error', 'Failed to fetch attendance summary');
      }

      // Set default data for demo (only in development)
      if (process.env.NODE_ENV === 'development') {
        setSummary({
          total_days: 22,
          present_days: 18,
          absent_days: 2,
          late_days: 3,
          half_days: 1,
          total_hours: 144,
          average_hours_per_day: 8.0,
        });
      } else {
        setSummary(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = useCallback(async () => {
    // Determine if we should fetch. 
    // If admin, we need selectedStaff. If not admin, we just need dates.
    if (isAdminUser && !selectedStaff) return;
    if (!startDate || !endDate) return;

    setIsLogsLoading(true);
    try {
      const params: any = {
        page,
        per_page: perPage,
        paginate: true,
        start_date: startDate,
        end_date: endDate
      };

      let response;
      if (isAdminUser && selectedStaff) {
        params.staff_member_id = Number(selectedStaff);
        // Admin fetching for specific staff uses getWorkLogs
        response = await attendanceService.getWorkLogs(params);
      } else {
        // Regular user fetching their own logs uses getMyWorkLogs
        response = await attendanceService.getMyWorkLogs(params);
      }

      console.log('Work logs response:', response.data);

      const { data, meta } = response.data;
      setLogs(data || []);
      setTotalRows(meta?.total || 0);

    } catch (error) {
      console.error('Failed to fetch work logs:', error);
      setLogs([]);
      setTotalRows(0);
    } finally {
      setIsLogsLoading(false);
    }
  }, [page, perPage, startDate, endDate, selectedStaff, isAdminUser]);

  // Update logs when page changes
  useEffect(() => {
    if ((!isAdminUser || selectedStaff) && startDate && endDate) {
      fetchLogs();
    }
  }, [page, isAdminUser, selectedStaff, startDate, endDate, fetchLogs]);

  // Auto-fetch summary when selectedStaff changes for non-admin users
  useEffect(() => {
    if (!isAdminUser && selectedStaff && startDate && endDate) {
      fetchSummary();
    }
  }, [selectedStaff, startDate, endDate, isAdminUser]);

  const chartData = summary ? [
    { name: 'Present', value: summary.present_days, fill: '#859900' },
    { name: 'Absent', value: summary.absent_days, fill: '#dc322f' },
    { name: 'Late', value: summary.late_days, fill: '#b58900' },
    { name: 'Half Day', value: summary.half_days, fill: '#268bd2' },
  ] : [];

  const formatTotalHours = (totalHours: number | string | null | undefined) => {
    if (!totalHours || totalHours === 0) return '0h 0m';

    const hours = typeof totalHours === 'string' ? parseFloat(totalHours) : totalHours;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    if (h === 0 && m === 0) return '0h 0m';
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes || minutes === 0) return '-';
    
    // For specific time display (if asked), we could use date processing 
    // but here we format as duration Xh Ym
    
    // If > 60 mins, format as hours
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    }
    
    return `${minutes}m`;
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const columns: TableColumn<WorkLog>[] = [
    {
      name: 'Date',
      selector: (row) => row.log_date,
      cell: (row) => (
        <div className="flex flex-col py-2">
          <span className="font-medium">{formatDate(row.log_date)}</span>
          {row.log_date_formatted && (
            <span className="text-xs text-solarized-base01">
              {row.log_date_formatted}
            </span>
          )}
        </div>
      ),
      sortable: true,
      minWidth: '150px',
    },
    {
      name: 'Shift',
      cell: (row) => (
        row.shift ? (
          <div className="text-sm py-2">
            <div className="font-medium">{row.shift.name}</div>
            <div className="text-xs text-solarized-base01">
              {row.shift.start_time} - {row.shift.end_time}
              {row.shift.is_night_shift && (
                <span className="ml-1 text-solarized-violet">🌙</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-solarized-base01 text-sm">-</span>
        )
      ),
      minWidth: '120px',
    },
    {
      name: 'Clock In',
      cell: (row) => (
        <div className="flex items-center gap-1 py-2 whitespace-nowrap">
          <Clock className="h-4 w-4 text-solarized-green flex-shrink-0" />
          <span>{formatTime(row.clock_in, row.clock_in_time)}</span>
        </div>
      ),
      minWidth: '120px',
    },
    {
      name: 'Clock Out',
      cell: (row) => (
        <div className="flex items-center gap-1 py-2 whitespace-nowrap">
          <Clock className="h-4 w-4 text-solarized-red flex-shrink-0" />
          <span>{formatTime(row.clock_out, row.clock_out_time)}</span>
        </div>
      ),
      minWidth: '120px',
    },
    {
      name: 'Hours',
      cell: (row) => {
        let totalHours = row.total_hours;
        if (totalHours === undefined || totalHours === null) {
          totalHours = calculateTotalHours(row.clock_in, row.clock_out);
        }
        return (
          <div className={`font-medium ${totalHours >= 8 ? 'text-solarized-green' : totalHours >= 6 ? 'text-solarized-yellow' : 'text-solarized-red'}`}>
            {safeNumberFormat(totalHours, 1)}h
          </div>
        );
      },
      minWidth: '80px',
    },
    {
      name: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
      minWidth: '100px',
    },
    {
      name: 'Late',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Watch className="h-3 w-3 text-solarized-base01" />
          <span className={`font-medium ${row.late_minutes > 0 ? 'text-solarized-yellow' : 'text-solarized-green'}`}>
            {formatDuration(row.late_minutes)}
          </span>
        </div>
      ),
      minWidth: '80px',
    },
    {
      name: 'Early Leave',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Watch className="h-3 w-3 text-solarized-base01" />
          <span className={`font-medium ${row.early_leave_minutes > 0 ? 'text-solarized-orange' : 'text-solarized-green'}`}>
            {formatDuration(row.early_leave_minutes)}
          </span>
        </div>
      ),
      minWidth: '100px',
    },
    {
      name: 'Overtime',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Watch className="h-3 w-3 text-solarized-base01" />
          <span className={`font-medium ${row.overtime_minutes > 0 ? 'text-solarized-green' : 'text-solarized-base01'}`}>
            {formatDuration(row.overtime_minutes)}
          </span>
        </div>
      ),
      minWidth: '100px',
    },
    {
      name: 'Notes',
      selector: (row) => row.notes || '-',
      cell: (row) => (
        <span className="max-w-[150px] truncate block" title={row.notes || ''}>
          {row.notes || '-'}
        </span>
      ),
      minWidth: '120px',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-solarized-base02">
          {isAdminUser ? 'Attendance Summary' : 'My Attendance Summary'}
        </h1>
        <p className="text-solarized-base01">
          {isAdminUser
            ? 'View attendance statistics and reports'
            : 'View your attendance statistics and summary'}
        </p>
      </div>

      {isAdminUser ? (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Generate Summary</CardTitle>
            <CardDescription>Select an employee and date range to view their attendance summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="staff">Employee</Label>
                <Select
                  value={selectedStaff}
                  onValueChange={setSelectedStaff}
                  disabled={isLoadingStaff}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      isLoadingStaff ? "Loading employees..." : "Select employee"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchSummary}
                  disabled={!selectedStaff || !startDate || !endDate || isLoading}
                  className="w-full bg-solarized-blue hover:bg-solarized-blue/90"
                >
                  {isLoading ? "Generating..." : "Generate"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Your Attendance Summary</CardTitle>
            <CardDescription>
              Viewing attendance summary for {currentUser?.name || 'you'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchSummary}
                  disabled={!startDate || !endDate || isLoading}
                  className="w-full bg-solarized-blue hover:bg-solarized-blue/90"
                >
                  {isLoading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-md">
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-solarized-green/10 flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-solarized-green" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Present Days</p>
                    <p className="text-2xl font-bold text-solarized-base02">{summary.present_days}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-solarized-red/10 flex items-center justify-center">
                    <UserX className="h-6 w-6 text-solarized-red" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Absent Days</p>
                    <p className="text-2xl font-bold text-solarized-base02">{summary.absent_days}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-solarized-yellow/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-solarized-yellow" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Late Days</p>
                    <p className="text-2xl font-bold text-solarized-base02">{summary.late_days}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-solarized-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Total Hours</p>
                    <p className="text-2xl font-bold text-solarized-base02">{formatTotalHours(summary.total_hours)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {summary.half_days > 0 && (
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-solarized-orange/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-solarized-orange" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Half Days</p>
                    <p className="text-2xl font-bold text-solarized-base02">{summary.half_days}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-0 shadow-md lg:col-span-1">
              <CardHeader>
                <CardTitle>Attendance Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee8d5" />
                      <XAxis dataKey="name" stroke="#657b83" />
                      <YAxis stroke="#657b83" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fdf6e3',
                          border: '1px solid #eee8d5',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Work Logs</CardTitle>
                <CardDescription>
                  Showing records for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={logs}
                  progressPending={isLogsLoading}
                  pagination
                  paginationServer
                  paginationTotalRows={totalRows}
                  paginationPerPage={perPage}
                  paginationDefaultPage={page}
                  onChangePage={handlePageChange}
                  onChangeRowsPerPage={handlePerRowsChange}
                  highlightOnHover
                  responsive
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : isAdminUser ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">No Summary Generated</h3>
            <p className="text-solarized-base01 mt-1">
              {isAdminUser && !selectedStaff
                ? 'Select an employee and date range to generate an attendance summary.'
                : 'Select a date range and click generate to view attendance summary.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">No Summary Available</h3>
            <p className="text-solarized-base01 mt-1">
              Select a date range and click refresh to view your attendance summary.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
