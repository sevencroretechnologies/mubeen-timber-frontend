import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  allowedRoles
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, hasAnyRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-solarized-base3">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-solarized-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-solarized-base01">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has any of the allowed roles to bypass permission checks
  if (allowedRoles && hasAnyRole(allowedRoles)) {
    return <>{children}</>;
  }

  // Check single permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // Check multiple permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? requiredPermissions.every(p => hasPermission(p))
      : requiredPermissions.some(p => hasPermission(p));

    if (!hasRequiredPermissions) {
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
}
