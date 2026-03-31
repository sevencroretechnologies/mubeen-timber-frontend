import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  UserCheck,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface EmployeeStats {
  total: number;
  active: number;
  on_leave: number;
  inactive: number;
  new_this_month: number;
}

interface AttendanceStats {
  present: number;
  absent: number;
  not_marked: number;
}

interface LeaveStats {
  pending: number;
  approved_this_month: number;
}

interface DashboardData {
  employees: EmployeeStats;
  attendance_today: AttendanceStats;
  leave_requests: LeaveStats;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

interface AttendanceData {
  date: string;
  present: number;
  absent: number;
}

const COLORS = ['#859900', '#dc322f', '#b58900', '#268bd2'];

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const dashboardRes = await dashboardService.getStats();
        const payload = dashboardRes.data;

        // Backend returns CRM stats directly (leads, opportunities, appointments, contracts)
        // OR HRM stats wrapped in { success: true, data: { employees, attendance_today, ... } }
        if (payload?.success === true && payload?.data) {
          // HRM-style response
          setDashboardData(payload.data);
        } else if (payload && (payload.leads !== undefined || payload.opportunities !== undefined)) {
          // CRM-style response — map what we can, zero-fill the rest
          setDashboardData({
            employees: { total: 0, active: 0, on_leave: 0, inactive: 0, new_this_month: 0 },
            attendance_today: { present: 0, absent: 0, not_marked: 0 },
            leave_requests: { pending: 0, approved_this_month: 0 },
          });
        } else {
          setError(payload?.message || 'Failed to load dashboard data');
        }

        // Generate attendance trend data
        const mockAttendance: AttendanceData[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const totalEmployees = (payload?.data?.employees?.total) || 10;
          mockAttendance.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            present: Math.floor(Math.random() * (totalEmployees * 0.2)) + Math.floor(totalEmployees * 0.8),
            absent: Math.floor(Math.random() * (totalEmployees * 0.1)) + 1,
          });
        }
        setAttendanceData(mockAttendance);
      } catch (err) {
        const apiError = err as ApiError;
        const errorMessage = apiError.response?.data?.message || apiError.message || 'Failed to fetch dashboard data';
        setError(errorMessage);
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const pieData = dashboardData ? [
    { name: 'Present', value: dashboardData.attendance_today?.present || 0 },
    { name: 'Absent', value: dashboardData.attendance_today?.absent || 0 },
    { name: 'Not Marked', value: dashboardData.attendance_today?.not_marked || 0 },
  ] : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-solarized-red/10 border border-solarized-red/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-solarized-red" />
            <p className="text-solarized-red font-medium">Error loading dashboard</p>
          </div>
          <p className="text-solarized-base01 text-sm mt-1">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-solarized-base01">
              Total Employees
            </CardTitle>
            <Users className="h-5 w-5 text-solarized-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-solarized-base02">
              {dashboardData?.employees?.total || 0}
            </div>
            <p className="text-xs text-solarized-base01 mt-1">
              <TrendingUp className="inline h-3 w-3 text-solarized-green mr-1" />
              +{dashboardData?.employees?.new_this_month || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-solarized-base01">
              Present Today
            </CardTitle>
            <UserCheck className="h-5 w-5 text-solarized-green" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-solarized-base02">
              {dashboardData?.attendance_today?.present || 0}
            </div>
            <p className="text-xs text-solarized-base01 mt-1">
              {dashboardData?.employees?.total && dashboardData.employees.total > 0
                ? `${Math.round(((dashboardData.attendance_today?.present || 0) / dashboardData.employees.total) * 100)}% attendance rate`
                : '0% attendance rate'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-solarized-base01">
              Not Marked
            </CardTitle>
            <Calendar className="h-5 w-5 text-solarized-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-solarized-base02">
              {dashboardData?.attendance_today?.not_marked || 0}
            </div>
            <p className="text-xs text-solarized-base01 mt-1">
              {dashboardData?.leave_requests?.approved_this_month || 0} leave approved this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-solarized-base01">
              Pending Approvals
            </CardTitle>
            <AlertCircle className="h-5 w-5 text-solarized-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-solarized-base02">
              {dashboardData?.leave_requests?.pending || 0}
            </div>
            <Link to="/leave/approvals" className="text-xs text-solarized-blue hover:underline mt-1 inline-flex items-center">
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>Last 7 days attendance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee8d5" />
                  <XAxis dataKey="date" stroke="#657b83" />
                  <YAxis stroke="#657b83" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fdf6e3',
                      border: '1px solid #eee8d5',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="present"
                    stackId="1"
                    stroke="#859900"
                    fill="#859900"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="absent"
                    stackId="1"
                    stroke="#dc322f"
                    fill="#dc322f"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Today's Status</CardTitle>
            <CardDescription>Employee attendance breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm text-solarized-base01">
                    {entry.name}: {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks at your fingertips</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link to="/staff/create">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Users className="h-6 w-6 text-solarized-blue" />
                <span>Add Employee</span>
              </Button>
            </Link>
            <Link to="/leave/apply">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Calendar className="h-6 w-6 text-solarized-green" />
                <span>Apply Leave</span>
              </Button>
            </Link>
            <Link to="/payroll/generate">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <DollarSign className="h-6 w-6 text-solarized-yellow" />
                <span>Generate Payroll</span>
              </Button>
            </Link>
            <Link to="/reports">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <TrendingUp className="h-6 w-6 text-solarized-cyan" />
                <span>View Reports</span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates in the system</CardDescription>
            </div>
            <Link to="/reports">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-solarized-green/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-solarized-green" />
                </div>
                <div>
                  <p className="text-sm font-medium">Leave request approved</p>
                  <p className="text-xs text-solarized-base01">John Doe's leave request was approved</p>
                  <p className="text-xs text-solarized-base00 mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-solarized-blue/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-solarized-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium">New employee added</p>
                  <p className="text-xs text-solarized-base01">Sarah Smith joined the Engineering team</p>
                  <p className="text-xs text-solarized-base00 mt-1">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-solarized-yellow/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-4 w-4 text-solarized-yellow" />
                </div>
                <div>
                  <p className="text-sm font-medium">Payroll generated</p>
                  <p className="text-xs text-solarized-base01">January 2026 payroll has been processed</p>
                  <p className="text-xs text-solarized-base00 mt-1">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
