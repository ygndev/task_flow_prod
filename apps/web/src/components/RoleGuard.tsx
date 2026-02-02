import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: 'ADMIN' | 'MEMBER';
}

/**
 * RoleGuard component that:
 * - Redirects to /login if not logged in
 * - Redirects non-ADMIN users from /admin/* routes to /member/tasks
 * - Allows ADMIN to access /member/tasks (admin can view member page too)
 */
export function RoleGuard({ children, requiredRole }: RoleGuardProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  // Not logged in -> redirect to login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check if trying to access admin route without admin role
  if (location.pathname.startsWith('/admin') && role !== 'ADMIN') {
    return <Navigate to="/member/tasks" replace />;
  }

  // Check required role if specified
  if (requiredRole && role !== requiredRole) {
    if (requiredRole === 'ADMIN') {
      return <Navigate to="/member/tasks" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
