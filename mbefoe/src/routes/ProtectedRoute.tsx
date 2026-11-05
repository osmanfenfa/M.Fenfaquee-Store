import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'

export function FullPageSpinner() {
  return (
    <div className="grid min-h-svh place-items-center" role="status" aria-label="Loading">
      <div className="size-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    </div>
  )
}

/** Only lets the signed-in owner through; otherwise sends them to /login. */
export default function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
