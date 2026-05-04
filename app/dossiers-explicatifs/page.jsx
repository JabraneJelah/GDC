'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Footer } from '@/components/layout/footer'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DOSSIER_STATUS_LABELS,
  getDossierStatusLabel,
  getStatusColor,
} from '@/frontend/src/lib/dossierStatus'
import { AlertTriangle, FolderOpen, Plus } from 'lucide-react'

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
  red: 'text-rose-400',
  amber: 'text-amber-400',
  blue: 'text-slate-500',
}

function getFaultDisplay(typeFaute) {
  if (!typeFaute) return { label: null, color: 'text-slate-500' }
  const label = typeFauteArabicLabels[typeFaute.code] || typeFaute.nom || null
  const severity = typeFauteSeverity[typeFaute.code]
  return { label, color: faultTextColor[severity] || 'text-slate-700' }
}

const statusBadgeStyles = {
  ENREGISTRE: 'bg-slate-100 text-slate-600',
  DOCUMENTS_INITIAUX_GENERES: 'bg-blue-50 text-blue-600',
  NOTIFIE: 'bg-blue-50 text-blue-600',
  REPONSE_RECUE: 'bg-violet-50 text-violet-600',
  REPONSE_CONVAINCANTE: 'bg-green-50 text-green-600',
  REPONSE_NON_CONVAINCANTE: 'bg-red-50 text-red-500',
  PROCEDURE_SUIVANTE_GENEREE: 'bg-orange-50 text-orange-500',
  CLOTURE: 'bg-green-50 text-green-600',
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ar-MA')
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

export default function DossiersExplicatifsPage() {
  const router = useRouter()
  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchDossiers = async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) setLoading(true)
      setError(false)
      const response = await fetch('/api/dossiers-explicatifs')

      if (!response.ok) {
        throw new Error('Failed to load dossiers')
      }

      const data = await response.json()
      setDossiers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erreur lors du chargement des dossiers explicatifs:', err)
      setError(true)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    fetchDossiers({ showLoading: true })
  }, [])

  const filteredDossiers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return dossiers.filter((dossier) => {
      const matchesSearch =
        !normalizedSearch ||
        [dossier.reference, dossier.nom_complet, dossier.matricule]
          .filter(Boolean)
          .some((value) => value.toString().toLowerCase().includes(normalizedSearch))

      const matchesStatus =
        statusFilter === 'all' || dossier.statut === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [dossiers, search, statusFilter])

  const totalPages = Math.ceil(filteredDossiers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedDossiers = filteredDossiers.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const activeCount = useMemo(() => dossiers.filter((d) => d.statut !== 'CLOTURE').length, [dossiers])
  const closedCount = useMemo(() => dossiers.filter((d) => d.statut === 'CLOTURE').length, [dossiers])

  const handleSearchChange = (event) => {
    setSearch(event.target.value)
    setCurrentPage(1)
  }

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value)
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
      <div className="space-y-6" dir="rtl">

        {/* Header */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 text-right">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                الملفات التوضيحية
              </h1>
              <p className="text-sm leading-relaxed text-slate-500">
                تتبع وتدبير الملفات التوضيحية وحالتها
              </p>
              {dossiers.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 pt-0.5 text-sm">
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <span className="size-2 rounded-full bg-blue-500" />
                    <span className="font-semibold">{activeCount}</span>
                    <span className="text-slate-500">ملف نشط</span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-1.5 text-green-600">
                    <span className="size-2 rounded-full bg-green-500" />
                    <span className="font-semibold">{closedCount}</span>
                    <span className="text-slate-500">مغلق</span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">المجموع: <span className="font-semibold text-slate-700">{dossiers.length}</span></span>
                </div>
              )}
            </div>
            <Button
              type="button"
              className="gap-2 sm:w-auto"
              onClick={() => router.push('/dossiers-explicatifs/nouveau')}
            >
              <Plus className="size-4" />
              إنشاء ملف جديد
            </Button>
          </div>
        </section>

        {/* Filters */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_16rem] sm:items-end">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="dossier-search" className="block text-right text-sm font-medium text-slate-700">
                  البحث
                </Label>
                <Input
                  id="dossier-search"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="البحث بالاسم الكامل أو رقم التأجير أو المرجع"
                  className="h-11 w-full text-right"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="status-filter" className="block text-right text-sm font-medium text-slate-700">
                  الحالة
                </Label>
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger id="status-filter" className="h-11 w-full text-right">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {Object.keys(DOSSIER_STATUS_LABELS).map((status) => (
                      <SelectItem key={status} value={status}>
                        {getDossierStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-200 hover:bg-slate-50">
                    <TableHead className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">المرجع</TableHead>
                    <TableHead className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">الاسم الكامل</TableHead>
                    <TableHead className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">رقم التأجير</TableHead>
                    <TableHead className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">المصلحة</TableHead>
                    <TableHead className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">نوع المخالفة</TableHead>
                    <TableHead className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">الحالة</TableHead>
                    <TableHead className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">تاريخ المخالفة</TableHead>
                    <TableHead className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">تاريخ الإنشاء</TableHead>
                    <TableHead className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDossiers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="px-5 py-16 text-center">
                        <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                          <FolderOpen className="size-10 text-slate-300" strokeWidth={1.5} />
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-600">لا توجد ملفات توضيحية حاليا</p>
                            <p className="text-xs text-slate-400">قم بإنشاء ملف جديد للبدء في تتبع المسطرة</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDossiers.map((dossier) => {
                      const { label: faultLabel, color: faultColor } = getFaultDisplay(dossier.type_faute)
                      const badgeClass = statusBadgeStyles[dossier.statut] || statusBadgeStyles.ENREGISTRE

                      return (
                        <TableRow key={dossier.id} className="border-b border-slate-100 hover:bg-slate-50">

                          <TableCell className="px-5 py-3.5 text-right">
                            <span dir="ltr" className="font-mono text-sm font-semibold text-slate-900">
                              {dossier.reference || '—'}
                            </span>
                          </TableCell>

                          <TableCell className="px-5 py-3.5 text-right text-sm font-medium text-slate-800">
                            {dossier.nom_complet || '—'}
                          </TableCell>

                          <TableCell className="px-5 py-3.5 text-right text-sm text-slate-600">
                            {dossier.matricule || '—'}
                          </TableCell>

                          <TableCell className="px-5 py-3.5 text-right text-sm text-slate-600">
                            {dossier.service || '—'}
                          </TableCell>

                          <TableCell className="px-5 py-3.5 text-right">
                            {faultLabel ? (
                              <span className={`text-sm font-medium ${faultColor}`}>
                                {faultLabel}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </TableCell>

                          <TableCell className="px-5 py-3.5 text-right">
                            <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                              {getDossierStatusLabel(dossier.statut)}
                            </span>
                          </TableCell>

                          <TableCell className="px-5 py-3.5 text-right text-sm text-slate-500">
                            {formatDate(dossier.date_faute)}
                          </TableCell>

                          <TableCell className="px-5 py-3.5 text-right text-sm text-slate-500">
                            {formatDate(dossier.cree_le)}
                          </TableCell>

                          <TableCell className="px-5 py-3.5 text-right">
                            <Link
                              href={`/dossiers-explicatifs/${dossier.id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              عرض
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
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </CardContent>
        </Card>

      </div>
    </PageShell>
  )
}
