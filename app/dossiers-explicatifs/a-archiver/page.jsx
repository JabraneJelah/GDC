'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle, Archive, ArrowRight, CheckCircle2, FolderOpen } from 'lucide-react'

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ar-MA')
}


export default function AArchiverPage() {
  const router = useRouter()
  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveError, setArchiveError] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  const fetchDossiers = useCallback(async () => {
    try {
      setFetchError(false)
      const res = await fetch('/api/dossiers-explicatifs')
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setDossiers(Array.isArray(data) ? data.filter((d) => d.statut === 'A_ARCHIVER') : [])
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDossiers()
  }, [fetchDossiers])

  useEffect(() => {
    if (!toastMessage) return
    const t = setTimeout(() => setToastMessage(''), 3000)
    return () => clearTimeout(t)
  }, [toastMessage])

  const handleArchive = async () => {
    if (!confirmId || archiveLoading) return
    setArchiveError('')
    setArchiveLoading(true)
    try {
      const res = await fetch(`/api/dossiers-explicatifs/${confirmId}/archive`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'archive failed')
      }
      setDossiers((prev) => prev.filter((d) => d.id !== confirmId))
      setConfirmId(null)
      setToastMessage('تم أرشفة الملف بنجاح')
    } catch (err) {
      setArchiveError(err.message?.includes('deja archive') ? 'هذا الملف مؤرشف مسبقا' : 'تعذر أرشفة الملف، حاول مرة أخرى')
    } finally {
      setArchiveLoading(false)
    }
  }

  const confirmingDossier = dossiers.find((d) => d.id === confirmId)

  return (
    <PageShell>
      <div className="space-y-6" dir="rtl">

        {/* Toast */}
        {toastMessage ? (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-medium text-green-700 shadow-lg">
            <CheckCircle2 className="size-4 shrink-0 text-green-500" />
            {toastMessage}
          </div>
        ) : null}

        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-right">
              <div className="flex items-center gap-2">
                <Archive className="size-5 text-amber-500" />
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">قائمة الأرشفة</h1>
              </div>
              <p className="text-sm text-slate-500">
                الملفات المغلقة في انتظار الأرشفة النهائية
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

        {/* Content */}
        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
            <span className="size-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-amber-500" />
            <p className="text-sm text-slate-500">جاري تحميل القائمة...</p>
          </div>
        ) : fetchError ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
            <AlertTriangle className="size-10 text-red-400" />
            <p className="text-sm text-slate-600">تعذر تحميل القائمة</p>
            <Button variant="outline" onClick={fetchDossiers}>إعادة المحاولة</Button>
          </div>
        ) : (
          <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1200px]">
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-b border-slate-200 hover:bg-slate-50">
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">المرجع</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">الاسم الكامل</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">رقم التأجير</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">المصلحة</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">تاريخ الإغلاق</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-slate-600">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dossiers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="px-5 py-16 text-center">
                          <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                            <FolderOpen className="size-10 text-slate-300" strokeWidth={1.5} />
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-slate-600">لا توجد ملفات في انتظار الأرشفة</p>
                              <p className="text-xs text-slate-400">ستظهر الملفات المغلقة هنا عند جاهزيتها للأرشفة</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      dossiers.map((dossier) => (
                        <TableRow key={dossier.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <TableCell className="px-4 py-3 text-right">
                            <span dir="ltr" className="font-mono text-sm font-bold text-slate-900">
                              {dossier.reference || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                            {dossier.nom_complet || '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm text-slate-600">
                            {dossier.matricule || '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm text-slate-600">
                            {dossier.service || '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm text-slate-500">
                            {formatDate(dossier.date_cloture || dossier.mis_a_jour_le || dossier.cree_le)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/dossiers-explicatifs/${dossier.id}`}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                              >
                                عرض
                              </Link>
                              <button
                                type="button"
                                onClick={() => { setArchiveError(''); setConfirmId(dossier.id) }}
                                className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 shadow-sm transition-colors hover:bg-amber-100"
                              >
                                <Archive className="size-3" />
                                أرشفة
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Archive confirm dialog */}
        <Dialog open={Boolean(confirmId)} onOpenChange={(open) => { if (!open) { setConfirmId(null); setArchiveError('') } }}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-right">تأكيد الأرشفة</DialogTitle>
              <DialogDescription className="text-right">
                سيتم أرشفة الملف نهائيا ولن يظهر في قائمة الملفات النشطة
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-right">
              {confirmingDossier ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">الملف</p>
                  <p className="mt-0.5 font-semibold text-slate-900" dir="ltr">{confirmingDossier.reference}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{confirmingDossier.nom_complet}</p>
                </div>
              ) : null}
              {archiveError ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="size-4 shrink-0" />
                  {archiveError}
                </div>
              ) : null}
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setConfirmId(null); setArchiveError('') }}
                  disabled={archiveLoading}
                  className="w-full sm:w-auto"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  onClick={handleArchive}
                  disabled={archiveLoading}
                  className="w-full bg-amber-600 hover:bg-amber-700 sm:w-auto"
                >
                  {archiveLoading ? 'جاري الأرشفة...' : 'تأكيد الأرشفة'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PageShell>
  )
}
