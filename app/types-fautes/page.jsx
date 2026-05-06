'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, Plus, ShieldAlert } from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────


function ActiveBadge({ actif }) {
  return actif
    ? (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        نشط
      </span>
    )
    : (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
        غير نشط
      </span>
    )
}

const EMPTY_FORM = { code: '', nom: '', description: '' }

// ─── page ─────────────────────────────────────────────────────────────────────

export default function TypesFautesPage() {
  const [typesFaute, setTypesFaute] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  // filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')

  // create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_FORM)
  const [createErrors, setCreateErrors] = useState({})
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createApiError, setCreateApiError] = useState('')

  // edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editErrors, setEditErrors] = useState({})
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editApiError, setEditApiError] = useState('')

  // deactivate confirm dialog
  const [deactivateId, setDeactivateId] = useState(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)
  const [deactivateApiError, setDeactivateApiError] = useState('')

  // inline success toast
  const [toast, setToast] = useState('')

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchTypesFaute = useCallback(async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) setLoading(true)
      setFetchError(false)
      const res = await fetch('/api/type-faute')
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setTypesFaute(Array.isArray(data) ? data : [])
    } catch {
      setFetchError(true)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTypesFaute({ showLoading: true })
  }, [fetchTypesFaute])

  // auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // ── derived ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return typesFaute.filter((tf) => {
      if (statusFilter === 'actif' && !tf.actif) return false
      if (statusFilter === 'inactif' && tf.actif) return false
      if (!q) return true
      return (
        tf.code?.toLowerCase().includes(q) ||
        tf.nom?.toLowerCase().includes(q) ||
        tf.description?.toLowerCase().includes(q)
      )
    })
  }, [typesFaute, search, statusFilter])

  const activeCount = useMemo(() => typesFaute.filter((t) => t.actif).length, [typesFaute])
  const inactiveCount = useMemo(() => typesFaute.filter((t) => !t.actif).length, [typesFaute])

  const deactivatingRecord = typesFaute.find((t) => t.id === deactivateId)

  // ── create ─────────────────────────────────────────────────────────────────

  const validateCreate = () => {
    const errors = {}
    if (!createForm.code.trim()) errors.code = 'الرمز مطلوب'
    else if (!/^[A-Z0-9_]+$/.test(createForm.code.trim())) errors.code = 'يجب أن يحتوي الرمز على أحرف لاتينية كبيرة وأرقام وشرطة سفلية فقط'
    if (!createForm.nom.trim()) errors.nom = 'اسم نوع المخالفة مطلوب'
    setCreateErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreateApiError('')
    if (!validateCreate()) return
    setCreateSubmitting(true)
    try {
      const res = await fetch('/api/type-faute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: createForm.code.trim().toUpperCase(),
          nom: createForm.nom.trim(),
          description: createForm.description.trim() || null,
          actif: true,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setCreateApiError(body?.error || 'تعذر إنشاء نوع المخالفة')
        return
      }
      setCreateOpen(false)
      setCreateForm(EMPTY_FORM)
      setCreateErrors({})
      setToast('تم إنشاء نوع المخالفة بنجاح')
      await fetchTypesFaute()
    } catch {
      setCreateApiError('حدث خطأ غير متوقع')
    } finally {
      setCreateSubmitting(false)
    }
  }

  // ── edit ───────────────────────────────────────────────────────────────────

  const openEdit = (tf) => {
    setEditingId(tf.id)
    setEditForm({ code: tf.code || '', nom: tf.nom || '', description: tf.description || '' })
    setEditErrors({})
    setEditApiError('')
    setEditOpen(true)
  }

  const validateEdit = () => {
    const errors = {}
    if (!editForm.code.trim()) errors.code = 'الرمز مطلوب'
    else if (!/^[A-Z0-9_]+$/.test(editForm.code.trim())) errors.code = 'يجب أن يحتوي الرمز على أحرف لاتينية كبيرة وأرقام وشرطة سفلية فقط'
    if (!editForm.nom.trim()) errors.nom = 'اسم نوع المخالفة مطلوب'
    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setEditApiError('')
    if (!validateEdit()) return
    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/type-faute/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editForm.code.trim().toUpperCase(),
          nom: editForm.nom.trim(),
          description: editForm.description.trim() || null,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setEditApiError(body?.error || 'تعذر تحديث نوع المخالفة')
        return
      }
      setEditOpen(false)
      setEditingId(null)
      setToast('تم تحديث نوع المخالفة بنجاح')
      await fetchTypesFaute()
    } catch {
      setEditApiError('حدث خطأ غير متوقع')
    } finally {
      setEditSubmitting(false)
    }
  }

  // ── deactivate / reactivate ────────────────────────────────────────────────

  const handleDeactivate = async () => {
    if (!deactivateId || deactivateLoading) return
    setDeactivateApiError('')
    setDeactivateLoading(true)
    try {
      const res = await fetch(`/api/type-faute/${deactivateId}`, { method: 'DELETE' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setDeactivateApiError(body?.error || 'تعذر تعطيل نوع المخالفة')
        return
      }
      setDeactivateId(null)
      setToast('تم تعطيل نوع المخالفة')
      await fetchTypesFaute()
    } catch {
      setDeactivateApiError('حدث خطأ غير متوقع')
    } finally {
      setDeactivateLoading(false)
    }
  }

  const handleReactivate = async (id) => {
    try {
      const res = await fetch(`/api/type-faute/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: true }),
      })
      if (!res.ok) return
      setToast('تمت إعادة تفعيل نوع المخالفة')
      await fetchTypesFaute()
    } catch {
      // silent
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
          <span className="size-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
          <p className="text-sm text-slate-600">جاري تحميل أنواع المخالفات...</p>
        </div>
      </PageShell>
    )
  }

  if (fetchError) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4" dir="rtl">
          <AlertTriangle className="size-10 text-red-400" />
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-slate-800">تعذر تحميل أنواع المخالفات</p>
            <p className="text-sm text-slate-600">تحقق من اتصالك ثم حاول مجددًا</p>
          </div>
          <Button variant="outline" onClick={() => fetchTypesFaute({ showLoading: true })}>
            إعادة المحاولة
          </Button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="space-y-5" dir="rtl">

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700 shadow-lg">
            {toast}
          </div>
        )}

        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1 text-right">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-blue-600" />
                <h1 className="text-2xl font-semibold text-slate-950">أنواع المخالفات</h1>
              </div>
              <p className="text-sm text-slate-600">
                تدبير أنواع المخالفات المرتبطة بالملفات التوضيحية والنماذج
              </p>
              <div className="flex items-center gap-4 pt-1 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-900">{activeCount}</span>
                  <span className="text-slate-600">نشط</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-slate-300" />
                  <span className="font-semibold text-slate-900">{inactiveCount}</span>
                  <span className="text-slate-600">غير نشط</span>
                </span>
              </div>
            </div>
            <Button
              type="button"
              className="gap-2 sm:w-auto"
              onClick={() => { setCreateForm(EMPTY_FORM); setCreateErrors({}); setCreateApiError(''); setCreateOpen(true) }}
            >
              <Plus className="size-4" />
              إضافة نوع مخالفة
            </Button>
          </div>
        </section>

        {/* Search + status filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث بالرمز أو الاسم أو الوصف..."
              className="h-10 rounded-xl border-slate-300 bg-white text-right text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full rounded-xl border-slate-300 bg-white text-right text-sm text-slate-900 sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">الكل</SelectItem>
              <SelectItem value="actif">نشط فقط</SelectItem>
              <SelectItem value="inactif">غير نشط فقط</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Results count */}
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-right text-xs font-medium text-slate-600 sm:px-6">
            عرض{' '}
            <span className="font-bold text-slate-900">{filtered.length}</span>{' '}
            {filtered.length === 1 ? 'نوع مخالفة' : 'نوع مخالفة'}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F1F5F9]">
                  <th scope="col" className="px-5 py-3 text-right text-xs font-semibold text-slate-700">الرمز</th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-semibold text-slate-700">نوع المخالفة</th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-semibold text-slate-700">الوصف</th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-semibold text-slate-700">الحالة</th>
                  <th scope="col" className="px-5 py-3 text-center text-xs font-semibold text-slate-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                        <ShieldAlert className="size-9 text-slate-300" strokeWidth={1.5} />
                        <p className="text-sm font-medium text-slate-700">
                          {search || statusFilter !== 'tous'
                            ? 'لا توجد أنواع مخالفات مطابقة'
                            : 'لا توجد أنواع مخالفات حاليا'}
                        </p>
                        {(search || statusFilter !== 'tous') && (
                          <button
                            type="button"
                            onClick={() => { setSearch(''); setStatusFilter('tous') }}
                            className="text-xs text-blue-600 underline hover:text-blue-800"
                          >
                            مسح الفلاتر
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((tf) => (
                    <tr key={tf.id} className={`bg-white transition-colors hover:bg-[#F8FAFC] ${!tf.actif ? 'opacity-70' : ''}`}>
                      <td className="px-5 py-3.5">
                        <span dir="ltr" className="font-mono text-sm font-semibold text-slate-800">
                          {tf.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-medium text-slate-900">{tf.nom}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm text-slate-600 line-clamp-2">
                          {tf.description || <span className="text-slate-400">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <ActiveBadge actif={tf.actif} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(tf)}
                            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          >
                            تعديل
                          </button>
                          <span className="text-slate-200">|</span>
                          {tf.actif ? (
                            <button
                              type="button"
                              onClick={() => { setDeactivateId(tf.id); setDeactivateApiError('') }}
                              className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50"
                            >
                              تعطيل
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReactivate(tf.id)}
                              className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                            >
                              إعادة تفعيل
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Create dialog ── */}
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setCreateForm(EMPTY_FORM); setCreateErrors({}); setCreateApiError('') } }}>
          <DialogContent className="max-w-lg rounded-2xl border-slate-200 shadow-xl" dir="rtl">
            <DialogHeader className="border-b border-slate-100 pb-4 text-right">
              <DialogTitle className="text-lg font-bold text-slate-950">إضافة نوع مخالفة</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                أدخل معطيات نوع المخالفة الجديد. سيكون نشطًا تلقائيًا.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 pt-1">
              {createApiError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="size-4 shrink-0" />
                  {createApiError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="create-code" className="block text-right text-sm font-medium text-slate-700">
                  الرمز <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-code"
                  value={createForm.code}
                  onChange={(e) => { setCreateForm((p) => ({ ...p, code: e.target.value.toUpperCase() })); setCreateErrors((p) => ({ ...p, code: '' })) }}
                  placeholder="مثال: RETARD"
                  dir="ltr"
                  className="h-10 rounded-xl border-slate-300 bg-white font-mono text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500"
                />
                <p className="text-xs text-slate-500">أحرف لاتينية كبيرة وأرقام وشرطة سفلية فقط</p>
                {createErrors.code && <p className="text-xs font-medium text-red-600">{createErrors.code}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-nom" className="block text-right text-sm font-medium text-slate-700">
                  نوع المخالفة <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-nom"
                  value={createForm.nom}
                  onChange={(e) => { setCreateForm((p) => ({ ...p, nom: e.target.value })); setCreateErrors((p) => ({ ...p, nom: '' })) }}
                  placeholder="مثال: التأخر عن العمل"
                  className="h-10 rounded-xl border-slate-300 bg-white text-right text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500"
                />
                {createErrors.nom && <p className="text-xs font-medium text-red-600">{createErrors.nom}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-description" className="block text-right text-sm font-medium text-slate-700">
                  الوصف
                </Label>
                <textarea
                  id="create-description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="وصف اختياري..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={createSubmitting}
                  className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 sm:w-auto"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={createSubmitting}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                >
                  {createSubmitting ? 'جاري الحفظ...' : 'إضافة نوع المخالفة'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Edit dialog ── */}
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setEditingId(null); setEditErrors({}); setEditApiError('') } }}>
          <DialogContent className="max-w-lg rounded-2xl border-slate-200 shadow-xl" dir="rtl">
            <DialogHeader className="border-b border-slate-100 pb-4 text-right">
              <DialogTitle className="text-lg font-bold text-slate-950">تعديل نوع المخالفة</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                تعديل معطيات نوع المخالفة لن يؤثر على الملفات المرتبطة به.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEdit} className="space-y-4 pt-1">
              {editApiError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="size-4 shrink-0" />
                  {editApiError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="edit-code" className="block text-right text-sm font-medium text-slate-700">
                  الرمز <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-code"
                  value={editForm.code}
                  onChange={(e) => { setEditForm((p) => ({ ...p, code: e.target.value.toUpperCase() })); setEditErrors((p) => ({ ...p, code: '' })) }}
                  dir="ltr"
                  className="h-10 rounded-xl border-slate-300 bg-white font-mono text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500"
                />
                {editErrors.code && <p className="text-xs font-medium text-red-600">{editErrors.code}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-nom" className="block text-right text-sm font-medium text-slate-700">
                  نوع المخالفة <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-nom"
                  value={editForm.nom}
                  onChange={(e) => { setEditForm((p) => ({ ...p, nom: e.target.value })); setEditErrors((p) => ({ ...p, nom: '' })) }}
                  className="h-10 rounded-xl border-slate-300 bg-white text-right text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500"
                />
                {editErrors.nom && <p className="text-xs font-medium text-red-600">{editErrors.nom}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-description" className="block text-right text-sm font-medium text-slate-700">
                  الوصف
                </Label>
                <textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={editSubmitting}
                  className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 sm:w-auto"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={editSubmitting}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                >
                  {editSubmitting ? 'جاري التحديث...' : 'حفظ التعديلات'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Deactivate confirm dialog ── */}
        <Dialog
          open={Boolean(deactivateId)}
          onOpenChange={(open) => { if (!open) { setDeactivateId(null); setDeactivateApiError('') } }}
        >
          <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-right text-lg font-bold text-slate-950">تأكيد التعطيل</DialogTitle>
              <DialogDescription className="text-right text-sm text-slate-600">
                هل تريد تعطيل هذا النوع من المخالفة؟
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {deactivatingRecord && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">نوع المخالفة</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800" dir="ltr">
                    {deactivatingRecord.code}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-900">{deactivatingRecord.nom}</p>
                </div>
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                لن يظهر هذا النوع في نماذج إنشاء الملفات الجديدة، لكن الملفات الموجودة ستبقى صالحة.
              </div>

              {deactivateApiError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="size-4 shrink-0" />
                  {deactivateApiError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setDeactivateId(null); setDeactivateApiError('') }}
                  disabled={deactivateLoading}
                  className="w-full border-slate-300 text-slate-700 sm:w-auto"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={deactivateLoading}
                  className="w-full bg-amber-600 text-white hover:bg-amber-700 sm:w-auto"
                >
                  {deactivateLoading ? 'جاري التعطيل...' : 'تعطيل'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PageShell>
  )
}
