import { useState, useEffect } from 'react';
import { leaveService, staffService } from '../../services/api';
import { showAlert } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';
import { Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StaffMember {
  id: number;
  full_name: string;
}

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
  org_id: number | null;
  company_id: number | null;
}

export default function LeaveBalances() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  // Load user data from localStorage on mount
  useEffect(() => {
    const loadUserData = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData: UserData = JSON.parse(userStr);
          setCurrentUser(userData);
          
          // Check if user has admin role (admin, administrator, org, organisation, company, hr)
          const adminRoles = ['admin', 'administrator', 'org', 'organisation', 'company', 'hr'];
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
        setIsLoadingStaff(false);
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
    
    fetchStaff();
  }, [isAdminUser]);

  // Fetch balances whenever selectedStaff changes
  useEffect(() => {
    if (selectedStaff) {
      fetchBalances();
    } else {
      setBalances([]);
    }
  }, [selectedStaff]);

  const fetchBalances = async () => {
    if (!selectedStaff) return;
    
    setIsLoading(true);
    try {
      // For admin users, we need to pass staff_member_id
      // For non-admin users, the backend will use their own staff_member_id automatically
      const response = await leaveService.getBalances(Number(selectedStaff));
      
      console.log('Balance API Response:', response.data);
      
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

  const handleStaffChange = (value: string) => {
    setSelectedStaff(value);
  };

  // Get current staff member name
  const getCurrentStaffName = () => {
    if (!currentUser || !selectedStaff) return '';
    
    // For non-admin users, show their own name
    if (!isAdminUser) {
      return currentUser.name;
    }
    
    // For admin users, find the selected staff from the list
    const staffMember = staff.find(s => s.id.toString() === selectedStaff);
    return staffMember?.full_name || '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-solarized-base02">Leave Balances</h1>
        <p className="text-solarized-base01">
          {isAdminUser 
            ? 'View leave balances for employees' 
            : 'View your leave balances'}
        </p>
      </div>

      {isAdminUser ? (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Select Employee</CardTitle>
            <CardDescription>Choose an employee to view their leave balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Select 
                value={selectedStaff} 
                onValueChange={handleStaffChange}
                disabled={isLoadingStaff}
              >
                <SelectTrigger className="w-[300px]">
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
              
              {selectedStaff && (
                <Button 
                  variant="outline" 
                  onClick={fetchBalances}
                  disabled={isLoading}
                >
                  {isLoading ? "Refreshing..." : "Refresh"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Your Leave Balances</CardTitle>
            <CardDescription>
              Viewing leave balances for {currentUser?.name || 'you'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-solarized-base01 mb-2">Employee</p>
                <p className="text-lg font-medium">{currentUser?.name || 'Loading...'}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={fetchBalances}
                disabled={isLoading}
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
      ) : selectedStaff && balances.length > 0 ? (
        <>
          {/* {isAdminUser && selectedStaff && (
            <div className="mb-4 p-4 bg-solarized-base3 rounded-lg">
              <p className="text-sm text-solarized-base01">Viewing balances for:</p>
              <p className="font-medium text-lg">{getCurrentStaffName()}</p>
            </div>
          )} */}
          
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
                      {balance.used} / {balance.allocated} days
                    </span>
                  </div>
                  <Progress
                    value={balance.allocated > 0 ? (balance.used / balance.allocated) * 100 : 0}
                    className="h-2"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-solarized-base01">Remaining</span>
                    <span className="text-2xl font-bold text-solarized-blue">
                      {balance.remaining} days
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : selectedStaff ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">No leave balances found</h3>
            <p className="text-solarized-base01 mt-1">
              {isAdminUser 
                ? "This employee doesn't have any leave balances configured."
                : "You don't have any leave balances configured."}
            </p>
          </CardContent>
        </Card>
      ) : isAdminUser ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">Select an Employee</h3>
            <p className="text-solarized-base01 mt-1">
              Choose an employee from the dropdown to view their leave balances.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">Loading your balances...</h3>
            <p className="text-solarized-base01 mt-1">
              Please wait while we fetch your leave balances.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
