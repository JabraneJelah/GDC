'use client'

import { useEffect, useState } from 'react'
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
import { Pagination } from '@/components/ui/pagination'
import { CalendarDays, Plus } from 'lucide-react'

const ITEMS_PER_PAGE = 10

function ymdFromDate(d) {
  const x = new Date(d)
  return (
    x.getFullYear() +
    '-' +
    String(x.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(x.getDate()).padStart(2, '0')
  )
}

function inclusiveCalendarDays(dateDebut, dateFin) {
  const s = new Date(dateDebut.getFullYear(), dateDebut.getMonth(), dateDebut.getDate())
  const e = new Date(dateFin.getFullYear(), dateFin.getMonth(), dateFin.getDate())
  return Math.round((e - s) / 86400000) + 1
}

function formatPeriodeCell(jour) {
  const start = new Date(jour.date_debut)
  const end = new Date(jour.date_fin)
  const fmt = (d) =>
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (ymdFromDate(start) === ymdFromDate(end)) {
    return fmt(start)
  }
  const n = inclusiveCalendarDays(start, end)
  return `${fmt(start)} → ${fmt(end)} (${n} أيام)`
}

function ActiveBadge({ actif }) {
  return actif ? (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      نشط
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      غير نشط
    </span>
  )
}

const EMPTY_FORM = { date_debut: '', date_fin: '', nom: '', actif: true }

export default function JoursFeriesPage() {
  const [joursFeries, setJoursFeries] = useState([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editingJour, setEditingJour] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formSubmitting, setFormSubmitting] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [jourToDelete, setJourToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchJoursFeries()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const fetchJoursFeries = async () => {
    try {
      const response = await fetch('/api/jours-feries?actif=all')
      if (response.ok) {
        const data = await response.json()
        setJoursFeries(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des jours fériés:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.date_debut || !formData.date_fin) {
      setErrorMessage('تاريخ البداية وتاريخ النهاية إلزاميان.')
      setErrorDialogOpen(true)
      return
    }
    const d0 = new Date(formData.date_debut + 'T00:00:00')
    const d1 = new Date(formData.date_fin + 'T00:00:00')
    if (d1 < d0) {
      setErrorMessage('يجب أن يكون تاريخ النهاية مساوياً أو لاحقاً لتاريخ البداية.')
      setErrorDialogOpen(true)
      return
    }
    setFormSubmitting(true)
    try {
      const url = editingJour ? `/api/jours-feries/${editingJour.id}` : '/api/jours-feries'
      const method = editingJour ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        setOpen(false)
        setEditingJour(null)
        setFormData(EMPTY_FORM)
        setCurrentPage(1)
        setToast(editingJour ? 'تم تعديل العطلة بنجاح' : 'تمت إضافة العطلة بنجاح')
        fetchJoursFeries()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'حدث خطأ أثناء الحفظ')
        setErrorDialogOpen(true)
      }
    } catch {
      setErrorMessage('حدث خطأ غير متوقع')
      setErrorDialogOpen(true)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleEdit = (jour) => {
    setEditingJour(jour)
    setFormData({
      date_debut: ymdFromDate(new Date(jour.date_debut)),
      date_fin: ymdFromDate(new Date(jour.date_fin)),
      nom: jour.nom,
      actif: jour.actif,
    })
    setOpen(true)
  }

  const handleDeleteClick = (jour) => {
    setJourToDelete(jour)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!jourToDelete) return
    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/jours-feries/${jourToDelete.id}`, { method: 'DELETE' })
      if (response.ok) {
        setCurrentPage(1)
        setDeleteDialogOpen(false)
        setJourToDelete(null)
        setToast('تم حذف العطلة بنجاح')
        fetchJoursFeries()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'حدث خطأ أثناء الحذف')
        setErrorDialogOpen(true)
        setDeleteDialogOpen(false)
        setJourToDelete(null)
      }
    } catch {
      setErrorMessage('حدث خطأ غير متوقع')
      setErrorDialogOpen(true)
      setDeleteDialogOpen(false)
      setJourToDelete(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setEditingJour(null)
      setFormData(EMPTY_FORM)
    }
  }

  const holidaySpanDays =
    formData.date_debut && formData.date_fin
      ? (() => {
          const a = new Date(formData.date_debut + 'T00:00:00')
          const b = new Date(formData.date_fin + 'T00:00:00')
          if (b < a) return 0
          return inclusiveCalendarDays(a, b)
        })()
      : 0

  const activeCount = joursFeries.filter((j) => j.actif).length
  const inactiveCount = joursFeries.filter((j) => !j.actif).length

  const totalPages = Math.ceil(joursFeries.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedJoursFeries = joursFeries.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
        <span className="size-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        <p className="text-sm text-slate-600">جاري تحميل العطل الرسمية...</p>
      </div>
    )
  }

  return (
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
                <CalendarDays className="size-5 text-blue-600" />
                <h1 className="text-2xl font-semibold text-slate-950">العطل الرسمية</h1>
              </div>
              <p className="text-sm text-slate-600">تدبير قائمة العطل الرسمية المستخدمة في حساب الإجازات</p>
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
              onClick={() => { setFormData(EMPTY_FORM); setEditingJour(null); setOpen(true) }}
            >
              <Plus className="size-4" />
              إضافة عطلة
            </Button>
          </div>
        </section>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-right text-xs font-medium text-slate-600 sm:px-6">
            إجمالي{' '}
            <span className="font-bold text-slate-900">{joursFeries.length}</span>{' '}
            عطلة
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F1F5F9]">
                  <th scope="col" className="px-5 py-3 text-right text-xs font-semibold text-slate-700">الفترة</th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-semibold text-slate-700">الاسم</th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-semibold text-slate-700">الحالة</th>
                  <th scope="col" className="px-5 py-3 text-center text-xs font-semibold text-slate-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {joursFeries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                        <CalendarDays className="size-9 text-slate-300" strokeWidth={1.5} />
                        <p className="text-sm font-medium text-slate-700">لا توجد عطل رسمية حاليا</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedJoursFeries.map((jour) => (
                    <tr
                      key={jour.id}
                      className={`bg-white transition-colors hover:bg-[#F8FAFC] ${!jour.actif ? 'opacity-60' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <span dir="ltr" className="text-sm font-medium text-slate-800">
                          {formatPeriodeCell(jour)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-medium text-slate-900">{jour.nom}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <ActiveBadge actif={jour.actif} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(jour)}
                            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          >
                            تعديل
                          </button>
                          <span className="text-slate-200">|</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(jour)}
                            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="border-t border-slate-100">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        {/* Create / Edit dialog */}
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-right text-lg font-bold text-slate-900">
                {editingJour ? 'تعديل العطلة' : 'إضافة عطلة جديدة'}
              </DialogTitle>
              <DialogDescription className="text-right text-sm text-slate-600">
                {editingJour
                  ? 'تعديل معلومات العطلة الرسمية'
                  : 'إضافة عطلة رسمية جديدة إلى المرجعية'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              <div className="space-y-1.5">
                <Label htmlFor="date_debut" className="text-sm font-medium text-slate-700">
                  تاريخ البداية <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date_debut"
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => {
                    const v = e.target.value
                    setFormData((prev) => ({ ...prev, date_debut: v, date_fin: v }))
                  }}
                  className="h-10 rounded-xl border-slate-300 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date_fin" className="text-sm font-medium text-slate-700">
                  تاريخ النهاية <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date_fin"
                  type="date"
                  value={formData.date_fin}
                  onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                  className="h-10 rounded-xl border-slate-300 text-sm"
                  required
                />
              </div>
              {holidaySpanDays > 1 && (
                <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                  فترة مدتها {holidaySpanDays} أيام
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="nom" className="text-sm font-medium text-slate-700">
                  الاسم <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="مثال: عيد الفطر"
                  className="h-10 rounded-xl border-slate-300 text-right text-sm"
                  required
                />
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <input
                  type="checkbox"
                  id="actif"
                  checked={formData.actif}
                  onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600"
                />
                <Label htmlFor="actif" className="cursor-pointer text-sm font-medium text-slate-700">
                  نشط (يُستخدم في حساب الإجازات)
                </Label>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={formSubmitting}
                  className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {formSubmitting ? 'جاري الحفظ...' : editingJour ? 'حفظ التعديلات' : 'إضافة'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={(v) => { if (!deleteLoading) setDeleteDialogOpen(v) }}>
          <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-right text-lg font-bold text-slate-900">تأكيد الحذف</DialogTitle>
              <DialogDescription className="text-right text-sm text-slate-600">
                {jourToDelete ? (
                  <>
                    هل أنت متأكد من حذف «{jourToDelete.nom}» ({formatPeriodeCell(jourToDelete)})؟
                    هذا الإجراء لا يمكن التراجع عنه.
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
              <button
                type="button"
                onClick={() => { setDeleteDialogOpen(false); setJourToDelete(null) }}
                disabled={deleteLoading}
                className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {deleteLoading ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Error dialog */}
        <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-right text-lg font-bold text-red-600">خطأ</DialogTitle>
              <DialogDescription className="text-right text-sm text-slate-700 whitespace-pre-line">
                {errorMessage}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-start pt-1">
              <button
                type="button"
                onClick={() => setErrorDialogOpen(false)}
                className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                إغلاق
              </button>
            </div>
          </DialogContent>
        </Dialog>

    </div>
  )
}
