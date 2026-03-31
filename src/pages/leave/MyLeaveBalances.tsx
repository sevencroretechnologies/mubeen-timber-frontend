import { useState, useEffect } from 'react';
import { leaveService } from '../../services/api';
import { showAlert } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';
import { Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeaveBalance {
  category_id: number;
  category_name: string;
  allocated: number;
  used: number;
  remaining: number;
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

export default function MyLeaveBalances() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
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
        }
      } catch (error) {
        console.error('Failed to parse user data from localStorage:', error);
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchBalances();
    }
  }, [currentUser]);

  const fetchBalances = async () => {
    setIsLoading(true);
    try {
      // Use the new endpoint for "My Leave Balances"
      const response = await leaveService.getMyBalances();

      console.log('My Balance API Response:', response.data);

      if (response.data.success && response.data.data) {
        setBalances(response.data.data);
      } else {
        setBalances(response.data.data || response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch balances:', error);

      if (error.response?.data?.message) {
        showAlert('error', 'Error', error.response.data.message);
      } else {
        showAlert('error', 'Error', 'Failed to fetch leave balances');
      }

      setBalances([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate overall usage percentage
  const calculateOverallUsage = () => {
    if (balances.length === 0) return 0;

    const totalAllocated = balances.reduce((sum, balance) => sum + balance.allocated, 0);
    const totalUsed = balances.reduce((sum, balance) => sum + balance.used, 0);

    return totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;
  };

  // Get total remaining days
  const getTotalRemaining = () => {
    return balances.reduce((sum, balance) => sum + balance.remaining, 0);
  };

  // Get total allocated days
  const getTotalAllocated = () => {
    return balances.reduce((sum, balance) => sum + balance.allocated, 0);
  };

  // Get total used days
  const getTotalUsed = () => {
    return balances.reduce((sum, balance) => sum + balance.used, 0);
  };

  // Helper to format days
  const formatDays = (days: number) => {
    const val = Math.round(days);
    return `${val} ${val === 1 ? 'day' : 'days'}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-solarized-base02">My Leave Balances</h1>
        <p className="text-solarized-base01">
          View your leave balances for the current year
        </p>
      </div>

      {/* User Info Card */}
      <Card className="border-0 shadow-md">
        {/* <CardHeader> */}
        {/* <CardTitle className="text-lg">Your Information</CardTitle>
          <CardDescription>
            Viewing leave balances for {currentUser?.name || 'you'}
          </CardDescription> */}
        {/* </CardHeader> */}
        <CardContent>
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                <User className="h-6 w-6 text-solarized-blue" />
              </div>
              <div>
                <p className="font-medium">{currentUser?.name || 'Loading...'}</p>
                <p className="text-sm text-solarized-base01">{currentUser?.email || ''}</p>
              </div>
            </div>
            {/* <Button 
              variant="outline" 
              onClick={fetchBalances}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh Balances"}
            </Button> */}
          </div>
        </CardContent>
      </Card>

      {/* Overall Summary Card */}
      {balances.length > 0 && !isLoading && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Overall Summary</CardTitle>
            <CardDescription>Your total leave usage for the year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-solarized-base3 rounded-lg">
                  <p className="text-sm text-solarized-base01">Total Allocated</p>
                  <p className="text-2xl font-bold text-solarized-blue">{formatDays(getTotalAllocated())}</p>
                </div>
                <div className="text-center p-4 bg-solarized-base3 rounded-lg">
                  <p className="text-sm text-solarized-base01">Total Used</p>
                  <p className="text-2xl font-bold text-solarized-green">{formatDays(getTotalUsed())}</p>
                </div>
                <div className="text-center p-4 bg-solarized-base3 rounded-lg">
                  <p className="text-sm text-solarized-base01">Total Remaining</p>
                  <p className="text-2xl font-bold text-solarized-green">{formatDays(getTotalRemaining())}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm text-solarized-base01 mb-1">
                  <span>Overall Usage</span>
                  <span>{calculateOverallUsage().toFixed(1)}%</span>
                </div>
                <Progress value={calculateOverallUsage()} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Leave Balances */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-md">
              <CardContent className="pt-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : balances.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {balances.map((balance) => (
            <Card key={balance.category_id} className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{balance.category_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-solarized-base01">Used</span>
                  <span className="font-medium">
                    {Math.round(balance.used)} / {formatDays(balance.allocated)}
                  </span>
                </div>
                <Progress
                  value={balance.allocated > 0 ? (balance.used / balance.allocated) * 100 : 0}
                  className="h-2"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-solarized-base01">Allocated</p>
                    <p className="text-lg font-semibold">{formatDays(balance.allocated)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Remaining</p>
                    <p className="text-lg font-semibold text-solarized-green">{formatDays(balance.remaining)}</p>
                  </div>
                </div>

                {/* Usage breakdown */}
                <div className="pt-2 border-t">
                  <p className="text-sm text-solarized-base01 mb-2">Usage Breakdown</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Used</span>
                      <span>{formatDays(balance.used)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Available</span>
                      <span>{formatDays(balance.remaining)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                      <span>Total</span>
                      <span>{formatDays(balance.allocated)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">No leave balances found</h3>
            <p className="text-solarized-base01 mt-1">
              {currentUser?.staff_member_id
                ? "You don't have any leave balances configured for this year."
                : "You don't have a staff member record. Please contact administrator to create one."}
            </p>
            {currentUser?.staff_member_id && (
              <Button
                variant="outline"
                onClick={fetchBalances}
                disabled={isLoading}
                className="mt-4"
              >
                {isLoading ? "Refreshing..." : "Try Again"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Important Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-solarized-base01">
            <li className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-solarized-blue mt-0.5 flex-shrink-0" />
              <span>Leave balances are calculated annually and reset at the beginning of each calendar year.</span>
            </li>
            <li className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-solarized-green mt-0.5 flex-shrink-0" />
              <span>Unused leave may be carried over to the next year, subject to company policy.</span>
            </li>
            <li className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-solarized-yellow mt-0.5 flex-shrink-0" />
              <span>Balances are updated in real-time when leave requests are approved.</span>
            </li>
            <li className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-solarized-red mt-0.5 flex-shrink-0" />
              <span>For any discrepancies in your leave balance, please contact HR department.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}