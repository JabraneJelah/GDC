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
import { Building2, Plus, Search, X } from 'lucide-react'

const ITEMS_PER_PAGE = 10

export default function HopitauxPage() {
  const { user } = useCurrentUser()
  const readOnly = isLecteurRH(user)

  const [hopitaux, setHopitaux] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE)

  const [open, setOpen] = useState(false)
  const [editingHopital, setEditingHopital] = useState(null)
  const [formData, setFormData] = useState({ nom: '' })
  const [formError, setFormError] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [hopitalToDelete, setHopitalToDelete] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => { fetchHopitaux() }, [])

  const fetchHopitaux = async () => {
    try {
      const response = await fetch('/api/hopitaux')
      if (response.ok) setHopitaux(await response.json())
    } catch (error) {
      console.error('Erreur lors du chargement des hôpitaux:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredHopitaux = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return hopitaux
    return hopitaux.filter((h) => h.nom?.toLowerCase().includes(q))
  }, [hopitaux, search])

  const totalFiltered = filteredHopitaux.length
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalFiltered)
  const paginatedHopitaux = filteredHopitaux.slice(startIndex, endIndex)

  const openAddDialog = () => {
    setEditingHopital(null)
    setFormData({ nom: '' })
    setFormError('')
    setErrorMessage('')
    setSuccessMessage('')
    setOpen(true)
  }

  const openEditDialog = (hopital) => {
    setEditingHopital(hopital)
    setFormData({ nom: hopital.nom })
    setFormError('')
    setErrorMessage('')
    setSuccessMessage('')
    setOpen(true)
  }

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen)
    if (!isOpen) {
      setEditingHopital(null)
      setFormData({ nom: '' })
      setFormError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.nom.trim()) {
      setFormError('المرجو إدخال اسم المستشفى')
      return
    }
    setFormError('')
    setActionLoading(true)
    try {
      const url = editingHopital ? `/api/hopitaux/${editingHopital.id}` : '/api/hopitaux'
      const method = editingHopital ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        setSuccessMessage(editingHopital ? 'تم تحديث المستشفى بنجاح' : 'تمت إضافة المستشفى بنجاح')
        setOpen(false)
        setEditingHopital(null)
        setFormData({ nom: '' })
        setCurrentPage(1)
        await fetchHopitaux()
      } else {
        const data = await response.json().catch(() => null)
        setFormError(data?.error || 'تعذر حفظ المستشفى')
      }
    } catch {
      setFormError('تعذر حفظ المستشفى')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteClick = (hopital) => {
    setHopitalToDelete(hopital)
    setDeleteDialogOpen(true)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleDeleteConfirm = async () => {
    if (!hopitalToDelete) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/hopitaux/${hopitalToDelete.id}`, { method: 'DELETE' })
      if (response.ok) {
        setSuccessMessage('تم حذف المستشفى بنجاح')
        setDeleteDialogOpen(false)
        setHopitalToDelete(null)
        setCurrentPage(1)
        await fetchHopitaux()
      } else {
        const data = await response.json().catch(() => null)
        setErrorMessage(data?.error || 'تعذر حذف المستشفى')
        setDeleteDialogOpen(false)
        setHopitalToDelete(null)
      }
    } catch {
      setErrorMessage('تعذر حذف المستشفى')
      setDeleteDialogOpen(false)
      setHopitalToDelete(null)
    } finally {
      setActionLoading(false)
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">المستشفيات</h1>
            <p className="mt-0.5 text-sm text-slate-500">تدبير مستشفيات المؤسسة</p>
          </div>
          {!readOnly && (
            <Button
              type="button"
              onClick={openAddDialog}
              className="shrink-0 gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="size-4" />
              إضافة مستشفى
            </Button>
          )}
        </div>
        <div className="mt-4 flex items-center gap-6">
          <div>
            <p className="text-xs text-slate-500">الإجمالي</p>
            <p className="text-xl font-bold text-slate-900" dir="ltr">{hopitaux.length}</p>
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
              placeholder="البحث عن مستشفى..."
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
            عرض <span className="font-semibold text-slate-800">{filteredHopitaux.length}</span> نتيجة
          </p>
        )}
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F1F5F9]">
                <th scope="col" className="px-5 py-3 text-right text-sm font-semibold text-slate-700">اسم المستشفى</th>
                <th scope="col" className="w-32 px-5 py-3 text-center text-sm font-semibold text-slate-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedHopitaux.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-14 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                      <Building2 className="size-9 text-slate-300" strokeWidth={1.5} />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-600">
                          {search ? 'لا توجد مستشفيات مطابقة للبحث' : 'لا توجد مستشفيات حالياً'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {search ? 'جرب تعديل كلمة البحث' : 'أضف مستشفى جديداً للبدء'}
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
                paginatedHopitaux.map((hopital) => (
                  <tr key={hopital.id} className="bg-white transition-colors hover:bg-[#F8FAFC]">
                    <td className="px-5 py-3 text-right">
                      <span className="block max-w-sm truncate text-sm font-semibold text-slate-900" title={hopital.nom}>
                        {hopital.nom}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {readOnly ? (
                        <div className="text-center text-xs text-slate-400">—</div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEditDialog(hopital)}
                            disabled={actionLoading}
                            className="cursor-pointer rounded-md px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            تعديل
                          </button>
                          <span className="text-slate-200">|</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(hopital)}
                            disabled={actionLoading}
                            className="cursor-pointer rounded-md px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            حذف
                          </button>
                        </div>
                      )}
                    </td>
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

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="border-b border-slate-100 pb-4 text-right">
            <DialogTitle className="text-xl font-bold text-slate-950">
              {editingHopital ? 'تعديل المستشفى' : 'إضافة مستشفى'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {editingHopital ? 'تعديل اسم المستشفى المحدد' : 'إضافة مستشفى جديد إلى قائمة مستشفيات المؤسسة'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="hopital-nom" className="block text-sm font-semibold text-slate-700">
                اسم المستشفى <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hopital-nom"
                value={formData.nom}
                onChange={(e) => { setFormData({ nom: e.target.value }); setFormError('') }}
                placeholder="مثال: المستشفى الإقليمي، مستشفى محمد الخامس..."
                className="h-10 rounded-xl border-slate-300 bg-white text-right text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
                autoFocus
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={actionLoading}
                className="w-full cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed sm:w-auto"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="w-full cursor-pointer bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed sm:w-auto"
              >
                {actionLoading ? 'جاري الحفظ...' : editingHopital ? 'تحديث المستشفى' : 'إضافة المستشفى'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(isOpen) => {
        if (!actionLoading) { setDeleteDialogOpen(isOpen); if (!isOpen) setHopitalToDelete(null) }
      }}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl font-bold text-slate-900">حذف المستشفى</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              هل أنت متأكد من حذف مستشفى{' '}
              <span className="font-semibold text-slate-800">&quot;{hopitalToDelete?.nom}&quot;</span>؟
              {' '}هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-start">
            <button
              type="button"
              onClick={() => { setDeleteDialogOpen(false); setHopitalToDelete(null) }}
              disabled={actionLoading}
              className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={actionLoading}
              className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {actionLoading ? 'جاري الحذف...' : 'حذف المستشفى'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
