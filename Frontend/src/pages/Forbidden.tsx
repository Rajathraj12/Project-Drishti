import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { landingPath } from '../permissions/rbac'

export default function Forbidden() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const home = landingPath(user?.role)

  return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-navy-700)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 8 }}>Access Denied</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
        Your profile is not authorized to view this page.
      </p>
      <button className="btn-gov-primary" onClick={() => navigate(home, { replace: true })}>
        Go to authorized home
      </button>
    </div>
  )
}
