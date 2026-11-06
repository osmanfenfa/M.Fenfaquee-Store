import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'

export function FullPageSpinner() {
  return (
    <div className="grid min-h-svh place-items-center" role="status" aria-label="Loading">
      <div className="size-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    </div>
  )
}

/** Only lets signed-in users through; otherwise sends them to /login. */
export default function ProtectedRoute() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  // A platform admin without a shop has no shop pages — send them to the admin area
  if (user && !user.shop && location.pathname !== '/admin') return <Navigate to="/admin" replace />
  return <Outlet />
}
