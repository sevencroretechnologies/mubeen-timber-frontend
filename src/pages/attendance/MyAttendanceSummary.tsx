import { useState, useEffect } from 'react';
import { attendanceService } from '../../services/api';
import { showAlert } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Calendar, Clock, UserCheck, UserX, AlertTriangle, TrendingUp, Target, Percent, Zap, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SummaryData {
  start_date?: string;
  end_date?: string;
  total_days?: number;
  present_days?: number;
  absent_days?: number;
  late_days?: number;
  half_days?: number;
  total_hours?: number;
  average_hours_per_day?: number;
  working_days?: number;
  attendance_percentage?: number;
  [key: string]: any;
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

interface ApiResponse {
  success: boolean;
  data: SummaryData;
  message: string;
}

export default function MyAttendanceSummary() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  // Load user data from localStorage on component mount
  useEffect(() => {
    const loadUserData = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData: UserData = JSON.parse(userStr);
          setCurrentUser(userData);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Failed to parse user data from localStorage:', error);
        showAlert('error', 'Error', 'Failed to load user data. Please login again.');
        navigate('/login');
      }
    };
    
    loadUserData();
  }, [navigate]);

  // Set default date range (current month)
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Auto-fetch summary when component mounts
  useEffect(() => {
    if (startDate && endDate && currentUser) {
      fetchSummary();
    }
  }, [startDate, endDate, currentUser]);

  const fetchSummary = async () => {
    if (!startDate || !endDate) {
      showAlert('warning', 'Warning', 'Please select both start and end dates');
      return;
    }
    
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        start_date: startDate,
        end_date: endDate,
      };
      
      const response = await attendanceService.getMySummary(params);
      console.log('Summary API response:', response.data); // Debug log
      
      // Extract data from the response structure
      const apiResponse = response.data as ApiResponse;
      if (apiResponse.success && apiResponse.data) {
        setSummary(apiResponse.data);
      } else {
        setSummary({});
      }
    } catch (error: any) {
      console.error('Failed to fetch summary:', error);
      
      if (error.response?.status === 401) {
        showAlert('error', 'Session Expired', 'Please login again.');
        navigate('/login');
      } else if (error.response?.data?.message) {
        showAlert('error', 'Error', error.response.data.message);
      } else {
        showAlert('error', 'Error', 'Failed to fetch attendance summary');
      }
      
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe number formatting
  const safeNumberFormat = (value: any, decimals: number = 1): string => {
    if (value === undefined || value === null || isNaN(Number(value))) {
      return '0.0';
    }
    return Number(value).toFixed(decimals);
  };

  // Calculate absent days (not provided in API)
  const calculateAbsentDays = (): number => {
    if (!summary) return 0;
    
    const totalDays = summary.total_days || 0;
    const presentDays = summary.present_days || 0;
    const lateDays = summary.late_days || 0;
    const halfDays = summary.half_days || 0;
    
    return Math.max(0, totalDays - presentDays - lateDays - halfDays);
  };

  // Calculate attendance percentage
  const calculateAttendancePercentage = (): number => {
    if (!summary) return 0;
    
    const totalDays = summary.total_days || 0;
    const presentDays = summary.present_days || 0;
    if (totalDays === 0) return 0;
    
    return (presentDays / totalDays) * 100;
  };

  // Get safe summary data with defaults and calculations
  const getSafeSummary = (): SummaryData => {
    if (!summary) {
      return {
        start_date: startDate,
        end_date: endDate,
        total_days: 0,
        present_days: 0,
        absent_days: 0,
        late_days: 0,
        half_days: 0,
        total_hours: 0,
        average_hours_per_day: 0,
        attendance_percentage: 0,
      };
    }
    
    const absentDays = calculateAbsentDays();
    const attendancePercentage = calculateAttendancePercentage();
    
    return {
      start_date: summary.start_date || startDate,
      end_date: summary.end_date || endDate,
      total_days: summary.total_days || 0,
      present_days: summary.present_days || 0,
      absent_days: absentDays,
      late_days: summary.late_days || 0,
      half_days: summary.half_days || 0,
      total_hours: summary.total_hours || 0,
      average_hours_per_day: summary.average_hours_per_day || 0,
      attendance_percentage: attendancePercentage,
    };
  };

  const safeSummary = getSafeSummary();

  // Prepare chart data
  const barChartData = [
    { name: 'Present', value: safeSummary.present_days || 0, fill: '#859900' },
    { name: 'Absent', value: safeSummary.absent_days || 0, fill: '#dc322f' },
    { name: 'Late', value: safeSummary.late_days || 0, fill: '#b58900' },
    { name: 'Half Day', value: safeSummary.half_days || 0, fill: '#cb4b16' },
  ];

  const pieChartData = [
    { name: 'Present', value: safeSummary.present_days || 0 },
    { name: 'Absent', value: safeSummary.absent_days || 0 },
    { name: 'Late', value: safeSummary.late_days || 0 },
    { name: 'Half Day', value: safeSummary.half_days || 0 },
  ];

  const COLORS = ['#859900', '#dc322f', '#b58900', '#cb4b16'];

  // Format date range for display
  const formatDateRange = () => {
    if (!safeSummary.start_date || !safeSummary.end_date) return '';
    
    const format = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    return `${format(safeSummary.start_date)} - ${format(safeSummary.end_date)}`;
  };

  // Calculate working days (excludes weekends)
  const calculateWorkingDays = () => {
    if (!safeSummary.start_date || !safeSummary.end_date) return safeSummary.total_days || 0;
    
    try {
      const start = new Date(safeSummary.start_date);
      const end = new Date(safeSummary.end_date);
      let workingDays = 0;
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) { // Not Sunday (0) or Saturday (6)
          workingDays++;
        }
      }
      
      return workingDays;
    } catch (error) {
      return safeSummary.total_days || 0;
    }
  };

  const workingDays = calculateWorkingDays();

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
      <div>
        <h1 className="text-2xl font-bold text-solarized-base02">My Attendance Summary</h1>
        <p className="text-solarized-base01">
          View your personal attendance statistics and insights
        </p>
      </div>

      {/* User Info Card */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-solarized-blue" />
              </div>
              <div>
                <p className="font-medium text-lg">{currentUser.name}</p>
                <div className="flex items-center gap-4 text-sm text-solarized-base01">
                  <span>{currentUser.email}</span>
                  {/* {currentUser.staff_member_id && (
                    <>
                      <span>•</span>
                      <span>Staff ID: {currentUser.staff_member_id}</span>
                    </>
                  )} */}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-solarized-base01">Date Range</p>
              <p className="font-medium">{formatDateRange()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Filter Summary</CardTitle>
          <CardDescription>
            Select a date range to view your attendance summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
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
            <div className="flex items-end gap-2">
              <Button
                onClick={fetchSummary}
                disabled={!startDate || !endDate || isLoading}
                className="w-full bg-solarized-blue hover:bg-solarized-blue/90"
              >
                {isLoading ? "Refreshing..." : "Refresh Summary"}
              </Button>
              <Button
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  setStartDate(firstDay.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
                variant="outline"
              >
                This Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
          {/* Key Metrics */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-solarized-green/10 flex items-center justify-center">
                    <Percent className="h-6 w-6 text-solarized-green" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Attendance %</p>
                    <p className="text-2xl font-bold text-solarized-green">
                      {safeNumberFormat(safeSummary.attendance_percentage, 1)}%
                    </p>
                    <p className="text-xs text-solarized-base01">
                      {safeSummary.present_days || 0} of {safeSummary.total_days || 0} days
                    </p>
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
                    <p className="text-2xl font-bold text-solarized-blue">
                      {safeNumberFormat(safeSummary.total_hours)}
                    </p>
                    <p className="text-xs text-solarized-base01">
                      Avg: {safeNumberFormat(safeSummary.average_hours_per_day)}/day
                    </p>
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
                    <p className="text-2xl font-bold text-solarized-yellow">
                      {safeSummary.late_days || 0}
                    </p>
                    {/* <p className="text-xs text-solarized-base01">
                      {safeSummary.late_days > 0 ? 'Need improvement' : 'Excellent'}
                    </p> */}
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
                    <p className="text-2xl font-bold text-solarized-red">
                      {safeSummary.absent_days || 0}
                    </p>
                    <p className="text-xs text-solarized-base01">
                      Total days missed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Statistics */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Present Days</CardTitle>
                <CardDescription>Regular attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-solarized-green">
                      {safeSummary.present_days || 0}
                    </p>
                    <p className="text-sm text-solarized-base01">
                      out of {safeSummary.total_days || 0} total days
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-solarized-green/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-solarized-green" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Working Days</CardTitle>
                <CardDescription>Business days in period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-solarized-blue">
                      {workingDays}
                    </p>
                    <p className="text-sm text-solarized-base01">
                      From {safeSummary.start_date} to {safeSummary.end_date}
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                    <Target className="h-8 w-8 text-solarized-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Half Days</CardTitle>
                <CardDescription>Partial attendance days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-solarized-orange">
                      {safeSummary.half_days || 0}
                    </p>
                    <p className="text-sm text-solarized-base01">
                      Partial attendance records
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-solarized-orange/10 flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-solarized-orange" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 lg:grid-cols-1">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Attendance Breakdown</CardTitle>
                <CardDescription>
                  Distribution of your attendance status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee8d5" />
                      <XAxis dataKey="name" stroke="#657b83" />
                      <YAxis stroke="#657b83" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fdf6e3',
                          border: '1px solid #eee8d5',
                          borderRadius: '8px',
                        }}
                        formatter={(value) => [`${value} days`, 'Count']}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[4, 4, 0, 0]}
                        fill="#8884d8"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Attendance Distribution</CardTitle>
                <CardDescription>
                  Percentage breakdown by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fdf6e3',
                          border: '1px solid #eee8d5',
                          borderRadius: '8px',
                        }}
                        formatter={(value) => [`${value} days`, 'Count']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card> */}
          </div>
        </>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">No Summary Available</h3>
            <p className="text-solarized-base01 mt-1 mb-4">
              Select a date range and click "Refresh Summary" to view your attendance summary.
            </p>
            <Button
              onClick={fetchSummary}
              disabled={!startDate || !endDate || isLoading}
              className="bg-solarized-blue hover:bg-solarized-blue/90"
            >
              Generate Summary
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}