'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCurrentUser, isLecteurRH } from '@/components/UserContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, RefreshCw, Search, Users, X } from 'lucide-react'

const ITEMS_PER_PAGE = 10

const ROLE_LABELS = {
  UTILISATEUR_RH: 'مستخدم الموارد البشرية',
  LECTEUR_RH: 'مستخدم للقراءة فقط',
}

const ROLE_BADGE_STYLES = {
  UTILISATEUR_RH: 'bg-blue-50 text-blue-700 border-blue-200',
  LECTEUR_RH: 'bg-violet-50 text-violet-700 border-violet-200',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

export default function UtilisateursPage() {
  const { user: currentSessionUser } = useCurrentUser()
  const readOnly = isLecteurRH(currentSessionUser)

  const [utilisateurs, setUtilisateurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE)

  const [createOpen, setCreateOpen] = useState(false)
  const [formData, setFormData] = useState({ username: '', nom_complet: '', role: 'UTILISATEUR_RH' })
  const [formError, setFormError] = useState('')

  const [editingUser, setEditingUser] = useState(null)
  const [editFormData, setEditFormData] = useState({ username: '', nom_complet: '', role: 'UTILISATEUR_RH' })
  const [editFormError, setEditFormError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => { fetchUtilisateurs() }, [])

  useEffect(() => {
    const totalPages = Math.ceil(filteredUtilisateurs.length / pageSize)
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1)
  }, [utilisateurs.length, currentPage])

  const fetchUtilisateurs = async () => {
    try {
      const res = await fetch('/api/utilisateurs')
      if (res.ok) setUtilisateurs(await res.json())
    } catch {
      setErrorMessage('تعذر تحميل قائمة المستخدمين')
    } finally {
      setLoading(false)
    }
  }

  const filteredUtilisateurs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return utilisateurs
    return utilisateurs.filter((u) =>
      (u.username?.toLowerCase().includes(q)) ||
      (u.nom_complet?.toLowerCase().includes(q))
    )
  }, [utilisateurs, search])

  const totalFiltered = filteredUtilisateurs.length
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalFiltered)
  const paginatedUtilisateurs = filteredUtilisateurs.slice(startIndex, endIndex)

  const activeCount = useMemo(() => utilisateurs.filter((u) => u.actif).length, [utilisateurs])
  const inactiveCount = useMemo(() => utilisateurs.filter((u) => !u.actif).length, [utilisateurs])

  const openCreate = () => {
    setFormData({ username: '', nom_complet: '', role: 'UTILISATEUR_RH' })
    setFormError('')
    setErrorMessage('')
    setSuccessMessage('')
    setCreateOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.username.trim() || !formData.nom_complet.trim()) {
      setFormError('المرجو ملء جميع الحقول الإلزامية')
      return
    }
    setFormError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/utilisateurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setCreateOpen(false)
        setSuccessMessage('تمت إضافة المستخدم بنجاح. كلمة المرور الافتراضية: 123456')
        setCurrentPage(1)
        fetchUtilisateurs()
      } else {
        const data = await res.json().catch(() => null)
        setFormError(data?.error || 'تعذر إنشاء المستخدم')
      }
    } catch {
      setFormError('تعذر إنشاء المستخدم')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (user) => {
    setEditingUser(user)
    setEditFormData({
      username: user.username ?? '',
      nom_complet: user.nom_complet ?? '',
      role: user.role ?? 'UTILISATEUR_RH',
    })
    setEditFormError('')
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    if (!editFormData.username.trim() || !editFormData.nom_complet.trim()) {
      setEditFormError('المرجو ملء جميع الحقول الإلزامية')
      return
    }
    setEditFormError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/utilisateurs/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      })
      if (res.ok) {
        setEditingUser(null)
        setSuccessMessage('تم تحديث المستخدم بنجاح')
        fetchUtilisateurs()
      } else {
        const data = await res.json().catch(() => null)
        setEditFormError(data?.error || 'تعذر تحديث المستخدم')
      }
    } catch {
      setEditFormError('تعذر تحديث المستخدم')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActif = async (user) => {
    setActionLoadingId(user.id)
    try {
      const res = await fetch(`/api/utilisateurs/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !user.actif }),
      })
      if (res.ok) {
        fetchUtilisateurs()
      } else {
        const data = await res.json().catch(() => null)
        setErrorMessage(data?.error || 'تعذر تغيير الحالة')
      }
    } catch {
      setErrorMessage('تعذر تغيير الحالة')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleResetPassword = async () => {
    if (!editingUser) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/utilisateurs/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_password: true }),
      })
      if (res.ok) {
        setEditFormError('')
        setSuccessMessage('تمت إعادة تعيين كلمة المرور إلى 123456')
      } else {
        const data = await res.json().catch(() => null)
        setEditFormError(data?.error || 'تعذر إعادة تعيين كلمة المرور')
      }
    } catch {
      setEditFormError('تعذر إعادة تعيين كلمة المرور')
    } finally {
      setSubmitting(false)
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
        <div className="flex items-start justify-between gap-4">
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">المستخدمون</h1>
            <p className="mt-0.5 text-sm text-slate-500">تدبير مستخدمي النظام</p>
          </div>
          {!readOnly && (
            <Button
              type="button"
              onClick={openCreate}
              className="shrink-0 gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="size-4" />
              إضافة مستخدم
            </Button>
          )}
        </div>
        <div className="mt-4 flex items-center gap-6">
          <div>
            <p className="text-xs text-slate-500">الإجمالي</p>
            <p className="text-xl font-bold text-slate-900" dir="ltr">{utilisateurs.length}</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <p className="text-xs text-slate-500">نشطون</p>
            <p className="text-xl font-bold text-green-700" dir="ltr">{activeCount}</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <p className="text-xs text-slate-500">غير نشطين</p>
            <p className="text-xl font-bold text-slate-400" dir="ltr">{inactiveCount}</p>
          </div>
        </div>
      </div>

      {/* Feedback messages */}
      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-right text-sm text-green-700">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Search bar */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              placeholder="البحث عن مستخدم..."
              className="h-9 rounded-xl border-slate-300 bg-white pr-9 text-right text-sm placeholder:text-slate-400 focus-visible:ring-blue-500"
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setCurrentPage(1) }}
              className="cursor-pointer flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {search && (
          <p className="mt-2 text-xs text-slate-500">
            عرض <span className="font-semibold text-slate-800">{filteredUtilisateurs.length}</span> نتيجة
          </p>
        )}
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F1F5F9]">
                <th scope="col" className="px-5 py-3 text-right text-sm font-semibold text-slate-700">اسم المستخدم</th>
                <th scope="col" className="px-5 py-3 text-right text-sm font-semibold text-slate-700">الاسم الكامل</th>
                <th scope="col" className="px-5 py-3 text-right text-sm font-semibold text-slate-700">الدور</th>
                <th scope="col" className="px-5 py-3 text-right text-sm font-semibold text-slate-700">الحالة</th>
                <th scope="col" className="px-5 py-3 text-right text-sm font-semibold text-slate-700">تاريخ الإنشاء</th>
                {!readOnly && (
                  <th scope="col" className="w-36 px-5 py-3 text-center text-sm font-semibold text-slate-700">الإجراءات</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUtilisateurs.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 5 : 6} className="px-6 py-14 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                      <Users className="size-9 text-slate-300" strokeWidth={1.5} />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-600">
                          {search ? 'لا يوجد مستخدمون مطابقون للبحث' : 'لا يوجد مستخدمون حالياً'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {search ? 'جرب تعديل كلمة البحث' : 'أضف مستخدماً جديداً للبدء'}
                        </p>
                      </div>
                      {search && (
                        <Button variant="outline" size="sm" onClick={() => { setSearch(''); setCurrentPage(1) }} className="mt-1 gap-1.5">
                          <X className="size-3.5" />
                          مسح البحث
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUtilisateurs.map((user) => (
                  <tr key={user.id} className="bg-white transition-colors hover:bg-[#F8FAFC]">
                    <td className="px-5 py-3 text-right">
                      <span className="block max-w-[160px] truncate text-sm font-semibold text-slate-900" title={user.username}>
                        {user.username ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="block max-w-[200px] truncate text-sm text-slate-700" title={user.nom_complet}>
                        {user.nom_complet ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE_STYLES[user.role] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {ROLE_LABELS[user.role] ?? user.role ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${user.actif ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.actif ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {user.actif ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-slate-600">
                      {formatDate(user.cree_le)}
                    </td>
                    {!readOnly && (
                      <td className="px-5 py-3 text-sm">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleActif(user)}
                            disabled={actionLoadingId === user.id}
                            className={`cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              user.actif
                                ? 'text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                                : 'text-slate-600 hover:bg-green-50 hover:text-green-700'
                            }`}
                          >
                            {actionLoadingId === user.id ? '...' : user.actif ? 'تعطيل' : 'تفعيل'}
                          </button>
                          <span className="text-slate-200">|</span>
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            className="cursor-pointer rounded-md px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          >
                            تعديل
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
          <span className="text-sm text-slate-500" dir="ltr">
            {totalFiltered > 0 ? `${startIndex + 1}-${endIndex} من ${totalFiltered}` : '0 من 0'}
          </span>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>عدد المدخلات في كل صفحة:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setFormData({ username: '', nom_complet: '', role: 'UTILISATEUR_RH' }); setFormError('') } }}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="border-b border-slate-100 pb-4 text-right">
            <DialogTitle className="text-xl font-bold text-slate-950">إضافة مستخدم</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              سيتم تعيين كلمة المرور الافتراضية <span dir="ltr" className="font-mono font-semibold">123456</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="create-username" className="block text-sm font-semibold text-slate-700">
                اسم المستخدم <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-username"
                value={formData.username}
                onChange={(e) => { setFormData({ ...formData, username: e.target.value }); setFormError('') }}
                placeholder="nom_utilisateur"
                className="h-10 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
                dir="ltr"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-nom" className="block text-sm font-semibold text-slate-700">
                الاسم الكامل <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-nom"
                value={formData.nom_complet}
                onChange={(e) => { setFormData({ ...formData, nom_complet: e.target.value }); setFormError('') }}
                placeholder="الاسم الكامل للمستخدم"
                className="h-10 rounded-xl border-slate-300 bg-white text-right text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-role" className="block text-sm font-semibold text-slate-700">
                الدور <span className="text-red-500">*</span>
              </Label>
              <select
                id="create-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-right text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="UTILISATEUR_RH">مستخدم الموارد البشرية</option>
                <option value="LECTEUR_RH">مستخدم للقراءة فقط</option>
              </select>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={submitting}
                className="w-full cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed sm:w-auto"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full cursor-pointer bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed sm:w-auto"
              >
                {submitting ? 'جاري الإنشاء...' : 'إضافة المستخدم'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null) }}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="border-b border-slate-100 pb-4 text-right">
            <DialogTitle className="text-xl font-bold text-slate-950">تعديل المستخدم</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              تعديل معلومات حساب <span className="font-semibold text-slate-700">{editingUser?.username}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-5">
            {editFormError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
                {editFormError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-username" className="block text-sm font-semibold text-slate-700">
                اسم المستخدم <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-username"
                value={editFormData.username}
                onChange={(e) => { setEditFormData({ ...editFormData, username: e.target.value }); setEditFormError('') }}
                className="h-10 rounded-xl border-slate-300 bg-white text-slate-900 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
                dir="ltr"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-nom" className="block text-sm font-semibold text-slate-700">
                الاسم الكامل <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-nom"
                value={editFormData.nom_complet}
                onChange={(e) => { setEditFormData({ ...editFormData, nom_complet: e.target.value }); setEditFormError('') }}
                className="h-10 rounded-xl border-slate-300 bg-white text-right text-slate-900 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-role" className="block text-sm font-semibold text-slate-700">الدور</Label>
              <select
                id="edit-role"
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-right text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="UTILISATEUR_RH">مستخدم الموارد البشرية</option>
                <option value="LECTEUR_RH">مستخدم للقراءة فقط</option>
              </select>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="mb-2 text-xs font-semibold text-amber-700">إعادة تعيين كلمة المرور</p>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={submitting}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="size-3.5" />
                إعادة التعيين إلى 123456
              </button>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
                disabled={submitting}
                className="w-full cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed sm:w-auto"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full cursor-pointer bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed sm:w-auto"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
