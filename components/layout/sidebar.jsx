'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  User,
  LogOut,
  GraduationCap,
  FileText,
} from 'lucide-react'

function NavTooltip({ label, children }) {
  return (
    <div className="group/tip relative">
      {children}
      <span className="pointer-events-none absolute right-full top-1/2 z-50 mr-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover/tip:opacity-100">
        {label}
      </span>
    </div>
  )
}

export function Sidebar({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isReferentielOpen, setIsReferentielOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  useEffect(() => {
    const referentielPaths = [
      '/services', '/specialites', '/types-conge', '/categories-personnel',
      '/titres', '/hopitaux', '/grades', '/jours-feries', '/types-fautes', '/parametrage',
    ]
    if (referentielPaths.some((p) => pathname.startsWith(p))) {
      setIsReferentielOpen(true)
    }
  }, [pathname])

  useEffect(() => {
    if (isCollapsed) setIsReferentielOpen(false)
  }, [isCollapsed])

  const menuItems = [
    { href: '/dashboard', label: 'لوحة القيادة', icon: LayoutDashboard },
    { href: '/professeurs', label: 'الأساتذة', icon: GraduationCap },
    { href: '/utilisateurs', label: 'إدارة المستخدمين', icon: Users },
    { href: '/conges', label: 'إدارة العطل', icon: Calendar },
    { href: '/dossiers-explicatifs', label: 'الملفات التوضيحية', icon: FileText },
    { href: '/document-templates', label: 'نماذج الوثائق', icon: FileText },
    {
      label: 'المرجعيات',
      icon: Settings,
      children: [
        { href: '/services', label: 'المصالح' },
        { href: '/specialites', label: 'التخصصات' },
        { href: '/titres', label: 'الألقاب' },
        { href: '/grades', label: 'الدرجات' },
        { href: '/types-conge', label: 'أنواع العطل' },
        { href: '/categories-personnel', label: 'الفئات' },
        { href: '/hopitaux', label: 'المستشفيات' },
        { href: '/jours-feries', label: 'العطل الرسمية' },
        { href: '/types-fautes', label: 'أنواع المخالفات' },
        { href: '/parametrage', label: 'الإعدادات' },
      ],
    },
  ]

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/')
  const isReferentielActive = menuItems
    .find((i) => i.children)
    ?.children.some((c) => isActive(c.href))

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-x-0 bottom-0 top-14 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed right-0 top-14 z-50 flex h-[calc(100vh-3.5rem)] flex-col border-l border-[#E2E8F0] bg-white transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : 'translate-x-full'}
          lg:translate-x-0
          ${isCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        <div className="flex h-full flex-col" dir="rtl">
          {/* Sidebar header */}
          <div
            className={`flex shrink-0 items-center border-b border-slate-200 ${
              isCollapsed ? 'justify-center p-3' : 'justify-between p-4'
            }`}
          >
            {!isCollapsed && (
              <Link
                href="/dashboard"
                className="truncate text-base font-semibold text-slate-950"
              >
                إدارة الموارد البشرية
              </Link>
            )}
            {/* Collapse toggle — desktop only */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden size-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[#1174BC]/10 hover:text-[#1174BC] lg:flex"
            >
              {isCollapsed ? (
                <ChevronsLeft className="h-4 w-4" />
              ) : (
                <ChevronsRight className="h-4 w-4" />
              )}
            </button>
            {/* Mobile close */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onCloseMobile}
              className="h-8 w-8 p-0 lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {menuItems.map((item) => {
              if (item.children) {
                const toggleActive = isReferentielActive || isReferentielOpen

                if (isCollapsed) {
                  return (
                    <NavTooltip key={item.label} label={item.label}>
                      <button
                        type="button"
                        className={`flex w-full items-center justify-center rounded-lg p-2.5 transition-colors ${
                          toggleActive
                            ? 'bg-[#1174BC]/10 text-[#1174BC]'
                            : 'text-slate-600 hover:bg-[#1174BC]/10 hover:text-[#1174BC]'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                      </button>
                    </NavTooltip>
                  )
                }

                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => setIsReferentielOpen(!isReferentielOpen)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                        toggleActive
                          ? 'bg-[#1174BC]/10 text-[#1174BC]'
                          : 'text-slate-800 hover:bg-[#1174BC]/10 hover:text-[#1174BC]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon
                          className={`h-5 w-5 ${toggleActive ? 'text-[#1174BC]' : 'text-current'}`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {isReferentielOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronLeft className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                    {isReferentielOpen && (
                      <div className="mr-4 mt-0.5 space-y-0.5 border-r border-slate-200 pr-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block rounded-lg px-3 py-2 text-base font-medium transition-colors ${
                              isActive(child.href)
                                ? 'bg-[#1174BC]/10 text-[#1174BC]'
                                : 'text-slate-700 hover:bg-[#1174BC]/10 hover:text-[#1174BC]'
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              const active = isActive(item.href)

              if (isCollapsed) {
                return (
                  <NavTooltip key={item.href} label={item.label}>
                    <Link
                      href={item.href}
                      className={`flex items-center justify-center rounded-lg p-2.5 transition-colors ${
                        active
                          ? 'bg-[#1174BC]/10 text-[#1174BC]'
                          : 'text-slate-600 hover:bg-[#1174BC]/10 hover:text-[#1174BC]'
                      }`}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                    </Link>
                  </NavTooltip>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                    active
                      ? 'bg-[#1174BC]/10 text-[#1174BC]'
                      : 'text-slate-800 hover:bg-[#1174BC]/10 hover:text-[#1174BC]'
                  }`}
                >
                  <item.icon
                    className={`h-5 w-5 shrink-0 ${active ? 'text-[#1174BC]' : 'text-current'}`}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer actions */}
          <div className="shrink-0 border-t border-slate-200 p-3 space-y-0.5">
            {isCollapsed ? (
              <>
                <NavTooltip label="الملف الشخصي">
                  <Link
                    href="/profile"
                    className={`flex items-center justify-center rounded-lg p-2.5 transition-colors ${
                      pathname === '/profile'
                        ? 'bg-[#1174BC]/10 text-[#1174BC]'
                        : 'text-slate-600 hover:bg-[#1174BC]/10 hover:text-[#1174BC]'
                    }`}
                  >
                    <User className="h-5 w-5 shrink-0" />
                  </Link>
                </NavTooltip>
                <NavTooltip label="تسجيل الخروج">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-[#1174BC]/10 hover:text-[#1174BC]"
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                  </button>
                </NavTooltip>
              </>
            ) : (
              <>
                <Link href="/profile" className="block">
                  <div
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                      pathname === '/profile'
                        ? 'bg-[#1174BC]/10 text-[#1174BC]'
                        : 'text-slate-800 hover:bg-[#1174BC]/10 hover:text-[#1174BC]'
                    }`}
                  >
                    <User
                      className={`h-5 w-5 shrink-0 ${
                        pathname === '/profile' ? 'text-[#1174BC]' : 'text-current'
                      }`}
                    />
                    <span>الملف الشخصي</span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-slate-800 transition-colors hover:bg-[#1174BC]/10 hover:text-[#1174BC]"
                >
                  <LogOut className="h-5 w-5 shrink-0 text-current" />
                  <span>تسجيل الخروج</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
