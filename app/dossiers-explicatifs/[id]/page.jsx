'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  getDossierStatusLabel,
  getStatusColor,
} from '@/frontend/src/lib/dossierStatus'
import {
  getExtraFieldsForCode,
  getMissingRequiredFields,
  getBlockingMessageForCode,
} from '@/lib/dossiers-explicatifs/extraFields'
import { AppCard } from '@/components/dossiers-explicatifs/AppCard'
import { WorkflowStepper } from '@/components/dossiers-explicatifs/WorkflowStepper'
import { StepActionPanel } from '@/components/dossiers-explicatifs/StepActionPanel'
import { DocumentsTable } from '@/components/dossiers-explicatifs/DocumentsTable'
import { UploadField } from '@/components/dossiers-explicatifs/UploadField'
import {
  Archive,
  ArrowRight,
  Calendar,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Pencil,
} from 'lucide-react'

const statusBadgeStyles = {
  neutral: 'rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700',
  info: 'rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700',
  warning: 'rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700',
  success: 'rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700',
  danger: 'rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700',
}

const editableInputClassName = 'h-11 border-slate-300 bg-white text-right text-slate-900 shadow-sm placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/20'
const selectTriggerClassName = 'h-11 border-slate-300 bg-white text-right text-slate-900 shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500/20'
const fileInputClassName = 'h-11 cursor-pointer border-slate-300 bg-white text-right text-slate-900 shadow-sm file:ml-3 file:rounded-md file:bg-blue-50 file:px-3 file:text-blue-700 hover:border-blue-300 focus-visible:border-blue-500 focus-visible:ring-blue-500/20'
const fieldLabelClassName = 'block text-right text-sm font-medium text-slate-700'

const workflowSteps = [
  { label: 'تسجيل الملف' },
  { label: 'التبليغ' },
  { label: 'الجواب والتقييم' },
  { label: 'المسطرة التأديبية' },
  { label: 'الإغلاق' },
]

const statusStepIndex = {
  ENREGISTRE: 0,
  DOCUMENTS_INITIAUX_GENERES: 1,
  NOTIFIE: 2,
  REPONSE_RECUE: 2,
  REPONSE_CONVAINCANTE: 4,
  REPONSE_NON_CONVAINCANTE: 3,
  PROCEDURE_SUIVANTE_GENEREE: 4,
  CLOTURE: 4,
  A_ARCHIVER: 4,
  ARCHIVE: 4,
}

const procedureLabels = {
  AVERTISSEMENT: 'تنبيه',
  RETENUE: 'اقتطاع',
}

const initialDocumentUsageLabels = {
  LETTRE_EXPLICATIVE: 'رسالة توضيحية',
  BORDEREAU_NOTIFICATION: 'إشعار / جدول إرسال',
}

const notificationProofMimeTypes = ['application/pdf', 'image/jpeg', 'image/png']
const responseDocumentMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

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

const actionConfirmations = {
  REPONSE_RECUE: 'هل أنت متأكد من اعتماد هذا التقييم؟',
  REPONSE_NON_CONVAINCANTE: 'هل أنت متأكد من إنشاء هذه المسطرة؟',
  REPONSE_CONVAINCANTE: 'هل أنت متأكد من إغلاق هذا الملف؟',
  PROCEDURE_SUIVANTE_GENEREE: 'هل أنت متأكد من إغلاق هذا الملف؟',
}



function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('ar-MA')
}

function formatDateTime(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const datePart = date.toLocaleDateString('ar-MA')
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const timePart = `${h}:${m}`
  if (timePart === '00:00') return datePart
  return `${datePart} على الساعة ${timePart}`
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function formatExtraFieldDisplay(field, value) {
  if (!value) return '-'
  if (field.type === 'date') {
    const d = new Date(value + 'T00:00:00')
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('ar-MA')
  }
  return value || '-'
}

function getDocumentName(document) {
  return document?.titre || document?.nom || document?.identifiant || '-'
}

function isDocumentReady(document) {
  return Boolean(document?.chemin_fichier && !document.chemin_fichier.startsWith('pending://'))
}

function getDocumentDownloadUrl(dossierId, documentId) {
  return `/api/dossiers-explicatifs/${dossierId}/documents/${documentId}/download`
}

function getTypeFauteLabel(typeFaute) {
  if (!typeFaute) return null

  return typeFauteArabicLabels[typeFaute.code] || typeFaute.nom || null
}

function RegistrationSummary({ dossier, extraFieldsConfig }) {
  const baseItems = [
    { label: 'المرجع', value: dossier.reference, dir: 'ltr' },
    { label: 'الاسم الكامل', value: dossier.nom_complet },
    { label: 'رقم التأجير', value: dossier.matricule, dir: 'ltr' },
    { label: 'المصلحة', value: dossier.professeur?.service?.nom || dossier.service },
    { label: 'الدرجة', value: dossier.professeur?.grade?.nom || dossier.profil },
    { label: 'نوع المخالفة', value: getTypeFauteLabel(dossier.type_faute) },
    { label: 'تاريخ المخالفة', value: formatDateTime(dossier.date_faute) },
  ]
  const extraItems = (extraFieldsConfig || []).map((field) => ({
    label: field.label,
    value: formatExtraFieldDisplay(field, dossier.donnees_supplementaires?.[field.key]),
  }))
  const items = [...baseItems, ...extraItems]

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <p className="text-sm font-semibold text-slate-800">تم تسجيل الملف بالمعطيات التالية:</p>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-0 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="border-b border-slate-100 py-3 text-right last:border-b-0">
            <dt className="text-sm font-medium text-slate-700">{item.label}</dt>
            <dd className="mt-1 truncate text-sm text-slate-900">
              {item.dir === 'ltr'
                ? <span dir="ltr">{item.value || '-'}</span>
                : (item.value || '-')}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}



function translateApiError(message, status) {
  if (!message) return getContextualActionError(status)

  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('non autorise')) return 'غير مصرح بتنفيذ هذا الإجراء'
  if (normalizedMessage.includes('id invalide')) return 'معرف الملف غير صالح'
  if (normalizedMessage.includes('non trouve')) return 'لم يتم العثور على الملف'
  if (normalizedMessage.includes('obligatoire') || normalizedMessage.includes('invalide')) return 'المرجو ملء الحقول المطلوبة بشكل صحيح'
  if (normalizedMessage.includes('deja cloture')) return 'هذا الملف مغلق مسبقا'
  if (normalizedMessage.includes('deja ete')) return 'تم تنفيذ هذا الإجراء سابقا'
  if (normalizedMessage.includes('ne peut etre cloture')) {
    return 'لا يمكن إغلاق الملف إلا بعد جواب مقنع أو بعد إنشاء طلب استكمال المسطرة التأديبية'
  }
  if (normalizedMessage.includes('ne peut etre')) return 'لا يمكن تنفيذ هذا الإجراء في الحالة الحالية للملف'
  if (normalizedMessage.includes('template') && normalizedMessage.includes('actif')) return 'النموذج المحدد غير نشط'
  if (normalizedMessage.includes('template') && normalizedMessage.includes('correspond')) return 'النموذج المحدد لا يطابق نوع المخالفة'
  if (normalizedMessage.includes('aucun template')) return 'لا يوجد نموذج نشط مرتبط بنفس نوع المخالفة ونوع المسطرة المختارة'
  if (normalizedMessage.includes('erreur serveur')) return 'حدث خطأ في الخادم'

  return getContextualActionError(status)
}

function getContextualActionError(status) {
  if (status === 'DOCUMENTS_INITIAUX_GENERES' || status === 'NOTIFIE') {
    return 'المرجو ملء الحقول المطلوبة'
  }

  if (status === 'REPONSE_RECUE') {
    return 'تعذر تقييم الجواب، المرجو المحاولة مرة أخرى'
  }

  if (status === 'REPONSE_NON_CONVAINCANTE') {
    return 'تعذر إنشاء طلب استكمال المسطرة التأديبية، المرجو التحقق من المعطيات والمحاولة مرة أخرى'
  }

  if (status === 'REPONSE_CONVAINCANTE' || status === 'PROCEDURE_SUIVANTE_GENEREE') {
    return 'تعذر إغلاق الملف، المرجو المحاولة مرة أخرى'
  }

  return 'تعذر تنفيذ الإجراء، المرجو المحاولة مرة أخرى'
}

const ctxBadge = {
  green: 'border-green-200 bg-green-50 text-green-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  slate: 'border-slate-200 bg-slate-100 text-slate-500',
}
const ctxDot = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  slate: 'bg-slate-300',
}

function ContextPanel({ title, statusLabel, statusColor, children }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${ctxBadge[statusColor] || ctxBadge.slate}`}>
          <span className={`size-1.5 rounded-full ${ctxDot[statusColor] || ctxDot.slate}`} />
          {statusLabel}
        </span>
        <p className="text-sm font-bold text-slate-700">{title}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export default function DossierExplicatifDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dossierId = params?.id
  const [dossier, setDossier] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [successModal, setSuccessModal] = useState(null)
  const [notificationDate, setNotificationDate] = useState(getTodayInputValue())
  const [notificationProofFile, setNotificationProofFile] = useState(null)
  const [responseDate, setResponseDate] = useState(getTodayInputValue())
  const [responseProofFile, setResponseProofFile] = useState(null)
  const [responseDecision, setResponseDecision] = useState('CONVAINCANTE')
  const [evaluationComment, setEvaluationComment] = useState('')
  const [procedureType, setProcedureType] = useState('AVERTISSEMENT')
  const [initialConfirmOpen, setInitialConfirmOpen] = useState(false)
  const [procedureConfirmOpen, setProcedureConfirmOpen] = useState(false)
  const [evalConfirmOpen, setEvalConfirmOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveError, setArchiveError] = useState('')
  const [viewedStepIndex, setViewedStepIndex] = useState(0)
  const [notifEditMode, setNotifEditMode] = useState(false)
  const [responseEditMode, setResponseEditMode] = useState(false)
  const [evalEditMode, setEvalEditMode] = useState(false)
  const [procedureLoading, setProcedureLoading] = useState(false)
  const [procedureError, setProcedureError] = useState(null)
  const [errorModal, setErrorModal] = useState(null)
  const [extraFieldsData, setExtraFieldsData] = useState({})
  const [extraFieldsSaving, setExtraFieldsSaving] = useState(false)
  const [extraFieldsError, setExtraFieldsError] = useState('')
  const [extraFieldsSuccess, setExtraFieldsSuccess] = useState(false)
  const [extraFieldsEditMode, setExtraFieldsEditMode] = useState(false)

  const fetchDossier = useCallback(async ({ showLoading = true } = {}) => {
    if (!dossierId) return null

    try {
      if (showLoading) setLoading(true)
      setError('')
      setNotFound(false)

      const response = await fetch(`/api/dossiers-explicatifs/${dossierId}`)

      if (response.status === 404) {
        setNotFound(true)
        setDossier(null)
        return null
      }

      if (!response.ok) {
        throw new Error('Fetch failed')
      }

      const data = await response.json()
      setDossier(data)
      return data
    } catch (fetchError) {
      console.error('Erreur lors du chargement du dossier explicatif:', fetchError)
      setError('تعذر تحميل الملف')
      return null
    } finally {
      setLoading(false)
    }
  }, [dossierId])

  useEffect(() => {
    fetchDossier()
  }, [fetchDossier])

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/document-template')
        if (!response.ok) return

        const data = await response.json()
        setTemplates(Array.isArray(data) ? data.filter((template) => template.actif !== false) : [])
      } catch (templateError) {
        console.error('Erreur lors du chargement des templates:', templateError)
      }
    }

    fetchTemplates()
  }, [])

  const activeInitialTemplates = useMemo(() => {
    if (!dossier?.type_faute_id) return []

    return templates.filter((template) => (
      template.actif !== false &&
      Number(template.type_faute_id) === Number(dossier.type_faute_id) &&
      Object.keys(initialDocumentUsageLabels).includes(template.usage)
    ))
  }, [dossier?.type_faute_id, templates])

  const currentStepIndex = statusStepIndex[dossier?.statut] ?? 0
  const statusColor = getStatusColor(dossier?.statut)
  const statusClassName = statusBadgeStyles[statusColor] || statusBadgeStyles.neutral
  const documents = Array.isArray(dossier?.documents) ? dossier.documents : []
  const notificationProofDocument = documents.find((document) => document.categorie === 'preuve_notification')
  const responseProofDocument = [...documents].reverse().find((document) => document.categorie === 'reponse_agent')
  const procedureDocuments = documents.filter((document) => document.categorie === 'procedure_suivante')
  const canGenerateProcedure = true
  const canRegisterNotification =
    dossier?.statut !== 'DOCUMENTS_INITIAUX_GENERES' ||
    Boolean(notificationProofDocument) ||
    Boolean(notificationProofFile)
  const canRegisterResponse =
    dossier?.statut !== 'NOTIFIE' ||
    Boolean(responseProofDocument) ||
    Boolean(responseProofFile)
  const canRunCurrentAction = canGenerateProcedure && canRegisterNotification && canRegisterResponse

  // Sync viewedStepIndex to currentStepIndex whenever the dossier's step advances
  useEffect(() => {
    setViewedStepIndex(currentStepIndex)
  }, [currentStepIndex])

  // Pre-fill notification date when navigating back to التبليغ step in correction mode
  useEffect(() => {
    if (!dossier) return
    if (viewedStepIndex === 1 && dossier.date_notification) {
      setNotificationDate(new Date(dossier.date_notification).toISOString().slice(0, 10))
    }
  }, [viewedStepIndex, dossier?.id])

  useEffect(() => {
    if (!dossier?.date_reponse_recue) return
    setResponseDate(new Date(dossier.date_reponse_recue).toISOString().slice(0, 10))
  }, [dossier?.date_reponse_recue])

  // Pre-fill evaluation decision when navigating to الجواب والتقييم step
  useEffect(() => {
    if (!dossier) return
    if (viewedStepIndex === 2 && dossier.decision_reponse) {
      setResponseDecision(dossier.decision_reponse)
    }
  }, [viewedStepIndex, dossier?.id])

  // Pre-fill procedure type from saved value so regeneration uses the same type
  useEffect(() => {
    if (dossier?.type_procedure_selectionne) {
      setProcedureType(dossier.type_procedure_selectionne)
    }
  }, [dossier?.type_procedure_selectionne])

  // Sync extra fields form from saved donnees_supplementaires
  useEffect(() => {
    if (!dossier) return
    const saved = dossier.donnees_supplementaires
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      setExtraFieldsData(saved)
    }
    const config = getExtraFieldsForCode(dossier.type_faute?.code)
    const allFilled = config.length > 0 && config.every((f) => saved?.[f.key]?.toString().trim())
    setExtraFieldsEditMode(!allFilled)
  }, [dossier?.id])

  // Auto-dismiss procedure error after 5 s
  useEffect(() => {
    if (!procedureError) return
    const timer = setTimeout(() => setProcedureError(null), 5000)
    return () => clearTimeout(timer)
  }, [procedureError])

  // Clear procedure error when user navigates to a different step
  useEffect(() => {
    setProcedureError(null)
  }, [viewedStepIndex])

  const actionFeedback = actionError ? (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
      <span>{actionError}</span>
    </div>
  ) : null

  const procedureFeedback = procedureError ? (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
      <span>{procedureError}</span>
    </div>
  ) : null

  const handleAction = async ({ skipConfirmation = false } = {}) => {
    if (!dossier || actionLoading) return

    if (!dossierId) {
      setActionError('معرف الملف غير صالح')
      return
    }

    setActionError('')
    setProcedureError(null)
    setSuccessModal(null)

    try {
      let endpoint = ''
      let payload = {}

      if (dossier.statut === 'ENREGISTRE') {
        endpoint = 'generate-initial-documents'
      } else if (dossier.statut === 'DOCUMENTS_INITIAUX_GENERES') {
        if (!notificationDate) throw new Error('notification_date_required')
        if (!notificationProofFile && !notificationProofDocument) throw new Error('notification_proof_required')
        if (notificationProofFile && !notificationProofMimeTypes.includes(notificationProofFile.type)) {
          throw new Error('notification_proof_type_invalid')
        }
        endpoint = 'register-notification'
        payload = new FormData()
        payload.append('date_notification', notificationDate)
        if (notificationProofFile) payload.append('file', notificationProofFile)
      } else if (dossier.statut === 'NOTIFIE') {
        if (!responseDate) throw new Error('response_date_required')
        if (!responseProofFile && !responseProofDocument) throw new Error('response_file_required')
        if (responseProofFile && !responseDocumentMimeTypes.includes(responseProofFile.type)) {
          throw new Error('response_file_type_invalid')
        }
        endpoint = 'register-response'
        payload = new FormData()
        payload.append('date_reponse', responseDate)
        if (responseProofFile) payload.append('file', responseProofFile)
      } else if (dossier.statut === 'REPONSE_RECUE') {
        endpoint = 'evaluate-response'
        payload = { decision_reponse: responseDecision }
        if (evaluationComment.trim()) payload.commentaire = evaluationComment.trim()
      } else if (dossier.statut === 'REPONSE_NON_CONVAINCANTE') {
        if (!procedureType) throw new Error('procedure_type_required')
        endpoint = 'generate-procedure'
        payload = { type_procedure: procedureType }
      } else if (dossier.statut === 'REPONSE_CONVAINCANTE' || dossier.statut === 'PROCEDURE_SUIVANTE_GENEREE') {
        endpoint = 'close-dossier'
      }

      if (!endpoint) return

      if (!skipConfirmation) {
        const confirmationMessage = actionConfirmations[dossier.statut]
        if (confirmationMessage && !window.confirm(confirmationMessage)) return
      }

      setActionLoading(true)

      const isMultipartPayload = payload instanceof FormData
      const response = await fetch(`/api/dossiers-explicatifs/${dossierId}/${endpoint}`, {
        method: 'POST',
        headers: isMultipartPayload ? undefined : { 'Content-Type': 'application/json' },
        body: isMultipartPayload ? payload : JSON.stringify(payload),
      })

      const responseBody = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(responseBody?.error || (dossier.statut === 'REPONSE_NON_CONVAINCANTE' ? 'procedure_generation_failed' : 'Action failed'))
      }

      const prevStatut = dossier.statut
      await fetchDossier({ showLoading: false })
      setInitialConfirmOpen(false)
      setProcedureConfirmOpen(false)
      setNotificationDate(getTodayInputValue())
      setNotificationProofFile(null)
      setResponseDate(getTodayInputValue())
      setResponseProofFile(null)
      setEvaluationComment('')

      if (prevStatut === 'ENREGISTRE') {
        setSuccessModal({ title: 'تم إنشاء الوثائق الأولية', description: 'تم إنشاء وثائق التبليغ بنجاح.', hasNextStep: true })
      } else if (prevStatut === 'DOCUMENTS_INITIAUX_GENERES') {
        setSuccessModal({ title: 'تم تسجيل التبليغ بنجاح', description: 'تم حفظ تاريخ التبليغ ووصل الاستلام.', hasNextStep: true })
      } else if (prevStatut === 'NOTIFIE') {
        setSuccessModal({ title: 'تم تسجيل الجواب بنجاح', description: 'تم حفظ تاريخ التوصل بالجواب والوثيقة المرفقة. يمكنك الآن تقييم الجواب.', hasNextStep: false })
      } else if (prevStatut === 'REPONSE_RECUE') {
        const descr = responseDecision === 'CONVAINCANTE'
          ? 'الجواب مقنع — يمكنك الانتقال إلى مرحلة الإغلاق المباشر.'
          : 'الجواب غير مقنع — يمكنك الانتقال إلى مرحلة المسطرة التأديبية.'
        setSuccessModal({ title: 'تم اعتماد التقييم بنجاح', description: descr, hasNextStep: true })
      } else if (prevStatut === 'REPONSE_NON_CONVAINCANTE') {
        setSuccessModal({ title: 'تم إنشاء طلب استكمال المسطرة التأديبية', description: 'تم توليد الوثيقة. يمكنك الانتقال إلى مرحلة الإغلاق.', hasNextStep: true })
      } else if (prevStatut === 'REPONSE_CONVAINCANTE' || prevStatut === 'PROCEDURE_SUIVANTE_GENEREE') {
        setSuccessModal({ title: 'تم إغلاق الملف بنجاح', description: 'تم إغلاق الملف التأديبي.', hasNextStep: true })
      }
    } catch (actionErrorValue) {
      console.error('Erreur lors de l action du dossier explicatif:', actionErrorValue)
      if (actionErrorValue.message === 'notification_date_required') {
        setActionError('المرجو إدخال تاريخ التبليغ')
      } else if (actionErrorValue.message === 'notification_proof_required') {
        setActionError('المرجو تحميل وصل الاستلام')
      } else if (actionErrorValue.message === 'notification_proof_type_invalid') {
        setActionError('صيغة وصل الاستلام غير مقبولة. الصيغ المقبولة: PDF أو JPG أو PNG')
      } else if (actionErrorValue.message === 'response_date_required') {
        setActionError('المرجو إدخال تاريخ التوصل بالجواب')
      } else if (actionErrorValue.message === 'response_file_required') {
        setActionError('المرجو تحميل وثيقة الجواب')
      } else if (actionErrorValue.message === 'response_file_type_invalid') {
        setActionError('صيغة وثيقة الجواب غير مقبولة. الصيغ المقبولة: PDF أو JPG أو PNG أو DOCX')
      } else if (actionErrorValue.message === 'procedure_type_required') {
        setProcedureError('المرجو اختيار نوع المسطرة')
      } else if (actionErrorValue.message === 'procedure_generation_failed') {
        setProcedureError('تعذر إنشاء طلب استكمال المسطرة التأديبية')
      } else if (dossier.statut === 'REPONSE_NON_CONVAINCANTE') {
        setProcedureError(actionErrorValue.message || 'تعذر إنشاء طلب استكمال المسطرة التأديبية')
      } else {
        setActionError(translateApiError(actionErrorValue.message, dossier.statut))
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveExtraFields = async () => {
    if (!dossier || extraFieldsSaving) return
    setExtraFieldsError('')
    setExtraFieldsSuccess(false)
    setExtraFieldsSaving(true)
    try {
      const res = await fetch(`/api/dossiers-explicatifs/${dossierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donnees_supplementaires: extraFieldsData }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setExtraFieldsError(body?.error || 'تعذر حفظ المعطيات الإضافية')
        return
      }
      await fetchDossier({ showLoading: false })
      setExtraFieldsEditMode(false)
      setExtraFieldsSuccess(true)
      setTimeout(() => setExtraFieldsSuccess(false), 2500)
    } catch {
      setExtraFieldsError('تعذر حفظ المعطيات الإضافية')
    } finally {
      setExtraFieldsSaving(false)
    }
  }

  const handlePrimaryActionClick = () => {
    if (dossier?.statut === 'ENREGISTRE') {
      setActionError('')
      setInitialConfirmOpen(true)
      return
    }

    if (dossier?.statut === 'REPONSE_RECUE') {
      setActionError('')
      setEvalConfirmOpen(true)
      return
    }

    if (dossier?.statut === 'REPONSE_NON_CONVAINCANTE') {
      setActionError('')
      setProcedureConfirmOpen(true)
      return
    }

    handleAction()
  }

  const handleNotificationUpdate = async () => {
    if (!dossier || actionLoading) return
    setActionError('')
    setSuccessModal(null)

    if (!notificationDate) {
      setActionError('المرجو إدخال تاريخ التبليغ')
      return
    }

    if (notificationProofFile && !notificationProofMimeTypes.includes(notificationProofFile.type)) {
      setActionError('صيغة وصل الاستلام غير مقبولة. الصيغ المقبولة: PDF أو JPG أو PNG')
      return
    }

    setActionLoading(true)
    try {
      const payload = new FormData()
      payload.append('date_notification', notificationDate)
      if (notificationProofFile) payload.append('file', notificationProofFile)

      const response = await fetch(`/api/dossiers-explicatifs/${dossierId}/register-notification`, {
        method: 'POST',
        body: payload,
      })

      const responseBody = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(responseBody?.error || 'update failed')
      }

      setNotificationProofFile(null)
      setNotifEditMode(false)
      await fetchDossier({ showLoading: false })
      setSuccessModal({ title: 'تم تحديث التبليغ بنجاح', description: 'تم حفظ التعديلات على بيانات التبليغ.', hasNextStep: false })
    } catch (err) {
      setActionError(translateApiError(err.message, dossier.statut))
    } finally {
      setActionLoading(false)
    }
  }

  const handleResponseUpdate = async () => {
    if (!dossier || actionLoading) return
    setActionError('')
    setSuccessModal(null)

    if (!responseDate) {
      setActionError('المرجو إدخال تاريخ التوصل بالجواب')
      return
    }

    if (!responseProofDocument && !responseProofFile && dossier.statut === 'NOTIFIE') {
      setActionError('المرجو تحميل وثيقة الجواب')
      return
    }

    if (responseProofFile && !responseDocumentMimeTypes.includes(responseProofFile.type)) {
      setActionError('صيغة وثيقة الجواب غير مقبولة. الصيغ المقبولة: PDF أو JPG أو PNG أو DOCX')
      return
    }

    setActionLoading(true)
    try {
      const payload = new FormData()
      payload.append('date_reponse', responseDate)
      if (responseProofFile) payload.append('file', responseProofFile)

      const response = await fetch(`/api/dossiers-explicatifs/${dossierId}/register-response`, {
        method: 'POST',
        body: payload,
      })

      const responseBody = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(responseBody?.error || 'update failed')
      }

      setResponseProofFile(null)
      setResponseEditMode(false)
      await fetchDossier({ showLoading: false })
      setSuccessModal({ title: 'تم تحديث الجواب بنجاح', description: 'تم حفظ التعديلات على بيانات الجواب.', hasNextStep: false })
    } catch (err) {
      setActionError(translateApiError(err.message, dossier.statut))
    } finally {
      setActionLoading(false)
    }
  }

  const handleEvaluationUpdate = async () => {
    if (!dossier || actionLoading) return
    setActionError('')
    setSuccessModal(null)
    setActionLoading(true)

    try {
      const payload = { decision_reponse: responseDecision }
      if (evaluationComment.trim()) payload.commentaire = evaluationComment.trim()

      const response = await fetch(`/api/dossiers-explicatifs/${dossierId}/evaluate-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseBody = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(responseBody?.error || 'update failed')
      }

      setEvalEditMode(false)
      await fetchDossier({ showLoading: false })
      setSuccessModal({ title: 'تم تحديث التقييم بنجاح', description: 'تم حفظ قرار التقييم الجديد.', hasNextStep: false })
    } catch (err) {
      setActionError(translateApiError(err.message, dossier.statut))
    } finally {
      setActionLoading(false)
    }
  }

  const handleGenerateProcedureFromEval = async () => {
    if (!dossier || procedureLoading) return
    setProcedureLoading(true)
    setProcedureError(null)
    setSuccessModal(null)
    setErrorModal(null)

    try {
      const response = await fetch(`/api/dossiers-explicatifs/${dossierId}/generate-procedure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_procedure: procedureType }),
      })

      const responseBody = await response.json().catch(() => null)

      if (!response.ok) {
        const errorMsg = responseBody?.error || ''
        if (errorMsg.includes('لا يوجد نموذج')) {
          setProcedureError('لا يوجد نموذج خاص باستكمال المسطرة التأديبية لهذا النوع من المخالفة. يرجى إضافته من صفحة نماذج الوثائق.')
        } else {
          setProcedureError(errorMsg || 'حدث خطأ أثناء إنشاء طلب المسطرة التأديبية.')
        }
        return
      }

      setProcedureError(null)
      await fetchDossier({ showLoading: false })
      setSuccessModal({
        title: 'تم إنشاء طلب استكمال المسطرة التأديبية',
        description: 'تم توليد الوثيقة وإضافتها إلى الوثائق المرتبطة بالملف.',
        hasNextStep: true,
      })
    } catch {
      setProcedureError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.')
    } finally {
      setProcedureLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!dossierId || archiveLoading) return
    setArchiveError('')
    setArchiveLoading(true)
    try {
      const res = await fetch(`/api/dossiers-explicatifs/${dossierId}/archive`, { method: 'POST' })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'archive failed')
      setArchiveConfirmOpen(false)
      await fetchDossier({ showLoading: false })
      setSuccessModal({ title: 'تم أرشفة الملف بنجاح', description: 'تم أرشفة الملف التأديبي نهائياً.', hasNextStep: false })
    } catch (err) {
      setArchiveError(
        err.message?.includes('deja archive') ? 'هذا الملف مؤرشف مسبقا' : 'تعذر أرشفة الملف، حاول مرة أخرى'
      )
    } finally {
      setArchiveLoading(false)
    }
  }

  // Interactive content for the current active step
  const renderCurrentStepContent = () => {
    if (!dossier) return null

    if (dossier.statut === 'CLOTURE') {
      return (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-5 text-right">
          <CheckCircle2 className="size-6 shrink-0 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">تم إغلاق الملف</p>
            {dossier.date_cloture ? (
              <p className="mt-0.5 text-sm text-green-600">التاريخ: {formatDate(dossier.date_cloture) || '-'}</p>
            ) : null}
          </div>
        </div>
      )
    }

    if (dossier.statut === 'A_ARCHIVER') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-right">
            <Archive className="size-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">في انتظار الأرشفة</p>
              {dossier.date_cloture ? (
                <p className="mt-0.5 text-sm text-amber-600">أُغلق بتاريخ: {formatDate(dossier.date_cloture) || '-'}</p>
              ) : null}
            </div>
          </div>
          {actionFeedback}
          <Button
            type="button"
            onClick={() => { setArchiveError(''); setArchiveConfirmOpen(true) }}
            disabled={archiveLoading}
            className="w-full bg-amber-600 hover:bg-amber-700 sm:w-auto"
          >
            <Archive className="size-4 ml-1.5" />
            {archiveLoading ? 'جاري الأرشفة...' : 'أرشفة الملف'}
          </Button>
        </div>
      )
    }

    if (dossier.statut === 'ARCHIVE') {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-medium text-slate-500">
           وضع القراءة فقط — تمت الأرشفة في {dossier.date_archivage ? formatDate(dossier.date_archivage) : '-'} — لا يمكن تنفيذ أي إجراء على هذا الملف
        </div>
      )
    }

    if (dossier.statut === 'ENREGISTRE') {
      const extraFieldsConfig = getExtraFieldsForCode(dossier.type_faute?.code)
      const missingRequired = getMissingRequiredFields(dossier.type_faute?.code, dossier.donnees_supplementaires)
      const hasAllRequired = missingRequired.length === 0
      const isFinalDossier = ['CLOTURE', 'A_ARCHIVER', 'ARCHIVE'].includes(dossier.statut)
      const extraFieldsBlockingMessage = getBlockingMessageForCode(dossier.type_faute?.code)
        || 'يرجى إكمال المعطيات الإضافية قبل إنشاء الوثائق.'

      return (
        <div className="space-y-4">
          <RegistrationSummary dossier={dossier} extraFieldsConfig={extraFieldsConfig} />

          {extraFieldsConfig.length > 0 && !isFinalDossier && !extraFieldsEditMode && (
            <div className="flex items-center gap-3" dir="rtl">
              <button
                type="button"
                onClick={() => { setExtraFieldsEditMode(true); setExtraFieldsError(''); setExtraFieldsSuccess(false) }}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Pencil className="size-3.5" />
                تعديل معطيات الشهادة الطبية
              </button>
              {extraFieldsSuccess && (
                <span className="text-sm font-medium text-green-700">✓ تم الحفظ بنجاح</span>
              )}
            </div>
          )}

          {extraFieldsConfig.length > 0 && extraFieldsEditMode && (
            <div className="space-y-3" dir="rtl">
              <div className="grid gap-3 sm:grid-cols-2">
                {extraFieldsConfig.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className={fieldLabelClassName}>
                      {field.label}
                      {field.required && <span className="mr-1 text-red-500">*</span>}
                    </Label>
                    <Input
                      type={field.type === 'date' ? 'date' : 'text'}
                      value={extraFieldsData[field.key] || ''}
                      onChange={(e) => {
                        setExtraFieldsData((prev) => ({ ...prev, [field.key]: e.target.value }))
                        setExtraFieldsError('')
                        setExtraFieldsSuccess(false)
                      }}
                      placeholder={field.placeholder}
                      disabled={extraFieldsSaving}
                      className={editableInputClassName}
                    />
                  </div>
                ))}
              </div>
              {extraFieldsError && (
                <p className="text-sm text-red-600">{extraFieldsError}</p>
              )}
              {extraFieldsSuccess && (
                <p className="text-sm font-medium text-green-700">تم حفظ المعطيات الإضافية بنجاح</p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveExtraFields}
                  disabled={extraFieldsSaving}
                  className="cursor-pointer gap-1.5 transition-colors"
                >
                  {extraFieldsSaving ? 'جاري الحفظ...' : 'حفظ المعطيات'}
                </Button>
                {hasAllRequired && (
                  <button
                    type="button"
                    onClick={() => { setExtraFieldsEditMode(false); setExtraFieldsError('') }}
                    className="cursor-pointer inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </div>
          )}


          {actionFeedback}
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-start">
            <Button
              type="button"
              onClick={() => handleAction({ skipConfirmation: true })}
              disabled={actionLoading || activeInitialTemplates.length === 0 || !hasAllRequired}
              className="w-full gap-2 sm:w-auto"
            >
              <FileText className="size-4" />
              {actionLoading ? 'جاري إنشاء الوثائق...' : 'إنشاء الوثائق الأولية'}
            </Button>
            {activeInitialTemplates.length === 0 ? (
              <p className="text-xs text-amber-700">
                لا توجد نماذج نشطة مرتبطة بهذا النوع لإنشاء الوثائق الأولية
              </p>
            ) : !hasAllRequired ? (
              <p className="text-xs text-amber-700">
                {extraFieldsBlockingMessage}
              </p>
            ) : null}
          </div>
        </div>
      )
    }

    if (dossier.statut === 'REPONSE_NON_CONVAINCANTE') {
      return (
        <div className="space-y-4">
          <div className="max-w-xs space-y-2">
            <Label className={fieldLabelClassName}>نوع المسطرة</Label>
            <Select
              value={procedureType}
              onValueChange={(value) => {
                setProcedureType(value)
                setProcedureError(null)
              }}
              disabled={actionLoading}
            >
              <SelectTrigger className={selectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AVERTISSEMENT">{procedureLabels.AVERTISSEMENT}</SelectItem>
                <SelectItem value="RETENUE">{procedureLabels.RETENUE}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {procedureFeedback}
          <Button
            type="button"
            onClick={handlePrimaryActionClick}
            disabled={actionLoading}
            className="w-full sm:w-auto"
          >
            {actionLoading ? 'جاري الإنشاء...' : 'إنشاء طلب استكمال المسطرة التأديبية'}
          </Button>
        </div>
      )
    }

    if (dossier.statut === 'REPONSE_CONVAINCANTE' || dossier.statut === 'PROCEDURE_SUIVANTE_GENEREE') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-right text-sm text-amber-800">
            سيطلب منك تأكيد إغلاق الملف قبل تنفيذ العملية
          </div>
          {actionFeedback}
          <Button
            type="button"
            onClick={handlePrimaryActionClick}
            disabled={actionLoading || !canRunCurrentAction}
            className="w-full sm:w-auto"
          >
            {actionLoading ? 'جاري التنفيذ...' : 'إغلاق الملف'}
          </Button>
        </div>
      )
    }

    return null
  }

  // Read-only content for completed steps
  const renderCompletedStepContent = (stepIndex) => {
    if (!dossier) return null

    switch (stepIndex) {
      case 0:
        return (
          <RegistrationSummary dossier={dossier} extraFieldsConfig={getExtraFieldsForCode(dossier.type_faute?.code)} />
        )

      case 1:
        return (
          <div className="space-y-3">
            {dossier.date_notification ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <div className="shrink-0 rounded-lg bg-white p-2 shadow-sm">
                  <Calendar className="size-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">تاريخ التبليغ</p>
                  <p className="mt-0.5 text-sm text-slate-900">{formatDate(dossier.date_notification)}</p>
                </div>
              </div>
            ) : null}
            {notificationProofDocument ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <FileText className="size-4 shrink-0 text-slate-500" />
                <span className="flex-1 truncate text-sm font-medium text-slate-700">{getDocumentName(notificationProofDocument)}</span>
                {isDocumentReady(notificationProofDocument) ? (
                  <a href={getDocumentDownloadUrl(dossier.id, notificationProofDocument.id)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                    <Download className="size-3" />
                    تحميل
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-600">لا يوجد وصل استلام مرفوع</p>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              {dossier.date_reponse_recue ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                  <div className="shrink-0 rounded-lg bg-white p-2 shadow-sm">
                    <Calendar className="size-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">تاريخ التوصل بالجواب</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{formatDate(dossier.date_reponse_recue)}</p>
                  </div>
                </div>
              ) : null}
              {responseProofDocument ? (
                <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                  <FileText className="size-4 shrink-0 text-slate-500" />
                  <span className="flex-1 truncate text-sm font-medium text-slate-700">{getDocumentName(responseProofDocument)}</span>
                  {isDocumentReady(responseProofDocument) ? (
                    <a href={getDocumentDownloadUrl(dossier.id, responseProofDocument.id)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                      <Download className="size-3" />
                      تحميل
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-600">لا يوجد وثيقة جواب مرفوعة</p>
              )}
            </div>
            {dossier.decision_reponse ? (
              <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-right ${dossier.decision_reponse === 'CONVAINCANTE'
                ? 'border-green-200 bg-green-50'
                : 'border-amber-200 bg-amber-50'
                }`}>
                {dossier.decision_reponse === 'CONVAINCANTE'
                  ? <CheckCircle2 className="size-5 shrink-0 text-green-600" />
                  : <AlertTriangle className="size-5 shrink-0 text-amber-600" />
                }
                <div>
                  <p className="text-xs text-slate-500">قرار التقييم</p>
                  <p className={`mt-0.5 text-sm font-bold ${dossier.decision_reponse === 'CONVAINCANTE' ? 'text-green-800' : 'text-amber-800'
                    }`}>
                    {dossier.decision_reponse === 'CONVAINCANTE' ? 'الجواب مقنع' : 'الجواب غير مقنع'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )

      case 3: {
        const isFinalState = ['CLOTURE', 'A_ARCHIVER', 'ARCHIVE'].includes(dossier.statut)
        const procedureDoc = procedureDocuments[0] || null

        if (!procedureDoc) {
          return <p className="text-sm text-slate-600">لم يتم إنشاء وثيقة المسطرة التأديبية</p>
        }

        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-600">طلب استكمال المسطرة التأديبية</p>
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <FileText className="size-4 shrink-0 text-slate-500" />
                <span className="flex-1 truncate text-sm font-medium text-slate-700">{getDocumentName(procedureDoc)}</span>
                {isDocumentReady(procedureDoc) ? (
                  <a href={getDocumentDownloadUrl(dossier.id, procedureDoc.id)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                    <Download className="size-3" />
                    تحميل
                  </a>
                ) : null}
              </div>
            </div>
            {!isFinalState ? (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[160px] flex-1 max-w-xs space-y-1.5">
                    <p className="text-sm font-medium text-slate-600">نوع المسطرة</p>
                    <Select value={procedureType} onValueChange={(v) => { setProcedureType(v); setProcedureError(null) }} disabled={procedureLoading}>
                      <SelectTrigger className={selectTriggerClassName}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVERTISSEMENT">{procedureLabels.AVERTISSEMENT}</SelectItem>
                        <SelectItem value="RETENUE">{procedureLabels.RETENUE}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateProcedureFromEval}
                    disabled={procedureLoading}
                    className="sm:w-auto"
                  >
                    {procedureLoading ? 'جاري إعادة التوليد...' : 'إعادة توليد طلب استكمال المسطرة التأديبية'}
                  </Button>
                </div>
                {procedureFeedback}
              </div>
            ) : null}
          </div>
        )
      }

      case 4: {
        if (dossier.statut === 'ARCHIVE') {
          return (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-5 text-right">
              <Archive className="size-6 shrink-0 text-slate-500" />
              <div>
                <p className="font-semibold text-slate-700">مؤرشف</p>
                {dossier.date_archivage ? (
                  <p className="mt-0.5 text-sm text-slate-500">تاريخ الأرشفة: {formatDate(dossier.date_archivage) || '-'}</p>
                ) : null}
              </div>
            </div>
          )
        }
        if (dossier.statut === 'A_ARCHIVER') {
          return (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-5 text-right">
              <Archive className="size-6 shrink-0 text-amber-500" />
              <div>
                <p className="font-semibold text-amber-800">في انتظار الأرشفة</p>
                {dossier.date_cloture ? (
                  <p className="mt-0.5 text-sm text-amber-600">أُغلق بتاريخ: {formatDate(dossier.date_cloture) || '-'}</p>
                ) : null}
              </div>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-5 text-right">
            <CheckCircle2 className="size-6 shrink-0 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">تم إغلاق الملف</p>
              {dossier.date_cloture ? (
                <p className="mt-0.5 text-sm text-green-600">التاريخ: {formatDate(dossier.date_cloture) || '-'}</p>
              ) : null}
            </div>
          </div>
        )
      }

      default:
        return null
    }
  }

  // Secondary context panel for each viewed step (steps 3-5 only)
  const renderStepContext = (stepIndex) => {
    if (!dossier) return null

    const docRow = (doc) => (
      <div key={doc.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <FileText className="size-3.5 shrink-0 text-slate-400" />
        <span className="flex-1 truncate text-sm text-slate-700">{getDocumentName(doc)}</span>
        {isDocumentReady(doc) ? (
          <a
            href={getDocumentDownloadUrl(dossier.id, doc.id)}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            <Download className="size-3" />
            تحميل
          </a>
        ) : null}
      </div>
    )

    switch (stepIndex) {
      case 0:
      case 1:
      case 2:
        return null

      case 3:
        return null

      case 4: {
        if (dossier.statut === 'CLOTURE') {
          return (
            <ContextPanel title="الأرشفة" statusColor="slate" statusLabel="في الانتظار">
              <p className="text-sm text-slate-500">الملف مغلق — يمكن أرشفته عند الجاهزية</p>
            </ContextPanel>
          )
        }
        return null
      }

      default:
        return null
    }
  }

  // التبليغ step: display mode by default, switches to edit mode via pencil icon
  const renderNotificationStep = () => {
    if (!dossier) return null

    const isFinal = ['CLOTURE', 'A_ARCHIVER', 'ARCHIVE'].includes(dossier.statut)
    const hasData = Boolean(dossier.date_notification)
    const isFirstReg = dossier.statut === 'DOCUMENTS_INITIAUX_GENERES'
    const canEdit = hasData && !isFinal
    const showForm = isFirstReg || notifEditMode

    if (!showForm && hasData) {
      return (
        <div dir="rtl">
          <div className="flex items-start justify-between gap-4">
            <dl className="grid flex-1 grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-700">تاريخ التبليغ</dt>
                <dd className="mt-1 truncate text-sm text-slate-900 text-right font-medium">{formatDate(dossier.date_notification) || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-700
">وصل الاستلام</dt>
                <dd className="mt-0.5 flex items-center gap-2 text-sm">
                  {notificationProofDocument ? (
                    <>
                      <FileText className="size-3.5 shrink-0 text-slate-400" />
                      <span className="max-w-[180px] mt-1 truncate text-sm text-slate-900 text-right font-medium">{getDocumentName(notificationProofDocument)}</span>
                      {isDocumentReady(notificationProofDocument) ? (
                        <a href={getDocumentDownloadUrl(dossier.id, notificationProofDocument.id)} className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800">
                          تحميل
                        </a>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-slate-500">لا يوجد وصل مرفوع</span>
                  )}
                </dd>
              </div>
            </dl>
            {canEdit ? (
              <button
                type="button"
                onClick={() => setNotifEditMode(true)}
                title="تعديل التبليغ"
                className="flex cursor-pointer shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <Pencil className="size-3.5" />
                تعديل
              </button>
            ) : null}
          </div>
          {actionFeedback}
        </div>
      )
    }

    return (
      <div className="max-w-xl space-y-5" dir="rtl">
        <div className="space-y-2">
          <Label htmlFor="notif_date" className={fieldLabelClassName}>تاريخ التبليغ</Label>
          <Input
            id="notif_date"
            type="date"
            value={notificationDate}
            onChange={(event) => { setNotificationDate(event.target.value); setActionError('') }}
            className={editableInputClassName}
            disabled={actionLoading}
          />
        </div>
        <UploadField
          id="notif_proof"
          label={notifEditMode ? 'وصل الاستلام (اختياري للتحديث)' : 'وصل الاستلام'}
          accept="application/pdf,image/jpeg,image/png"
          selectedFile={notificationProofFile}
          onChange={(event) => { setNotificationProofFile(event.target.files?.[0] || null); setActionError('') }}
          helperText={notifEditMode ? 'اترك فارغاً للإبقاء على الملف الحالي' : 'PDF أو JPG أو PNG'}
          disabled={actionLoading}
        />
        {notifEditMode && notificationProofDocument ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <FileText className="size-4 shrink-0 text-slate-400" />
            <span className="flex-1 truncate text-sm text-slate-600">{getDocumentName(notificationProofDocument)}</span>
            {isDocumentReady(notificationProofDocument) ? (
              <a href={getDocumentDownloadUrl(dossier.id, notificationProofDocument.id)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                <Download className="size-3" />
                تحميل
              </a>
            ) : null}
          </div>
        ) : null}
        {actionFeedback}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={notifEditMode ? handleNotificationUpdate : handlePrimaryActionClick}
            disabled={actionLoading || (!notifEditMode && !canRunCurrentAction)}
            className="sm:w-auto"
          >
            {actionLoading ? 'جاري الحفظ...' : notifEditMode ? 'تحديث التبليغ' : 'تسجيل التبليغ'}
          </Button>
          {notifEditMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => { setNotifEditMode(false); setActionError(''); setSuccessModal(null) }}
              disabled={actionLoading}
              className="sm:w-auto"
            >
              إلغاء
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  // الجواب والتقييم combined step
  const renderResponseAndEvaluationStep = () => {
    if (!dossier) return null

    const isFinal = ['CLOTURE', 'A_ARCHIVER', 'ARCHIVE'].includes(dossier.statut)
    const hasResponseData = Boolean(dossier.date_reponse_recue)
    const isFirstResponseReg = dossier.statut === 'NOTIFIE'
    const responseEditableStatuses = ['NOTIFIE', 'REPONSE_RECUE', 'REPONSE_CONVAINCANTE', 'REPONSE_NON_CONVAINCANTE', 'PROCEDURE_SUIVANTE_GENEREE']
    const canEditResponse = hasResponseData && !isFinal && responseEditableStatuses.includes(dossier.statut)
    const isResponseLocked = !hasResponseData && !isFirstResponseReg
    const showResponseForm = isFirstResponseReg || responseEditMode

    const evalAllowedStatuses = ['REPONSE_RECUE', 'REPONSE_CONVAINCANTE', 'REPONSE_NON_CONVAINCANTE', 'PROCEDURE_SUIVANTE_GENEREE']
    const hasEvalData = Boolean(dossier.decision_reponse)
    const evalReady = hasResponseData && Boolean(responseProofDocument)
    const canEval = evalReady && evalAllowedStatuses.includes(dossier.statut) && !isFinal
    const canEditEval = hasEvalData && !isFinal && evalAllowedStatuses.includes(dossier.statut)
    const showEvalForm = canEval && (!hasEvalData || evalEditMode)

    const block = 'overflow-hidden rounded-xl border border-slate-200 bg-white'
    const blockHeader = 'flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5'
    const blockBody = 'px-5 py-4'
    const blockSubtitle = 'mt-0.5 text-xs text-slate-500'
    const metaLabel = 'text-sm font-medium text-slate-600'
    const metaValue = 'mt-1 truncate text-sm font-semibold text-slate-950 text-right'
    const editBtn = 'flex cursor-pointer shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900'

    return (
      <div className="space-y-3" dir="rtl">

        {/* ═══ Block 1: الجواب ═══ */}
        <div className={block}>
          <div className={blockHeader}>
            <div>
              <p className="text-sm font-semibold text-slate-900">الجواب</p>
              <p className={blockSubtitle}>
                {isResponseLocked
                  ? 'في انتظار تسجيل التبليغ'
                  : showResponseForm
                    ? (responseEditMode ? 'تعديل بيانات الجواب المسجل' : 'سجّل تاريخ التوصل والوثيقة المرفقة')
                    : 'معلومات الجواب المرفوع من طرف المعني بالأمر'}
              </p>
            </div>
            {!showResponseForm && !showEvalForm ? (
              <div className="flex shrink-0 items-center gap-2">
                {canEditResponse ? (
                  <button type="button" onClick={() => setResponseEditMode(true)} className={editBtn}>
                    <Pencil className="size-3.5" />
                    تعديل الجواب
                  </button>
                ) : null}
                {canEditEval && hasEvalData ? (
                  <button type="button" onClick={() => setEvalEditMode(true)} className={editBtn}>
                    <Pencil className="size-3.5" />
                    تعديل النتيجة
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className={blockBody}>
            {isResponseLocked ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Lock className="size-4 shrink-0" />
                <span>تُكمل بعد تسجيل التبليغ</span>
              </div>
            ) : !showResponseForm && hasResponseData ? (
              <div>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
                  <div>
                    <dt className={metaLabel}>تاريخ التوصل بالجواب</dt>
                    <dd className={metaValue}>{formatDate(dossier.date_reponse_recue) || '—'}</dd>
                  </div>
                  <div>
                    <dt className={metaLabel}>وثيقة الجواب</dt>
                    <dd className="mt-0.5 flex items-center gap-2">
                      {responseProofDocument ? (
                        <>
                          <FileText className="size-3.5 shrink-0 text-slate-400" />
                          <span className="max-w-[220px] truncate text-sm text-slate-900 text-right font-medium">{getDocumentName(responseProofDocument)}</span>
                          {isDocumentReady(responseProofDocument) ? (
                            <a href={getDocumentDownloadUrl(dossier.id, responseProofDocument.id)} className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800">
                              تحميل
                            </a>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-sm text-slate-500">لا يوجد وثيقة مرفوعة</span>
                      )}
                    </dd>
                  </div>
                </dl>
                {hasEvalData ? (
                  <div className="mt-3.5 border-t border-slate-100 pt-3.5">
                    <dt className={metaLabel}>نتيجة الجواب</dt>
                    <dd className={metaValue}>{dossier.decision_reponse === 'CONVAINCANTE' ? 'الجواب مقنع' : 'الجواب غير مقنع'}</dd>
                  </div>
                ) : null}
                {actionFeedback}
              </div>
            ) : (
              <div className="max-w-lg space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="resp_date" className={fieldLabelClassName}>تاريخ التوصل بالجواب</Label>
                  <Input
                    id="resp_date"
                    type="date"
                    value={responseDate}
                    onChange={(event) => { setResponseDate(event.target.value); setActionError('') }}
                    className={editableInputClassName}
                    disabled={actionLoading}
                  />
                </div>
                <UploadField
                  id="resp_doc"
                  label={responseEditMode ? 'وثيقة الجواب (اختيارية للتحديث)' : 'وثيقة الجواب'}
                  accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                  selectedFile={responseProofFile}
                  onChange={(event) => { setResponseProofFile(event.target.files?.[0] || null); setActionError('') }}
                  helperText={responseEditMode ? 'اترك فارغاً للإبقاء على الملف الحالي' : 'PDF أو JPG أو PNG أو DOCX'}
                  disabled={actionLoading}
                />
                {responseEditMode && responseProofDocument ? (
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <FileText className="size-4 shrink-0 text-slate-400" />
                    <span className="flex-1 truncate text-sm text-slate-600">{getDocumentName(responseProofDocument)}</span>
                    {isDocumentReady(responseProofDocument) ? (
                      <a href={getDocumentDownloadUrl(dossier.id, responseProofDocument.id)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                        <Download className="size-3" />
                        تحميل
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {actionFeedback}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={responseEditMode ? handleResponseUpdate : handlePrimaryActionClick}
                    disabled={actionLoading || (!responseEditMode && !canRunCurrentAction)}
                    className="sm:w-auto"
                  >
                    {actionLoading ? 'جاري الحفظ...' : responseEditMode ? 'تحديث الجواب' : 'تسجيل الجواب'}
                  </Button>
                  {responseEditMode ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setResponseEditMode(false); setActionError(''); setSuccessModal(null) }}
                      disabled={actionLoading}
                      className="sm:w-auto"
                    >
                      إلغاء
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ Block 2: التقييم — form only, display merged into Block 1 ═══ */}
        {showEvalForm ? (
          <div className={block}>
            <div className={blockHeader}>
              <div>
                <p className="text-sm font-semibold text-slate-900">التقييم</p>
                <p className={blockSubtitle}>
                  {evalEditMode ? 'تعديل قرار التقييم المسجل' : 'حدد نتيجة فحص جواب المعني بالأمر'}
                </p>
              </div>
            </div>
            <div className={blockBody}>
              <div className="max-w-lg space-y-4">
                <div className="space-y-1.5">
                  <Label className={fieldLabelClassName}>نتيجة التقييم</Label>
                  <Select
                    value={responseDecision}
                    onValueChange={(value) => { setResponseDecision(value); setActionError('') }}
                    disabled={actionLoading}
                  >
                    <SelectTrigger className={selectTriggerClassName}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONVAINCANTE">الجواب مقنع</SelectItem>
                      <SelectItem value="NON_CONVAINCANTE">الجواب غير مقنع</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {actionFeedback}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={evalEditMode ? handleEvaluationUpdate : handlePrimaryActionClick}
                    disabled={actionLoading}
                    className="sm:w-auto"
                  >
                    {actionLoading ? 'جاري الحفظ...' : evalEditMode ? 'تحديث التقييم' : 'اعتماد التقييم'}
                  </Button>
                  {evalEditMode ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setEvalEditMode(false); setActionError(''); setSuccessModal(null) }}
                      disabled={actionLoading}
                      className="sm:w-auto"
                    >
                      إلغاء
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ═══ Block 3: الإجراء التالي — only when procedure not yet generated ═══ */}
        {!showEvalForm && hasEvalData && dossier.decision_reponse === 'NON_CONVAINCANTE' && !isFinal && procedureDocuments.length === 0 ? (
          <div className={block}>
            <div className={blockHeader}>
              <div>
                <p className="text-sm font-semibold text-slate-900">الإجراء التالي</p>
                <p className={blockSubtitle}>إنشاء طلب استكمال المسطرة التأديبية حسب نوع المخالفة</p>
              </div>
            </div>
            <div className={blockBody}>
              <div className="max-w-sm space-y-4">
                <div className="space-y-1.5">
                  <Label className={fieldLabelClassName}>نوع المسطرة</Label>
                  <Select
                    value={procedureType}
                    onValueChange={(v) => { setProcedureType(v); setProcedureError(null) }}
                    disabled={procedureLoading}
                  >
                    <SelectTrigger className={selectTriggerClassName}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVERTISSEMENT">{procedureLabels.AVERTISSEMENT}</SelectItem>
                      <SelectItem value="RETENUE">{procedureLabels.RETENUE}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {procedureFeedback}
                <Button
                  type="button"
                  onClick={handleGenerateProcedureFromEval}
                  disabled={procedureLoading}
                  className="w-full transition-colors sm:w-auto"
                >
                  {procedureLoading ? 'جاري الإنشاء...' : 'إنشاء طلب استكمال المسطرة التأديبية'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

      </div>
    )
  }

  // Combined step panel: primary content + optional secondary context in two columns
  const renderViewedStepContent = () => {
    if (!dossier) return null

    if (viewedStepIndex === 1) return renderNotificationStep()
    if (viewedStepIndex === 2) return renderResponseAndEvaluationStep()

    const isCurrentStep = viewedStepIndex === currentStepIndex
    const primary = isCurrentStep ? renderCurrentStepContent() : renderCompletedStepContent(viewedStepIndex)
    const secondary = renderStepContext(viewedStepIndex)

    if (!secondary) return primary

    return (
      <div className="grid gap-5 xl:grid-cols-2">
        <div>{primary}</div>
        {secondary}
      </div>
    )
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] items-center justify-center text-slate-600" dir="rtl">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            <span className="text-sm">جاري تحميل الملف...</span>
          </div>
        </div>
      </PageShell>
    )
  }

  if (notFound) {
    return (
      <PageShell>
        <div className="space-y-4 text-right" dir="rtl">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            لم يتم العثور على الملف
          </p>
          <Button variant="outline" onClick={() => router.push('/dossiers-explicatifs')}>
            رجوع
          </Button>
        </div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <div className="space-y-4 text-right" dir="rtl">
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
          <Button variant="outline" onClick={() => router.push('/dossiers-explicatifs')}>
            رجوع
          </Button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <meta charSet="UTF-8" />
      <div className="space-y-6" dir="rtl">

        {/* Header — identity + badges */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {/* Top row: label / badges / back button */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">الملف التأديبي</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <span dir="ltr">{dossier.reference}</span>
                </span>
                <Badge className={statusClassName}>
                  {getDossierStatusLabel(dossier.statut)}
                </Badge>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-2 border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
              onClick={() => router.push('/dossiers-explicatifs')}
            >
              <ArrowRight className="size-4" />
              رجوع
            </Button>
          </div>

          {/* Identity grid */}
          <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-slate-600">الاسم الكامل</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-950">{dossier.nom_complet || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">رقم التأجير</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-950"><span dir="ltr">{dossier.matricule || '—'}</span></p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">المصلحة</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-950">{dossier.professeur?.service?.nom || dossier.service || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">الدرجة</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-950">{dossier.professeur?.grade?.nom || dossier.profil || '—'}</p>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <AppCard title="مسار معالجة الملف">
          <div className="space-y-5">
            <WorkflowStepper
              steps={workflowSteps}
              currentStepIndex={currentStepIndex}
              viewedStepIndex={viewedStepIndex}
              onStepClick={setViewedStepIndex}
            />
            <StepActionPanel
              title={workflowSteps[viewedStepIndex]?.label || 'مسار الملف'}
              isCurrentStep={viewedStepIndex === currentStepIndex}
              onReturnToCurrent={() => setViewedStepIndex(currentStepIndex)}
            >
              <div key={viewedStepIndex} className="transition-opacity duration-150">
                {renderViewedStepContent()}
              </div>
            </StepActionPanel>
          </div>
        </AppCard>

        {/* Documents Table */}
        <AppCard title="الوثائق المرتبطة بالملف" icon={FileText}>
          <DocumentsTable documents={documents} dossierId={dossier.id} />
        </AppCard>

        {/* Initial documents dialog */}
        <Dialog open={initialConfirmOpen} onOpenChange={setInitialConfirmOpen}>
          <DialogContent className="max-w-xl" dir="rtl">
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle className="text-right">تأكيد إنشاء الوثائق الأولية</DialogTitle>
              <DialogDescription className="text-right">
                سيتم إنشاء الوثائق اعتمادا على النماذج المرتبطة بنفس نوع المخالفة
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-right">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-600">نوع المخالفة</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-950">{getTypeFauteLabel(dossier.type_faute) || '-'}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">النماذج التي سيتم إنشاؤها</p>
                {activeInitialTemplates.length > 0 ? (
                  <div className="space-y-2">
                    {activeInitialTemplates.map((template) => (
                      <div key={template.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <p className="text-sm font-semibold text-slate-800">
                          {initialDocumentUsageLabels[template.usage] || template.nom}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{template.nom}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    لا توجد نماذج نشطة مرتبطة بنفس نوع المخالفة لإنشاء الوثائق الأولية
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInitialConfirmOpen(false)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  onClick={() => handleAction({ skipConfirmation: true })}
                  disabled={actionLoading || activeInitialTemplates.length === 0}
                  className="w-full sm:w-auto"
                >
                  {actionLoading ? 'جاري إنشاء الوثائق...' : 'إنشاء الوثائق'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Procedure dialog */}
        <Dialog open={procedureConfirmOpen} onOpenChange={setProcedureConfirmOpen}>
          <DialogContent className="max-w-xl" dir="rtl">
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle className="text-right">تأكيد إنشاء طلب المسطرة التأديبية</DialogTitle>
              <DialogDescription className="text-right">
                سيتم إنشاء طلب استكمال المسطرة التأديبية اعتمادًا على نموذج نوع المخالفة
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-right">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-medium text-slate-500">نوع المسطرة</dt>
                    <dd className="font-semibold text-slate-800">{procedureLabels[procedureType] || '-'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-medium text-slate-500">نوع المخالفة</dt>
                    <dd className="max-w-[220px] text-left font-semibold text-slate-800">{getTypeFauteLabel(dossier.type_faute) || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProcedureConfirmOpen(false)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  onClick={() => handleAction({ skipConfirmation: true })}
                  disabled={actionLoading}
                  className="w-full sm:w-auto"
                >
                  {actionLoading ? 'جاري الإنشاء...' : 'إنشاء طلب المسطرة'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Evaluation confirmation dialog */}
        <Dialog open={evalConfirmOpen} onOpenChange={(open) => { if (!actionLoading) setEvalConfirmOpen(open) }}>
          <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-right text-lg font-bold text-slate-900">اعتماد التقييم</DialogTitle>
              <DialogDescription className="text-right text-sm text-slate-600">
                هل أنت متأكد من اعتماد نتيجة التقييم؟
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-start">
              <button
                type="button"
                onClick={() => setEvalConfirmOpen(false)}
                disabled={actionLoading}
                className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setEvalConfirmOpen(false)
                  handleAction({ skipConfirmation: true })
                }}
                disabled={actionLoading}
                className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {actionLoading ? 'جاري الحفظ...' : 'اعتماد التقييم'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success feedback modal */}
        <Dialog open={Boolean(successModal)} onOpenChange={(open) => { if (!open) setSuccessModal(null) }}>
          <DialogContent className="max-w-md" dir="rtl" showCloseButton={false}>
            <DialogHeader className="text-right">
              <DialogTitle className="text-right text-slate-900">{successModal?.title}</DialogTitle>
              {successModal?.description ? (
                <DialogDescription className="text-right">{successModal.description}</DialogDescription>
              ) : null}
            </DialogHeader>
            <DialogFooter className="sm:justify-start">
              <Button
                type="button"
                onClick={() => {
                  if (successModal?.hasNextStep) setViewedStepIndex(currentStepIndex)
                  setSuccessModal(null)
                }}
                className="w-full sm:w-auto"
              >
                {successModal?.hasNextStep ? 'الانتقال للمرحلة التالية' : 'حسنًا'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Error modal — missing template or procedure generation failure */}
        <Dialog open={Boolean(errorModal)} onOpenChange={(open) => { if (!open) setErrorModal(null) }}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-right text-slate-900">{errorModal?.title}</DialogTitle>
              {errorModal?.description ? (
                <DialogDescription className="text-right">{errorModal.description}</DialogDescription>
              ) : null}
            </DialogHeader>
            <DialogFooter className="sm:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => setErrorModal(null)}
                className="w-full sm:w-auto"
              >
                حسنًا
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Archive confirm dialog */}
        <Dialog open={archiveConfirmOpen} onOpenChange={(open) => { if (!open) { setArchiveConfirmOpen(false); setArchiveError('') } }}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-right">تأكيد أرشفة الملف</DialogTitle>
              <DialogDescription className="text-right">
                سيتم أرشفة الملف نهائيا ولن يمكن تنفيذ أي إجراء عليه بعد ذلك
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-right">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">الملف</p>
                <p className="mt-0.5 font-semibold text-slate-900" dir="ltr">{dossier?.reference}</p>
                <p className="mt-0.5 text-sm text-slate-600">{dossier?.nom_complet}</p>
              </div>
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
                  onClick={() => { setArchiveConfirmOpen(false); setArchiveError('') }}
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
