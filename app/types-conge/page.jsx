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
import { CalendarDays, Plus, Search, X } from 'lucide-react'

const ITEMS_PER_PAGE = 10

export default function TypesCongePage() {
  const { user } = useCurrentUser()
  const readOnly = isLecteurRH(user)

  const [typesConge, setTypesConge] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE)

  const [open, setOpen] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [formData, setFormData] = useState({ nom: '', document_obligatoire: false })
  const [formError, setFormError] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [typeToDelete, setTypeToDelete] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => { fetchTypesConge() }, [])

  const fetchTypesConge = async () => {
    try {
      const response = await fetch('/api/types-conge')
      if (response.ok) setTypesConge(await response.json())
    } catch (error) {
      console.error('Erreur lors du chargement des types de congé:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTypes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return typesConge
    return typesConge.filter((t) => t.nom?.toLowerCase().includes(q))
  }, [typesConge, search])

  const totalFiltered = filteredTypes.length
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalFiltered)
  const paginatedTypes = filteredTypes.slice(startIndex, endIndex)

  const openAddDialog = () => {
    setEditingType(null)
    setFormData({ nom: '', document_obligatoire: false })
    setFormError('')
    setErrorMessage('')
    setSuccessMessage('')
    setOpen(true)
  }

  const openEditDialog = (type) => {
    setEditingType(type)
    setFormData({ nom: type.nom, document_obligatoire: type.document_obligatoire })
    setFormError('')
    setErrorMessage('')
    setSuccessMessage('')
    setOpen(true)
  }

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen)
    if (!isOpen) {
      setEditingType(null)
      setFormData({ nom: '', document_obligatoire: false })
      setFormError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.nom.trim()) {
      setFormError('المرجو إدخال اسم نوع الرخصة')
      return
    }
    setFormError('')
    setActionLoading(true)
    try {
      const url = editingType ? `/api/types-conge/${editingType.id}` : '/api/types-conge'
      const method = editingType ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        setSuccessMessage(editingType ? 'تم تحديث نوع الرخصة بنجاح' : 'تمت إضافة نوع الرخصة بنجاح')
        setOpen(false)
        setEditingType(null)
        setFormData({ nom: '', document_obligatoire: false })
        setCurrentPage(1)
        await fetchTypesConge()
      } else {
        const data = await response.json().catch(() => null)
        setFormError(data?.error || 'حدث خطأ أثناء العملية')
      }
    } catch {
      setFormError('حدث خطأ أثناء العملية')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteClick = (type) => {
    setTypeToDelete(type)
    setDeleteDialogOpen(true)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleDeleteConfirm = async () => {
    if (!typeToDelete) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/types-conge/${typeToDelete.id}`, { method: 'DELETE' })
      if (response.ok) {
        setSuccessMessage('تم حذف نوع الرخصة بنجاح')
        setDeleteDialogOpen(false)
        setTypeToDelete(null)
        setCurrentPage(1)
        await fetchTypesConge()
      } else {
        const data = await response.json().catch(() => null)
        setErrorMessage(data?.error || 'حدث خطأ أثناء العملية')
        setDeleteDialogOpen(false)
        setTypeToDelete(null)
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء العملية')
      setDeleteDialogOpen(false)
      setTypeToDelete(null)
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">أنواع الرخص</h1>
            <p className="mt-0.5 text-sm text-slate-500">تدبير أنواع الرخص المستعملة في النظام</p>
          </div>
          {!readOnly && (
            <Button
              type="button"
              onClick={openAddDialog}
              className="shrink-0 gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="size-4" />
              إضافة نوع رخصة
            </Button>
          )}
        </div>
        <div className="mt-4 flex items-center gap-6">
          <div>
            <p className="text-xs text-slate-500">الإجمالي</p>
            <p className="text-xl font-bold text-slate-900" dir="ltr">{typesConge.length}</p>
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
              placeholder="البحث عن نوع رخصة..."
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
            عرض <span className="font-semibold text-slate-800">{filteredTypes.length}</span> نتيجة
          </p>
        )}
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F1F5F9]">
                <th scope="col" className="px-5 py-3 text-right text-sm font-semibold text-slate-700">اسم الرخصة</th>
                <th scope="col" className="px-5 py-3 text-right text-sm font-semibold text-slate-700">الوثيقة</th>
                <th scope="col" className="w-32 px-5 py-3 text-center text-sm font-semibold text-slate-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTypes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-14 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                      <CalendarDays className="size-9 text-slate-300" strokeWidth={1.5} />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-600">
                          {search ? 'لا توجد أنواع رخص مطابقة للبحث' : 'لا توجد أنواع رخص حالياً'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {search ? 'جرب تعديل كلمة البحث' : 'أضف نوع رخصة جديداً للبدء'}
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
                paginatedTypes.map((type) => (
                  <tr key={type.id} className="bg-white transition-colors hover:bg-[#F8FAFC]">
                    <td className="px-5 py-3 text-right">
                      <span className="block max-w-sm truncate text-sm font-semibold text-slate-900" title={type.nom}>
                        {type.nom}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {type.document_obligatoire ? (
                        <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          إلزامية
                        </span>
                      ) : (
                        <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                          اختيارية
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {readOnly ? (
                        <div className="text-center text-xs text-slate-400">—</div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEditDialog(type)}
                            disabled={actionLoading}
                            className="cursor-pointer rounded-md px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            تعديل
                          </button>
                          <span className="text-slate-200">|</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(type)}
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
              {editingType ? 'تعديل نوع الرخصة' : 'إضافة نوع رخصة'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {editingType ? 'تعديل معلومات نوع الرخصة المحدد' : 'إضافة نوع رخصة جديد إلى النظام'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="type-nom" className="block text-sm font-semibold text-slate-700">
                اسم نوع الرخصة <span className="text-red-500">*</span>
              </Label>
              <Input
                id="type-nom"
                value={formData.nom}
                onChange={(e) => { setFormData({ ...formData, nom: e.target.value }); setFormError('') }}
                placeholder="مثال: رخصة سنوية، رخصة مرضية..."
                className="h-10 rounded-xl border-slate-300 bg-white text-right text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
                autoFocus
              />
            </div>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
              <span className="text-sm font-semibold text-slate-700">الوثيقة إلزامية</span>
              <input
                type="checkbox"
                checked={formData.document_obligatoire}
                onChange={(e) => setFormData({ ...formData, document_obligatoire: e.target.checked })}
                className="size-4 accent-blue-600 cursor-pointer"
              />
            </label>

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
                {actionLoading ? 'جاري الحفظ...' : editingType ? 'حفظ التعديلات' : 'إضافة نوع الرخصة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(isOpen) => {
        if (!actionLoading) { setDeleteDialogOpen(isOpen); if (!isOpen) setTypeToDelete(null) }
      }}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl font-bold text-slate-900">تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              هل أنت متأكد من حذف نوع الرخصة{' '}
              <span className="font-semibold text-slate-800">&quot;{typeToDelete?.nom}&quot;</span>؟
              {' '}هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-start">
            <button
              type="button"
              onClick={() => { setDeleteDialogOpen(false); setTypeToDelete(null) }}
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
              {actionLoading ? 'جاري الحذف...' : 'حذف'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
