import { useState, useEffect } from 'react';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  roles: string[];
  staff_member_id: number | null;
}

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border-0 shadow-md rounded-lg p-6">
              <div className="h-4 w-24 bg-solarized-base2/50 rounded mb-2"></div>
              <div className="h-8 w-16 bg-solarized-base2/50 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Check if user is an admin or has admin-like roles
  const isAdminUser = currentUser?.roles?.some(role =>
    ['admin', 'org', 'company', 'hr'].includes(role)
  );

  // Show Admin Dashboard for admin/org/company/hr users
  // Show Staff Dashboard for regular 'user' role
  if (isAdminUser) {
    return <AdminDashboard />;
  }

  return <StaffDashboard />;
}
