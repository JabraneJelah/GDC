'use client'

import { useEffect, useMemo, useState } from 'react'
import { Footer } from '@/components/layout/footer'
import { Sidebar } from '@/components/layout/sidebar'
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
import { FileText, Pencil, Search, Trash2 } from 'lucide-react'

const initialFormData = {
  nom: '',
  identifiant: '',
  type_faute_id: '',
  usage: '',
  description: '',
  file: null,
}

const initialEditFormData = {
  nom: '',
  identifiant: '',
  type_faute_id: '',
  usage: '',
  description: '',
  actif: true,
}

const usageLabels = {
  LETTRE_EXPLICATIVE: 'رسالة توضيحية',
  BORDEREAU_NOTIFICATION: 'إشعار / جدول إرسال',
  AVERTISSEMENT: 'تنبيه',
  RETENUE: 'اقتطاع',
}

const typeFauteArabicLabels = {
  RETARD: 'التأخر عن العمل',
  ABSENCE_NON_JUSTIFIEE: 'الغياب غير المبرر',
  DEPART_AVANT_HEURE: 'مغادرة العمل قبل الوقت',
  NON_RESPECT_PAUSE: 'عدم احترام أوقات الاستراحة',
  MAUVAISE_CONDUITE_PATIENTS: 'سوء التعامل مع المرضى أو المرتفقين',
  NON_RESPECT_COLLEGUES: 'عدم احترام الرؤساء أو الزملاء',
  ALTERCATION_TRAVAIL: 'الشجار داخل العمل',
  NON_RESPECT_ETHIQUE: 'عدم الالتزام بآداب المهنة',
  TENUE_PROFESSIONNELLE: 'الهندام المهني',
  ABANDON_POSTE: 'التخلي عن الوظيفة',
}

function PageShell({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col lg:ml-0">
        <main className="flex-1 pt-16 lg:pt-4">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toISOString().slice(0, 10)
}

function getUsageLabel(usage) {
  return usageLabels[usage] || '—'
}

function getTypeFauteLabel(typeFaute) {
  if (!typeFaute) return '—'
  return typeFauteArabicLabels[typeFaute.code] || typeFaute.nom || '—'
}

function getUploadErrorMessage(responseBody) {
  if (typeof responseBody?.error === 'string' && responseBody.error.trim()) {
    return responseBody.error.trim()
  }
  return 'تعذر إضافة النموذج'
}

function getActionErrorMessage(responseBody) {
  if (typeof responseBody?.error === 'string' && responseBody.error.trim()) {
    return responseBody.error.trim()
  }
  return 'تعذر تنفيذ العملية'
}

export default function DocumentTemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [typesFaute, setTypesFaute] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [editFormData, setEditFormData] = useState(initialEditFormData)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [editFormErrors, setEditFormErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/document-template')
      if (!response.ok) throw new Error('Load templates failed')
      const data = await response.json()
      setTemplates(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error)
      setErrorMessage('تعذر تحميل نماذج الوثائق')
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [templatesResponse, typesFauteResponse] = await Promise.all([
          fetch('/api/document-template'),
          fetch('/api/type-faute'),
        ])

        if (!templatesResponse.ok || !typesFauteResponse.ok) {
          throw new Error('Load data failed')
        }

        const [templatesData, typesFauteData] = await Promise.all([
          templatesResponse.json(),
          typesFauteResponse.json(),
        ])

        setTemplates(Array.isArray(templatesData) ? templatesData : [])
        setTypesFaute(Array.isArray(typesFauteData) ? typesFauteData.filter((typeFaute) => typeFaute.actif !== false) : [])
      } catch (error) {
        console.error('Erreur lors du chargement des donnees:', error)
        setErrorMessage('تعذر تحميل المعطيات')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return templates
    return templates.filter((t) =>
      [t.nom, t.identifiant, getTypeFauteLabel(t.type_faute), getUsageLabel(t.usage)]
        .some((v) => v && v.toLowerCase().includes(q))
    )
  }, [templates, search])

  const totalFiltered = filteredTemplates.length
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalFiltered)
  const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex)

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }))
    setFormErrors((current) => ({ ...current, [field]: '' }))
    setErrorMessage('')
  }

  const handleEditChange = (field, value) => {
    setEditFormData((current) => ({ ...current, [field]: value }))
    setEditFormErrors((current) => ({ ...current, [field]: '' }))
    setErrorMessage('')
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.nom.trim()) errors.nom = 'المرجو إدخال اسم النموذج'
    if (!formData.identifiant.trim()) errors.identifiant = 'المرجو إدخال المعرف'
    if (!formData.type_faute_id) errors.type_faute_id = 'المرجو اختيار نوع المخالفة'
    if (!formData.usage) errors.usage = 'المرجو اختيار نوع الاستعمال'
    if (!formData.file) errors.file = 'المرجو اختيار ملف DOCX'
    if (formData.file && !formData.file.name.toLowerCase().endsWith('.docx')) {
      errors.file = 'يجب اختيار ملف بصيغة DOCX'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEditForm = () => {
    const errors = {}
    if (!editFormData.nom.trim()) errors.nom = 'المرجو إدخال اسم النموذج'
    if (!editFormData.identifiant.trim()) errors.identifiant = 'المرجو إدخال المعرف'
    if (!editFormData.type_faute_id) errors.type_faute_id = 'المرجو اختيار نوع المخالفة'
    if (!editFormData.usage) errors.usage = 'المرجو اختيار نوع الاستعمال'
    setEditFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setFormErrors({})
  }

  const resetEditForm = () => {
    setEditFormData(initialEditFormData)
    setEditFormErrors({})
    setEditingTemplate(null)
  }

  const openEditDialog = (template) => {
    setEditingTemplate(template)
    setEditFormData({
      nom: template.nom || '',
      identifiant: template.identifiant || '',
      type_faute_id: template.type_faute_id?.toString() || template.type_faute?.id?.toString() || '',
      usage: template.usage || '',
      description: template.description || '',
      actif: template.actif !== false,
    })
    setEditFormErrors({})
    setErrorMessage('')
    setSuccessMessage('')
    setEditDialogOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    if (!validateForm()) return
    setSubmitting(true)
    try {
      const payload = new FormData()
      payload.append('nom', formData.nom.trim())
      payload.append('identifiant', formData.identifiant.trim())
      payload.append('type_faute_id', formData.type_faute_id)
      payload.append('usage', formData.usage)
      payload.append('file', formData.file)
      if (formData.description.trim()) {
        payload.append('description', formData.description.trim())
      }
      const response = await fetch('/api/document-template/upload', {
        method: 'POST',
        body: payload,
      })
      const responseBody = await response.json().catch(() => null)
      if (!response.ok) {
        setErrorMessage(getUploadErrorMessage(responseBody))
        return
      }
      setSuccessMessage('تم إضافة النموذج بنجاح')
      setDialogOpen(false)
      resetForm()
      await fetchTemplates()
    } catch (error) {
      console.error('Erreur lors de l upload du template:', error)
      setErrorMessage('حدث خطأ غير متوقع أثناء رفع النموذج')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!editingTemplate) return
    setErrorMessage('')
    setSuccessMessage('')
    if (!validateEditForm()) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/document-template/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: editFormData.nom.trim(),
          identifiant: editFormData.identifiant.trim(),
          type_faute_id: editFormData.type_faute_id,
          usage: editFormData.usage,
          description: editFormData.description.trim(),
          actif: editFormData.actif,
        }),
      })
      const responseBody = await response.json().catch(() => null)
      if (!response.ok) {
        setErrorMessage(getActionErrorMessage(responseBody))
        return
      }
      setSuccessMessage('تم تحديث النموذج بنجاح')
      setEditDialogOpen(false)
      resetEditForm()
      await fetchTemplates()
    } catch (error) {
      console.error('Erreur lors de la mise a jour du template:', error)
      setErrorMessage('تعذر تنفيذ العملية')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (template) => {
    if (!window.confirm('هل تريد حذف هذا النموذج؟')) return
    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(true)
    try {
      const response = await fetch(`/api/document-template/${template.id}`, {
        method: 'DELETE',
      })
      const responseBody = await response.json().catch(() => null)
      if (!response.ok) {
        setErrorMessage(getActionErrorMessage(responseBody))
        return
      }
      setSuccessMessage('تم حذف النموذج بنجاح')
      await fetchTemplates()
    } catch (error) {
      console.error('Erreur lors de la suppression du template:', error)
      setErrorMessage('تعذر تنفيذ العملية')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
          <span className="size-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">جاري التحميل...</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="space-y-4" dir="rtl">

        {/* Header — compact, no card */}
        <div className="flex items-center justify-between">
          <Button type="button" onClick={() => setDialogOpen(true)}>
            إضافة نموذج جديد
          </Button>
          <h1 className="text-base font-bold text-gray-900">نماذج الوثائق</h1>
        </div>

        {/* Feedback messages */}
        {successMessage ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-right text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {/* Search — narrow, starts at right (RTL flex-start) */}
        <div className="flex">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              placeholder="ابحث عن نموذج..."
              className="h-10 rounded-lg border-gray-300 pl-9 pr-4 text-right text-sm"
            />
          </div>
        </div>

        {/* Table card — white bg, soft shadow, rounded, contains table + footer */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th scope="col" className="px-6 py-3.5 text-right text-sm font-semibold text-gray-500">اسم النموذج</th>
                  <th scope="col" className="px-5 py-3.5 text-right text-sm font-semibold text-gray-500">الاختصار</th>
                  <th scope="col" className="px-5 py-3.5 text-right text-sm font-semibold text-gray-500">نوع المخالفة</th>
                  <th scope="col" className="px-5 py-3.5 text-right text-sm font-semibold text-gray-500">الاستعمال</th>
                  <th scope="col" className="px-5 py-3.5 text-right text-sm font-semibold text-gray-500">الحالة</th>
                  <th scope="col" className="px-5 py-3.5 text-right text-sm font-semibold text-gray-500">تاريخ الإنشاء</th>
                  <th scope="col" className="px-5 py-3.5 text-center text-sm font-semibold text-gray-500">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                        <FileText className="size-9 text-gray-300" strokeWidth={1.5} />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-600">
                            {search ? 'لا توجد نتائج مطابقة' : 'لا توجد نماذج حاليا'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {search ? 'جرب كلمات بحث مختلفة' : 'أضف نموذج DOCX لربطه بنوع مخالفة'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTemplates.map((template) => (
                    <tr key={template.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-6 py-3.5 text-right text-sm font-medium text-gray-900">
                        {template.nom || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm text-gray-500">
                        <span dir="ltr" className="font-mono text-xs">
                          {template.identifiant || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm text-gray-600">
                        {getTypeFauteLabel(template.type_faute)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm text-gray-600">
                        {getUsageLabel(template.usage)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm">
                        <span className={template.actif ? 'text-emerald-600' : 'text-gray-400'}>
                          {template.actif ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm text-gray-500">
                        {formatDate(template.cree_le)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-3.5">
                          <button
                            type="button"
                            onClick={() => openEditDialog(template)}
                            disabled={actionLoading}
                            title="تعديل"
                            className="text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-40"
                          >
                            <Pencil className="size-[15px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(template)}
                            disabled={actionLoading}
                            title="حذف"
                            className="text-gray-400 transition-colors hover:text-red-500 disabled:opacity-40"
                          >
                            <Trash2 className="size-[15px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Card footer — pagination info matching the reference */}
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <span className="text-sm text-gray-500" dir="ltr">
              {totalFiltered > 0 ? `${startIndex + 1}-${endIndex} من ${totalFiltered}` : '0 من 0'}
            </span>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>عدد المُدخلات في كل صفحة:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
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
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle className="text-right">إضافة نموذج جديد</DialogTitle>
              <DialogDescription className="text-right">
                ارفع ملف DOCX وحدد نوع المخالفة والاستعمال المرتبط به
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pl-1">
              {errorMessage ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template-name" className="block text-right">اسم النموذج</Label>
                  <Input
                    id="template-name"
                    value={formData.nom}
                    onChange={(event) => handleChange('nom', event.target.value)}
                    className="h-11 text-right"
                  />
                  {formErrors.nom ? <p className="text-sm text-red-600">{formErrors.nom}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-identifier" className="block text-right">المعرف</Label>
                  <Input
                    id="template-identifier"
                    value={formData.identifiant}
                    onChange={(event) => handleChange('identifiant', event.target.value)}
                    className="h-11 text-right"
                    dir="ltr"
                  />
                  {formErrors.identifiant ? <p className="text-sm text-red-600">{formErrors.identifiant}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="block text-right">نوع المخالفة</Label>
                  <p className="text-xs text-slate-500">تصنيف المخالفة المرتبطة بالنموذج</p>
                  <Select value={formData.type_faute_id} onValueChange={(value) => handleChange('type_faute_id', value)}>
                    <SelectTrigger className="h-11 text-right">
                      <SelectValue placeholder="اختر نوع المخالفة" />
                    </SelectTrigger>
                    <SelectContent>
                      {typesFaute.map((typeFaute) => (
                        <SelectItem key={typeFaute.id} value={typeFaute.id.toString()}>
                          {getTypeFauteLabel(typeFaute)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.type_faute_id ? <p className="text-sm text-red-600">{formErrors.type_faute_id}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label className="block text-right">نوع الاستعمال</Label>
                  <p className="text-xs text-slate-500">فئة الوثيقة أو المسطرة التي سيستعمل فيها النموذج</p>
                  <Select value={formData.usage} onValueChange={(value) => handleChange('usage', value)}>
                    <SelectTrigger className="h-11 text-right">
                      <SelectValue placeholder="اختر نوع الاستعمال" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(usageLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.usage ? <p className="text-sm text-red-600">{formErrors.usage}</p> : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-file" className="block text-right">اختيار الملف (.docx)</Label>
                <Input
                  id="template-file"
                  type="file"
                  accept=".docx"
                  onChange={(event) => handleChange('file', event.target.files?.[0] || null)}
                  className="h-11 text-right"
                />
                {formErrors.file ? <p className="text-sm text-red-600">{formErrors.file}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description" className="block text-right">الوصف</Label>
                <textarea
                  id="template-description"
                  value={formData.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-right text-sm text-slate-700 shadow-xs outline-none transition-colors placeholder:text-slate-400 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? 'جاري الرفع...' : 'إضافة النموذج'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) resetEditForm()
        }}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle className="text-right">تعديل النموذج</DialogTitle>
              <DialogDescription className="text-right">
                يمكن تعديل معطيات النموذج دون تغيير ملف DOCX المرتبط به
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pl-1">
              {errorMessage ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-template-name" className="block text-right">اسم النموذج</Label>
                  <Input
                    id="edit-template-name"
                    value={editFormData.nom}
                    onChange={(event) => handleEditChange('nom', event.target.value)}
                    className="h-11 text-right"
                  />
                  {editFormErrors.nom ? <p className="text-sm text-red-600">{editFormErrors.nom}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-template-identifier" className="block text-right">المعرف</Label>
                  <Input
                    id="edit-template-identifier"
                    value={editFormData.identifiant}
                    onChange={(event) => handleEditChange('identifiant', event.target.value)}
                    className="h-11 text-right"
                    dir="ltr"
                  />
                  {editFormErrors.identifiant ? <p className="text-sm text-red-600">{editFormErrors.identifiant}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="block text-right">نوع المخالفة</Label>
                  <p className="text-xs text-slate-500">تصنيف المخالفة المرتبطة بالنموذج</p>
                  <Select value={editFormData.type_faute_id} onValueChange={(value) => handleEditChange('type_faute_id', value)}>
                    <SelectTrigger className="h-11 text-right">
                      <SelectValue placeholder="اختر نوع المخالفة" />
                    </SelectTrigger>
                    <SelectContent>
                      {typesFaute.map((typeFaute) => (
                        <SelectItem key={typeFaute.id} value={typeFaute.id.toString()}>
                          {getTypeFauteLabel(typeFaute)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editFormErrors.type_faute_id ? <p className="text-sm text-red-600">{editFormErrors.type_faute_id}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label className="block text-right">نوع الاستعمال</Label>
                  <p className="text-xs text-slate-500">فئة الوثيقة أو المسطرة التي سيستعمل فيها النموذج</p>
                  <Select value={editFormData.usage} onValueChange={(value) => handleEditChange('usage', value)}>
                    <SelectTrigger className="h-11 text-right">
                      <SelectValue placeholder="اختر نوع الاستعمال" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(usageLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editFormErrors.usage ? <p className="text-sm text-red-600">{editFormErrors.usage}</p> : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-template-description" className="block text-right">الوصف</Label>
                <textarea
                  id="edit-template-description"
                  value={editFormData.description}
                  onChange={(event) => handleEditChange('description', event.target.value)}
                  className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-right text-sm text-slate-700 shadow-xs outline-none transition-colors placeholder:text-slate-400 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <label className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <span className="text-sm font-medium text-slate-700">النموذج نشط</span>
                <input
                  type="checkbox"
                  checked={editFormData.actif}
                  onChange={(event) => handleEditChange('actif', event.target.checked)}
                  className="size-4 accent-blue-600"
                />
              </label>

              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm text-amber-800">
                لا يمكن تغيير ملف النموذج من هذه النافذة
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={actionLoading} className="w-full sm:w-auto">
                  {actionLoading ? 'جاري التحديث...' : 'تحديث النموذج'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </PageShell>
  )
}
