'use client'

import { useEffect, useState, useRef } from 'react'
import { useCurrentUser, isLecteurRH } from '@/components/UserContext'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Pagination } from '@/components/ui/pagination'
import { Users, Plus, Upload, FileSpreadsheet, Trash2, CalendarPlus, Download, Eye, X } from 'lucide-react'

const ITEMS_PER_PAGE = 8

export default function ProfesseursPage() {
  const { user } = useCurrentUser()
  const readOnly = isLecteurRH(user)

  const [professeurs, setProfesseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    nom: '',
    prenom: '',
    ppr: '',
    hopital_id: '',
    service_id: '',
    grade_id: '',
  })
  const [open, setOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [messageDialogIsError, setMessageDialogIsError] = useState(true)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [professeurToDelete, setProfesseurToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedProfesseurs, setSelectedProfesseurs] = useState(new Set())
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [bulkAddSoldesDialogOpen, setBulkAddSoldesDialogOpen] = useState(false)
  const [bulkAddYear, setBulkAddYear] = useState(new Date().getFullYear().toString())
  const [bulkAddLoading, setBulkAddLoading] = useState(false)
  const [bulkAddResult, setBulkAddResult] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const selectAllCheckboxRef = useRef(null)
  const [categories, setCategories] = useState([])
  const [specialites, setSpecialites] = useState([])
  const [titres, setTitres] = useState([])
  const [services, setServices] = useState([])
  const [hopitaux, setHopitaux] = useState([])
  const [grades, setGrades] = useState([])
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    ppr: '',
    specialite_id: '',
    categorie_personnel_id: '',
    titre_id: '',
    service_id: '',
    hopital_id: '',
    grade_id: '',
  })

  useEffect(() => {
    fetchProfesseurs()
    fetchOptions()
    setCurrentPage(1)
    setSelectedProfesseurs(new Set())
  }, [filters.nom, filters.prenom, filters.ppr, filters.hopital_id, filters.service_id, filters.grade_id])

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const paginatedProfesseurs = professeurs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      )
      const someSelected = selectedProfesseurs.size > 0 && selectedProfesseurs.size < paginatedProfesseurs.length
      selectAllCheckboxRef.current.indeterminate = someSelected
    }
  }, [professeurs, currentPage, selectedProfesseurs])

  const fetchOptions = async () => {
    try {
      const [categoriesRes, specialitesRes, titresRes, servicesRes, hopitauxRes, gradesRes] = await Promise.all([
        fetch('/api/categories-personnel'),
        fetch('/api/specialites'),
        fetch('/api/titres'),
        fetch('/api/services'),
        fetch('/api/hopitaux'),
        fetch('/api/grades'),
      ])
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
      if (specialitesRes.ok) setSpecialites(await specialitesRes.json())
      if (titresRes.ok) setTitres(await titresRes.json())
      if (servicesRes.ok) setServices(await servicesRes.json())
      if (hopitauxRes.ok) setHopitaux(await hopitauxRes.json())
      if (gradesRes.ok) setGrades(await gradesRes.json())
    } catch (error) {
      console.error('Erreur lors du chargement des options:', error)
    }
  }

  const fetchProfesseurs = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.nom.trim()) params.append('nom', filters.nom.trim())
      if (filters.prenom.trim()) params.append('prenom', filters.prenom.trim())
      if (filters.ppr.trim()) params.append('ppr', filters.ppr.trim())
      if (filters.hopital_id) params.append('hopital_id', filters.hopital_id)
      if (filters.service_id) params.append('service_id', filters.service_id)
      if (filters.grade_id) params.append('grade_id', filters.grade_id)
      const url = params.toString() ? `/api/professeurs?${params.toString()}` : '/api/professeurs'
      const response = await fetch(url)
      if (response.ok) setProfesseurs(await response.json())
    } catch (error) {
      console.error('Erreur lors du chargement des professeurs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilter = () => {
    setFilters({ nom: '', prenom: '', ppr: '', hopital_id: '', service_id: '', grade_id: '' })
    setCurrentPage(1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/professeurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        setOpen(false)
        setFormData({ nom: '', prenom: '', ppr: '', specialite_id: '', categorie_personnel_id: '', titre_id: '', service_id: '', hopital_id: '', grade_id: '' })
        setCurrentPage(1)
        fetchProfesseurs()
      } else {
        const data = await response.json()
        setMessageDialogIsError(true)
        setErrorMessage(data.error || 'حدث خطأ أثناء الإنشاء')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessageDialogIsError(true)
      setErrorMessage('حدث خطأ أثناء الإنشاء')
      setErrorDialogOpen(true)
    }
  }

  const handleImportExcel = async (e) => {
    e.preventDefault()
    if (!importFile) {
      setMessageDialogIsError(true)
      setErrorMessage('الرجاء اختيار ملف Excel')
      setErrorDialogOpen(true)
      return
    }
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      const response = await fetch('/api/soldes/import-excel', { method: 'POST', body: fd })
      const data = await response.json()
      if (response.ok) {
        setImportResult(data)
        setImportFile(null)
        fetchProfesseurs()
      } else {
        let errorMsg = data.error || 'حدث خطأ أثناء الاستيراد'
        if (data.foundColumns) errorMsg += `\n\nالأعمدة الموجودة في الملف:\n${data.foundColumns.join(', ')}`
        if (data.details) {
          errorMsg += `\n\nالتفاصيل:\n`
          errorMsg += `- عمود "Nom" موجود: ${data.details.nomFound ? 'نعم' : 'لا'}\n`
          errorMsg += `- عمود "Prénom" موجود: ${data.details.prenomFound ? 'نعم' : 'لا'}`
          if (data.details.allColumns?.length > 0) {
            errorMsg += `\n\nجميع الأعمدة المكتشفة:\n`
            data.details.allColumns.forEach((col, idx) => {
              const displayValue = col.original || '(فارغ)'
              errorMsg += `${idx + 1}. "${displayValue}"${col.normalized ? ` (${col.normalized})` : ''}\n`
            })
          }
        }
        if (data.debug?.firstFewRows) {
          errorMsg += `\n\nأول بضعة صفوف:\n`
          data.debug.firstFewRows.forEach((rowInfo) => {
            errorMsg += `صف ${rowInfo.rowIndex + 1}: ${rowInfo.values.join(', ')}\n`
          })
        }
        setMessageDialogIsError(true)
        setErrorMessage(errorMsg)
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessageDialogIsError(true)
      setErrorMessage('حدث خطأ أثناء الاستيراد')
      setErrorDialogOpen(true)
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteClick = (professeur) => {
    setProfesseurToDelete(professeur)
    setDeleteDialogOpen(true)
  }

  const handleDeleteProfesseur = async () => {
    if (!professeurToDelete) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/professeurs/${professeurToDelete.id}`, { method: 'DELETE' })
      if (response.ok) {
        setDeleteDialogOpen(false)
        setProfesseurToDelete(null)
        setCurrentPage(1)
        setSelectedProfesseurs(new Set())
        fetchProfesseurs()
      } else {
        const data = await response.json()
        setMessageDialogIsError(true)
        setErrorMessage(data.error || 'حدث خطأ أثناء الحذف')
        setErrorDialogOpen(true)
        setDeleteDialogOpen(false)
        setProfesseurToDelete(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessageDialogIsError(true)
      setErrorMessage('حدث خطأ أثناء الحذف')
      setErrorDialogOpen(true)
      setDeleteDialogOpen(false)
      setProfesseurToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleSelectProfesseur = (professeurId) => {
    const newSelected = new Set(selectedProfesseurs)
    if (newSelected.has(professeurId)) {
      newSelected.delete(professeurId)
    } else {
      newSelected.add(professeurId)
    }
    setSelectedProfesseurs(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedProfesseurs.size === paginatedProfesseurs.length) {
      setSelectedProfesseurs(new Set())
    } else {
      setSelectedProfesseurs(new Set(paginatedProfesseurs.map(p => p.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedProfesseurs.size === 0) return
    setDeleting(true)
    try {
      const response = await fetch('/api/professeurs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedProfesseurs) }),
      })
      if (response.ok) {
        const data = await response.json()
        setBulkDeleteDialogOpen(false)
        setSelectedProfesseurs(new Set())
        setCurrentPage(1)
        fetchProfesseurs()
        setMessageDialogIsError(false)
        setErrorMessage(data.message || 'تم الحذف بنجاح')
        setErrorDialogOpen(true)
      } else {
        const data = await response.json()
        setMessageDialogIsError(true)
        setErrorMessage(data.error || 'حدث خطأ أثناء الحذف المتعدد')
        setErrorDialogOpen(true)
        setBulkDeleteDialogOpen(false)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessageDialogIsError(true)
      setErrorMessage('حدث خطأ أثناء الحذف المتعدد')
      setErrorDialogOpen(true)
      setBulkDeleteDialogOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkAddAnnualSoldes = async (e) => {
    e.preventDefault()
    setBulkAddLoading(true)
    setBulkAddResult(null)
    try {
      const response = await fetch('/api/soldes/bulk-add-annual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annee: parseInt(bulkAddYear, 10) }),
      })
      const data = await response.json()
      if (response.ok) {
        setBulkAddResult(data)
        fetchProfesseurs()
      } else {
        setMessageDialogIsError(true)
        setErrorMessage(data.error || 'حدث خطأ أثناء إضافة الأرصدة')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessageDialogIsError(true)
      setErrorMessage('حدث خطأ أثناء إضافة الأرصدة')
      setErrorDialogOpen(true)
    } finally {
      setBulkAddLoading(false)
    }
  }

  const handleExportSoldes = async () => {
    setExportLoading(true)
    try {
      const res = await fetch('/api/soldes/export-excel', { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessageDialogIsError(true)
        setErrorMessage(data.error || 'حدث خطأ أثناء التصدير')
        setErrorDialogOpen(true)
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const filenameMatch = disposition?.match(/filename="?([^";]+)"?/)
      const filename = filenameMatch?.[1] || `soldes-conges-${new Date().toISOString().slice(0, 10)}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur export:', error)
      setMessageDialogIsError(true)
      setErrorMessage('حدث خطأ أثناء تصدير Excel')
      setErrorDialogOpen(true)
    } finally {
      setExportLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
        <span className="size-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        <p className="text-sm text-slate-600">جاري تحميل الموظفين...</p>
      </div>
    )
  }

  const totalPages = Math.ceil(professeurs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedProfesseurs = professeurs.slice(startIndex, endIndex)
  const allSelected = paginatedProfesseurs.length > 0 && selectedProfesseurs.size === paginatedProfesseurs.length

  const hasActiveFilters = filters.nom || filters.prenom || filters.ppr || filters.hopital_id || filters.service_id || filters.grade_id

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 text-right">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-blue-600" />
              <h1 className="text-2xl font-semibold text-slate-950">الموظفون</h1>
            </div>
            <p className="text-sm text-slate-600">تدبير بيانات الموظفين وأرصدة الرخص</p>
            <div className="flex items-center gap-4 pt-1 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-500" />
                <span className="font-semibold text-slate-900">{professeurs.length}</span>
                <span className="text-slate-600">موظف مسجل</span>
              </span>
              {selectedProfesseurs.size > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="font-semibold text-slate-900">{selectedProfesseurs.size}</span>
                    <span className="text-slate-600">محدد</span>
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly && (
              <>
                {/* إضافة الأرصدة السنوية */}
                <button
                  type="button"
                  onClick={() => { setBulkAddResult(null); setBulkAddSoldesDialogOpen(true) }}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <CalendarPlus className="size-3.5" />
                  إضافة الأرصدة السنوية
                </button>
                {/* تصدير الأرصدة */}
                <button
                  type="button"
                  onClick={handleExportSoldes}
                  disabled={exportLoading}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="size-3.5" />
                  {exportLoading ? 'جاري التصدير...' : 'تصدير الأرصدة'}
                </button>
                {/* استيراد الأرصدة */}
                <button
                  type="button"
                  onClick={() => { setImportFile(null); setImportResult(null); setImportDialogOpen(true) }}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Upload className="size-3.5" />
                  استيراد الأرصدة
                </button>
                {/* حذف المحدد */}
                {selectedProfesseurs.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    disabled={deleting}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                    حذف المحدد ({selectedProfesseurs.size})
                  </button>
                )}
                {/* إضافة موظف */}
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <Plus className="size-4" />
                  إضافة موظف
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[8rem]">
            <Label htmlFor="filter-nom" className="mb-1.5 block text-xs font-medium text-slate-600">النسب</Label>
            <Input
              id="filter-nom"
              placeholder="أدخل النسب..."
              value={filters.nom}
              onChange={(e) => { setFilters({ ...filters, nom: e.target.value }); setCurrentPage(1) }}
              className="h-10 rounded-xl border-slate-300 text-right text-sm"
            />
          </div>
          <div className="flex-1 min-w-[8rem]">
            <Label htmlFor="filter-prenom" className="mb-1.5 block text-xs font-medium text-slate-600">الاسم</Label>
            <Input
              id="filter-prenom"
              placeholder="أدخل الاسم..."
              value={filters.prenom}
              onChange={(e) => { setFilters({ ...filters, prenom: e.target.value }); setCurrentPage(1) }}
              className="h-10 rounded-xl border-slate-300 text-right text-sm"
            />
          </div>
          <div className="flex-1 min-w-[8rem]">
            <Label htmlFor="filter-ppr" className="mb-1.5 block text-xs font-medium text-slate-600">رقم التأجير</Label>
            <Input
              id="filter-ppr"
              placeholder="أدخل رقم التأجير..."
              value={filters.ppr}
              onChange={(e) => { setFilters({ ...filters, ppr: e.target.value }); setCurrentPage(1) }}
              className="h-10 rounded-xl border-slate-300 text-right text-sm"
            />
          </div>
          <div className="flex-1 min-w-[10rem]">
            <Label className="mb-1.5 block text-xs font-medium text-slate-600">المستشفى</Label>
            <Select
              value={filters.hopital_id || 'all'}
              onValueChange={(value) => { setFilters({ ...filters, hopital_id: value === 'all' ? '' : value }); setCurrentPage(1) }}
            >
              <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm">
                <SelectValue placeholder="جميع المستشفيات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستشفيات</SelectItem>
                {hopitaux.map((h) => (
                  <SelectItem key={h.id} value={h.id.toString()}>{h.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[10rem]">
            <Label className="mb-1.5 block text-xs font-medium text-slate-600">المصلحة</Label>
            <Select
              value={filters.service_id || 'all'}
              onValueChange={(value) => { setFilters({ ...filters, service_id: value === 'all' ? '' : value }); setCurrentPage(1) }}
            >
              <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm">
                <SelectValue placeholder="جميع المصالح" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المصالح</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[10rem]">
            <Label className="mb-1.5 block text-xs font-medium text-slate-600">الدرجة</Label>
            <Select
              value={filters.grade_id || 'all'}
              onValueChange={(value) => { setFilters({ ...filters, grade_id: value === 'all' ? '' : value }); setCurrentPage(1) }}
            >
              <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm">
                <SelectValue placeholder="جميع الدرجات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الدرجات</SelectItem>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={g.id.toString()}>{g.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilter}
              className="cursor-pointer inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <X className="size-3.5" />
              مسح
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-right text-xs font-medium text-slate-600 sm:px-6">
          عرض{' '}
          <span className="font-bold text-slate-900">{professeurs.length}</span>{' '}
          موظف
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F1F5F9]">
                <th scope="col" className="w-10 px-4 py-3 text-right">
                  <input
                    type="checkbox"
                    ref={selectAllCheckboxRef}
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">النسب</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">الاسم</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">رقم التأجير</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">التخصص</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">الدرجة</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">المصلحة</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">المستشفى</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">رصيد الرخص</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">الرخص</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-slate-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {professeurs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                      <Users className="size-9 text-slate-300" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-slate-700">لا يوجد موظف مطابق</p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleClearFilter}
                          className="text-xs text-blue-600 underline hover:text-blue-800"
                        >
                          مسح الفلاتر
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProfesseurs.map((professeur) => {
                  const soldesNonExpires = professeur.soldes || []
                  const totalJoursRestants = soldesNonExpires.reduce((sum, s) => sum + s.jours_restants, 0)
                  const isSelected = selectedProfesseurs.has(professeur.id)
                  return (
                    <tr
                      key={professeur.id}
                      className={`transition-colors hover:bg-[#F8FAFC] ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectProfesseur(professeur.id)}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="block max-w-[140px] truncate text-sm font-medium text-slate-900" title={professeur.nom}>
                          {professeur.nom}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="block max-w-[140px] truncate text-sm text-slate-700" title={professeur.prenom}>
                          {professeur.prenom}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm text-slate-600">{professeur.ppr ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="block max-w-[120px] truncate text-sm text-slate-600" title={professeur.specialite?.nom || ''}>
                          {professeur.specialite?.nom || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="block max-w-[120px] truncate text-sm text-slate-600" title={professeur.grade?.nom || ''}>
                          {professeur.grade?.nom || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="block max-w-[120px] truncate text-sm text-slate-600" title={professeur.service?.nom || ''}>
                          {professeur.service?.nom || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="block max-w-[120px] truncate text-sm text-slate-600" title={professeur.hopital?.nom || ''}>
                          {professeur.hopital?.nom || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {soldesNonExpires.length > 0 ? (
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold text-emerald-700">
                              {totalJoursRestants} يوم
                            </div>
                            <div className="space-y-0.5">
                              {soldesNonExpires.map((solde) => (
                                <div key={solde.id} className="text-xs text-slate-500">
                                  {solde.annee}: {solde.jours_restants}/{solde.jours_total}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-medium text-slate-700">{professeur._count.conges}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/professeurs/${professeur.id}`}
                            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          >
                            تفاصيل
                          </Link>
                          <span className="text-slate-200">|</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(professeur)}
                            className="cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="border-t border-slate-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => { setCurrentPage(page); setSelectedProfesseurs(new Set()) }}
            />
          </div>
        )}
      </div>

      {/* Add employee dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-xl sm:max-w-2xl" dir="rtl">
          <DialogHeader className="flex-shrink-0 border-b border-slate-100 px-6 pb-4 pt-6 text-right">
            <DialogTitle className="text-right text-lg font-bold text-slate-900">إضافة موظف جديد</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-600">
              أدخل بيانات الموظف الجديد
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              {/* Required fields first */}
              <div className="space-y-1.5">
                <Label htmlFor="add_nom" className="text-sm font-medium text-slate-700">
                  النسب <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add_nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                  className="h-10 rounded-xl border-slate-300 text-right text-sm"
                  placeholder="أدخل النسب..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add_prenom" className="text-sm font-medium text-slate-700">
                  الاسم <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add_prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  required
                  className="h-10 rounded-xl border-slate-300 text-right text-sm"
                  placeholder="أدخل الاسم..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add_ppr" className="text-sm font-medium text-slate-700">
                  رقم التأجير <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="add_ppr"
                  value={formData.ppr}
                  onChange={(e) => setFormData({ ...formData, ppr: e.target.value })}
                  required
                  className="h-10 rounded-xl border-slate-300 text-right text-sm"
                  placeholder="أدخل رقم التأجير..."
                />
              </div>
              {/* Optional fields */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">اللقب</Label>
                <Select value={formData.titre_id} onValueChange={(v) => setFormData({ ...formData, titre_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm">
                    <SelectValue placeholder="اختر اللقب (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {titres.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">فئة الموظف</Label>
                <Select value={formData.categorie_personnel_id} onValueChange={(v) => setFormData({ ...formData, categorie_personnel_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm">
                    <SelectValue placeholder="اختر الفئة (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">التخصص</Label>
                <Select value={formData.specialite_id} onValueChange={(v) => setFormData({ ...formData, specialite_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm">
                    <SelectValue placeholder="اختر التخصص (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialites.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">الدرجة</Label>
                <Select value={formData.grade_id} onValueChange={(v) => setFormData({ ...formData, grade_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm">
                    <SelectValue placeholder="اختر الدرجة (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g.id} value={g.id.toString()}>{g.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">المصلحة</Label>
                <Select value={formData.service_id} onValueChange={(v) => setFormData({ ...formData, service_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm">
                    <SelectValue placeholder="اختر المصلحة (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">المستشفى</Label>
                <Select value={formData.hopital_id} onValueChange={(v) => setFormData({ ...formData, hopital_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm">
                    <SelectValue placeholder="اختر المستشفى (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {hopitaux.map((h) => (
                      <SelectItem key={h.id} value={h.id.toString()}>{h.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
                >
                  إضافة الموظف
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import soldes dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-xl" dir="rtl">
          <DialogHeader className="flex-shrink-0 border-b border-slate-100 px-6 pb-4 pt-6 text-right">
            <DialogTitle className="text-right text-lg font-bold text-slate-900">استيراد الأرصدة من Excel</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-600">
              اختر ملف Excel بصيغة .xlsx أو .xls لاستيراد أرصدة الرخص
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
            <form onSubmit={handleImportExcel} className="space-y-4 text-right">
              <div className="space-y-1.5">
                <Label htmlFor="excel-file" className="text-sm font-medium text-slate-700">
                  ملف Excel (.xlsx أو .xls) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  required
                  disabled={importing}
                  className="h-10 rounded-xl border-slate-300 text-sm"
                />
              </div>
              {importResult && (
                <div className="space-y-2">
                  {importResult.summary?.importSansColonneSolde && (
                    <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
                      لم يتم اكتشاف عمود رصيد — تم استيراد الموظفين بدون رصيد ابتدائي.
                    </p>
                  )}
                  {importResult.summary?.warnings > 0 && (
                    <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      {importResult.summary.warnings} تحذير (درجة أو تخصص غير معروف في بعض الصفوف).
                    </p>
                  )}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                    اكتمل الاستيراد. نجح: {importResult.summary.success}، أخطاء: {importResult.summary.errors}، تجاهل: {importResult.summary.skipped}.
                  </div>
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
                <button
                  type="button"
                  onClick={() => { setImportDialogOpen(false); setImportFile(null); setImportResult(null) }}
                  className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
                >
                  إغلاق
                </button>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {importing ? 'جاري الاستيراد...' : 'استيراد'}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk add annual soldes dialog */}
      <Dialog open={bulkAddSoldesDialogOpen} onOpenChange={(v) => { setBulkAddSoldesDialogOpen(v); if (!v) setBulkAddResult(null) }}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right text-lg font-bold text-slate-900">إضافة الأرصدة السنوية</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-600">
              إضافة أرصدة سنوية لجميع الموظفين
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkAddAnnualSoldes} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">السنة</Label>
              <Select value={bulkAddYear} onValueChange={setBulkAddYear} disabled={bulkAddLoading}>
                <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm">
                  <SelectValue placeholder="اختر السنة" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const y = new Date().getFullYear() - 2 + i
                    return (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            {bulkAddResult && (
              bulkAddResult.summary.professeursTotal === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  لا يوجد موظفون. لم يتم إضافة أي رصيد.
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 space-y-1">
                  <p className="text-sm font-semibold text-emerald-800">اكتملت العملية</p>
                  <p className="text-sm text-emerald-700">
                    تم تحديث {bulkAddResult.summary.professeursMisAJour} موظف من أصل {bulkAddResult.summary.professeursTotal}.
                  </p>
                  <p className="text-sm text-emerald-700">
                    تم إنشاء {bulkAddResult.summary.soldesCrees} رصيد، {bulkAddResult.summary.soldesIgnores} موجود مسبقاً.
                  </p>
                </div>
              )
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
              <button
                type="button"
                onClick={() => setBulkAddSoldesDialogOpen(false)}
                className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
              >
                إغلاق
              </button>
              <button
                type="submit"
                disabled={bulkAddLoading}
                className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {bulkAddLoading ? 'جاري الإضافة...' : 'إضافة للجميع'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete single employee dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(v) => { if (!deleting) setDeleteDialogOpen(v) }}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right text-lg font-bold text-slate-900">تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-700 space-y-3">
              {professeurToDelete && (
                <>
                  <span className="block">
                    هل أنت متأكد من حذف الموظف{' '}
                    <strong>
                      {professeurToDelete.titre?.nom ? `${professeurToDelete.titre.nom} ` : ''}
                      {professeurToDelete.prenom} {professeurToDelete.nom}
                    </strong>
                    {professeurToDelete.ppr ? ` (${professeurToDelete.ppr})` : ''}؟
                  </span>
                  {professeurToDelete._count?.conges > 0 && (
                    <span className="block rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                      <strong>تنبيه:</strong> هذا الموظف لديه {professeurToDelete._count.conges} رخصة مسجلة. ستُحذف جميعها بشكل نهائي.
                    </span>
                  )}
                  {professeurToDelete._count?.soldes > 0 && (
                    <span className="block rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                      <strong>تنبيه:</strong> هذا الموظف لديه {professeurToDelete._count.soldes} رصيد رخصة. ستُحذف جميعها.
                    </span>
                  )}
                  <span className="block text-sm font-medium text-red-600">هذا الإجراء لا يمكن التراجع عنه.</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
            <button
              type="button"
              onClick={() => { setDeleteDialogOpen(false); setProfesseurToDelete(null) }}
              disabled={deleting}
              className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleDeleteProfesseur}
              disabled={deleting}
              className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {deleting ? 'جاري الحذف...' : 'حذف'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk delete dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right text-lg font-bold text-slate-900">تأكيد الحذف المتعدد</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-700 space-y-3">
              <span className="block">
                هل أنت متأكد من حذف <strong>{selectedProfesseurs.size}</strong> موظف محدد؟
              </span>
              <span className="block rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <strong>تنبيه:</strong> ستُحذف جميع الرخص والأرصدة المرتبطة بهؤلاء الموظفين. هذا الإجراء لا يمكن التراجع عنه.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
            <button
              type="button"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={deleting}
              className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={deleting}
              className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {deleting ? 'جاري الحذف...' : `حذف ${selectedProfesseurs.size} موظف`}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error / success dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className={`text-right text-lg font-bold ${messageDialogIsError ? 'text-red-600' : 'text-emerald-600'}`}>
              {messageDialogIsError ? 'خطأ' : 'تم بنجاح'}
            </DialogTitle>
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
