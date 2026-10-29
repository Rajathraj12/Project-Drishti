import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DrishtiLoader from './DrishtiLoader';
import { canAccessPath } from '../permissions/rbac';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isDevBypass } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <DrishtiLoader
        title="Initializing Drishti Platform..."
        subtitle="Verifying secure credentials and jurisdiction"
        fullScreen={true}
      />
    );
  }

  // If user is authenticated or dev bypass is active, proceed
  if (user || isDevBypass) {
    return <>{children}</>;
  }

  // If visitor is browsing as Guest, allow access to public and citizen transparency routes
  const isGuestAllowed = canAccessPath(null, location.pathname);
  if (isGuestAllowed) {
    return <>{children}</>;
  }

  // Restricted pages require official authentication
  return <Navigate to="/login" state={{ from: location }} replace />;
}
