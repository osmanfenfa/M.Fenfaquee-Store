import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-sm font-medium text-brand-700">404</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink-900">Page not found</h1>
        <p className="mt-2 text-sm text-ink-500">The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
