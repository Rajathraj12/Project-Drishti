import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DrishtiLoader from './DrishtiLoader';

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

  if (!user && !isDevBypass) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
