'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Settings, Menu } from 'lucide-react'

function getInitials(name) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const STATUT_LABELS = {
  ENREGISTRE: 'مسجل',
  DOCUMENTS_INITIAUX_GENERES: 'وثائق أولية',
  BROUILLON: 'مسودة',
  NOTIFIE: 'مُبلَّغ',
  EN_ATTENTE_REPONSE: 'في انتظار الجواب',
  REPONSE_RECUE: 'جواب مستلم',
  REPONSE_CONVAINCANTE: 'جواب مقنع',
  REPONSE_NON_CONVAINCANTE: 'جواب غير مقنع',
  PROCEDURE_SUIVANTE_GENEREE: 'مسطرة تالية',
  CLOTURE: 'مغلق',
  A_ARCHIVER: 'في انتظار الأرشفة',
  ARCHIVE: 'مؤرشف',
}

export function Header({ onMobileMenuOpen }) {
  const [user, setUser] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data))
      .catch(() => {})
  }, [])

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          setResults(await res.json())
        }
      } catch {}
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Close on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setResults(null)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const handleSelect = (href) => {
    setResults(null)
    setQuery('')
    router.push(href)
  }

  const hasResults = results && (results.professeurs.length > 0 || results.dossiers.length > 0)
  const isEmpty = results && !hasResults

  return (
    <header
      dir="rtl"
      className="fixed left-0 right-0 top-0 z-[60] flex h-14 w-full items-center justify-between border-b border-[#0F67A7] bg-[#1174BC] px-4 lg:px-8"
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

        {/* Search container */}
        <div ref={containerRef} className="relative hidden lg:block">
          <div className="flex w-64 items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-3 py-1.5 text-sm text-white/85 shadow-sm">
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
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="البحث في التطبيق..."
              dir="rtl"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/70"
            />
            {loading && (
              <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
          </div>

          {/* Dropdown */}
          {(hasResults || isEmpty) && (
            <div
              dir="rtl"
              className="absolute right-0 top-full z-[70] mt-1.5 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              {isEmpty ? (
                <p className="px-4 py-5 text-center text-sm text-slate-500">لا توجد نتائج</p>
              ) : (
                <>
                  {results.professeurs.length > 0 && (
                    <div>
                      <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        الموظفين
                      </p>
                      {results.professeurs.map((p) => {
                        const displayName =
                          p.nom_ar && p.prenom_ar
                            ? `${p.nom_ar} ${p.prenom_ar}`
                            : `${p.prenom} ${p.nom}`
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelect(`/professeurs/${p.id}`)}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right transition-colors hover:bg-slate-50"
                          >
                            <span className="truncate text-sm font-medium text-slate-800">{displayName}</span>
                            {p.ppr && (
                              <span className="shrink-0 text-xs text-slate-400" dir="ltr">{p.ppr}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {results.dossiers.length > 0 && (
                    <div className={results.professeurs.length > 0 ? 'border-t border-slate-100' : ''}>
                      <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        الملفات التوضيحية
                      </p>
                      {results.dossiers.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => handleSelect(`/dossiers-explicatifs/${d.id}`)}
                          className="w-full px-3 py-2.5 text-right transition-colors hover:bg-slate-50"
                        >
                          <p className="text-sm font-medium text-slate-800" dir="ltr">{d.reference}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{d.nom_complet}</p>
                          {d.statut && (
                            <p className="mt-0.5 text-xs text-slate-400">{STATUT_LABELS[d.statut] || d.statut}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
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
        <Link
          href="/profile"
          title="الملف الشخصي"
          className="mr-2 flex size-9 cursor-pointer select-none items-center justify-center rounded-full bg-white text-sm font-semibold text-[#1174BC] shadow-sm transition-opacity hover:opacity-80"
        >
          {user ? getInitials(user.nom_complet || user.username) : '—'}
        </Link>
      </div>
    </header>
  )
}
