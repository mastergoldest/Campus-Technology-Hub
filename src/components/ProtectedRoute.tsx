import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, type UserRole } from "../context/AuthContext";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Wait until the saved session has been checked.
  if (isLoading) {
    return (
      <main className="auth-page">
        <div className="auth-form-wrapper">
          <p>Verifying your session...</p>
        </div>
      </main>
    );
  }

  // Send logged-out users to the login page.
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // Prevent users from entering dashboards for other roles.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dashboardByRole: Record<UserRole, string> = {
      student: "/dashboard",
      technician: "/technician/dashboard",
      admin: "/admin/dashboard",
    };

    return (
      <Navigate
        to={dashboardByRole[user.role]}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;