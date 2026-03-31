import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGeolocated } from 'react-geolocated';
import { attendanceService, leaveService } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Clock,
  Calendar,
  LogIn,
  LogOut,
  User,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Timer,
  MapPin,
} from 'lucide-react';

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  staff_member_id: number | null;
  organization_name?: string;
  company_name?: string;
}

interface CurrentStatus {
  status: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
}

interface LeaveBalance {
  category_id: number;
  category_name: string;
  allocated: number;
  used: number;
  remaining: number;
}

interface RecentLeaveRequest {
  id: number;
  start_date: string;
  end_date: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

const formatTimeString = (timeString: string | null | undefined) => {
  if (!timeString) return '--:--';

  try {
    if (timeString.includes(' ') || timeString.includes('T')) {
      const isoString = (timeString.includes('T') ? timeString : timeString.replace(' ', 'T')) + 'Z';
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }
    return timeString;
  } catch (error) {
    console.error('Error formatting time:', error, timeString);
    return timeString;
  }
};

export default function StaffDashboard() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentLeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isLoadingLeave, setIsLoadingLeave] = useState(false);
  const [isClocking, setIsClocking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Geolocation hook for capturing staff location during check-in/out
  const { coords, isGeolocationAvailable, isGeolocationEnabled, getPosition } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    },
    watchPosition: false,
    userDecisionTimeout: 10000,
  });

  useEffect(() => {
    const loadUserData = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData: UserData = JSON.parse(userStr);
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    };

    loadUserData();
    setIsLoading(false);

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchCurrentStatus = async () => {
      if (!currentUser?.staff_member_id) return;

      setIsLoadingStatus(true);
      try {
        const response = await attendanceService.getCurrentStatusSelf();
        setCurrentStatus(response.data.data);
      } catch (error) {
        console.error('Failed to fetch current status:', error);
        setCurrentStatus({
          status: 'not_clocked_in',
          clock_in: null,
          clock_out: null,
          total_hours: null,
        });
      } finally {
        setIsLoadingStatus(false);
      }
    };

    fetchCurrentStatus();
  }, [currentUser]);

  useEffect(() => {
    const fetchLeaveData = async () => {
      if (!currentUser?.staff_member_id) return;

      setIsLoadingLeave(true);
      try {
        // Fetch leave balances
        const balancesRes = await leaveService.getMyBalances();
        if (balancesRes.data.success) {
          setLeaveBalances(balancesRes.data.data || []);
        }

        // Fetch recent leave requests
        const requestsRes = await leaveService.getMyRequests({ per_page: 5 });
        console.log('Leave requests response:', requestsRes.data);
        if (requestsRes.data.success) {
          const requests = requestsRes.data.data || [];
          console.log('Recent requests:', requests);
          console.log('Pending count:', requests.filter((r: any) => r.approval_status === 'pending').length);
          setRecentRequests(requests);
        }
      } catch (error) {
        console.error('Failed to fetch leave data:', error);
      } finally {
        setIsLoadingLeave(false);
      }
    };

    fetchLeaveData();
  }, [currentUser]);

  const handleClockIn = async () => {
    setIsClocking(true);
    setMessage(null);

    // Check if geolocation is available and enabled
    if (!isGeolocationAvailable) {
      setMessage({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      setIsClocking(false);
      return;
    }

    if (!isGeolocationEnabled) {
      setMessage({ type: 'error', text: 'Please enable location services to clock in.' });
      setIsClocking(false);
      return;
    }

    // Wait for location if not available yet
    if (!coords) {
      getPosition();
      setMessage({ type: 'error', text: 'Fetching your location... Please try again in a moment.' });
      setIsClocking(false);
      return;
    }

    try {
      const locationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      };
      const response = await attendanceService.clockInSelf(locationData);
      setCurrentStatus(response.data.data);
      setMessage({
        type: 'success',
        text: `Successfully clocked in! Location: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clock in';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    setIsClocking(true);
    setMessage(null);

    // Check if geolocation is available and enabled
    if (!isGeolocationAvailable) {
      setMessage({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      setIsClocking(false);
      return;
    }

    if (!isGeolocationEnabled) {
      setMessage({ type: 'error', text: 'Please enable location services to clock out.' });
      setIsClocking(false);
      return;
    }

    // Wait for location if not available yet
    if (!coords) {
      getPosition();
      setMessage({ type: 'error', text: 'Fetching your location... Please try again in a moment.' });
      setIsClocking(false);
      return;
    }

    try {
      const locationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      };
      const response = await attendanceService.clockOutSelf(locationData);
      setCurrentStatus(response.data.data);
      setMessage({
        type: 'success',
        text: `Successfully clocked out! Location: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clock out';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsClocking(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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

  const hasStaffMember = !!currentUser?.staff_member_id;
  const isClockedIn = currentStatus?.status === 'clocked_in';

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
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">
            Welcome back, {currentUser?.name}!
          </h1>
          <p className="text-solarized-base01">
            {hasStaffMember ? 'Here\'s your attendance and leave overview' : 'Manage your HR activities'}
          </p>
        </div>
        <div className="text-sm text-solarized-base01">
          <div className="text-2xl font-bold text-solarized-blue">{formatTime(currentTime)}</div>
          <div>{formatDate(currentTime)}</div>
        </div>
      </div>

      {!hasStaffMember && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are not linked to a staff member profile. Some features may not be available.
          </AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-solarized-base01">
              Today's Status
            </CardTitle>
            <User className="h-5 w-5 text-solarized-blue" />
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-solarized-base02 capitalize">
                  {currentStatus?.status === 'clocked_in' && 'Clocked In'}
                  {currentStatus?.status === 'clocked_out' && 'Clocked Out'}
                  {currentStatus?.status === 'not_clocked_in' && 'Not Clocked In'}
                  {!currentStatus && '--'}
                </div>
                <p className="text-xs text-solarized-base01 mt-1">
                  {currentStatus?.clock_in && `In: ${formatTimeString(currentStatus.clock_in)}`}
                  {currentStatus?.clock_out && ` | Out: ${formatTimeString(currentStatus.clock_out)}`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-solarized-base01">
              Hours Today
            </CardTitle>
            <Timer className="h-5 w-5 text-solarized-green" />
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-solarized-base02">
                  {formatTotalHours(currentStatus?.total_hours)}
                </div>
                <p className="text-xs text-solarized-base01 mt-1">
                  Total working hours today
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-solarized-base01">
              Leave Balance
            </CardTitle>
            <Calendar className="h-5 w-5 text-solarized-yellow" />
          </CardHeader>
          <CardContent>
            {isLoadingLeave ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <>
                  <div className="text-2xl font-bold text-solarized-base02">
                    {Math.floor(leaveBalances.reduce((acc, curr) => acc + curr.remaining, 0))} days
                  </div>
                  <p className="text-xs text-solarized-base01 mt-1">
                    Total Available Leave
                  </p>
                </>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-solarized-base01">
              Pending Requests
            </CardTitle>
            <FileText className="h-5 w-5 text-solarized-orange" />
          </CardHeader>
          <CardContent>
            {isLoadingLeave ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-solarized-base02">
                  {recentRequests.filter(r => r.approval_status === 'pending').length}
                </div>
                <Link to="/leave/requests" className="text-xs text-solarized-blue hover:underline mt-1 inline-flex items-center">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clock In/Out Actions */}
      {hasStaffMember && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              {currentStatus?.status === 'clocked_out'
                ? 'Your attendance has been recorded for today.'
                : 'Record your attendance for today'}
            </CardDescription>
          </CardHeader>
          {currentStatus?.status !== 'clocked_out' ? (
            <CardContent>
              {/* Location Status Indicator */}
              <div className="mb-4 p-3 bg-solarized-base3 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className={`h-4 w-4 ${coords ? 'text-solarized-green' : 'text-solarized-yellow'}`} />
                  <span className="text-sm text-solarized-base01">
                    {!isGeolocationAvailable && 'Geolocation not supported'}
                    {isGeolocationAvailable && !isGeolocationEnabled && 'Please enable location services'}
                    {isGeolocationAvailable && isGeolocationEnabled && !coords && 'Acquiring location...'}
                    {coords && `Location: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`}
                  </span>
                </div>
                {coords && (
                  <div className="text-xs text-solarized-base00 mt-1 ml-6">
                    Accuracy: ±{coords.accuracy.toFixed(0)} meters
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                {currentStatus?.status !== 'clocked_in' && (
                  <Button
                    onClick={handleClockIn}
                    disabled={isClocking || !coords}
                    className="flex-1 h-14 text-lg bg-solarized-green hover:bg-solarized-green/90"
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    {isClocking ? 'Clocking In...' : 'Clock In'}
                  </Button>
                )}
                {currentStatus?.status === 'clocked_in' && (
                  <Button
                    onClick={handleClockOut}
                    disabled={isClocking || !coords}
                    variant="outline"
                    className="flex-1 h-14 text-lg border-solarized-red text-solarized-red hover:bg-solarized-red/10"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    {isClocking ? 'Clocking Out...' : 'Clock Out'}
                  </Button>
                )}
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <div className="text-center py-6">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-solarized-green" />
                <h3 className="text-xl font-semibold text-solarized-base02 mb-2">
                  Attendance Completed for Today
                </h3>
                <p className="text-solarized-base01">
                  You have successfully recorded your clock in and clock out for today.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Leave Balances & Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Leave Balances</CardTitle>
              <CardDescription>Your available leave days</CardDescription>
            </div>
            <Link to="/leave/my-balances">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingLeave ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : leaveBalances.length > 0 ? (
              <div className="space-y-3">
                {leaveBalances.slice(0, 5).map((balance) => (
                  <div
                    key={balance.category_id}
                    className="flex items-center justify-between p-3 bg-solarized-base3 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-solarized-base02">
                        {balance.category_name}
                      </div>
                      <div className="text-xs text-solarized-base01">
                        {Math.floor(balance.used)} used / {Math.floor(balance.allocated)} total
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-solarized-blue">
                        {Math.floor(balance.remaining)}
                      </div>
                      <div className="text-xs text-solarized-base01">days left</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-solarized-base01">
                No leave balances available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Leave Requests</CardTitle>
              <CardDescription>Your latest leave applications</CardDescription>
            </div>
            <Link to="/leave/requests">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingLeave ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentRequests.length > 0 ? (
              <div className="space-y-3">
                {recentRequests.slice(0, 4).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start gap-3 p-3 bg-solarized-base3 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      request.approval_status === 'approved'
                        ? 'bg-solarized-green/10'
                        : request.approval_status === 'pending'
                        ? 'bg-solarized-yellow/10'
                        : 'bg-solarized-red/10'
                    }">
                      {request.approval_status === 'approved' && <CheckCircle className="h-4 w-4 text-solarized-green" />}
                      {request.approval_status === 'pending' && <Clock className="h-4 w-4 text-solarized-yellow" />}
                      {request.approval_status === 'rejected' && <AlertCircle className="h-4 w-4 text-solarized-red" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-solarized-base02 capitalize">
                          {request.approval_status}
                        </p>
                        <p className="text-xs text-solarized-base00">
                          {new Date(request.start_date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-xs text-solarized-base01 truncate">
                        {request.reason || 'No reason provided'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-solarized-base01">
                No leave requests yet
                <Link to="/leave/apply" className="block mt-2 text-solarized-blue hover:underline">
                  Apply for leave
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Access commonly used features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/attendance/self">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Clock className="h-6 w-6 text-solarized-blue" />
                <span className="text-sm">My Attendance</span>
              </Button>
            </Link>
            <Link to="/leave/apply">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Calendar className="h-6 w-6 text-solarized-green" />
                <span className="text-sm">Apply Leave</span>
              </Button>
            </Link>
            <Link to="/leave/my-balances">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <FileText className="h-6 w-6 text-solarized-yellow" />
                <span className="text-sm">Leave Balances</span>
              </Button>
            </Link>
            <Link to="/payroll/my-slips">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <DollarSign className="h-6 w-6 text-solarized-cyan" />
                <span className="text-sm">My Payslips</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
