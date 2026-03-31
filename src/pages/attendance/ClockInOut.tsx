import { useState, useEffect, useCallback } from 'react';
import { attendanceService, staffService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle, Calendar, User, Users, Watch } from 'lucide-react';

interface StaffMember {
  id: number;
  full_name: string;
  staff_code: string;
  email?: string;
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

interface ShiftInfo {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  is_night_shift: boolean;
}

interface CurrentStatus {
  status: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  break_minutes: number;
  shift: ShiftInfo | null;
  current_time: string;
  on_leave?: boolean;
  leave_details?: any;
}

export default function ClockInOut() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string>('');
  const [location, setLocation] = useState<string>('');

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

          // If it's a staff user (non-admin), set their staff ID as selected
          if (!hasAdminRole && userData.staff_member_id) {
            setSelectedStaff(userData.staff_member_id.toString());
          }
        }
      } catch (error) {
        console.error('Failed to parse user data from localStorage:', error);
      }
    };

    loadUserData();

    // Get client IP address
    fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('Unknown'));
  }, []);

  // Fetch staff list for admin users
  useEffect(() => {
    const fetchStaffMembers = async () => {
      if (!isAdminUser) return;

      setIsLoadingStaff(true);
      try {
        const response = await staffService.getAll({ per_page: 100 });
        setStaffMembers(response.data.data || []);

        // Auto-select first staff member if none selected
        if (response.data.data?.length > 0 && !selectedStaff) {
          setSelectedStaff(response.data.data[0].id.toString());
        }
      } catch (error) {
        console.error('Failed to fetch staff members:', error);
        showAlert('error', 'Error', 'Failed to load staff members');
      } finally {
        setIsLoadingStaff(false);
      }
    };

    if (isAdminUser) {
      fetchStaffMembers();
    }
  }, [isAdminUser]);

  const fetchCurrentStatus = useCallback(async () => {
    if (!selectedStaff && isAdminUser) return;

    setIsLoadingStatus(true);
    try {
      const params: Record<string, unknown> = {};

      if (isAdminUser && selectedStaff) {
        params.staff_member_id = Number(selectedStaff);
      } else if (!isAdminUser && currentUser?.staff_member_id) {
        params.staff_member_id = currentUser.staff_member_id;
      }

      console.log('Refreshing status with params:', params);

      const response = await attendanceService.getCurrentStatus(params);
      console.log('Refresh response:', response.data);

      // Ensure we have all required fields
      const statusData = response.data.data || {};
      setCurrentStatus({
        status: statusData.status || 'not_clocked_in',
        clock_in: statusData.clock_in || null,
        clock_out: statusData.clock_out || null,
        total_hours: statusData.total_hours || null,
        late_minutes: statusData.late_minutes || 0,
        early_leave_minutes: statusData.early_leave_minutes || 0,
        overtime_minutes: statusData.overtime_minutes || 0,
        break_minutes: statusData.break_minutes || 0,
        shift: statusData.shift || null,
        current_time: statusData.current_time || new Date().toLocaleTimeString(),
        on_leave: statusData.on_leave || false,
        leave_details: statusData.leave_details || null,
      });
    } catch (error) {
      console.error('Failed to refresh status:', error);
      setCurrentStatus({
        status: 'not_clocked_in',
        clock_in: null,
        clock_out: null,
        total_hours: null,
        late_minutes: 0,
        early_leave_minutes: 0,
        overtime_minutes: 0,
        break_minutes: 0,
        shift: null,
        current_time: new Date().toLocaleTimeString(),
        on_leave: false,
      });
    } finally {
      setIsLoadingStatus(false);
    }
  }, [selectedStaff, isAdminUser, currentUser]);

  // Fetch current status
  useEffect(() => {
    const fetchStatus = async () => {
      // For admin users, wait until staff members are loaded
      if (isAdminUser && staffMembers.length === 0) return;

      // For non-admin users, wait until we have current user data
      if (!isAdminUser && !currentUser?.staff_member_id) return;

      if (isAdminUser && !selectedStaff) return;

      await fetchCurrentStatus();
    };

    fetchStatus();
  }, [selectedStaff, isAdminUser, currentUser, staffMembers.length, fetchCurrentStatus]);

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
        // Use same format as other pages: HH:MM:SS AM/PM
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
  }

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

  const handleClockIn = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const data: Record<string, unknown> = {
        ip_address: ipAddress,
        location: location || 'Office',
      };

      // For admin users, include staff_member_id if selected
      if (isAdminUser && selectedStaff) {
        data.staff_member_id = Number(selectedStaff);
      }

      console.log('Clock In Data:', data);

      const response = await attendanceService.clockIn(data);
      console.log('Clock In Response:', response.data);

      // Immediately update the status
      await fetchCurrentStatus();
      setMessage({ type: 'success', text: 'Successfully clocked in!' });
      showAlert('success', 'Success!', 'Successfully clocked in!', 2000);

    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Failed to clock in');
      console.error('Clock In Error:', err);
      setMessage({ type: 'error', text: errorMessage });
      showAlert('error', 'Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const data: Record<string, unknown> = {
        ip_address: ipAddress,
        location: location || 'Office',
      };

      // For admin users, include staff_member_id if selected
      if (isAdminUser && selectedStaff) {
        data.staff_member_id = Number(selectedStaff);
      }

      console.log('Clock Out Data:', data);

      const response = await attendanceService.clockOut(data);
      console.log('Clock Out Response:', response.data);

      // Immediately update the status
      await fetchCurrentStatus();
      setMessage({ type: 'success', text: 'Successfully clocked out!' });
      showAlert('success', 'Success!', 'Successfully clocked out!', 2000);

    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Failed to clock out');
      console.error('Clock Out Error:', err);
      setMessage({ type: 'error', text: errorMessage });
      showAlert('error', 'Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Get current staff member name
  const getCurrentStaffName = () => {
    if (!selectedStaff) return '';

    // For non-admin users, show their own name
    if (!isAdminUser) {
      return currentUser?.name || 'You';
    }

    // For admin users, find the selected staff from the list
    const staffMember = staffMembers.find(s => s.id.toString() === selectedStaff);
    return staffMember?.full_name || 'Selected Staff';
  };

  // Get current staff member code
  const getCurrentStaffCode = () => {
    if (!selectedStaff) return '';

    if (!isAdminUser) {
      return currentUser?.staff_member_id ? `ID: ${currentUser.staff_member_id}` : '';
    }

    const staffMember = staffMembers.find(s => s.id.toString() === selectedStaff);
    return staffMember?.staff_code ? `Code: ${staffMember.staff_code}` : '';
  };

  const formatShiftTimeDisplay = (timeString: string): string => {
    if (!timeString) return '--:--';

    try {
      // Parse the time (assuming it's in 24-hour format like "09:00:00")
      const [hours, minutes, seconds] = timeString.split(':').map(Number);

      // Create a date object with today's date and this time
      const date = new Date();
      date.setHours(hours, minutes || 0, seconds || 0, 0);

      // Format as 12-hour with AM/PM
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting shift time:', error);
      return timeString;
    }
  };

  // Then update the formatShiftTime function:
  const formatShiftTime = (shift: ShiftInfo | null) => {
    if (!shift) return 'No shift assigned';
    const startTime = formatShiftTimeDisplay(shift.start_time);
    const endTime = formatShiftTimeDisplay(shift.end_time);
    return `${startTime} - ${endTime}${shift.is_night_shift ? ' (Night Shift)' : ''}`;
  };
  // Determine if clock-in is disabled
  const isClockInDisabled = () => {
    if (isLoading || !selectedStaff) return true;
    if (currentStatus?.on_leave) return true;
    if (currentStatus?.status === 'clocked_in') return true;
    return false;
  };

  // Determine if clock-out is disabled
  const isClockOutDisabled = () => {
    if (isLoading || !selectedStaff) return true;
    if (currentStatus?.status !== 'clocked_in') return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-solarized-base02">Clock In / Out</h1>
        <p className="text-solarized-base01">
          {isAdminUser
            ? 'Record attendance for staff members'
            : 'Record your attendance for today'}
        </p>
      </div>

      {/* Staff Selection for Admin Users */}
      {isAdminUser && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Staff Member
            </CardTitle>
            <CardDescription>
              Choose a staff member to clock in/out for them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="staff_member">Employee</Label>
                <Select
                  value={selectedStaff}
                  onValueChange={setSelectedStaff}
                  disabled={isLoadingStaff}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      isLoadingStaff ? "Loading staff members..." : "Select employee"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.full_name} {staff.staff_code ? `(${staff.staff_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Main Office, Home Office"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            {/* {selectedStaff && (
              <div className="mt-4 p-3 bg-solarized-base3 rounded-lg">
                <p className="text-sm text-solarized-base01">Selected Staff:</p>
                <p className="font-medium text-lg">{getCurrentStaffName()}</p>
                {getCurrentStaffCode() && (
                  <p className="text-sm text-solarized-base01">{getCurrentStaffCode()}</p>
                )}
              </div>
            )} */}
          </CardContent>
        </Card>
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
            <CardTitle className="text-lg">
              {isAdminUser ? 'Staff Status' : 'Your Status'}
            </CardTitle>
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
                  <>
                    <div className="flex justify-center">
                      <Badge
                        className={`text-lg px-4 py-2 ${currentStatus.status === 'clocked_in'
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

                    {/* Show shift information */}
                    {currentStatus.shift && (
                      <div className="mt-3 p-3 bg-solarized-base3 rounded-lg">
                        <div className="text-center">
                          <p className="text-sm text-solarized-base01 mb-1">Shift</p>
                          <p className="font-medium text-base">{currentStatus.shift.name}</p>
                          <p className="text-sm text-solarized-base01 mt-1">
                            {currentStatus.shift.start_time} - {currentStatus.shift.end_time}
                            {currentStatus.shift.is_night_shift && (
                              <span className="ml-2 text-xs text-solarized-violet">(Night Shift)</span>
                            )}
                          </p>
                          <div className="flex items-center justify-center gap-3 mt-2">
                            {currentStatus.late_minutes > 0 && (
                              <div className="text-sm text-solarized-yellow">
                                Late: {currentStatus.late_minutes} min
                              </div>
                            )}
                            {currentStatus.overtime_minutes > 0 && (
                              <div className="text-sm text-solarized-green">
                                OT: {currentStatus.overtime_minutes} min
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-solarized-base01">
                {isAdminUser ? 'Select a staff member to view status' : 'Loading status...'}
              </p>
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
              <span className="text-solarized-blue">Employee is on leave today</span>
            ) : isAdminUser ? (
              `Clock in/out for ${getCurrentStaffName() || 'selected staff member'}`
            ) : (
              'Use the buttons below to record your attendance for today.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleClockIn}
              disabled={isClockInDisabled()}
              className="flex-1 h-16 text-lg bg-solarized-green hover:bg-solarized-green/90"
            >
              <LogIn className="mr-2 h-6 w-6" />
              {isAdminUser ? 'Clock In Staff' : 'Clock In'}
            </Button>
            <Button
              onClick={handleClockOut}
              disabled={isClockOutDisabled()}
              variant="outline"
              className="flex-1 h-16 text-lg border-solarized-red text-solarized-red hover:bg-solarized-red/10"
            >
              <LogOut className="mr-2 h-6 w-6" />
              {isAdminUser ? 'Clock Out Staff' : 'Clock Out'}
            </Button>
          </div>
          {!selectedStaff && isAdminUser && (
            <p className="text-sm text-solarized-red mt-2">
              Please select a staff member to enable clock in/out
            </p>
          )}
          {currentStatus?.on_leave && (
            <p className="text-sm text-solarized-blue mt-2">
              Cannot clock in/out: Employee is on approved leave today
            </p>
          )}
        </CardContent>
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
            <div className="grid gap-4 sm:grid-cols-5">
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
              <div className="text-center p-4 bg-solarized-base3 rounded-lg">
                <Watch className="h-8 w-8 mx-auto mb-2 text-solarized-yellow" />
                <p className="text-sm text-solarized-base01">Late Minutes</p>
                <p className="font-semibold">{currentStatus?.late_minutes || 0}</p>
              </div>
              <div className="text-center p-4 bg-solarized-base3 rounded-lg">
                <Watch className="h-8 w-8 mx-auto mb-2 text-solarized-orange" />
                <p className="text-sm text-solarized-base01">Overtime</p>
                <p className="font-semibold">{currentStatus?.overtime_minutes || 0} min</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}