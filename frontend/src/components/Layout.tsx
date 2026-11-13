import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const links = [
  { to: '/map', label: 'Map', icon: '🗺️' },
  { to: '/upload', label: 'Upload file', icon: '📁' },
]

/** Sidebar navigation (top bar on small screens) wrapping every logged-in page. */
export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white p-3 md:w-56 md:flex-col md:items-stretch md:border-b-0 md:border-r md:p-4">
        <div className="mr-auto font-semibold text-blue-700 md:mb-6 md:mr-0 md:text-lg">📍 Location Manager</div>
        <nav className="flex gap-1 md:flex-col" aria-label="Main">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              <span aria-hidden className="mr-2">
                {l.icon}
              </span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="md:mt-auto md:border-t md:border-slate-200 md:pt-4">
          <p className="hidden truncate px-3 pb-2 text-xs text-slate-500 md:block" title={user?.email}>
            {user?.email}
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <span aria-hidden className="mr-2">
              ↩
            </span>
            Log out
          </button>
        </div>
      </aside>
      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
