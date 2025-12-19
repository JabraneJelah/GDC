'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon, MenuIcon, XIcon } from 'lucide-react'

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/dashboard', label: 'Tableau de bord' },
  ]

  const referentielItems = [
    { href: '/professeurs', label: 'Professeurs' },
    { href: '/conges', label: 'Congés' },
    { href: '/types-conge', label: 'Types de Congé' },
    { href: '/categories-personnel', label: 'Catégories' },
    { href: '/specialites', label: 'Spécialités' },
    { href: '/titres', label: 'Titres' },
  ]

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const isReferentielActive = referentielItems.some(item => pathname === item.href)

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <Link href="/dashboard" className="text-base sm:text-lg font-semibold">
              Gestion des Congés
            </Link>
            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-slate-100 text-gray-900'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-2 ${
                  isReferentielActive ? 'bg-slate-100' : ''
                }`}
              >
                Référentiel
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-slate-200 bg-white shadow-lg z-50">
                  <div className="py-1">
                    {referentielItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsDropdownOpen(false)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          pathname === item.href
                            ? 'bg-slate-100 text-gray-900 font-medium'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-gray-900'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Link href="/profile">
              <Button 
                variant="outline" 
                className={`text-sm ${pathname === '/profile' ? 'bg-slate-100' : ''}`}
              >
                Mon Profil
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout} className="text-sm">
              Déconnexion
            </Button>
          </div>
          <div className="md:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-9 w-9 p-0"
            >
              {isMobileMenuOpen ? (
                <XIcon className="h-5 w-5" />
              ) : (
                <MenuIcon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-slate-100 text-gray-900'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-200">
              <div className="px-3 py-2 text-sm font-medium text-slate-700">
                Référentiel
              </div>
              {referentielItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-6 py-2 rounded-md text-sm transition-colors ${
                    pathname === item.href
                      ? 'bg-slate-100 text-gray-900 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="pt-2 border-t border-slate-200">
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                  pathname === '/profile'
                    ? 'bg-slate-100 text-gray-900 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Mon Profil
              </Link>
            </div>
            <div className="pt-2 border-t border-slate-200 px-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  handleLogout()
                }}
                className="w-full"
              >
                Déconnexion
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

