'use client'

import { useEffect, useState } from 'react'
import { Bell, Settings, Menu } from 'lucide-react'

function getInitials(name) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Header({ onMobileMenuOpen }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data))
      .catch(() => {})
  }, [])

  return (
    <header
      dir="rtl"
      className="fixed left-0 right-0 top-0 z-40 flex h-14 w-full items-center justify-between border-b border-[#0F67A7] bg-[#1174BC] px-4 lg:px-8"
    >
      {/* Right side: mobile hamburger + search */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuOpen}
          className="flex size-8 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/15 hover:text-white lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        <div className="hidden w-64 cursor-text items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-3 py-1.5 text-sm text-white/85 shadow-sm lg:flex">
          <svg
            className="size-4 shrink-0 text-white/80"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <span>البحث في التطبيق...</span>
        </div>
      </div>

      {/* Left side: actions + avatar */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Bell className="size-4" />
        </button>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Settings className="size-4" />
        </button>
        <div className="mr-2 flex size-9 select-none items-center justify-center rounded-full bg-white text-sm font-semibold text-[#1174BC] shadow-sm">
          {user ? getInitials(user.nom_complet || user.username) : '—'}
        </div>
      </div>
    </header>
  )
}
