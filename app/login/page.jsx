'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Building2,
  CalendarRange,
  Eye,
  EyeOff,
  Lock,
  User,
} from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [mot_de_passe, setMotDePasse] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, mot_de_passe }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erreur de connexion')
        setLoading(false)
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 100))

      setLoading(false)
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Login error:', err)
      setError('Erreur de connexion')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col font-sans md:flex-row">
      {/* Branded panel */}
      <aside className="relative flex min-h-[200px] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-[#0c2847] to-slate-950 px-8 py-8 text-white md:min-h-screen md:w-[44%] lg:w-[40%] xl:max-w-xl xl:w-[38%]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/[0.08]" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full border border-white/[0.06]" />

        <div className="relative z-10 flex flex-1 flex-col justify-center md:justify-start md:pt-8 lg:pt-14">

          <h1 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-[1.75rem] xl:text-3xl">
          Plateforme de gestion des congés
          </h1>

          <div className="mt-8 hidden items-center gap-3 text-slate-400 md:flex">


          </div>
        </div>

        <p className="relative z-10 mt-6 text-xs text-slate-500 md:mt-0">
          © 2026 — CHU
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/90 px-5 py-10 sm:px-8 md:px-10 lg:px-14">
        <div className="w-full max-w-[420px] rounded-2xl border border-slate-200/90 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-9">
          <div className="mb-8 space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-800">
              Connexion
            </h2>
            <p className="text-sm leading-relaxed text-slate-500">
              Saisissez vos identifiants RH pour accéder à l&apos;application.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                Nom d&apos;utilisateur
              </Label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  id="username"
                  type="text"
                  placeholder="Identifiant"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="h-11 border-slate-200 bg-slate-50/50 pl-10 transition-colors focus-visible:bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mot_de_passe" className="text-sm font-medium text-slate-700">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  id="mot_de_passe"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={mot_de_passe}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 border-slate-200 bg-slate-50/50 pl-10 pr-11 transition-colors focus-visible:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-center text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-[#3B82F6] text-[15px] font-medium text-white shadow-sm transition-colors duration-200 hover:bg-[#2563EB] focus-visible:ring-blue-500/40 disabled:opacity-70"
            >
              {loading ? 'Connexion en cours…' : 'Se connecter'}
            </Button>
          </form>

          <p className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            © 2026 — CHU · Accès réservé au personnel autorisé
          </p>
        </div>
      </main>
    </div>
  )
}
