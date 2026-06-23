'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCurrentUser, isLecteurRH } from '@/components/UserContext'
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
import { ChevronDown, ChevronUp, FileText, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { StatusBadge } from '@/components/dossiers-explicatifs/StatusBadge'

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
  LETTRE_EXPLICATIVE: 'طلب التوضيح / الاستفسار',
  BORDEREAU_NOTIFICATION: 'وثيقة التبليغ',
  AVERTISSEMENT: 'تنبيه',
  RETENUE: 'اقتطاع',
  PROCEDURE_DISCIPLINAIRE: 'طلب استكمال المسطرة التأديبية',
}

const usageBadgeStyles = {
  LETTRE_EXPLICATIVE: 'bg-blue-50 text-blue-700 border-blue-200',
  BORDEREAU_NOTIFICATION: 'bg-violet-50 text-violet-700 border-violet-200',
  AVERTISSEMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  RETENUE: 'bg-rose-50 text-rose-700 border-rose-200',
  PROCEDURE_DISCIPLINAIRE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
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
  CERTIFICAT_MEDICAL_HORS_DELAI: 'الإدلاء بشهادة طبية خارج الآجال',
  AZS: 'عطلة مرضية غير مبررة',
  CONGE_MALADIE_NON_JUSTIFIE: 'عطلة مرضية غير مبررة',
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
  if (!typeFaute) return 'عام (كل الأنواع)'
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
  const { user } = useCurrentUser()
  const readOnly = isLecteurRH(user)

  const [templates, setTemplates] = useState([])
  const [typesFaute, setTypesFaute] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTypeFauteId, setFilterTypeFauteId] = useState('')
  const [filterUsage, setFilterUsage] = useState('')
  const [filterActif, setFilterActif] = useState('active')
  const [filtersOpen, setFiltersOpen] = useState(false)
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState(null)

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
    return templates.filter((t) => {
      if (filterActif === 'active' && t.actif === false) return false
      if (filterActif === 'inactive' && t.actif !== false) return false
      if (q && ![t.nom, t.identifiant, getTypeFauteLabel(t.type_faute), getUsageLabel(t.usage)]
        .some((v) => v && v.toLowerCase().includes(q))) return false
      if (filterTypeFauteId && String(t.type_faute?.id) !== filterTypeFauteId) return false
      if (filterUsage && t.usage !== filterUsage) return false
      return true
    })
  }, [templates, search, filterTypeFauteId, filterUsage, filterActif])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.trim()) count++
    if (filterTypeFauteId) count++
    if (filterUsage) count++
    if (filterActif !== 'active') count++
    return count
  }, [search, filterTypeFauteId, filterUsage, filterActif])

  const resetFilters = () => {
    setSearch('')
    setFilterTypeFauteId('')
    setFilterUsage('')
    setFilterActif('active')
    setCurrentPage(1)
  }

  const activeCount = useMemo(() => templates.filter((t) => t.actif !== false).length, [templates])
  const inactiveCount = useMemo(() => templates.filter((t) => t.actif === false).length, [templates])

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
    if (!formData.type_faute_id) errors.type_faute_id = 'المرجو اختيار نوع المخالفة أو اختيار "عام"'
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
    if (!editFormData.type_faute_id) errors.type_faute_id = 'المرجو اختيار نوع المخالفة أو اختيار "عام"'
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
    const rawId = template.type_faute_id ?? template.type_faute?.id
    setEditFormData({
      nom: template.nom || '',
      identifiant: template.identifiant || '',
      type_faute_id: rawId == null ? '__GENERIC__' : rawId.toString(),
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
      // '__GENERIC__' means no specific fault type (generic template) → send empty string
      payload.append('type_faute_id', formData.type_faute_id === '__GENERIC__' ? '' : formData.type_faute_id)
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
          // '__GENERIC__' means generic template (no specific fault type) → null
          type_faute_id: editFormData.type_faute_id === '__GENERIC__' ? null : editFormData.type_faute_id,
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

  const handleDelete = (template) => {
    setTemplateToDelete(template)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!templateToDelete) return
    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(true)
    try {
      const response = await fetch(`/api/document-template/${templateToDelete.id}`, {
        method: 'DELETE',
      })
      const responseBody = await response.json().catch(() => null)
      if (!response.ok) {
        setErrorMessage(getActionErrorMessage(responseBody))
        return
      }
      setSuccessMessage('تم حذف النموذج بنجاح')
      setDeleteConfirmOpen(false)
      setTemplateToDelete(null)
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

        {/* Header card */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm" dir="rtl">
          <div className="flex items-start justify-between gap-4">
            <div className="text-right">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">نماذج الوثائق</h1>
              <p className="mt-0.5 text-sm text-slate-500">إدارة نماذج الوثائق المرتبطة بأنواع المخالفات</p>
            </div>
            {!readOnly && (
              <Button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="shrink-0 gap-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="size-4" />
                إضافة نموذج جديد
              </Button>
            )}
          </div>
          <div className="mt-4 flex items-center gap-6">
            <div>
              <p className="text-xs text-slate-500">نشطة</p>
              <p className="text-xl font-bold text-slate-900" dir="ltr">{activeCount}</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-xs text-slate-500">غير نشطة</p>
              <p className="text-xl font-bold text-slate-500" dir="ltr">{inactiveCount}</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-xs text-slate-500">الإجمالي</p>
              <p className="text-xl font-bold text-slate-900" dir="ltr">{templates.length}</p>
            </div>
          </div>
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

        {/* Collapsible filter bar */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Toggle header */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 sm:px-6"
          >
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="size-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-800">البحث والتصفية</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {filtersOpen
              ? <ChevronUp className="size-4 text-slate-400" />
              : <ChevronDown className="size-4 text-slate-400" />
            }
          </button>

          {/* Expanded filter form */}
          {filtersOpen && (
            <div className="border-t border-slate-100 px-5 pb-5 pt-4 sm:px-6">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Search */}
                  <div className="space-y-1.5">
                    <label className="block text-right text-xs font-semibold text-slate-600">بحث عام</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <Input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                        placeholder="اسم النموذج، المعرف..."
                        className="h-9 rounded-xl border-slate-300 bg-white pl-9 pr-4 text-right text-sm placeholder:text-slate-400 focus-visible:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* نوع المخالفة */}
                  <div className="space-y-1.5">
                    <label className="block text-right text-xs font-semibold text-slate-600">نوع المخالفة</label>
                    <Select
                      value={filterTypeFauteId || '__all__'}
                      onValueChange={(v) => { setFilterTypeFauteId(v === '__all__' ? '' : v); setCurrentPage(1) }}
                    >
                      <SelectTrigger className="h-9 rounded-xl border-slate-300 bg-white text-right text-sm">
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">الكل</SelectItem>
                        {typesFaute.map((tf) => (
                          <SelectItem key={tf.id} value={String(tf.id)}>
                            {getTypeFauteLabel(tf)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* الاستعمال */}
                  <div className="space-y-1.5">
                    <label className="block text-right text-xs font-semibold text-slate-600">الاستعمال</label>
                    <Select
                      value={filterUsage || '__all__'}
                      onValueChange={(v) => { setFilterUsage(v === '__all__' ? '' : v); setCurrentPage(1) }}
                    >
                      <SelectTrigger className="h-9 rounded-xl border-slate-300 bg-white text-right text-sm">
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">الكل</SelectItem>
                        {Object.entries(usageLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* الحالة */}
                  <div className="space-y-1.5">
                    <label className="block text-right text-xs font-semibold text-slate-600">الحالة</label>
                    <Select
                      value={filterActif}
                      onValueChange={(v) => { setFilterActif(v); setCurrentPage(1) }}
                    >
                      <SelectTrigger className="h-9 rounded-xl border-slate-300 bg-white text-right text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">النماذج النشطة</SelectItem>
                        <SelectItem value="inactive">النماذج غير النشطة</SelectItem>
                        <SelectItem value="__all__">الكل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm text-slate-500">
                    عرض{' '}
                    <span className="font-semibold text-slate-800">{filteredTemplates.length}</span>{' '}
                    نتيجة
                  </span>
                  <div className="flex gap-2">
                    {activeFilterCount > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetFilters}
                        className="h-8 gap-1.5 text-slate-600"
                      >
                        <X className="size-3.5" />
                        إعادة التعيين
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="h-8"
                      onClick={() => setFiltersOpen(false)}
                    >
                      عرض النتائج ({filteredTemplates.length})
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F1F5F9]">
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-slate-700">اسم النموذج</th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-slate-700">الاختصار</th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-slate-700">نوع المخالفة</th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-slate-700">الاستعمال</th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-slate-700">الحالة</th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-slate-700">تاريخ الإنشاء</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                        <FileText className="size-9 text-slate-300" strokeWidth={1.5} />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-600">
                            {activeFilterCount > 0 || filterActif !== '__all__'
                              ? 'لا توجد نماذج مطابقة لمعايير التصفية'
                              : 'لا توجد نماذج حاليا'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {filterActif === 'active' && search === '' && !filterTypeFauteId && !filterUsage
                              ? 'لا توجد نماذج نشطة حاليا — يمكنك تفعيل نماذج موجودة أو إضافة نموذج جديد'
                              : activeFilterCount > 0 || filterActif !== '__all__'
                                ? 'جرب تعديل معايير البحث أو إعادة التعيين'
                                : 'أضف نموذج DOCX لربطه بنوع مخالفة'}
                          </p>
                        </div>
                        {activeFilterCount > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetFilters}
                            className="mt-1 gap-1.5"
                          >
                            <X className="size-3.5" />
                            إعادة التعيين
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTemplates.map((template) => (
                    <tr key={template.id} className="bg-white transition-colors hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        {template.nom || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span dir="ltr" className="font-mono text-sm text-slate-700">
                          {template.identifiant || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">
                        {getTypeFauteLabel(template.type_faute)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {template.usage ? (
                          <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${usageBadgeStyles[template.usage] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {getUsageLabel(template.usage)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <StatusBadge variant={template.actif !== false ? 'success' : 'neutral'}>
                          {template.actif !== false ? 'نشط' : 'غير نشط'}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {formatDate(template.cree_le)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {readOnly ? (
                          <div className="text-center text-xs text-slate-400">—</div>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => openEditDialog(template)}
                              disabled={actionLoading}
                              className="cursor-pointer rounded-md px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              تعديل
                            </button>
                            <span className="text-slate-200">|</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(template)}
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
              <span>عدد المُدخلات في كل صفحة:</span>
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
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogContent className="max-w-2xl rounded-2xl border-slate-200 shadow-xl" dir="rtl">
            <DialogHeader className="border-b border-slate-100 pb-4 text-right sm:text-right">
              <DialogTitle className="text-xl font-bold text-slate-950 text-right">إضافة نموذج جديد</DialogTitle>
              <DialogDescription className="text-sm text-slate-600 text-right">
                ارفع ملف DOCX وحدد نوع المخالفة والاستعمال المرتبط به
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
              {errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="template-name" className="block text-sm font-semibold text-slate-700">
                    اسم النموذج <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="template-name"
                    value={formData.nom}
                    onChange={(event) => handleChange('nom', event.target.value)}
                    placeholder="مثال: رسالة توضيحية — تأخر"
                    className="h-10 rounded-xl border-slate-300 bg-white text-right text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
                  />
                  {formErrors.nom ? <p className="text-xs text-red-600">{formErrors.nom}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="template-identifier" className="block text-sm font-semibold text-slate-700">
                    المعرف <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="template-identifier"
                    value={formData.identifiant}
                    onChange={(event) => handleChange('identifiant', event.target.value)}
                    placeholder="LETTRE_RETARD"
                    className="h-10 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
                    dir="ltr"
                  />
                  {formErrors.identifiant ? <p className="text-xs text-red-600">{formErrors.identifiant}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="block text-sm font-semibold text-slate-700">
                    نوع المخالفة <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-slate-500">تصنيف المخالفة المرتبطة بالنموذج</p>
                  <Select value={formData.type_faute_id} onValueChange={(value) => handleChange('type_faute_id', value)}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-300 bg-white text-right text-slate-900 focus:border-blue-500 focus:ring-blue-500/30">
                      <SelectValue placeholder="اختر نوع المخالفة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__GENERIC__">عام – لكل أنواع المخالفات</SelectItem>
                      {typesFaute.map((typeFaute) => (
                        <SelectItem key={typeFaute.id} value={typeFaute.id.toString()}>
                          {getTypeFauteLabel(typeFaute)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.type_faute_id ? <p className="text-xs text-red-600">{formErrors.type_faute_id}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label className="block text-sm font-semibold text-slate-700">
                    نوع الاستعمال <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-slate-500">فئة الوثيقة أو المسطرة التي سيستعمل فيها النموذج</p>
                  <Select value={formData.usage} onValueChange={(value) => handleChange('usage', value)}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-300 bg-white text-right text-slate-900 focus:border-blue-500 focus:ring-blue-500/30">
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
                  {formErrors.usage ? <p className="text-xs text-red-600">{formErrors.usage}</p> : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="block text-sm font-semibold text-slate-700">
                  ملف النموذج <span className="text-red-500">*</span>
                </Label>
                <label
                  htmlFor="template-file"
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-5 text-center transition-colors ${
                    formData.file
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <FileText className={`size-7 ${formData.file ? 'text-blue-500' : 'text-slate-400'}`} strokeWidth={1.5} />
                  {formData.file ? (
                    <span className="text-sm font-medium text-blue-700" dir="ltr">{formData.file.name}</span>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-slate-700">اسحب الملف هنا أو انقر للاختيار</span>
                      <span className="text-xs text-slate-400">يُقبل ملف DOCX فقط</span>
                    </>
                  )}
                  <input
                    id="template-file"
                    type="file"
                    accept=".docx"
                    onChange={(event) => handleChange('file', event.target.files?.[0] || null)}
                    className="sr-only"
                  />
                </label>
                {formErrors.file ? <p className="text-xs text-red-600">{formErrors.file}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="template-description" className="block text-sm font-semibold text-slate-700">الوصف</Label>
                <textarea
                  id="template-description"
                  value={formData.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  placeholder="وصف اختياري للنموذج..."
                  className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
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
                      <SelectItem value="__GENERIC__">عام – لكل أنواع المخالفات</SelectItem>
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

        {/* Delete confirmation dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={(open) => {
          if (!actionLoading) {
            setDeleteConfirmOpen(open)
            if (!open) setTemplateToDelete(null)
          }
        }}>
          <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-right text-xl font-bold text-slate-900">حذف النموذج</DialogTitle>
              <DialogDescription className="text-right text-sm text-slate-600">
                هل أنت متأكد من حذف هذا النموذج؟ سيتم تعطيله ولن يظهر ضمن النماذج النشطة.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-start">
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setTemplateToDelete(null) }}
                disabled={actionLoading}
                className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={actionLoading}
                className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {actionLoading ? 'جاري الحذف...' : 'حذف النموذج'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PageShell>
  )
}
