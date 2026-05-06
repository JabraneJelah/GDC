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
import { AppCard } from '@/components/dossiers-explicatifs/AppCard'
import { InfoGrid } from '@/components/dossiers-explicatifs/InfoGrid'
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
  User,
  Hash,
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
const fieldLabelClassName = 'block text-right text-sm font-semibold text-slate-800'

const workflowSteps = [
  { label: 'تسجيل الملف' },
  { label: 'إنشاء الوثائق' },
  { label: 'التبليغ' },
  { label: 'الجواب' },
  { label: 'التقييم' },
  { label: 'المسطرة' },
  { label: 'الإغلاق' },
]

const statusStepIndex = {
  ENREGISTRE: 1,
  DOCUMENTS_INITIAUX_GENERES: 2,
  NOTIFIE: 3,
  REPONSE_RECUE: 4,
  REPONSE_CONVAINCANTE: 6,
  REPONSE_NON_CONVAINCANTE: 5,
  PROCEDURE_SUIVANTE_GENEREE: 6,
  CLOTURE: 6,
  A_ARCHIVER: 6,
  ARCHIVE: 6,
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

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10)
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
    return 'لا يمكن إغلاق الملف إلا بعد جواب مقنع أو بعد إنشاء المسطرة اللاحقة'
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
    return 'تعذر إنشاء المسطرة اللاحقة، المرجو التحقق من المعطيات والمحاولة مرة أخرى'
  }

  if (status === 'REPONSE_CONVAINCANTE' || status === 'PROCEDURE_SUIVANTE_GENEREE') {
    return 'تعذر إغلاق الملف، المرجو المحاولة مرة أخرى'
  }

  return 'تعذر تنفيذ الإجراء، المرجو المحاولة مرة أخرى'
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
  const [actionSuccess, setActionSuccess] = useState('')
  const [notificationDate, setNotificationDate] = useState(getTodayInputValue())
  const [notificationProofFile, setNotificationProofFile] = useState(null)
  const [responseDate, setResponseDate] = useState(getTodayInputValue())
  const [responseProofFile, setResponseProofFile] = useState(null)
  const [responseDecision, setResponseDecision] = useState('CONVAINCANTE')
  const [evaluationComment, setEvaluationComment] = useState('')
  const [procedureType, setProcedureType] = useState('AVERTISSEMENT')
  const [procedureTemplateId, setProcedureTemplateId] = useState('')
  const [initialConfirmOpen, setInitialConfirmOpen] = useState(false)
  const [procedureConfirmOpen, setProcedureConfirmOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveError, setArchiveError] = useState('')
  const [viewedStepIndex, setViewedStepIndex] = useState(0)

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

  const activeProcedureTemplates = useMemo(() => {
    if (!dossier?.type_faute_id || !procedureType) return []

    return templates.filter((template) => (
      template.actif !== false &&
      Number(template.type_faute_id) === Number(dossier.type_faute_id) &&
      template.usage === procedureType
    ))
  }, [dossier?.type_faute_id, procedureType, templates])

  const activeInitialTemplates = useMemo(() => {
    if (!dossier?.type_faute_id) return []

    return templates.filter((template) => (
      template.actif !== false &&
      Number(template.type_faute_id) === Number(dossier.type_faute_id) &&
      Object.keys(initialDocumentUsageLabels).includes(template.usage)
    ))
  }, [dossier?.type_faute_id, templates])

  useEffect(() => {
    const selectedTemplateStillAvailable = activeProcedureTemplates.some((template) => template.id === procedureTemplateId)

    if (selectedTemplateStillAvailable) return

    if (activeProcedureTemplates.length > 0) {
      setProcedureTemplateId(activeProcedureTemplates[0].id)
    } else {
      setProcedureTemplateId('')
    }
  }, [activeProcedureTemplates, procedureTemplateId])

  const selectedProcedureTemplate = useMemo(
    () => activeProcedureTemplates.find((template) => template.id === procedureTemplateId) || null,
    [activeProcedureTemplates, procedureTemplateId]
  )

  const currentStepIndex = statusStepIndex[dossier?.statut] ?? 0
  const statusColor = getStatusColor(dossier?.statut)
  const statusClassName = statusBadgeStyles[statusColor] || statusBadgeStyles.neutral
  const documents = Array.isArray(dossier?.documents) ? dossier.documents : []
  const notificationProofDocument = documents.find((document) => document.categorie === 'preuve_notification')
  const responseProofDocument = documents.find((document) => document.categorie === 'reponse_agent')
  const initialDocuments = documents.filter((document) => ['lettre_explicative', 'bordereau_notification'].includes(document.categorie))
  const procedureDocuments = documents.filter((document) => document.categorie === 'procedure_suivante')
  const canGenerateProcedure = dossier?.statut !== 'REPONSE_NON_CONVAINCANTE' || Boolean(selectedProcedureTemplate)
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

  // Auto-dismiss success messages after 2.5 s
  useEffect(() => {
    if (!actionSuccess) return
    const id = setTimeout(() => setActionSuccess(''), 2500)
    return () => clearTimeout(id)
  }, [actionSuccess])

  const actionFeedback = (
    <>
      {actionError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
          <span>{actionError}</span>
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-right text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" />
          <span>{actionSuccess}</span>
        </div>
      ) : null}
    </>
  )

  const handleAction = async ({ skipConfirmation = false } = {}) => {
    if (!dossier || actionLoading) return

    if (!dossierId) {
      setActionError('معرف الملف غير صالح')
      return
    }

    setActionError('')
    setActionSuccess('')

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
        if (!procedureTemplateId) throw new Error('template_required')
        endpoint = 'generate-procedure'
        payload = {
          type_procedure: procedureType,
          template_id: procedureTemplateId,
        }
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

      setActionSuccess(dossier.statut === 'REPONSE_NON_CONVAINCANTE'
        ? 'تم إنشاء المسطرة اللاحقة بنجاح'
        : 'تم تنفيذ العملية بنجاح')

      await fetchDossier({ showLoading: false })
      setInitialConfirmOpen(false)
      setProcedureConfirmOpen(false)
      setNotificationDate(getTodayInputValue())
      setNotificationProofFile(null)
      setResponseDate(getTodayInputValue())
      setResponseProofFile(null)
      setEvaluationComment('')
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
        setActionError('المرجو اختيار نوع المسطرة')
      } else if (actionErrorValue.message === 'template_required') {
        setActionError('المرجو اختيار نموذج المسطرة')
      } else if (actionErrorValue.message === 'procedure_generation_failed') {
        setActionError('تعذر إنشاء المسطرة اللاحقة')
      } else if (dossier.statut === 'REPONSE_NON_CONVAINCANTE') {
        setActionError(actionErrorValue.message || 'تعذر إنشاء المسطرة اللاحقة')
      } else {
        setActionError(translateApiError(actionErrorValue.message, dossier.statut))
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handlePrimaryActionClick = () => {
    if (dossier?.statut === 'ENREGISTRE') {
      setActionError('')
      setActionSuccess('')
      setInitialConfirmOpen(true)
      return
    }

    if (dossier?.statut === 'REPONSE_NON_CONVAINCANTE') {
      setActionError('')
      setActionSuccess('')
      setProcedureConfirmOpen(true)
      return
    }

    handleAction()
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
      setActionSuccess('تم أرشفة الملف بنجاح')
      await fetchDossier({ showLoading: false })
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
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-right">
            <Archive className="size-5 shrink-0 text-slate-500" />
            <div>
              <p className="font-semibold text-slate-700">هذا الملف مؤرشف</p>
              {dossier.date_archivage ? (
                <p className="mt-0.5 text-sm text-slate-500">تاريخ الأرشفة: {formatDate(dossier.date_archivage) || '-'}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-medium text-slate-500">
            🔒 وضع القراءة فقط — لا يمكن تنفيذ أي إجراء على هذا الملف
          </div>
        </div>
      )
    }

    if (dossier.statut === 'ENREGISTRE') {
      return (
        <div className="space-y-4">
          <p className="leading-relaxed text-sm text-slate-600">
            سيتم إنشاء الوثائق اعتمادا على النماذج النشطة المرتبطة بنفس نوع المخالفة.
          </p>
          {actionFeedback}
          <Button
            type="button"
            onClick={handlePrimaryActionClick}
            disabled={actionLoading || !canRunCurrentAction}
            className="w-full sm:w-auto"
          >
            {actionLoading ? 'جاري إنشاء الوثائق...' : 'إنشاء الوثائق'}
          </Button>
        </div>
      )
    }

    if (dossier.statut === 'DOCUMENTS_INITIAUX_GENERES') {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date_notification" className={fieldLabelClassName}>تاريخ التبليغ</Label>
              <Input
                id="date_notification"
                type="date"
                value={notificationDate}
                onChange={(event) => {
                  setNotificationDate(event.target.value)
                  setActionError('')
                }}
                className={editableInputClassName}
                disabled={actionLoading}
              />
            </div>
            <div>
              <UploadField
                id="notification_proof"
                label="وصل الاستلام"
                accept="application/pdf,image/jpeg,image/png"
                selectedFile={notificationProofFile}
                onChange={(event) => {
                  setNotificationProofFile(event.target.files?.[0] || null)
                  setActionError('')
                }}
                helperText="PDF أو JPG أو PNG"
                disabled={actionLoading}
              />
            </div>
          </div>
          {actionFeedback}
          <Button
            type="button"
            onClick={handlePrimaryActionClick}
            disabled={actionLoading || !canRunCurrentAction}
            className="w-full sm:w-auto"
          >
            {actionLoading ? 'جاري التنفيذ...' : 'تسجيل التبليغ'}
          </Button>
        </div>
      )
    }

    if (dossier.statut === 'NOTIFIE') {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date_reponse" className={fieldLabelClassName}>تاريخ التوصل بالجواب</Label>
              <Input
                id="date_reponse"
                type="date"
                value={responseDate}
                onChange={(event) => {
                  setResponseDate(event.target.value)
                  setActionError('')
                }}
                className={editableInputClassName}
                disabled={actionLoading}
              />
            </div>
            <div>
              <UploadField
                id="response_document"
                label="وثيقة الجواب"
                accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                selectedFile={responseProofFile}
                onChange={(event) => {
                  setResponseProofFile(event.target.files?.[0] || null)
                  setActionError('')
                }}
                helperText="PDF أو JPG أو PNG أو DOCX"
                disabled={actionLoading}
              />
            </div>
          </div>
          {actionFeedback}
          <Button
            type="button"
            onClick={handlePrimaryActionClick}
            disabled={actionLoading || !canRunCurrentAction}
            className="w-full sm:w-auto"
          >
            {actionLoading ? 'جاري التنفيذ...' : 'تسجيل الجواب'}
          </Button>
        </div>
      )
    }

    if (dossier.statut === 'REPONSE_RECUE') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className={fieldLabelClassName}>تقييم الجواب</Label>
            <Select
              value={responseDecision}
              onValueChange={(value) => {
                setResponseDecision(value)
                setActionError('')
              }}
              disabled={actionLoading}
            >
              <SelectTrigger className={selectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONVAINCANTE">الجواب مقنع</SelectItem>
                <SelectItem value="NON_CONVAINCANTE">غير مقنع</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="commentaire_evaluation" className={fieldLabelClassName}>ملاحظة اختيارية</Label>
            <textarea
              id="commentaire_evaluation"
              value={evaluationComment}
              onChange={(event) => {
                setEvaluationComment(event.target.value)
                setActionError('')
              }}
              className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-[3px] focus-visible:ring-blue-500/20"
              disabled={actionLoading}
            />
          </div>
          {actionFeedback}
          <Button
            type="button"
            onClick={handlePrimaryActionClick}
            disabled={actionLoading || !canRunCurrentAction}
            className="w-full sm:w-auto"
          >
            {actionLoading ? 'جاري التنفيذ...' : 'اعتماد التقييم'}
          </Button>
        </div>
      )
    }

    if (dossier.statut === 'REPONSE_NON_CONVAINCANTE') {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className={fieldLabelClassName}>نوع المسطرة</Label>
              <Select
                value={procedureType}
                onValueChange={(value) => {
                  setProcedureType(value)
                  setActionError('')
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
            <div className="space-y-2">
              <Label className={fieldLabelClassName}>نموذج المسطرة</Label>
              {activeProcedureTemplates.length === 1 ? (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right text-sm font-medium text-slate-800">
                  {activeProcedureTemplates[0].nom}
                </div>
              ) : null}
              {activeProcedureTemplates.length > 1 ? (
                <Select
                  value={procedureTemplateId}
                  onValueChange={(value) => {
                    setProcedureTemplateId(value)
                    setActionError('')
                  }}
                  disabled={actionLoading}
                >
                  <SelectTrigger className={selectTriggerClassName}>
                    <SelectValue placeholder="اختر النموذج" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProcedureTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {activeProcedureTemplates.length === 0 ? (
                <p className="text-sm text-amber-700">لا يوجد نموذج نشط مرتبط بنفس نوع المخالفة ونوع المسطرة المختارة</p>
              ) : (
                <p className="text-xs font-medium text-slate-500">
                  يتم عرض النماذج النشطة المرتبطة بنفس نوع المخالفة ونوع المسطرة المختارة
                </p>
              )}
            </div>
          </div>
          {selectedProcedureTemplate ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-right">
              <p className="text-sm font-semibold text-slate-800">النموذج الذي سيتم إنشاؤه: {selectedProcedureTemplate.nom}</p>
              <p className="mt-1 text-xs text-slate-500">نوع المخالفة: {getTypeFauteLabel(dossier.type_faute) || '-'}</p>
            </div>
          ) : null}
          {actionFeedback}
          <Button
            type="button"
            onClick={handlePrimaryActionClick}
            disabled={actionLoading || !canRunCurrentAction}
            className="w-full sm:w-auto"
          >
            {actionLoading ? 'جاري إنشاء المسطرة...' : 'إنشاء المسطرة'}
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
          <div className="space-y-4">
            <p className="leading-relaxed text-sm text-slate-500">تم تسجيل الملف بالمعطيات التالية:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {dossier.nom_complet ? (
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-right">
                  <User className="mt-0.5 size-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">الاسم الكامل</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{dossier.nom_complet}</p>
                  </div>
                </div>
              ) : null}
              {dossier.matricule ? (
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-right">
                  <Hash className="mt-0.5 size-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">رقم التأجير</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{dossier.matricule}</p>
                  </div>
                </div>
              ) : null}
              {getTypeFauteLabel(dossier.type_faute) ? (
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-right">
                  <FileText className="mt-0.5 size-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">نوع المخالفة</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{getTypeFauteLabel(dossier.type_faute)}</p>
                  </div>
                </div>
              ) : null}
              {formatDate(dossier.date_faute) ? (
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-right">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">تاريخ المخالفة</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{formatDate(dossier.date_faute)}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-3">
            <p className="leading-relaxed text-sm text-slate-500">الوثائق الأولية التي تم إنشاؤها:</p>
            {initialDocuments.length > 0 ? (
              <div className="space-y-2">
                {initialDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <FileText className="size-4 shrink-0 text-slate-500" />
                    <span className="flex-1 truncate text-sm font-medium text-slate-700">{getDocumentName(doc)}</span>
                    {isDocumentReady(doc) ? (
                      <a href={getDocumentDownloadUrl(dossier.id, doc.id)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                        <Download className="size-3" />
                        تحميل
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">لم يتم إنشاء وثائق أولية</p>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-3">
            {dossier.date_notification ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <div className="shrink-0 rounded-lg bg-white p-2 shadow-sm">
                  <Calendar className="size-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">تاريخ التبليغ</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800">{formatDate(dossier.date_notification)}</p>
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

      case 3:
        return (
          <div className="space-y-3">
            {dossier.date_reponse ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <div className="shrink-0 rounded-lg bg-white p-2 shadow-sm">
                  <Calendar className="size-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">تاريخ التوصل بالجواب</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800">{formatDate(dossier.date_reponse)}</p>
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
              <p className="text-sm text-slate-600">لا توجد وثيقة جواب مرفوعة</p>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            {dossier.decision_reponse ? (
              <div className={`flex items-center gap-3 rounded-xl border px-5 py-4 text-right ${
                dossier.decision_reponse === 'CONVAINCANTE'
                  ? 'border-green-200 bg-green-50'
                  : 'border-amber-200 bg-amber-50'
              }`}>
                <div className={`shrink-0 rounded-full p-1.5 ${
                  dossier.decision_reponse === 'CONVAINCANTE' ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  {dossier.decision_reponse === 'CONVAINCANTE'
                    ? <CheckCircle2 className="size-5 text-green-600" />
                    : <AlertTriangle className="size-5 text-amber-600" />
                  }
                </div>
                <div>
                  <p className="text-xs text-slate-500">قرار التقييم</p>
                  <p className={`mt-0.5 text-sm font-bold ${
                    dossier.decision_reponse === 'CONVAINCANTE' ? 'text-green-800' : 'text-amber-800'
                  }`}>
                    {dossier.decision_reponse === 'CONVAINCANTE' ? 'الجواب مقنع' : 'الجواب غير مقنع'}
                  </p>
                </div>
              </div>
            ) : null}
            {dossier.commentaire_evaluation ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs text-slate-500">ملاحظة</p>
                <p className="mt-1 leading-relaxed text-sm text-slate-700">{dossier.commentaire_evaluation}</p>
              </div>
            ) : null}
          </div>
        )

      case 5:
        return (
          <div className="space-y-3">
            <p className="leading-relaxed text-sm text-slate-500">وثائق المسطرة اللاحقة:</p>
            {procedureDocuments.length > 0 ? (
              <div className="space-y-2">
                {procedureDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <FileText className="size-4 shrink-0 text-slate-500" />
                    <span className="flex-1 truncate text-sm font-medium text-slate-700">{getDocumentName(doc)}</span>
                    {isDocumentReady(doc) ? (
                      <a href={getDocumentDownloadUrl(dossier.id, doc.id)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                        <Download className="size-3" />
                        تحميل
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">لم يتم إنشاء وثائق مسطرة</p>
            )}
          </div>
        )

      case 6: {
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

  // Combined step content renderer
  const renderViewedStepContent = () => {
    if (viewedStepIndex === currentStepIndex) {
      return renderCurrentStepContent()
    }
    return renderCompletedStepContent(viewedStepIndex)
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

  const employeeFields = [
    { label: 'الاسم الكامل', value: dossier.nom_complet },
    { label: 'رقم التأجير', value: dossier.matricule },
    { label: 'الدرجة', value: dossier.professeur?.grade?.nom || dossier.profil },
    { label: 'المصلحة', value: dossier.professeur?.service?.nom || dossier.service },
    { label: 'المستشفى', value: dossier.professeur?.hopital?.nom },
    { label: 'التخصص', value: dossier.professeur?.specialite?.nom },
  ]

  return (
    <PageShell>
      <meta charSet="UTF-8" />
      <div className="space-y-6" dir="rtl">

        {/* Header */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">الملف التأديبي</p>
              <h1 dir="ltr" className="text-3xl font-bold tracking-tight text-slate-900">
                {dossier.reference}
              </h1>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge className={statusClassName}>
                  {getDossierStatusLabel(dossier.statut)}
                </Badge>
                {getTypeFauteLabel(dossier.type_faute) ? (
                  <>
                    <span className="text-slate-300 select-none">·</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {getTypeFauteLabel(dossier.type_faute)}
                    </span>
                  </>
                ) : null}
                {formatDate(dossier.date_faute) ? (
                  <>
                    <span className="text-slate-300 select-none">·</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="size-3 text-slate-400" />
                      {formatDate(dossier.date_faute)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
              onClick={() => router.push('/dossiers-explicatifs')}
            >
              <ArrowRight className="size-4" />
              رجوع
            </Button>
          </div>
        </section>

        {/* Employee Info */}
        <AppCard>
          <InfoGrid items={employeeFields} />
        </AppCard>

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
                <p className="text-xs font-medium text-slate-500">نوع المخالفة</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{getTypeFauteLabel(dossier.type_faute) || '-'}</p>
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
              <DialogTitle className="text-right">تأكيد إنشاء المسطرة</DialogTitle>
              <DialogDescription className="text-right">
                راجع النموذج المختار قبل إنشاء المسطرة اللاحقة
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-right">
              {selectedProcedureTemplate ? (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-medium text-slate-500">نوع المسطرة</dt>
                      <dd className="font-semibold text-slate-800">{procedureLabels[procedureType] || '-'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-medium text-slate-500">النموذج الذي سيتم إنشاؤه</dt>
                      <dd className="max-w-[220px] text-left font-semibold text-slate-800">{selectedProcedureTemplate.nom}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-medium text-slate-500">نوع المخالفة</dt>
                      <dd className="max-w-[220px] text-left font-semibold text-slate-800">{getTypeFauteLabel(dossier.type_faute) || '-'}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  لا يوجد نموذج نشط مرتبط بنفس نوع المخالفة ونوع المسطرة المختارة
                </div>
              )}

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
                  disabled={actionLoading || !selectedProcedureTemplate}
                  className="w-full sm:w-auto"
                >
                  {actionLoading ? 'جاري إنشاء المسطرة...' : 'إنشاء المسطرة'}
                </Button>
              </div>
            </div>
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
