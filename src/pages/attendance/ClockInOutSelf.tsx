import { useState, useEffect } from 'react';
import { attendanceService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle, Calendar, User } from 'lucide-react';

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  staff_member_id: number | null;
}

interface CurrentStatus {
  status: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
  on_leave?: boolean;
  leave_details?: {
    category?: {
      title: string;
    };
    // Add other leave details fields if available
  };
}

export default function ClockInOutSelf() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [location, setLocation] = useState<string>('');

  // Load user data from localStorage
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
        showAlert('error', 'Error', 'Failed to load user data');
      }
    };

    loadUserData();
    
    // Get IP address
    fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('Unknown'));
  }, []);

  // Fetch current status
  useEffect(() => {
    const fetchCurrentStatus = async () => {
      if (!currentUser?.staff_member_id) return;
      
      setIsLoadingStatus(true);
      try {
        const response = await attendanceService.getCurrentStatusSelf();
        const statusData = response.data.data || {};
        setCurrentStatus({
          status: statusData.status || 'not_clocked_in',
          clock_in: statusData.clock_in || null,
          clock_out: statusData.clock_out || null,
          total_hours: statusData.total_hours || null,
          on_leave: statusData.on_leave || false,
          leave_details: statusData.leave_details || null,
        });
      } catch (error) {
        console.error('Failed to fetch current status:', error);
        setCurrentStatus({
          status: 'not_clocked_in',
          clock_in: null,
          clock_out: null,
          total_hours: null,
          on_leave: false,
        });
      } finally {
        setIsLoadingStatus(false);
      }
    };
    
    fetchCurrentStatus();
  }, [currentUser]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const formatTimeString = (timeString: string | null | undefined) => {
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

  const handleClockIn = async () => {
    if (currentStatus?.on_leave) {
      showAlert('warning', 'On Leave', 'Cannot clock in: You are on approved leave today');
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const data = {
        ip_address: ipAddress,
        location: location || 'Office',
      };
      
      const response = await attendanceService.clockInSelf(data);
      const statusData = response.data.data || {};
      setCurrentStatus({
        status: statusData.status || 'clocked_in',
        clock_in: statusData.clock_in || null,
        clock_out: statusData.clock_out || null,
        total_hours: statusData.total_hours || null,
        on_leave: false, // Reset leave status on successful clock in
      });
      setMessage({ type: 'success', text: 'Successfully clocked in!' });
      showAlert('success', 'Success!', 'Successfully clocked in!', 2000);
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Failed to clock in');
      setMessage({ type: 'error', text: errorMessage });
      showAlert('error', 'Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (currentStatus?.on_leave) {
      showAlert('warning', 'On Leave', 'Cannot clock out: You are on approved leave today');
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const data = {
        ip_address: ipAddress,
        location: location || 'Office',
      };
      
      const response = await attendanceService.clockOutSelf(data);
      const statusData = response.data.data || {};
      setCurrentStatus({
        status: statusData.status || 'clocked_out',
        clock_in: statusData.clock_in || null,
        clock_out: statusData.clock_out || null,
        total_hours: statusData.total_hours || null,
        on_leave: false, // Reset leave status on successful clock out
      });
      setMessage({ type: 'success', text: 'Successfully clocked out!' });
      showAlert('success', 'Success!', 'Successfully clocked out!', 2000);
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Failed to clock out');
      setMessage({ type: 'error', text: errorMessage });
      showAlert('error', 'Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
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

  // Determine if clock-in is disabled
  const isClockInDisabled = () => {
    if (isLoading || !hasStaffMember) return true;
    if (currentStatus?.on_leave) return true;
    if (currentStatus?.status === 'clocked_in') return true;
    return false;
  };

  // Determine if clock-out is disabled
  const isClockOutDisabled = () => {
    if (isLoading || !hasStaffMember) return true;
    if (currentStatus?.on_leave) return true;
    if (currentStatus?.status !== 'clocked_in') return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-solarized-base02">My Attendance</h1>
        <p className="text-solarized-base01">
          {hasStaffMember ? 'Record your attendance for today' : 'View attendance information'}
        </p>
      </div>

      {!hasStaffMember && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are not linked to a staff member profile. Clock in/out functionality is not available.
            Please contact your administrator if you need access to these features.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-md">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Current Time</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-solarized-blue mb-2">
              {formatTime(currentTime)}
            </div>
            <div className="flex items-center justify-center gap-2 text-solarized-base01">
              <Calendar className="h-4 w-4" />
              {formatDate(currentTime)}
            </div>
            {ipAddress && (
              <div className="mt-2 text-sm text-solarized-base01">
                IP Address: {ipAddress}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Your Status</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {isLoadingStatus ? (
              <div className="animate-pulse">
                <div className="h-8 bg-solarized-base01/10 rounded w-32 mx-auto mb-2"></div>
                <div className="h-4 bg-solarized-base01/10 rounded w-48 mx-auto"></div>
              </div>
            ) : currentStatus ? (
              <>
                {currentStatus.on_leave ? (
                  <div className="space-y-3">
                    <Badge className="bg-solarized-blue/10 text-solarized-blue text-lg px-4 py-2">
                      On Leave
                    </Badge>
                    {currentStatus.leave_details && (
                      <p className="text-solarized-base01 text-sm">
                        {currentStatus.leave_details.category?.title || 'Approved Leave'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <Badge
                      className={`text-lg px-4 py-2 ${
                        currentStatus.status === 'clocked_in'
                          ? 'bg-solarized-green/10 text-solarized-green'
                          : currentStatus.status === 'clocked_out'
                          ? 'bg-solarized-blue/10 text-solarized-blue'
                          : 'bg-solarized-base01/10 text-solarized-base01'
                      }`}
                    >
                      {currentStatus.status === 'clocked_in' && 'Clocked In'}
                      {currentStatus.status === 'clocked_out' && 'Clocked Out'}
                      {currentStatus.status === 'not_clocked_in' && 'Not Clocked In'}
                    </Badge>
                  </div>
                )}
              </>
            ) : (
              <p className="text-solarized-base01">Loading status...</p>
            )}
          </CardContent>
        </Card>
      </div>

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

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            {currentStatus?.on_leave ? (
              <span className="text-solarized-blue">You are on approved leave today</span>
            ) : hasStaffMember ? (
              currentStatus?.status === 'clocked_out'
                ? 'Your attendance has been recorded for today.'
                : 'Use the buttons below to record your attendance for today.'
            ) : (
              'Clock in/out functionality is not available for your account.'
            )}
          </CardDescription>
        </CardHeader>
        {hasStaffMember && currentStatus?.status !== 'clocked_out' && !currentStatus?.on_leave && (
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              {currentStatus?.status !== 'clocked_in' && (
                <Button
                  onClick={handleClockIn}
                  disabled={isClockInDisabled()}
                  className="flex-1 h-16 text-lg bg-solarized-green hover:bg-solarized-green/90"
                >
                  <LogIn className="mr-2 h-6 w-6" />
                  Clock In
                </Button>
              )}
              {currentStatus?.status === 'clocked_in' && (
                <Button
                  onClick={handleClockOut}
                  disabled={isClockOutDisabled()}
                  variant="outline"
                  className="flex-1 h-16 text-lg border-solarized-red text-solarized-red hover:bg-solarized-red/10"
                >
                  <LogOut className="mr-2 h-6 w-6" />
                  Clock Out
                </Button>
              )}
            </div>
          </CardContent>
        )}
        {hasStaffMember && currentStatus?.status === 'clocked_out' && !currentStatus?.on_leave && (
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
        {currentStatus?.on_leave && (
          <CardContent>
            <div className="text-center py-6">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-solarized-blue" />
              <h3 className="text-xl font-semibold text-solarized-base02 mb-2">
                On Approved Leave
              </h3>
              <p className="text-solarized-base01">
                {currentStatus.leave_details?.category?.title 
                  ? `You are on "${currentStatus.leave_details.category.title}" leave today.`
                  : 'You are on approved leave today.'
                }
              </p>
              <p className="text-solarized-base01 mt-2">
                Clock in/out functionality is disabled for today.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Today's Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {currentStatus?.on_leave ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-solarized-blue mx-auto mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">On Leave Today</h3>
              <p className="text-solarized-base01 mt-1">
                {currentStatus.leave_details?.category?.title || 'Approved Leave'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-4 bg-solarized-base3 rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 text-solarized-blue" />
                <p className="text-sm text-solarized-base01">Clock In</p>
                <p className="font-semibold">{formatTimeString(currentStatus?.clock_in) || '--:--'}</p>
              </div>
              <div className="text-center p-4 bg-solarized-base3 rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 text-solarized-red" />
                <p className="text-sm text-solarized-base01">Clock Out</p>
                <p className="font-semibold">{formatTimeString(currentStatus?.clock_out) || '--:--'}</p>
              </div>
              <div className="text-center p-4 bg-solarized-base3 rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 text-solarized-green" />
                <p className="text-sm text-solarized-base01">Total Hours</p>
                <p className="font-semibold">{formatTotalHours(currentStatus?.total_hours)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}