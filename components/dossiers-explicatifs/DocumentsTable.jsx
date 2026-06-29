'use client'

import { FileText, Download, CheckCircle2, Clock } from 'lucide-react'

const categoryLabels = {
  procedure_suivante:       'طلب استكمال المسطرة التأديبية',
  lettre_explicative:       'رسالة توضيحية',
  bordereau_notification:   'إشعار / جدول إرسال',
  preuve_notification:      'وصل الاستلام',
  reponse_agent:            'جواب المعني بالأمر',
  correspondance_service:   'مراسلة المصلحة',
}

const originLabels = {
  GENERE:    'مولدة',
  TELEVERSE: 'مرفوعة',
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-MA')
}

function getDocumentName(doc) {
  return doc?.titre || doc?.nom || doc?.identifiant || '—'
}

function isReady(doc) {
  return Boolean(doc?.chemin_fichier && !doc.chemin_fichier.startsWith('pending://'))
}

function downloadUrl(dossierId, docId) {
  return `/api/dossiers-explicatifs/${dossierId}/documents/${docId}/download`
}

function StatusChip({ doc }) {
  if (isReady(doc)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
        <CheckCircle2 className="size-3" />
        جاهز
      </span>
    )
  }
  if (doc?.chemin_fichier?.startsWith('pending://')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
        <Clock className="size-3" />
        في انتظار التوليد
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      غير جاهز
    </span>
  )
}

export function DocumentsTable({ documents = [], dossierId }) {
  if (!documents.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100">
          <FileText className="size-5 text-slate-400" />
        </div>
        <p className="font-medium text-slate-700">لا توجد وثائق مرتبطة حاليا</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">ستظهر الوثائق هنا بعد تنفيذ مراحل المسطرة</p>
      </div>
    )
  }

  const sorted = [...documents].sort((a, b) => new Date(a.cree_le) - new Date(b.cree_le))

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200" dir="rtl">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[1200px] text-right text-sm">
          <thead className="bg-[#F1F5F9]">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">الوثيقة</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">الفئة</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">المصدر</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">تاريخ الإنشاء</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">الحالة</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((doc) => (
              <tr
                key={doc.id}
                className="bg-white transition-colors hover:bg-[#F8FAFC]"
              >
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 rounded bg-slate-100 p-1">
                      <FileText className="size-3 text-slate-400" />
                    </div>
                    <span className="max-w-[200px] truncate font-medium text-slate-800">
                      {getDocumentName(doc)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {categoryLabels[doc.categorie] || doc.categorie || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {originLabels[doc.origine] || doc.origine || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{formatDate(doc.cree_le)}</td>
                <td className="px-4 py-3 text-sm">
                  <StatusChip doc={doc} />
                </td>
                <td className="px-4 py-3 text-sm">
                  {isReady(doc) ? (
                    <a
                      href={downloadUrl(dossierId, doc.id)}
                      className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Download className="size-3" />
                      تحميل
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">غير جاهز</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
