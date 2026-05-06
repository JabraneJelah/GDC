'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/footer'

export function PageShell({ children }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen">
      {/* Full-width fixed header */}
      <Header onMobileMenuOpen={() => setIsMobileOpen(true)} />

      {/* Body: sidebar + content, pushed below the header */}
      <div className="flex pt-14">
        {/* Content area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 bg-[#F8FAFC]">
            <div className="w-full max-w-none px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
          <Footer />
        </div>

        {/* Desktop spacer — mirrors the fixed sidebar width */}
        <div
          className={`hidden flex-shrink-0 transition-all duration-300 lg:block ${
            isCollapsed ? 'w-16' : 'w-64'
          }`}
        />

        {/* Sidebar (fixed, right-aligned, starts below header) */}
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((v) => !v)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
      </div>
    </div>
  )
}
