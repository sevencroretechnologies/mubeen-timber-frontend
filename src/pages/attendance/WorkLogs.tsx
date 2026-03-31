import { useState, useEffect, useCallback } from 'react';
import { attendanceService, staffService } from '../../services/api';
import { showAlert } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

import { StatusBadge } from '../../components/ui/status-badge';
import { Calendar, Clock, Filter, MapPin, ShieldAlert, Watch } from 'lucide-react';
import DataTable, { TableColumn } from 'react-data-table-component';
import { useNavigate } from 'react-router-dom';

interface StaffMember {
  id: number;
  full_name: string;
  staff_code?: string;
  email?: string;
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
  clock_in_latitude?: number | null;
  clock_in_longitude?: number | null;
  clock_out_latitude?: number | null;
  clock_out_longitude?: number | null;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
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
  org_id: number | null;
  company_id: number | null;
}

export default function WorkLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [staffMemberId, setStaffMemberId] = useState<string>('');
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [perPage, setPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const safeNumberFormat = (value: any, decimals: number = 1): string => {
    if (value === undefined || value === null || isNaN(Number(value))) {
      return '0.0';
    }
    return Number(value).toFixed(decimals);
  };

  // Load user data from localStorage on mount
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

          // If not admin, redirect to My Work Logs
          if (!hasAdminRole) {
            showAlert('warning', 'Access Restricted', 'You do not have permission to view all work logs. Redirecting to your work logs.');
            navigate('/my-work-logs');
            return;
          }
        } else {
          // No user data, redirect to login
          navigate('/login');
          return;
        }
      } catch (error) {
        console.error('Failed to parse user data from localStorage:', error);
        showAlert('error', 'Error', 'Failed to load user data. Please login again.');
        navigate('/login');
      }
    };

    loadUserData();
  }, [navigate]);

  // Fetch staff list only for admin users
  useEffect(() => {
    const fetchStaff = async () => {
      if (!isAdminUser) return;

      setIsLoadingStaff(true);
      try {
        const response = await staffService.getAll({ per_page: 100 });
        setStaffMembers(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        showAlert('error', 'Error', 'Failed to fetch staff list');
      } finally {
        setIsLoadingStaff(false);
      }
    };

    if (isAdminUser) {
      fetchStaff();
    }
  }, [isAdminUser]);

  // ================= FETCH WORK LOGS =================
  const fetchLogs = useCallback(
    async (currentPage: number = 1) => {
      if (!isAdminUser) return;

      setIsLoading(true);
      try {
        const params: Record<string, unknown> = {
          page: currentPage,
          per_page: perPage,
        };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (staffMemberId) params.staff_member_id = staffMemberId;

        if (sortField) {
          params.order_by = sortField;
          params.order = sortDirection;
        }

        const response = await attendanceService.getWorkLogs(params);
        console.log('Work logs response:', response.data);

        setLogs(response.data.data || []);
        setMeta(response.data.meta);
      } catch (error: any) {
        console.error('Failed to fetch work logs:', error);

        if (error.response?.status === 403) {
          showAlert('error', 'Access Denied', 'You do not have permission to view all work logs.');
          navigate('/my-work-logs');
        } else if (error.response?.status === 401) {
          showAlert('error', 'Session Expired', 'Please login again.');
          navigate('/login');
        } else {
          console.error('Failed to fetch work logs:', error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, sortField, sortDirection, startDate, endDate, staffMemberId, isAdminUser, navigate]
  );

  // Fetch work logs when filters or page changes
  useEffect(() => {
    if (isAdminUser) {
      fetchLogs(page);
    }
  }, [page, fetchLogs, isAdminUser]);

  // ================= PAGINATION =================
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  
  // Add this function after your other helper functions (formatTime, formatDate, etc.)
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

  // ================= SORTING =================
  const handleSort = (column: any, sortDir: 'asc' | 'desc') => {
    const fieldMap: Record<string, string> = {
      'Employee': 'staff_member.full_name',
      'Date': 'log_date',
    };

    const field = fieldMap[column.name] || column.name;
    setSortField(field);
    setSortDirection(sortDir);
    setPage(1);
  };

  const handleFilter = () => {
    setPage(1);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStaffMemberId('');
    setPage(1);
  };

// Copy this exact function from your clock-in page to MyWorkLogs
const formatTimeString = (timeString: string | null | undefined): string => {
    if (!timeString) return '--:--';

    try {
        // Check if it's a datetime string from backend (in UTC)
        // Format: "YYYY-MM-DD HH:MM:SS" or ISO format
        if (timeString.includes(' ') || timeString.includes('T')) {
            // Replace space with T and add 'Z' to indicate UTC timezone
            const isoString = (timeString.includes('T') ? timeString : timeString.replace(' ', 'T')) + 'Z';
            const date = new Date(isoString);

            // JavaScript automatically converts UTC to local timezone when parsing ISO strings with Z
            // Use same format as formatTime: HH:MM:SS AM/PM
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        }

        // Handle time-only strings (fallback for legacy format)
        const timeParts = timeString.split(':');

        if (timeParts.length >= 2) {
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            const seconds = timeParts.length >= 3 ? parseInt(timeParts[2], 10) : 0;

            // Format as HH:MM:SS AM/PM
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12; // Convert 0 to 12
            const displayMinutes = minutes.toString().padStart(2, '0');
            const displaySeconds = seconds.toString().padStart(2, '0');

            return `${displayHours}:${displayMinutes}:${displaySeconds} ${period}`;
        }

        // If we can't parse it, return the original string
        return timeString;
    } catch (error) {
        console.error('Error formatting time:', error, timeString);
        return timeString;
    }
};

// Update formatTime to use this function
const formatTime = (time: string | null, fallbackTime?: string | null): string => {
    // Always use formatTimeString
    return formatTimeString(time || fallbackTime);
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
        // Handle ISO format (2026-02-03T06:12:46Z)
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

  // Get total hours for all displayed logs
  const getTotalHours = () => {
    return logs.reduce((total, log) => {
      if (log.total_hours !== undefined && log.total_hours !== null) {
        return total + log.total_hours;
      }
      return total + calculateTotalHours(log.clock_in, log.clock_out);
    }, 0);
  };

  // Get stats for current page
  const getStats = () => {
    const presentCount = logs.filter(log => log.status === 'present' || log.status === 'late').length;
    const lateCount = logs.filter(log => log.status === 'late').length;
    const absentCount = logs.filter(log => log.status === 'absent').length;
    const halfDayCount = logs.filter(log => log.status === 'half_day').length;
    const leaveCount = logs.filter(log => log.status === 'leave' || log.status === 'on_leave').length;

    return {
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      halfDay: halfDayCount,
      leave: leaveCount,
      total: logs.length
    };
  };

  
  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes || minutes === 0) return '-';

    // If > 60 mins, format as hours
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    }

    return `${minutes}m`;
  };

  // Calculate total minutes
  const getTotalMinutes = (field: keyof WorkLog) => {
    return logs.reduce((total, log) => total + (log[field] as number || 0), 0);
  };

  // ================= TABLE COLUMNS =================
  const columns: TableColumn<WorkLog>[] = [
    {
      name: 'Date',
      selector: (row) => row.log_date,
      cell: (row) => (
        <div className="flex flex-col py-2">
          <span className="font-medium">{formatDate(row.log_date)}</span>
          {/* {row.log_date_formatted && (
            <span className="text-xs text-solarized-base01">
              {row.log_date_formatted}
            </span>
          )} */}
        </div>
      ),
      sortable: true,
      minWidth: '150px',
    },
    {
      name: 'Employee',
      selector: (row) => row.staff_member?.full_name || '',
      cell: (row) => (
        <div className="py-2">
          <div className="font-medium">{row.staff_member?.full_name || 'Unknown'}</div>
          {row.staff_member?.staff_code && (
            <div className="text-xs text-solarized-base01">
              ID: {row.staff_member.staff_code}
            </div>
          )}
        </div>
      ),
      sortable: true,
      minWidth: '180px',
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
      // minWidth: '120px',
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
      name: 'Clock In Location',
      cell: (row) => (
        row.clock_in_latitude && row.clock_in_longitude ? (
          <div className="flex justify-center items-center w-full py-2">
            <a
              href={`https://www.google.com/maps/@${row.clock_in_latitude},${row.clock_in_longitude},21z`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-solarized-green hover:text-solarized-green/80 cursor-pointer text-sm font-medium"
              title="View on Google Maps"
            >
              <MapPin className="h-5 w-5" />
              <span>In</span>
            </a>
          </div>
        ) : (
          <div className="flex justify-center items-center w-full">
            <span className="text-solarized-base01 text-sm">-</span>
          </div>
        )
      ),
      minWidth: '150px',
      center: true,
    },
    {
      name: 'Clock Out Location',
      cell: (row) => (
        row.clock_out_latitude && row.clock_out_longitude ? (
          <div className="flex justify-center items-center w-full py-2">
            <a
              href={`https://www.google.com/maps/@${row.clock_out_latitude},${row.clock_out_longitude},21z`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-solarized-red hover:text-solarized-red/80 cursor-pointer text-sm font-medium"
              title="View on Google Maps"
            >
              <MapPin className="h-5 w-5" />
              <span>Out</span>
            </a>
          </div>
        ) : (
          <div className="flex justify-center items-center w-full">
            <span className="text-solarized-base01 text-sm">-</span>
          </div>
        )
      ),
      minWidth: '160px',
      center: true,
    },
    {
      name: 'Hours',
      cell: (row) => {
        let totalHours = row.total_hours;
        if (totalHours === undefined || totalHours === null) {
          totalHours = calculateTotalHours(row.clock_in, row.clock_out);
        }

        // Use the new formatTotalHours function
        const formattedHours = formatTotalHours(totalHours);

        return (
          <div className={`font-medium ${totalHours >= 8 ? 'text-solarized-green' : totalHours >= 6 ? 'text-solarized-yellow' : 'text-solarized-red'}`}>
            {formattedHours}
          </div>
        );
      },
      // minWidth: '80px',
    },
    {
      name: 'Status',
      cell: (row) => (
        <StatusBadge status={row.status} />
      ),
      // minWidth: '100px',
    },
    {
      name: 'Late',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Watch className="h-4 w-4 text-solarized-base01" />
          <span className={`font-medium ${row.late_minutes > 0 ? 'text-solarized-yellow' : 'text-solarized-green'}`}>
            {/* {row.late_minutes || 0} */}
            {formatDuration(row.late_minutes)}
          </span>
        </div>
      ),
      // minWidth: '80px',
    },
    {
      name: 'Early Leave',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Watch className="h-4 w-4 text-solarized-base01" />
          <span className={`font-medium ${row.early_leave_minutes > 0 ? 'text-solarized-orange' : 'text-solarized-green'}`}>
            {formatDuration(row.early_leave_minutes)}
          </span>
        </div>
      ),
      minWidth: '120px',
    },
    {
      name: 'Overtime',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Watch className="h-4 w-4 text-solarized-base01" />
          <span className={`font-medium ${row.overtime_minutes > 0 ? 'text-solarized-green' : 'text-solarized-base01'}`}>
            {row.overtime_minutes || 0}
          </span>
        </div>
      ),
      // minWidth: '100px',
    },

    {
      name: 'Notes',
      selector: (row) => row.notes || '-',
      cell: (row) => (
        <div className="max-w-[150px] truncate" title={row.notes || ''}>
          {row.notes || '-'}
        </div>
      ),
      // minWidth: '120px',
    },
  ];

  // ================= CUSTOM STYLES =================
  const customStyles = {
    headRow: {
      style: {
        backgroundColor: '#f9fafb',
        borderBottomWidth: '1px',
        borderBottomColor: '#e5e7eb',
        borderBottomStyle: 'solid' as const,
        minHeight: '56px',
      },
    },
    headCells: {
      style: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        paddingLeft: '16px',
        paddingRight: '16px',
      },
    },
  };

  if (!isAdminUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border-0 shadow-md max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-16 w-16 text-solarized-yellow mx-auto mb-4" />
            <h3 className="text-xl font-bold text-solarized-base02 mb-2">Access Restricted</h3>
            <p className="text-solarized-base01 mb-4">
              You do not have permission to view all work logs. This page is only accessible to administrators.
            </p>
            <Button
              onClick={() => navigate('/my-work-logs')}
              className="bg-solarized-blue hover:bg-solarized-blue/90"
            >
              View My Work Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-solarized-base02">Work Logs</h1>
        <p className="text-solarized-base01">
          View attendance records for all staff members
          {currentUser && <span className="text-solarized-blue ml-2">• Admin Access</span>}
        </p>
      </div>

      {/* Stats Summary */}
      {logs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-solarized-base01">Total Records</div>
              <div className="text-2xl font-bold">{getStats().total}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-solarized-base01">Present</div>
              <div className="text-2xl font-bold text-solarized-green">{getStats().present}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-solarized-base01">Late</div>
              <div className="text-2xl font-bold text-solarized-yellow">{getStats().late}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-solarized-base01">Absent</div>
              <div className="text-2xl font-bold text-solarized-red">{getStats().absent}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-solarized-base01">Leave</div>
              <div className="text-2xl font-bold text-solarized-blue">{getStats().leave}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-solarized-base01">Total Hours</div>
              <div className="text-2xl font-bold text-solarized-cyan">{safeNumberFormat(getTotalHours(), 1)}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-solarized-base01">Late Minutes</div>
              <div className="text-2xl font-bold text-solarized-orange">{getTotalMinutes('late_minutes')}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Work Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff_member">Staff Member</Label>
              <select
                id="staff_member"
                className="w-full px-3 py-2 border border-solarized-base1 rounded-md bg-white dark:bg-solarized-base03"
                value={staffMemberId}
                onChange={(e) => setStaffMemberId(e.target.value)}
                disabled={isLoadingStaff}
              >
                <option value="">All Staff</option>
                {staffMembers.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name} {staff.staff_code ? `(${staff.staff_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 col-span-1 md:col-span-2">
              <Button
                onClick={handleFilter}
                className="bg-solarized-blue hover:bg-solarized-blue/90 flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Apply Filter'}
              </Button>
              <Button
                onClick={clearFilters}
                variant="outline"
                disabled={isLoading || (!startDate && !endDate && !staffMemberId)}
                className="flex-1"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          {!isLoading && logs.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No work logs found</h3>
              <p className="text-solarized-base01 mt-1">
                {startDate || endDate || staffMemberId
                  ? 'Try adjusting your filter criteria.'
                  : 'No work logs available for the selected period.'}
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={logs}
              progressPending={isLoading}
              pagination
              paginationServer
              paginationTotalRows={meta?.total ?? 0}
              paginationPerPage={perPage}
              paginationDefaultPage={page}
              onChangePage={handlePageChange}
              onChangeRowsPerPage={handlePerRowsChange}
              onSort={handleSort}
              customStyles={customStyles}
              sortServer
              highlightOnHover
              responsive
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}