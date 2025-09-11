import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext';

interface ProtectedRouteProps {
    allowedRoles: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { user, token } = useAuth();

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    return allowedRoles.includes(user.role) ? (
        <Outlet />
    ) : (
        <Navigate to="/unauthorized" replace /> // Or a dedicated "Unauthorized" page
    );
};

export default ProtectedRoute;
