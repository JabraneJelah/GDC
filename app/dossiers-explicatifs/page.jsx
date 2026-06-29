'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCurrentUser, isLecteurRH } from '@/components/UserContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
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
import {
  getListStatusLabel,
  getListStatusColor,
} from '@/frontend/src/lib/dossierStatus'
import { FilterBar } from '@/components/dossiers-explicatifs/FilterBar'
import { StatusBadge } from '@/components/dossiers-explicatifs/StatusBadge'
import {
  AlertTriangle,
  Eye,
  FolderOpen,
  Plus,
  X,
} from 'lucide-react'

const ITEMS_PER_PAGE = 8

const DEFAULT_FILTERS = {
  search: '',
  service: '',
  hopital: '',
  typeFauteId: '',
  status: 'actifs',
  dateFrom: '',
  dateTo: '',
}

const STATUS_OPTIONS = [
  { value: 'actifs', label: 'الملفات النشطة' },
  { value: 'a_archiver', label: 'في انتظار الأرشفة' },
  { value: 'archives', label: 'المؤرشفة' },
  { value: 'annules', label: 'الملغاة' },
  { value: 'ENREGISTRE', label: 'مسجل' },
  { value: 'DOCUMENTS_INITIAUX_GENERES', label: 'الوثائق الأولية مولدة' },
  { value: 'NOTIFIE', label: 'تم الإشعار' },
  { value: 'REPONSE_RECUE', label: 'الجواب مستلم' },
  { value: 'REPONSE_CONVAINCANTE', label: 'جواب مقنع' },
  { value: 'REPONSE_NON_CONVAINCANTE', label: 'جواب غير مقنع' },
  { value: 'PROCEDURE_SUIVANTE_GENEREE', label: 'المسطرة التالية مولدة' },
  { value: 'CLOTURE', label: 'مغلق' },
  { value: 'A_ARCHIVER', label: 'جاهز للأرشفة' },
  { value: 'ARCHIVE', label: 'مؤرشف' },
  { value: 'ANNULE', label: 'ملغى' },
]

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

const typeFauteSeverity = {
  ALTERCATION_TRAVAIL: 'red',
  ABANDON_POSTE: 'red',
  MAUVAISE_CONDUITE_PATIENTS: 'red',
  ABSENCE_NON_JUSTIFIEE: 'amber',
  DEPART_AVANT_HEURE: 'amber',
  NON_RESPECT_COLLEGUES: 'amber',
  NON_RESPECT_ETHIQUE: 'amber',
  RETARD: 'blue',
  NON_RESPECT_PAUSE: 'blue',
  TENUE_PROFESSIONNELLE: 'blue',
}

const faultTextColor = {
  red: 'text-rose-600',
  amber: 'text-amber-600',
  blue: 'text-slate-700',
}

function getFaultDisplay(typeFaute) {
  if (!typeFaute) return { label: null, color: 'text-slate-500' }
  const label = typeFauteArabicLabels[typeFaute.code] || typeFaute.nom || null
  const severity = typeFauteSeverity[typeFaute.code]
  return { label, color: faultTextColor[severity] || 'text-slate-700' }
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ar-MA')
}


export default function DossiersExplicatifsPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const readOnly = isLecteurRH(user)

  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [typesFaute, setTypesFaute] = useState([])
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchDossiers = useCallback(async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) setLoading(true)
      setError(false)
      const response = await fetch('/api/dossiers-explicatifs')
      if (!response.ok) throw new Error('fetch failed')
      const data = await response.json()
      setDossiers(Array.isArray(data) ? data : [])
    } catch {
      setError(true)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDossiers({ showLoading: true })
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
    () => Object.entries(filters).filter(([k, v]) => v !== DEFAULT_FILTERS[k]).length,
    [filters],
  )

  const filteredDossiers = useMemo(() => {
    const norm = filters.search.trim().toLowerCase()
    return dossiers.filter((d) => {
      if (norm && ![d.reference, d.nom_complet, d.matricule].filter(Boolean).some((v) => v.toLowerCase().includes(norm))) return false
      if (filters.service && d.service !== filters.service) return false
      if (filters.hopital && d.professeur?.hopital?.nom !== filters.hopital) return false
      if (filters.typeFauteId && String(d.type_faute?.id) !== filters.typeFauteId) return false
      const s = filters.status
      if (s === 'actifs' && (d.statut === 'ARCHIVE' || d.statut === 'ANNULE')) return false
      if (s === 'a_archiver' && d.statut !== 'A_ARCHIVER') return false
      if (s === 'archives' && d.statut !== 'ARCHIVE') return false
      if (s === 'annules' && d.statut !== 'ANNULE') return false
      if (!['actifs', 'a_archiver', 'archives', 'annules'].includes(s) && d.statut !== s) return false
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

  const activeCount = useMemo(
    () => dossiers.filter((d) => !['ARCHIVE', 'A_ARCHIVER', 'CLOTURE'].includes(d.statut)).length,
    [dossiers],
  )
  const closedCount = useMemo(
    () => dossiers.filter((d) => d.statut === 'CLOTURE').length,
    [dossiers],
  )

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
          <span className="size-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">جاري تحميل الملفات...</p>
        </div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4" dir="rtl">
          <AlertTriangle className="size-10 text-red-400" />
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-slate-800">تعذر تحميل الملفات التوضيحية</p>
            <p className="text-sm text-slate-500">تحقق من اتصالك ثم حاول مجددًا</p>
          </div>
          <Button variant="outline" onClick={() => fetchDossiers({ showLoading: true })}>
            إعادة المحاولة
          </Button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="space-y-5" dir="rtl">

        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 text-right">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">الملفات التوضيحية</h1>
              <p className="text-sm leading-relaxed text-slate-500">تتبع وتدبير الملفات التوضيحية وحالتها</p>
              {dossiers.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 pt-0.5 text-sm">
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <span className="size-2 rounded-full bg-blue-500" />
                    <span className="font-semibold">{activeCount}</span>
                    <span className="text-slate-500">نشط</span>
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="flex items-center gap-1.5 text-green-600">
                    <span className="size-2 rounded-full bg-green-500" />
                    <span className="font-semibold">{closedCount}</span>
                    <span className="text-slate-500">مغلق</span>
                  </span>
                </div>
              )}
            </div>
            {!readOnly && (
              <Button
                type="button"
                className="gap-2 sm:w-auto"
                onClick={() => router.push('/dossiers-explicatifs/nouveau')}
              >
                <Plus className="size-4" />
                إنشاء ملف جديد
              </Button>
            )}
          </div>
        </section>

        {/* Collapsible filter bar */}
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
          statusOptions={STATUS_OPTIONS}
        />

        {/* Results + Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
              <TableHeader className="bg-[#F1F5F9]">
                <TableRow className="border-b border-slate-200 hover:bg-[#F1F5F9]">
                  <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-700">المرجع</TableHead>
                  <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-700">الاسم الكامل</TableHead>
                  <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-700">رقم التأجير</TableHead>
                  <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-700">المصلحة</TableHead>
                  <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-700">نوع المخالفة</TableHead>
                  <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-700">الحالة</TableHead>
                  <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-700">تاريخ المخالفة</TableHead>
                  <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-700">تاريخ الإنشاء</TableHead>
                  <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-700">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDossiers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                        <FolderOpen className="size-10 text-slate-300" strokeWidth={1.5} />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-600">
                            {activeFilterCount > 0
                              ? 'لا توجد نتائج مطابقة للفلاتر المطبقة'
                              : 'لا توجد ملفات توضيحية حاليا'}
                          </p>
                          <p className="text-xs text-slate-600">
                            {activeFilterCount > 0
                              ? 'جرب تعديل معايير البحث'
                              : 'قم بإنشاء ملف جديد للبدء في تتبع المسطرة'}
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
                  paginatedDossiers.map((dossier) => {
                    const { label: faultLabel, color: faultColor } = getFaultDisplay(dossier.type_faute)
                    return (
                      <TableRow key={dossier.id} className="border-b border-slate-100 bg-white hover:bg-[#F8FAFC]">
                        <TableCell className="px-4 py-3 text-right">
                          <span dir="ltr" className="font-mono text-sm text-slate-600">
                            {dossier.reference || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right text-sm text-slate-600">
                          {dossier.nom_complet || '—'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right text-sm text-slate-600">
                          {dossier.matricule || '—'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right text-sm text-slate-600">
                          {dossier.service || '—'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          {faultLabel
                            ? <span className={`text-sm font-medium ${faultColor}`}>{faultLabel}</span>
                            : <span className="text-sm text-slate-400">—</span>
                          }
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <StatusBadge variant={getListStatusColor(dossier.statut)}>
                            {getListStatusLabel(dossier.statut)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right text-sm text-slate-700">
                          {formatDate(dossier.date_faute)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right text-sm text-slate-700">
                          {formatDate(dossier.cree_le)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <Link
                            href={`/dossiers-explicatifs/${dossier.id}`}
                            aria-label="عرض الملف"
                            title="عرض الملف"
                            className="inline-flex size-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          >
                            <Eye className="size-4" aria-hidden="true" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })
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
        </div>

      </div>
    </PageShell>
  )
}
