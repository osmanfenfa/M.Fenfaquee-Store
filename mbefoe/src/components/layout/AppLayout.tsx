import { useCallback, useState } from 'react'
import { Outlet } from 'react-router'
import BottomNav from './BottomNav'
import Header from './Header'
import MobileNavigation from './MobileNavigation'
import Sidebar from './Sidebar'

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  return (
    <div className="min-h-svh">
      <Sidebar />
      <MobileNavigation open={menuOpen} onClose={closeMenu} />
      <div className="lg:pl-64">
        <Header />
        <main className="pb-bottom-nav mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:py-8 lg:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav onMore={() => setMenuOpen(true)} />
    </div>
  )
}
