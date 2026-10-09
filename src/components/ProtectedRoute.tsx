
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'administration' | 'professeur' | 'parent';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole
}) => {
  const { isAuthenticated, authUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !authUser) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    const roles = Array.isArray(authUser.role) ? authUser.role : [authUser.role];
    const hasRole = roles.some((r: string) => {
      if (requiredRole === "administration") return r === "ADMIN" || r === "administration";
      if (requiredRole === "professeur") return r === "TEACHER" || r === "professeur";
      if (requiredRole === "parent") return r === "PARENT" || r === "parent";
      return false;
    });

    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
