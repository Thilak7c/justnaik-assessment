import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { useAuth } from './AuthContext'

function FullPageSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner label="Checking your session…" />
    </div>
  )
}

/** Pages that need a logged-in user. Anonymous users are sent to /login (and come back afterwards). */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'checking') return <FullPageSpinner />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Login/register pages: already logged-in users go straight to the map. */
export function PublicOnlyRoute() {
  const { status } = useAuth()
  if (status === 'checking') return <FullPageSpinner />
  if (status === 'authenticated') return <Navigate to="/map" replace />
  return <Outlet />
}
