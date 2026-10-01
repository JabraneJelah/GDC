'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FilterBar } from '@/components/dossiers-explicatifs/FilterBar'
import { AlertTriangle, Archive, ArrowRight, FolderOpen, X } from 'lucide-react'

const ITEMS_PER_PAGE = 8

const typeFauteArabicLabels = {
  RETARD: 'التأخر عن العمل',
  ABSENCE_NON_JUSTIFIEE: 'الغياب غير المبرر',
  DEPART_AVANT_HEURE: 'مغادرة العمل قبل الوقت',
  NON_RESPECT_PAUSE: 'عدم احترام أوقات الاستراحة',
  MAUVAISE_CONDUITE_PATIENTS: 'سوء التعامل مع المرضى',
  NON_RESPECT_COLLEGUES: 'عدم احترام الرؤساء أو الزملاء',
  ALTERCATION_TRAVAIL: 'الشجار داخل العمل',
  NON_RESPECT_ETHIQUE: 'عدم الالتزام بآداب المهنة',
  TENUE_PROFESSIONNELLE: 'الهندام المهني',
  ABANDON_POSTE: 'التخلي عن الوظيفة',
  CERTIFICAT_MEDICAL_HORS_DELAI: 'الإدلاء بشهادة طبية خارج الآجال',
  AZS: 'عطلة مرضية غير مبررة',
  CONGE_MALADIE_NON_JUSTIFIE: 'عطلة مرضية غير مبررة',
}

function getFaultLabel(typeFaute) {
  if (!typeFaute) return null
  return typeFauteArabicLabels[typeFaute.code] || typeFaute.nom || null
}

const procedureTypeArabicLabels = {
  AVERTISSEMENT: 'تنبيه',
  RETENUE: 'اقتطاع',
}

const PROCEDURE_TYPE_FILTER_OPTIONS = [
  { value: 'AVERTISSEMENT', label: 'تنبيه' },
  { value: 'RETENUE', label: 'اقتطاع' },
  { value: 'NONE', label: 'بدون مسطرة' },
]

function getProcedureTypeLabel(typeProcedureSelectionne) {
  if (!typeProcedureSelectionne) return null
  return procedureTypeArabicLabels[typeProcedureSelectionne] || null
}

// Prefers the live professor's split name fields (Arabic first, matching the
// dossier-creation snapshot convention); falls back to the stored snapshot
// string for historical dossiers or professors no longer linked.
function getDossierFullName(dossier) {
  const p = dossier.professeur
  if (p?.nom_ar && p?.prenom_ar) return `${p.nom_ar} ${p.prenom_ar}`.trim()
  if (p?.nom || p?.prenom) return `${p.prenom || ''} ${p.nom || ''}`.trim()
  return dossier.nom_complet || null
}

const DEFAULT_FILTERS = {
  search: '',
  service: '',
  hopital: '',
  typeFauteId: '',
  procedureType: '',
  dateFrom: '',
  dateTo: '',
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ar-MA')
}

export default function ArchivePage() {
  const router = useRouter()
  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [typesFaute, setTypesFaute] = useState([])
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchDossiers = useCallback(async () => {
    try {
      setFetchError(false)
      const res = await fetch('/api/dossiers-explicatifs')
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setDossiers(Array.isArray(data) ? data.filter((d) => d.statut === 'ARCHIVE') : [])
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDossiers()
    fetch('/api/type-faute')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTypesFaute(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [fetchDossiers])

  const uniqueServices = useMemo(
    () => [...new Set(dossiers.map((d) => d.service).filter(Boolean))].sort(),
    [dossiers],
  )

  const uniqueHopitaux = useMemo(
    () => [...new Set(dossiers.map((d) => d.professeur?.hopital?.nom).filter(Boolean))].sort(),
    [dossiers],
  )

  const activeFilterCount = useMemo(
    () => Object.keys(DEFAULT_FILTERS).filter((k) => filters[k] !== DEFAULT_FILTERS[k]).length,
    [filters],
  )

  const filteredDossiers = useMemo(() => {
    const norm = filters.search.trim().toLowerCase()
    return dossiers.filter((d) => {
      if (norm && ![d.reference, d.nom_complet, d.matricule].filter(Boolean).some((v) => v.toLowerCase().includes(norm))) return false
      if (filters.service && d.service !== filters.service) return false
      if (filters.hopital && d.professeur?.hopital?.nom !== filters.hopital) return false
      if (filters.typeFauteId && String(d.type_faute?.id) !== filters.typeFauteId) return false
      if (filters.procedureType) {
        if (filters.procedureType === 'NONE') {
          if (d.type_procedure_selectionne) return false
        } else if (d.type_procedure_selectionne !== filters.procedureType) {
          return false
        }
      }
      const df = d.date_faute?.slice(0, 10)
      if (filters.dateFrom && df && df < filters.dateFrom) return false
      if (filters.dateTo && df && df > filters.dateTo) return false
      return true
    })
  }, [dossiers, filters])

  const totalPages = Math.ceil(filteredDossiers.length / ITEMS_PER_PAGE)
  const paginatedDossiers = filteredDossiers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setCurrentPage(1)
  }

  return (
    <PageShell>
      <div className="space-y-5" dir="rtl">

        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-right">
              <div className="flex items-center gap-2">
                <Archive className="size-5 text-amber-500" />
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">الأرشيف</h1>
              </div>
              <p className="text-sm text-slate-500">
                الملفات التوضيحية المؤرشفة نهائيا
                {!loading && (
                  <span className="mr-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    {dossiers.length}
                  </span>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 sm:w-auto"
              onClick={() => router.push('/dossiers-explicatifs')}
            >
              <ArrowRight className="size-4" />
              رجوع
            </Button>
          </div>
        </section>

        {/* Filter bar — no status filter since all dossiers here are ARCHIVE */}
        <FilterBar
          filters={filters}
          defaultFilters={DEFAULT_FILTERS}
          onFilterChange={setFilter}
          onClearFilters={clearFilters}
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen((v) => !v)}
          resultCount={filteredDossiers.length}
          uniqueServices={uniqueServices}
          uniqueHopitaux={uniqueHopitaux}
          typesFaute={typesFaute}
          statusOptions={null}
          procedureTypeOptions={PROCEDURE_TYPE_FILTER_OPTIONS}
        />

        {/* Content */}
        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
            <span className="size-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-amber-500" />
            <p className="text-sm text-slate-500">جاري تحميل الأرشيف...</p>
          </div>
        ) : fetchError ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
            <AlertTriangle className="size-10 text-red-400" />
            <p className="text-sm text-slate-600">تعذر تحميل الأرشيف</p>
            <Button variant="outline" onClick={fetchDossiers}>إعادة المحاولة</Button>
          </div>
        ) : (
          <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-0">
              {activeFilterCount > 0 && (
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5 sm:px-6">
                  <span className="text-xs text-slate-600">
                    تم العثور على{' '}
                    <span className="font-semibold text-slate-900">{filteredDossiers.length}</span>{' '}
                    نتيجة
                  </span>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    مسح الفلاتر
                  </button>
                </div>
              )}
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1200px]">
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-b border-slate-200 hover:bg-slate-50">
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">المرجع</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">الاسم الكامل</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">رقم التأجير</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">المصلحة</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">نوع المخالفة</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">نوع المسطرة</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">تاريخ الأرشفة</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDossiers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="px-5 py-16 text-center">
                          <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                            <FolderOpen className="size-10 text-slate-300" strokeWidth={1.5} />
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-slate-600">
                                {activeFilterCount > 0
                                  ? 'لا توجد نتائج مطابقة للفلاتر المطبقة'
                                  : 'لا توجد ملفات مؤرشفة'}
                              </p>
                              <p className="text-xs text-slate-400">
                                {activeFilterCount > 0
                                  ? 'جرب تعديل معايير البحث'
                                  : 'ستظهر الملفات المؤرشفة هنا'}
                              </p>
                            </div>
                            {activeFilterCount > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                className="mt-1 gap-1.5"
                              >
                                <X className="size-3.5" />
                                مسح الفلاتر
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedDossiers.map((dossier) => (
                        <TableRow key={dossier.id} className="border-b border-slate-100 bg-white hover:bg-slate-50">
                          <TableCell className="px-4 py-3 text-right">
                            <span dir="ltr" className="font-mono text-sm font-bold text-slate-900">
                              {dossier.reference || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                            {getDossierFullName(dossier) || '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm text-slate-600">
                            {dossier.matricule || '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm text-slate-600">
                            {dossier.service || '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm text-slate-600">
                            {getFaultLabel(dossier.type_faute) || '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm text-slate-600">
                            {getProcedureTypeLabel(dossier.type_procedure_selectionne) || '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm text-slate-500">
                            {formatDate(dossier.date_archivage)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <Link
                              href={`/dossiers-explicatifs/${dossier.id}`}
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                            >
                              عرض
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
            </CardContent>
          </Card>
        )}

      </div>
    </PageShell>
  )
}
