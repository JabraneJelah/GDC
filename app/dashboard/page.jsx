'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useCurrentUser, isLecteurRH } from '@/components/UserContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Users,
  X,
} from 'lucide-react'

const ITEMS_PER_PAGE = 10

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatBadge({ count, label, color = 'blue' }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[color]}`}>
      <span dir="ltr">{count}</span>
      {label && <span>{label}</span>}
    </span>
  )
}

export default function DashboardPage() {
  const { user } = useCurrentUser()
  const readOnly = isLecteurRH(user)

  const [stats, setStats] = useState(null)
  const [historique, setHistorique] = useState([])
  const [histLoading, setHistLoading] = useState(true)
  const [histOpen, setHistOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [services, setServices] = useState([])
  const [typesConge, setTypesConge] = useState([])
  const [filters, setFilters] = useState({
    service_id: 'all',
    type_conge_id: 'all',
    date_debut: '',
    date_fin: '',
    nom_complet: '',
    ppr: '',
  })

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStats(data) })
      .catch(() => {})

    Promise.all([fetch('/api/services'), fetch('/api/types-conge')])
      .then(async ([sRes, tRes]) => {
        if (sRes.ok) setServices(await sRes.json())
        if (tRes.ok) setTypesConge(await tRes.json())
      })
      .catch(() => {})
  }, [])

  const fetchHistorique = useCallback(async () => {
    setHistLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.service_id !== 'all') params.append('service_id', filters.service_id)
      if (filters.type_conge_id !== 'all') params.append('type_conge_id', filters.type_conge_id)
      if (filters.date_debut) params.append('date_debut', filters.date_debut)
      if (filters.date_fin) params.append('date_fin', filters.date_fin)
      if (filters.nom_complet) params.append('nom_complet', filters.nom_complet)
      if (filters.ppr) params.append('ppr', filters.ppr)
      const res = await fetch(`/api/dashboard/historique-conges${params.toString() ? `?${params}` : ''}`)
      if (res.ok) setHistorique(await res.json())
    } catch {} finally {
      setHistLoading(false)
    }
  }, [filters])

  useEffect(() => {
    if (!histOpen) return
    const id = setTimeout(() => { fetchHistorique(); setCurrentPage(1) }, filters.nom_complet || filters.ppr ? 500 : 0)
    return () => clearTimeout(id)
  }, [filters, fetchHistorique, histOpen])

  const handleOpenHist = () => {
    const opening = !histOpen
    setHistOpen(opening)
    if (opening && historique.length === 0) fetchHistorique()
  }

  const clearFilters = () => {
    setFilters({ service_id: 'all', type_conge_id: 'all', date_debut: '', date_fin: '', nom_complet: '', ppr: '' })
    setCurrentPage(1)
  }

  const hasActiveFilters = Object.entries(filters).some(([k, v]) =>
    k === 'service_id' || k === 'type_conge_id' ? v !== 'all' : v !== ''
  )

  const totalPages = Math.ceil(historique.length / ITEMS_PER_PAGE)
  const paginatedHistorique = historique.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)


  return (
    <div className="space-y-4" dir="rtl">

      {/* Page header */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">لوحة التحكم</h1>
      </div>

      {/* Module cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* الرخص */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <BookOpen className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">الرخص</p>
              {stats && (
                <p className="text-xs text-slate-500">
                  <span dir="ltr">{stats.congesCetteAnnee}</span> رخصة هذه السنة
                </p>
              )}
            </div>
          </div>
          <p className="mb-4 text-sm text-slate-500">تدبير طلبات الرخص وأرصدة الموظفين</p>
          {!readOnly && (
            <div className="mt-auto">
              <Link
                href="/conges"
                className="cursor-pointer inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="size-4" />
                إضافة رخصة
              </Link>
            </div>
          )}
        </div>

        {/* الملفات التوضيحية */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
              <FileText className="size-5 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">الملفات التوضيحية</p>
              {stats && (
                <p className="text-xs text-slate-500">
                  <span dir="ltr">{stats.totalDossiers}</span> ملف إجمالاً
                </p>
              )}
            </div>
          </div>
          <p className="mb-4 text-sm text-slate-500">تتبع المساطر التأديبية ومعالجة الردود</p>
          {stats && stats.dossierEnCours > 0 && (
            <div className="mb-3">
              <StatBadge count={stats.dossierEnCours} label="ملف قيد المعالجة " color="amber" />
            </div>
          )}
          {!readOnly && (
            <div className="mt-auto">
              <Link
                href="/dossiers-explicatifs/nouveau"
                className="cursor-pointer inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              >
                <Plus className="size-4" />
                إضافة ملف
              </Link>
            </div>
          )}
        </div>

        {/* الموظفون */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <Users className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">الموظفون</p>
              {stats && (
                <p className="text-xs text-slate-500">
                  <span dir="ltr">{stats.totalProfesseurs}</span> موظف مسجل
                </p>
              )}
            </div>
          </div>
          <p className="mb-4 text-sm text-slate-500">إدارة بيانات الموظفين </p>
          <div className="mt-auto flex flex-col gap-2">
            <Link
              href="/professeurs"
              className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              تدبير الموظفين
            </Link>
          </div>
        </div>

        {/* الأرشيف */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <Archive className="size-5 text-slate-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">الأرشيف</p>
              {stats && stats.dossierAArchiver > 0 && (
                <p className="text-xs text-slate-500">
                  <span dir="ltr">{stats.dossierAArchiver}</span> ملف جاهز للأرشفة
                </p>
              )}
            </div>
          </div>
          <p className="mb-4 text-sm text-slate-500">الملفات المغلقة الجاهزة للأرشفة</p>
          <div className="mt-auto flex flex-col gap-2">
            <Link
              href="/dossiers-explicatifs/a-archiver"
              className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              الوصول إلى الأرشيف
            </Link>
          </div>
        </div>

      </div>

      {/* Congé history (collapsible) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={handleOpenHist}
          className="flex w-full items-center justify-between px-5 py-4 sm:px-6"
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="size-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-800">سجل الرخص</span>
            {stats && (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-200 px-1.5 text-[11px] font-bold text-slate-700" dir="ltr">
                {stats.totalConges}
              </span>
            )}
          </div>
          {histOpen ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
        </button>

        {histOpen && (
          <div className="border-t border-slate-100">
            {/* Filters */}
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">المصلحة</Label>
                  <Select value={filters.service_id} onValueChange={(v) => setFilters({ ...filters, service_id: v })}>
                    <SelectTrigger className="h-8 rounded-lg border-slate-300 text-right text-xs"><SelectValue placeholder="الكل" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {services.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">نوع الرخصة</Label>
                  <Select value={filters.type_conge_id} onValueChange={(v) => setFilters({ ...filters, type_conge_id: v })}>
                    <SelectTrigger className="h-8 rounded-lg border-slate-300 text-right text-xs"><SelectValue placeholder="الكل" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {typesConge.map((t) => <SelectItem key={t.id} value={t.id.toString()}>{t.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">الاسم الكامل</Label>
                  <Input value={filters.nom_complet} onChange={(e) => setFilters({ ...filters, nom_complet: e.target.value })}
                    placeholder="بحث..." className="h-8 rounded-lg border-slate-300 text-right text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">رقم التأجير</Label>
                  <Input value={filters.ppr} onChange={(e) => setFilters({ ...filters, ppr: e.target.value })}
                    placeholder="PPR..." className="h-8 rounded-lg border-slate-300 text-xs" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">من تاريخ</Label>
                  <Input type="date" value={filters.date_debut} onChange={(e) => setFilters({ ...filters, date_debut: e.target.value })}
                    className="h-8 rounded-lg border-slate-300 text-xs" />
                </div>
                <div className="flex flex-col justify-end space-y-1">
                  <Label className="text-xs text-slate-500">إلى تاريخ</Label>
                  <Input type="date" value={filters.date_fin} onChange={(e) => setFilters({ ...filters, date_fin: e.target.value })}
                    className="h-8 rounded-lg border-slate-300 text-xs" />
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-3 flex justify-start">
                  <button type="button" onClick={clearFilters}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <X className="size-3" />
                    مسح التصفية
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F1F5F9]">
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">الاسم الكامل</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">رقم التأجير</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">الدرجة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">المصلحة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">نوع الرخصة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">الفترة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">المدة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">المعوض</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {histLoading ? (
                    <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">جاري التحميل...</td></tr>
                  ) : historique.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">لا توجد رخص مسجلة</td></tr>
                  ) : (
                    paginatedHistorique.map((conge) => (
                      <tr key={conge.id} className="bg-white transition-colors hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-slate-800">
                            {conge.titre ? `${conge.titre} ` : ''}{conge.prenom} {conge.nom}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-slate-600" dir="ltr">{conge.ppr || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-slate-600">{conge.grade || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-slate-600">{conge.service || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                            {conge.type_conge}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-slate-600" dir="ltr">
                            {formatDate(conge.date_debut)} — {formatDate(conge.date_fin)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-slate-800">{conge.duree_jours} أيام</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-slate-600">
                            {conge.nom_interim && conge.prenom_interim
                              ? `${conge.nom_interim} ${conge.prenom_interim}`
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <span className="text-sm text-slate-500" dir="ltr">
                {historique.length > 0
                  ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, historique.length)} من ${historique.length}`
                  : '0 من 0'}
              </span>
              {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
