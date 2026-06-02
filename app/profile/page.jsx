'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, User } from 'lucide-react'

function formatDateArabic(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ar-MA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const [profileData, setProfileData] = useState({ username: '', nom_complet: '' })
  const [passwordData, setPasswordData] = useState({
    mot_de_passe_actuel: '',
    nouveau_mot_de_passe: '',
    confirmer_mot_de_passe: '',
  })

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile')
      if (response.ok) {
        const data = await response.json()
        setUser(data)
        setProfileData({ username: data.username || '', nom_complet: data.nom_complet || '' })
      } else {
        setProfileError('تعذر تحميل الملف الشخصي')
      }
    } catch {
      setProfileError('تعذر تحميل الملف الشخصي')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setUpdatingProfile(true)
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data)
        setProfileSuccess('تم تحديث المعلومات بنجاح')
      } else {
        const data = await response.json().catch(() => null)
        setProfileError(data?.error || 'تعذر تحديث المعلومات')
      }
    } catch {
      setProfileError('تعذر تحديث المعلومات')
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordData.nouveau_mot_de_passe !== passwordData.confirmer_mot_de_passe) {
      setPasswordError('كلمتا المرور الجديدتان غير متطابقتين')
      return
    }
    if (passwordData.nouveau_mot_de_passe.length < 6) {
      setPasswordError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل')
      return
    }

    setUpdatingPassword(true)
    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mot_de_passe_actuel: passwordData.mot_de_passe_actuel,
          nouveau_mot_de_passe: passwordData.nouveau_mot_de_passe,
        }),
      })
      if (response.ok) {
        setPasswordSuccess('تم تغيير كلمة المرور بنجاح')
        setPasswordData({ mot_de_passe_actuel: '', nouveau_mot_de_passe: '', confirmer_mot_de_passe: '' })
      } else {
        const data = await response.json().catch(() => null)
        setPasswordError(data?.error || 'تعذر تغيير كلمة المرور')
      }
    } catch {
      setPasswordError('تعذر تغيير كلمة المرور')
    } finally {
      setUpdatingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
        <span className="size-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-600" />
        <p className="text-sm text-gray-500">جاري التحميل...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" dir="rtl">

      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <User className="size-6 text-blue-600" />
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">الملف الشخصي</h1>
            <p className="mt-0.5 text-sm text-slate-500">تدبير معلومات الحساب وكلمة المرور</p>
          </div>
        </div>
        {user && (
          <div className="mt-4 flex items-center gap-6 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs text-slate-500">اسم المستخدم</p>
              <p className="text-sm font-semibold text-slate-800" dir="ltr">{user.username ?? '—'}</p>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <p className="text-xs text-slate-500">الاسم الكامل</p>
              <p className="text-sm font-semibold text-slate-800">{user.nom_complet ?? '—'}</p>
            </div>
            {user.cree_le && (
              <>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <p className="text-xs text-slate-500">تاريخ إنشاء الحساب</p>
                  <p className="text-sm font-semibold text-slate-800">{formatDateArabic(user.cree_le)}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Two-column forms */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Personal info card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <User className="size-4 text-slate-500" />
              <h2 className="font-semibold text-slate-800">المعلومات الشخصية</h2>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-5 px-6 py-5">
            {profileError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-right text-sm text-green-700">
                {profileSuccess}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username" className="block text-sm font-semibold text-slate-700">
                اسم المستخدم <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                type="text"
                value={profileData.username}
                onChange={(e) => { setProfileData({ ...profileData, username: e.target.value }); setProfileError(''); setProfileSuccess('') }}
                required
                dir="ltr"
                className="h-10 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nom_complet" className="block text-sm font-semibold text-slate-700">
                الاسم الكامل <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nom_complet"
                value={profileData.nom_complet}
                onChange={(e) => { setProfileData({ ...profileData, nom_complet: e.target.value }); setProfileError(''); setProfileSuccess('') }}
                required
                className="h-10 rounded-xl border-slate-300 bg-white text-right text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <Button
                type="submit"
                disabled={updatingProfile}
                className="cursor-pointer bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed"
              >
                {updatingProfile ? 'جاري التحديث...' : 'تحديث المعلومات'}
              </Button>
            </div>
          </form>
        </div>

        {/* Password card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <KeyRound className="size-4 text-slate-500" />
              <h2 className="font-semibold text-slate-800">تغيير كلمة المرور</h2>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-5 px-6 py-5">
            {passwordError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-right text-sm text-green-700">
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="mot_de_passe_actuel" className="block text-sm font-semibold text-slate-700">
                كلمة المرور الحالية <span className="text-red-500">*</span>
              </Label>
              <Input
                id="mot_de_passe_actuel"
                type="password"
                value={passwordData.mot_de_passe_actuel}
                onChange={(e) => { setPasswordData({ ...passwordData, mot_de_passe_actuel: e.target.value }); setPasswordError(''); setPasswordSuccess('') }}
                required
                className="h-10 rounded-xl border-slate-300 bg-white text-slate-900 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nouveau_mot_de_passe" className="block text-sm font-semibold text-slate-700">
                كلمة المرور الجديدة <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nouveau_mot_de_passe"
                type="password"
                value={passwordData.nouveau_mot_de_passe}
                onChange={(e) => { setPasswordData({ ...passwordData, nouveau_mot_de_passe: e.target.value }); setPasswordError(''); setPasswordSuccess('') }}
                required
                minLength={6}
                className="h-10 rounded-xl border-slate-300 bg-white text-slate-900 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
              />
              <p className="text-xs text-slate-400">6 أحرف على الأقل</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmer_mot_de_passe" className="block text-sm font-semibold text-slate-700">
                تأكيد كلمة المرور الجديدة <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmer_mot_de_passe"
                type="password"
                value={passwordData.confirmer_mot_de_passe}
                onChange={(e) => { setPasswordData({ ...passwordData, confirmer_mot_de_passe: e.target.value }); setPasswordError(''); setPasswordSuccess('') }}
                required
                minLength={6}
                className="h-10 rounded-xl border-slate-300 bg-white text-slate-900 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <Button
                type="submit"
                disabled={updatingPassword}
                className="cursor-pointer bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed"
              >
                {updatingPassword ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </Button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
