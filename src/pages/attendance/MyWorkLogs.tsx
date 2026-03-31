import { useState, useEffect, useCallback } from 'react';
import { attendanceService } from '../../services/api';
import { showAlert } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Calendar, Clock, Filter, User, TrendingUp, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable, { TableColumn } from 'react-data-table-component';

interface WorkLog {
  id: number;
  staff_member_id: number;
  staff_member?: { full_name: string };
  log_date: string;
  log_date_formatted?: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_time?: string | null;
  clock_out_time?: string | null;
  status: string;
  late_minutes: number;
  notes: string | null;
  total_hours?: number;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface WorkLogSummary {
  start_date?: string;
  end_date?: string;
  total_days?: number;
  present_days?: number;
  late_days?: number;
  half_days?: number;
  total_hours?: number;
  average_hours_per_day?: number;
  [key: string]: any; // Allow additional properties
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

export default function MyWorkLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [summary, setSummary] = useState<WorkLogSummary | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Load user data from localStorage on mount
  useEffect(() => {
    const loadUserData = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData: UserData = JSON.parse(userStr);
          setCurrentUser(userData);

          // Check if user has staff member ID
          if (!userData.staff_member_id) {
            showAlert('warning', 'No Staff Record', 'You do not have a staff member record. Please contact administrator.');
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

  const fetchLogs = useCallback(
    async (currentPage: number = 1) => {
      if (!currentUser?.staff_member_id) return;

      setIsLoading(true);
      try {
        const params: Record<string, unknown> = {
          page: currentPage,
          per_page: perPage,
        };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const response = await attendanceService.getMyWorkLogs(params);
        console.log('Work logs response:', response.data); // Debug log
        setLogs(response.data.data || []);
        setMeta(response.data.meta);
      } catch (error: any) {
        console.error('Failed to fetch work logs:', error);

        if (error.response?.status === 401) {
          showAlert('error', 'Session Expired', 'Please login again.');
          navigate('/login');
        } else {
          // showAlert('error', 'Error', 'Failed to fetch work logs');
          console.error('Failed to fetch work logs:', error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser?.staff_member_id, startDate, endDate, perPage, navigate]
  );

  // Fetch logs when page or perPage changes
  useEffect(() => {
    if (currentUser?.staff_member_id) {
      fetchLogs(page);
    }
  }, [page, perPage, fetchLogs, currentUser?.staff_member_id]);

  // Fetch summary when date range changes
  useEffect(() => {
    if (currentUser?.staff_member_id) {
      fetchSummary();
    }
  }, [startDate, endDate, currentUser?.staff_member_id]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const fetchSummary = async () => {
    setIsSummaryLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await attendanceService.getMySummary(params);
      console.log('Summary response:', response.data); // Debug log
      setSummary(response.data || {});
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      setSummary({}); // Set empty object instead of null
    } finally {
      setIsSummaryLoading(false);
    }
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

  const handleFilter = () => {
    setPage(1);
    fetchLogs(1);
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      // This would need an export endpoint in your backend
      showAlert('warning', 'Export', 'Export feature will be implemented soon.');
      // const response = await attendanceService.exportMyWorkLogs(params);
    } catch (error) {
      console.error('Failed to export:', error);
      // showAlert('error', 'Error', 'Failed to export work logs');
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      present: 'bg-solarized-green/10 text-solarized-green',
      absent: 'bg-solarized-red/10 text-solarized-red',
      late: 'bg-solarized-yellow/10 text-solarized-yellow',
      half_day: 'bg-solarized-orange/10 text-solarized-orange',
      leave: 'bg-solarized-blue/10 text-solarized-blue',
    };
    return variants[status] || variants.absent;
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
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString; // Return original if parsing fails
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

  // Safe number formatting
  const safeNumberFormat = (value: any, decimals: number = 1): string => {
    if (value === undefined || value === null || isNaN(Number(value))) {
      return '0.0';
    }
    return Number(value).toFixed(decimals);
  };

  // Calculate overall stats
  const getOverallStats = () => {
    const presentCount = logs.filter(log => log.status === 'present').length;
    const lateCount = logs.filter(log => log.status === 'late').length;
    const absentCount = logs.filter(log => log.status === 'absent').length;
    const totalHours = logs.reduce((total, log) => {
      if (log.total_hours !== undefined && log.total_hours !== null) {
        return total + log.total_hours;
      }
      return total + calculateTotalHours(log.clock_in, log.clock_out);
    }, 0);

    return {
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      totalHours: totalHours,
      averageHours: logs.length > 0 ? totalHours / logs.length : 0
    };
  };

  // Get summary with safe defaults
  const getSafeSummary = () => {
    return {
      start_date: summary?.start_date || startDate,
      end_date: summary?.end_date || endDate,
      total_days: summary?.total_days || 0,
      present_days: summary?.present_days || 0,
      late_days: summary?.late_days || 0,
      half_days: summary?.half_days || 0,
      total_hours: summary?.total_hours || 0,
      average_hours_per_day: summary?.average_hours_per_day || 0
    };
  };

  const safeSummary = getSafeSummary();
  const overallStats = getOverallStats();

  // DataTable columns definition
  const columns: TableColumn<WorkLog>[] = [
    {
      name: 'Date',
      selector: (row) => row.log_date,
      sortable: true,
      minWidth: '180px',
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{formatDate(row.log_date)}</span>
          {/* {row.log_date_formatted && (
            <span className="text-xs text-solarized-base01">
              {row.log_date_formatted}
            </span>
          )} */}
        </div>
      ),
    },
    {
      name: 'Clock In',
      selector: (row) => row.clock_in || '',
      sortable: true,
      minWidth: '120px',
      cell: (row) => {
        const clockInTime = formatTime(row.clock_in, row.clock_in_time);
        return (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-solarized-green" />
            {clockInTime}
          </div>
        );
      },
    },
    {
      name: 'Clock Out',
      selector: (row) => row.clock_out || '',
      sortable: true,
      minWidth: '120px',
      cell: (row) => {
        const clockOutTime = formatTime(row.clock_out, row.clock_out_time);
        return (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-solarized-red" />
            {clockOutTime}
          </div>
        );
      },
    },
    {
      name: 'Total Hours',
      selector: (row) => row.total_hours || 0,
      sortable: true,
      minWidth: '120px',
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
    },
    {
      name: 'Status',
      selector: (row) => row.status,
      sortable: true,
      minWidth: '120px',
      cell: (row) => (
        <Badge className={getStatusBadge(row.status)}>
          {row.status?.replace('_', ' ') || 'Unknown'}
        </Badge>
      ),
    },
    {
      name: 'Late (mins)',
      selector: (row) => row.late_minutes || 0,
      sortable: true,
      minWidth: '100px',
      cell: (row) => (
        <div className={`font-medium ${row.late_minutes > 0 ? 'text-solarized-yellow' : 'text-solarized-green'}`}>
          {formatDuration(row.late_minutes)}
        </div>
      ),
    },
    {
      name: 'Notes',
      selector: (row) => row.notes || '',
      sortable: false,
      minWidth: '200px',
      cell: (row) => (
        <div className="truncate max-w-[200px]" title={row.notes || ''}>
          {row.notes || '-'}
        </div>
      ),
    },
  ];

  // Custom styles for DataTable
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
    cells: {
      style: {
        paddingLeft: '16px',
        paddingRight: '16px',
      },
    },
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 ml-4">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">My Work Logs</h1>
          <p className="text-solarized-base01">View your attendance records and work history</p>
        </div>
        {/* <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportLoading || logs.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {exportLoading ? 'Exporting...' : 'Export'}
          </Button>
        </div> */}
      </div>

      {/* User Info Card */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                <User className="h-6 w-6 text-solarized-blue" />
              </div>
              <div>
                <p className="font-medium text-lg">{currentUser.name}</p>
                <div className="flex items-center gap-4 text-sm text-solarized-base01">
                  <span>{currentUser.email}</span>
                  {/* <span>•</span>
                  <span>Staff ID: {currentUser.staff_member_id || 'N/A'}</span> */}
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-solarized-blue border-solarized-blue">
              {currentUser.role_display || currentUser.primary_role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      {/* <Card className="border-0 shadow-md bg-gradient-to-r from-solarized-blue/10 to-solarized-cyan/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-solarized-blue" />
              <h3 className="text-lg font-semibold text-solarized-base02">Work Summary</h3>
            </div>
            <div className="text-sm text-solarized-base01">
              {safeSummary.start_date} to {safeSummary.end_date}
            </div>
          </div>
          
          {isSummaryLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white/50 border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="text-sm text-solarized-base01">Present Days</div>
                  <div className="text-2xl font-bold text-solarized-green">
                    {safeSummary.present_days || 0}
                  </div>
                  <div className="text-xs text-solarized-base01">
                    out of {safeSummary.total_days || 0} days
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/50 border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="text-sm text-solarized-base01">Total Hours</div>
                  <div className="text-2xl font-bold text-solarized-blue">
                    {safeNumberFormat(safeSummary.total_hours)}
                  </div>
                  <div className="text-xs text-solarized-base01">
                    Avg: {safeNumberFormat(safeSummary.average_hours_per_day)}/day
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/50 border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="text-sm text-solarized-base01">Late Days</div>
                  <div className="text-2xl font-bold text-solarized-yellow">
                    {safeSummary.late_days || 0}
                  </div>
                  <div className="text-xs text-solarized-base01">Attendance</div>
                </CardContent>
              </Card>
              <Card className="bg-white/50 border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="text-sm text-solarized-base01">Half Days</div>
                  <div className="text-2xl font-bold text-solarized-orange">
                    {safeSummary.half_days || 0}
                  </div>
                  <div className="text-xs text-solarized-base01">Attendance</div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card> */}

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Work Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={handleFilter}
                className="bg-solarized-blue hover:bg-solarized-blue/90"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Apply Filter'}
              </Button>
              {/* <Button
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date();
                  lastMonth.setDate(today.getDate() - 30);
                  setStartDate(lastMonth.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
                variant="outline"
              >
                Last 30 Days
              </Button> */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Page Stats */}
      {logs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-solarized-base01">Present (This Page)</div>
              <div className="text-2xl font-bold text-solarized-green">
                {overallStats.present}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-solarized-base01">Late (This Page)</div>
              <div className="text-2xl font-bold text-solarized-yellow">
                {overallStats.late}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-solarized-base01">Total Hours</div>
              <div className="text-2xl font-bold text-solarized-blue">
                {safeNumberFormat(overallStats.totalHours)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-solarized-base01">Avg Hours/Day</div>
              <div className="text-2xl font-bold text-solarized-cyan">
                {safeNumberFormat(overallStats.averageHours)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No work logs found</h3>
              <p className="text-solarized-base01 mt-1">
                {currentUser.staff_member_id
                  ? 'Try adjusting your filter criteria.'
                  : 'You do not have a staff member record. Please contact administrator.'}
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={logs}
              pagination
              paginationServer
              paginationTotalRows={meta?.total ?? 0}
              paginationPerPage={perPage}
              onChangePage={handlePageChange}
              onChangeRowsPerPage={handlePerRowsChange}
              customStyles={customStyles}
              highlightOnHover
              responsive
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}