import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, loading, isDevBypass } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading application...</div>;
  }

  // If no user is present, redirect to login
  if (!user && !isDevBypass) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is restricted
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-navy-700)" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
        <button onClick={() => window.history.back()} className="btn-gov-outline" style={{ marginTop: 20 }}>Go Back</button>
      </div>
    );
  }

  return <>{children}</>;
}
