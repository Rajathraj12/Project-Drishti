import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isDevBypass } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading application...</div>;
  }

  if (!user) {
    if (isDevBypass) {
      return <div style={{ padding: 40, textAlign: "center" }}>Initializing development identity...</div>;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
