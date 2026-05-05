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
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  User,
  LogOut,
  GraduationCap,
  FileText
} from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isReferentielOpen, setIsReferentielOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const referentielPaths = ['/services', '/specialites', '/types-conge', '/categories-personnel', '/titres', '/hopitaux', '/grades', '/jours-feries', '/types-fautes']
    if (referentielPaths.some(path => pathname.startsWith(path))) {
      setIsReferentielOpen(true)
    }
  }, [pathname])

  const menuItems = [
    {
      href: '/dashboard',
      label: 'لوحة القيادة',
      icon: LayoutDashboard,
    },
    {
      href: '/professeurs',
      label: 'الأساتذة',
      icon: GraduationCap,
    },
    {
      href: '/utilisateurs',
      label: 'إدارة المستخدمين',
      icon: Users,
    },
    {
      href: '/conges',
      label: 'إدارة العطل',
      icon: Calendar,
    },
    {
      href: '/dossiers-explicatifs',
      label: 'الملفات التوضيحية',
      icon: FileText,
    },
    {
      href: '/document-templates',
      label: 'نماذج الوثائق',
      icon: FileText,
    },
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
      ],
    },
  ]

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/')

  const SidebarContent = () => (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
        <Link href="/dashboard" className="text-base font-semibold text-[#334155]">
          إدارة الموارد البشرية
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden h-8 w-8 p-0"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setIsReferentielOpen(!isReferentielOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isReferentielOpen
                      ? 'bg-[#F8FAFC] text-[#334155]'
                      : 'text-[#334155] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                  {isReferentielOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </button>
                {isReferentielOpen && (
                  <div className="mr-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                          isActive(child.href)
                            ? 'bg-[#F8FAFC] text-[#334155] font-medium'
                            : 'text-[#334155] hover:bg-[#F8FAFC]'
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

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-[#F8FAFC] text-[#334155]'
                  : 'text-[#334155] hover:bg-[#F8FAFC]'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#E2E8F0] p-4 space-y-2">
        <Link href="/profile">
          <Button
            variant="ghost"
            className={`w-full justify-end gap-3 ${
              pathname === '/profile' ? 'bg-[#F8FAFC]' : ''
            }`}
          >
            <span>الملف الشخصي</span>
            <User className="h-5 w-5" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-end gap-3 text-[#334155] hover:bg-[#F8FAFC]"
        >
          <span>تسجيل الخروج</span>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          className="h-9 w-9 p-0 bg-white shadow-md"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile padding spacer */}
      <div className="lg:hidden h-16" />

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-white border-l border-[#E2E8F0] z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full'
        } lg:translate-x-0`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop spacer - hidden on mobile, ordered last so sidebar sits on the right */}
      <div className="hidden lg:block lg:order-last w-64 flex-shrink-0" />
    </>
  )
}
