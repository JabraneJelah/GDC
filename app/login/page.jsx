'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Building2,
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
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-8 font-sans" dir="rtl">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          {/* Logo placeholder — replace src with actual logo path when available */}
          <div className="mb-7 flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">
              <Building2 className="size-8 text-slate-400" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-slate-900">نظام إدارة الموارد البشرية</h1>
              <p className="mt-0.5 text-sm text-slate-500">سجّل دخولك للمتابعة</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="block text-sm font-semibold text-slate-700">
                اسم المستخدم
              </Label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  id="username"
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="h-11 border-slate-300 bg-slate-50/50 pr-10 text-right text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-blue-500/30"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="mot_de_passe" className="block text-sm font-semibold text-slate-700">
                كلمة المرور
              </Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
                  className="h-11 border-slate-300 bg-slate-50/50 pr-10 pl-11 text-right text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-blue-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 w-full bg-blue-600 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:ring-blue-500/40 disabled:opacity-70"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>

          <p className="mt-7 border-t border-slate-100 pt-5 text-center text-xs text-slate-400">
            © 2026 — CHU · الوصول مقتصر على المستخدمين المصرح لهم
          </p>
        </div>
      </div>
    </div>
  )
}
