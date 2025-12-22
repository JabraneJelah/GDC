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
  ChevronRight,
  User,
  LogOut,
  GraduationCap
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

  // Fermer le menu mobile quand on change de page
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Vérifier si on est dans une page du référentiel pour ouvrir le menu
  useEffect(() => {
    const referentielPaths = ['/services', '/specialites', '/types-conge', '/categories-personnel']
    if (referentielPaths.some(path => pathname.startsWith(path))) {
      setIsReferentielOpen(true)
    }
  }, [pathname])

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
    },
    {
      href: '/professeurs',
      label: 'Professeurs',
      icon: GraduationCap,
    },
    {
      href: '/utilisateurs',
      label: 'Gestion des utilisateurs',
      icon: Users,
    },
    {
      href: '/conges',
      label: 'Gestion des congés',
      icon: Calendar,
    },
    {
      label: 'Référentiel',
      icon: Settings,
      children: [
        { href: '/services', label: 'Services' },
        { href: '/specialites', label: 'Spécialités' },
        { href: '/types-conge', label: 'Types de congé' },
        { href: '/categories-personnel', label: 'Catégorie personnel' },
      ],
    },
  ]

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/')

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <Link href="/dashboard" className="text-base font-semibold text-slate-900">
          Gestion des Congés
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
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                  {isReferentielOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {isReferentielOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                          isActive(child.href)
                            ? 'bg-slate-100 text-slate-900 font-medium'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-4 space-y-2">
        <Link href="/profile">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${
              pathname === '/profile' ? 'bg-slate-100' : ''
            }`}
          >
            <User className="h-5 w-5" />
            <span>Mon Profil</span>
          </Button>
        </Link>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="h-5 w-5" />
          <span>Déconnexion</span>
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
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
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop spacer - hidden on mobile */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
    </>
  )
}

