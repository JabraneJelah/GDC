'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Download, FileText, Pencil, Trash2, Plus, Upload, ArrowRight, Users } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

function toCongesUploadApiUrl(fileUrl) {
  if (!fileUrl) return ''
  if (fileUrl.startsWith('/api/uploads/conges/')) return fileUrl
  const marker = '/uploads/conges/'
  const idx = fileUrl.indexOf(marker)
  if (idx === -1) return fileUrl
  const filename = fileUrl.slice(idx + marker.length)
  if (!filename || filename.includes('/') || filename.includes('\\')) return fileUrl
  return `/api/uploads/conges/${filename}`
}

function toDecisionsUploadApiUrl(fileUrl) {
  if (!fileUrl) return ''
  if (fileUrl.startsWith('/api/uploads/decisions/')) return fileUrl
  const marker = '/uploads/decisions/'
  const idx = fileUrl.indexOf(marker)
  if (idx === -1) return fileUrl
  const filename = fileUrl.slice(idx + marker.length)
  if (!filename || filename.includes('/') || filename.includes('\\')) return fileUrl
  return `/api/uploads/decisions/${filename}`
}

const parseReferenceDoc = (value) => {
  if (!value) return { referenceNumber: '', fileUrl: '', fileName: '', fileType: '' }
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object') {
      return {
        referenceNumber: parsed.referenceNumber || '',
        fileUrl: parsed.fileUrl || '',
        fileName: parsed.fileName || '',
        fileType: parsed.fileType || '',
      }
    }
  } catch (_) {}
  return { referenceNumber: value, fileUrl: '', fileName: '', fileType: '' }
}

const parseDecisionDoc = (value) => {
  if (!value) return { fileUrl: '', fileName: '', fileType: '' }
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object') {
      return {
        fileUrl: parsed.fileUrl || '',
        fileName: parsed.fileName || '',
        fileType: parsed.fileType || '',
      }
    }
  } catch (_) {}
  return { fileUrl: '', fileName: '', fileType: '' }
}

const HISTORIQUE_CONGES_PAGE_SIZE = 8

function DetailField({ label, value, ltr }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800 break-words" dir={ltr ? 'ltr' : undefined}>
        {value || '—'}
      </p>
    </div>
  )
}

export default function ProfesseurDetailsPage() {
  const params = useParams()
  const [professeur, setProfesseur] = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [soldes, setSoldes] = useState([])
  const [soldeDialogOpen, setSoldeDialogOpen] = useState(false)
  const [deleteSoldeDialogOpen, setDeleteSoldeDialogOpen] = useState(false)
  const [soldeToDelete, setSoldeToDelete] = useState(null)
  const [editingSolde, setEditingSolde] = useState(null)
  const [soldeFormData, setSoldeFormData] = useState({
    annee: '',
    jours_total: '',
    jours_restants: '',
    type_conge_id: '',
  })
  const [typesConge, setTypesConge] = useState([])
  const [categories, setCategories] = useState([])
  const [specialites, setSpecialites] = useState([])
  const [titres, setTitres] = useState([])
  const [services, setServices] = useState([])
  const [hopitaux, setHopitaux] = useState([])
  const [grades, setGrades] = useState([])
  const [historiqueCongesPage, setHistoriqueCongesPage] = useState(1)
  const decisionFileInputRef = useRef(null)
  const decisionTargetCongeIdRef = useRef(null)
  const [decisionBusyCongeId, setDecisionBusyCongeId] = useState(null)
  const [deleteDecisionDialogOpen, setDeleteDecisionDialogOpen] = useState(false)
  const [deleteDecisionTargetId, setDeleteDecisionTargetId] = useState(null)
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    ppr: '',
    adresse: '',
    sexe: '',
    lieu_naissance: '',
    ville: '',
    specialite_id: '',
    categorie_personnel_id: '',
    titre_id: '',
    service_id: '',
    hopital_id: '',
    grade_id: '',
  })

  useEffect(() => {
    if (params.id) {
      fetchProfesseur()
      fetchTypesConge()
    }
  }, [params.id])

  const congesSignature = professeur
    ? [...(professeur.conges || [])].map((c) => c.id).sort((a, b) => a - b).join(',')
    : ''

  useEffect(() => {
    setHistoriqueCongesPage(1)
  }, [congesSignature])

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

  const fetchTypesConge = async () => {
    try {
      const response = await fetch('/api/types-conge')
      if (response.ok) setTypesConge(await response.json())
    } catch (error) {
      console.error('Erreur lors du chargement des types de congé:', error)
    }
  }

  const fetchProfesseur = async () => {
    try {
      const response = await fetch(`/api/professeurs/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProfesseur(data)
        setSoldes(data.soldes || [])
        setFormData({
          nom: data.nom || '',
          prenom: data.prenom || '',
          ppr: data.ppr || '',
          adresse: data.adresse || '',
          sexe: data.sexe || '',
          lieu_naissance: data.lieu_naissance || '',
          ville: data.ville || '',
          specialite_id: data.specialite_id?.toString() || '',
          categorie_personnel_id: data.categorie_personnel_id?.toString() || '',
          titre_id: data.titre_id?.toString() || '',
          service_id: data.service_id?.toString() || '',
          hopital_id: data.hopital_id?.toString() || '',
          grade_id: data.grade_id?.toString() || '',
        })
      } else {
        setProfesseur(null)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
      setProfesseur(null)
    } finally {
      setLoading(false)
    }
  }

  const openDecisionPicker = (congeId) => {
    decisionTargetCongeIdRef.current = congeId
    decisionFileInputRef.current?.click()
  }

  const handleDecisionFileChange = async (e) => {
    const file = e.target.files?.[0]
    const targetId = decisionTargetCongeIdRef.current
    decisionTargetCongeIdRef.current = null
    e.target.value = ''
    if (!file || !targetId) return
    setDecisionBusyCongeId(targetId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/conges/${targetId}/decision`, { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setErrorMessage(err.error || 'فشل رفع القرار')
        setErrorDialogOpen(true)
        return
      }
      await fetchProfesseur()
    } finally {
      setDecisionBusyCongeId(null)
    }
  }

  const handleDeleteDecision = async () => {
    const congeId = deleteDecisionTargetId
    if (!congeId) return
    setDeleteDecisionDialogOpen(false)
    setDeleteDecisionTargetId(null)
    setDecisionBusyCongeId(congeId)
    try {
      const res = await fetch(`/api/conges/${congeId}/decision`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setErrorMessage(err.error || 'فشل حذف القرار')
        setErrorDialogOpen(true)
        return
      }
      await fetchProfesseur()
    } finally {
      setDecisionBusyCongeId(null)
    }
  }

  const loadOptionsIfNeeded = async () => {
    if (categories.length > 0 && specialites.length > 0 && titres.length > 0 &&
        services.length > 0 && hopitaux.length > 0 && grades.length > 0) return
    await fetchOptions()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/professeurs/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          specialite_id: formData.specialite_id ? parseInt(formData.specialite_id, 10) : undefined,
          categorie_personnel_id: formData.categorie_personnel_id ? parseInt(formData.categorie_personnel_id, 10) : undefined,
          titre_id: formData.titre_id ? parseInt(formData.titre_id, 10) : undefined,
          service_id: formData.service_id ? parseInt(formData.service_id, 10) : undefined,
          hopital_id: formData.hopital_id ? parseInt(formData.hopital_id, 10) : undefined,
          grade_id: formData.grade_id ? parseInt(formData.grade_id, 10) : undefined,
        }),
      })
      if (response.ok) {
        setOpen(false)
        fetchProfesseur()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'حدث خطأ أثناء التحديث')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('حدث خطأ أثناء التحديث')
      setErrorDialogOpen(true)
    }
  }

  const handleOpenSoldeDialog = (solde = null) => {
    if (solde) {
      setEditingSolde(solde)
      setSoldeFormData({
        annee: solde.annee.toString(),
        jours_total: solde.jours_total.toString(),
        jours_restants: solde.jours_restants.toString(),
        type_conge_id: solde.type_conge_id?.toString() || '',
      })
    } else {
      setEditingSolde(null)
      setSoldeFormData({
        annee: new Date().getFullYear().toString(),
        jours_total: '22',
        jours_restants: '22',
        type_conge_id: '',
      })
    }
    setSoldeDialogOpen(true)
  }

  const handleSoldeSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingSolde
        ? `/api/professeurs/${params.id}/soldes/${editingSolde.id}`
        : `/api/professeurs/${params.id}/soldes`
      const method = editingSolde ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annee: parseInt(soldeFormData.annee, 10),
          jours_total: parseInt(soldeFormData.jours_total, 10),
          jours_restants: editingSolde ? parseInt(soldeFormData.jours_restants, 10) : undefined,
          type_conge_id: soldeFormData.type_conge_id ? parseInt(soldeFormData.type_conge_id, 10) : null,
        }),
      })
      if (response.ok) {
        setSoldeDialogOpen(false)
        fetchProfesseur()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'حدث خطأ في العملية')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('حدث خطأ في العملية')
      setErrorDialogOpen(true)
    }
  }

  const handleDeleteSoldeClick = (solde) => {
    setSoldeToDelete(solde)
    setDeleteSoldeDialogOpen(true)
  }

  const handleDeleteSoldeConfirm = async () => {
    try {
      const response = await fetch(`/api/professeurs/${params.id}/soldes/${soldeToDelete.id}`, { method: 'DELETE' })
      if (response.ok) {
        setDeleteSoldeDialogOpen(false)
        setSoldeToDelete(null)
        fetchProfesseur()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'حدث خطأ أثناء الحذف')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('حدث خطأ أثناء الحذف')
      setErrorDialogOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
        <span className="size-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        <p className="text-sm text-slate-600">جاري تحميل بيانات الموظف...</p>
      </div>
    )
  }

  if (!professeur) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
        <p className="text-sm text-slate-600">لم يتم العثور على الموظف</p>
        <Link href="/professeurs" className="text-xs text-blue-600 underline">رجوع إلى قائمة الموظفين</Link>
      </div>
    )
  }

  const congesList = professeur.conges ?? []
  const totalHistoriquePages = Math.ceil(congesList.length / HISTORIQUE_CONGES_PAGE_SIZE)
  const historiquePageSafe =
    totalHistoriquePages === 0 ? 1 : Math.min(Math.max(1, historiqueCongesPage), totalHistoriquePages)
  const historiqueStart = (historiquePageSafe - 1) * HISTORIQUE_CONGES_PAGE_SIZE
  const historiqueCongesPageRows = congesList.slice(historiqueStart, historiqueStart + HISTORIQUE_CONGES_PAGE_SIZE)
  const showHistoriquePagination = congesList.length > HISTORIQUE_CONGES_PAGE_SIZE

  const fullName = `${professeur.titre?.nom ? `${professeur.titre.nom} ` : ''}${professeur.prenom} ${professeur.nom}`.trim()

  const totalSoldeDisponible = soldes
    .filter(s => new Date(s.expire_le) >= new Date() && s.jours_restants > 0)
    .filter(s => {
      const typeNom = (s.type_conge?.nom || '').toLowerCase()
      return !typeNom.includes('exceptionnel') && !typeNom.includes('excepcionel')
    })
    .reduce((sum, s) => sum + s.jours_restants, 0)

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Identity */}
          <div className="space-y-3 text-right">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-blue-600 shrink-0" />
              <h1 className="text-2xl font-bold text-slate-950">{fullName}</h1>
            </div>
            {professeur.ppr && (
              <p className="text-sm text-slate-500">رقم التأجير: <span className="font-semibold text-slate-700" dir="ltr">{professeur.ppr}</span></p>
            )}
          </div>
          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/professeurs"
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ArrowRight className="size-4" />
              رجوع
            </Link>
            <button
              type="button"
              onClick={() => { loadOptionsIfNeeded(); setOpen(true) }}
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Pencil className="size-4" />
              تعديل المعلومات
            </button>
          </div>
        </div>
      </section>

      {/* Unified employee info card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">معلومات الموظف</h2>
        </div>
        <div className="divide-y divide-slate-100">

          {/* الهوية */}
          <div className="px-5 py-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-500">الهوية</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <DetailField label="الاسم الكامل" value={fullName} />
              <DetailField label="رقم التأجير (PPR)" value={professeur.ppr} ltr />
              <DetailField label="رقم بطاقة الهوية (CIN)" value={professeur.cin} ltr />
              <DetailField label="الجنس" value={professeur.sexe === 'MASCULIN' ? 'ذكر' : professeur.sexe === 'FEMININ' ? 'أنثى' : professeur.sexe} />
            </div>
          </div>

          {/* المعلومات المهنية */}
          <div className="px-5 py-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-500">المعلومات المهنية</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <DetailField label="الدرجة" value={professeur.grade?.nom} />
              <DetailField label="التخصص" value={professeur.specialite?.nom} />
              <DetailField label="المصلحة" value={professeur.service?.nom} />
              <DetailField label="المستشفى" value={professeur.hopital?.nom} />
              <DetailField label="الفئة المهنية" value={professeur.categorie_personnel?.nom} />
              {professeur.titre?.nom && <DetailField label="اللقب" value={professeur.titre.nom} />}
            </div>
          </div>

          {/* معلومات الاتصال */}
          <div className="px-5 py-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-500">معلومات الاتصال</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <DetailField label="الهاتف (GSM)" value={professeur.telephone} ltr />
              <DetailField label="المدينة" value={professeur.ville} />
              <DetailField label="مكان الازدياد" value={professeur.lieu_naissance} />
              <div className="sm:col-span-3">
                <DetailField label="العنوان" value={professeur.adresse} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Soldes section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-800">تدبير أرصدة الرخص</h2>
          <button
            type="button"
            onClick={() => handleOpenSoldeDialog()}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="size-3.5" />
            إضافة رصيد
          </button>
        </div>
        <div className="p-5 sm:p-6">
          {soldes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <p className="text-sm text-slate-500">لا يوجد رصيد مسجل</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#F1F5F9]">
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">السنة</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">نوع الرخصة</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">الأيام الإجمالية</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">الأيام المتبقية</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">تاريخ الانتهاء</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-700">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {soldes.map((solde) => {
                      const expireLe = new Date(solde.expire_le)
                      const isExpired = expireLe < new Date()
                      return (
                        <tr key={solde.id} className="bg-white transition-colors hover:bg-slate-50">
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-semibold text-slate-800">{solde.annee}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm text-slate-700">{solde.type_conge?.nom || '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm text-slate-700">{solde.jours_total}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-semibold ${isExpired ? 'text-slate-400' : 'text-emerald-700'}`}>
                              {solde.jours_restants}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm ${isExpired ? 'text-slate-400' : 'text-slate-700'}`} dir="ltr">
                              {expireLe.toLocaleDateString('fr-FR')}
                            </span>
                            {isExpired && (
                              <span className="mr-2 text-xs text-red-500">(منتهي)</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenSoldeDialog(solde)}
                                className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                title="تعديل"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSoldeClick(solde)}
                                className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                title="حذف"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-sm font-medium text-slate-600">الرصيد الإجمالي المتاح</p>
                <p className="text-lg font-bold text-emerald-700">{totalSoldeDisponible} يوم</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Congé history section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">سجل الرخص</h2>
            <span className="text-xs text-slate-500">{congesList.length} رخصة</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F1F5F9]">
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">النوع</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">تاريخ المغادرة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">تاريخ الرجوع</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">المدة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">الدرجة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">الوثيقة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">القرار</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">أنشئ من طرف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {congesList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <p className="text-sm text-slate-500">لا توجد رخص مسجلة</p>
                  </td>
                </tr>
              ) : (
                historiqueCongesPageRows.map((conge) => (
                  <tr key={conge.id} className="bg-white transition-colors hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        {conge.type_conge.nom}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-slate-700" dir="ltr">{new Date(conge.date_debut).toLocaleDateString('fr-FR')}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-slate-700" dir="ltr">{new Date(conge.date_fin).toLocaleDateString('fr-FR')}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-medium text-slate-800">{conge.duree_jours} أيام</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-slate-600">{professeur.grade?.nom || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {(() => {
                        const ref = parseReferenceDoc(conge.reference_doc)
                        if (!ref.referenceNumber && !ref.fileUrl) return <span className="text-sm text-slate-400">—</span>
                        return (
                          <div className="space-y-1">
                            {ref.referenceNumber && (
                              <div className="max-w-[120px] truncate text-xs text-slate-700" title={ref.referenceNumber}>
                                {ref.referenceNumber}
                              </div>
                            )}
                            {ref.fileUrl && (
                              ref.fileType?.startsWith('image/') ? (
                                <div className="flex items-center gap-1.5">
                                  <a href={toCongesUploadApiUrl(ref.fileUrl)} target="_blank" rel="noreferrer">
                                    <img src={toCongesUploadApiUrl(ref.fileUrl)} alt={ref.fileName || 'وثيقة'} className="h-9 w-9 rounded-lg border border-slate-200 object-cover" />
                                  </a>
                                  <a href={toCongesUploadApiUrl(ref.fileUrl)} download={ref.fileName || true} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                    <Download className="h-3 w-3" />
                                    تحميل
                                  </a>
                                </div>
                              ) : (
                                <a href={toCongesUploadApiUrl(ref.fileUrl)} target="_blank" rel="noreferrer" download={ref.fileName || true}
                                  className="inline-flex max-w-[120px] items-center gap-1 overflow-hidden text-xs text-blue-600 hover:underline"
                                  title={ref.fileName || 'فتح PDF'}
                                >
                                  <FileText className="h-3 w-3 shrink-0 text-red-500" />
                                  <span className="truncate">{ref.fileName || 'PDF'}</span>
                                </a>
                              )
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {(() => {
                        const dec = parseDecisionDoc(conge.decision_doc)
                        const busy = decisionBusyCongeId === conge.id
                        if (!dec.fileUrl) {
                          return (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openDecisionPicker(conge.id)}
                              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                            >
                              <Upload className="h-3 w-3" />
                              إضافة
                            </button>
                          )
                        }
                        const apiUrl = toDecisionsUploadApiUrl(dec.fileUrl)
                        return (
                          <div className="flex flex-wrap items-center gap-1">
                            {dec.fileType?.startsWith('image/') ? (
                              <a href={apiUrl} target="_blank" rel="noreferrer" title={dec.fileName || 'قرار'}>
                                <img src={apiUrl} alt={dec.fileName || 'قرار'} className="h-9 w-9 rounded-lg border border-slate-200 object-cover" />
                              </a>
                            ) : (
                              <a href={apiUrl} target="_blank" rel="noreferrer" download={dec.fileName || true}
                                className="inline-flex max-w-[100px] items-center gap-1 overflow-hidden text-xs text-blue-600 hover:underline"
                                title={dec.fileName || 'فتح القرار'}
                              >
                                <FileText className="h-3 w-3 shrink-0 text-red-500" />
                                <span className="truncate">{dec.fileName || 'PDF'}</span>
                              </a>
                            )}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openDecisionPicker(conge.id)}
                              className="cursor-pointer flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                              title="استبدال القرار"
                            >
                              <Upload className="h-3 w-3" />
                            </button>
                            <a href={apiUrl} download={dec.fileName || true}
                              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              title="تحميل"
                            >
                              <Download className="h-3 w-3" />
                            </a>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => { setDeleteDecisionTargetId(conge.id); setDeleteDecisionDialogOpen(true) }}
                              className="cursor-pointer flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="حذف القرار"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="block max-w-[120px] truncate text-sm text-slate-600" title={conge.cree_par_rh.nom_complet}>
                        {conge.cree_par_rh.nom_complet}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {showHistoriquePagination && (
          <div className="border-t border-slate-100 px-5 py-3">
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={historiquePageSafe <= 1}
                onClick={() => setHistoriqueCongesPage((p) => Math.max(1, p - 1))}
                className="cursor-pointer inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                السابق
              </button>
              <span className="min-w-[6rem] text-center text-sm text-slate-600">
                {historiquePageSafe} / {totalHistoriquePages}
              </span>
              <button
                type="button"
                disabled={historiquePageSafe >= totalHistoriquePages}
                onClick={() => setHistoriqueCongesPage((p) => Math.min(totalHistoriquePages, p + 1))}
                className="cursor-pointer inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          </div>
        )}
        <input
          ref={decisionFileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,application/pdf,.pdf,.png,.jpg,.jpeg"
          onChange={handleDecisionFileChange}
        />
      </section>

      {/* Edit employee dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-xl" dir="rtl">
          <DialogHeader className="flex-shrink-0 border-b border-slate-100 px-6 pb-4 pt-6 text-right">
            <DialogTitle className="text-right text-lg font-bold text-slate-900">تعديل معلومات الموظف</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-600">
              تعديل البيانات الشخصية والوظيفية للموظف
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              <div className="space-y-1.5">
                <Label htmlFor="edit_nom" className="text-sm font-medium text-slate-700">النسب <span className="text-red-500">*</span></Label>
                <Input id="edit_nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required className="h-10 rounded-xl border-slate-300 text-right text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_prenom" className="text-sm font-medium text-slate-700">الاسم <span className="text-red-500">*</span></Label>
                <Input id="edit_prenom" value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} required className="h-10 rounded-xl border-slate-300 text-right text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_ppr" className="text-sm font-medium text-slate-700">رقم التأجير <span className="text-red-500">*</span></Label>
                <Input id="edit_ppr" value={formData.ppr} onChange={(e) => setFormData({ ...formData, ppr: e.target.value })} required className="h-10 rounded-xl border-slate-300 text-right text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_adresse" className="text-sm font-medium text-slate-700">العنوان</Label>
                <textarea id="edit_adresse" value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="العنوان الكامل (اختياري)" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">الجنس</Label>
                <Select value={formData.sexe} onValueChange={(v) => setFormData({ ...formData, sexe: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm"><SelectValue placeholder="اختر الجنس (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASCULIN">ذكر</SelectItem>
                    <SelectItem value="FEMININ">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_lieu_naissance" className="text-sm font-medium text-slate-700">مكان الازدياد</Label>
                <Input id="edit_lieu_naissance" value={formData.lieu_naissance} onChange={(e) => setFormData({ ...formData, lieu_naissance: e.target.value })} className="h-10 rounded-xl border-slate-300 text-right text-sm" placeholder="مكان الازدياد (اختياري)" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_ville" className="text-sm font-medium text-slate-700">المدينة</Label>
                <Input id="edit_ville" value={formData.ville} onChange={(e) => setFormData({ ...formData, ville: e.target.value })} className="h-10 rounded-xl border-slate-300 text-right text-sm" placeholder="المدينة (اختياري)" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">اللقب</Label>
                <Select value={formData.titre_id} onValueChange={(v) => setFormData({ ...formData, titre_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm"><SelectValue placeholder="اختر اللقب (اختياري)" /></SelectTrigger>
                  <SelectContent>{titres.map((t) => <SelectItem key={t.id} value={t.id.toString()}>{t.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">الفئة المهنية</Label>
                <Select value={formData.categorie_personnel_id} onValueChange={(v) => setFormData({ ...formData, categorie_personnel_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm"><SelectValue placeholder="اختر الفئة (اختياري)" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">التخصص</Label>
                <Select value={formData.specialite_id} onValueChange={(v) => setFormData({ ...formData, specialite_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm"><SelectValue placeholder="اختر التخصص (اختياري)" /></SelectTrigger>
                  <SelectContent>{specialites.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">الدرجة</Label>
                <Select value={formData.grade_id} onValueChange={(v) => setFormData({ ...formData, grade_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm"><SelectValue placeholder="اختر الدرجة (اختياري)" /></SelectTrigger>
                  <SelectContent>{grades.map((g) => <SelectItem key={g.id} value={g.id.toString()}>{g.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">المصلحة</Label>
                <Select value={formData.service_id} onValueChange={(v) => setFormData({ ...formData, service_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm"><SelectValue placeholder="اختر المصلحة (اختياري)" /></SelectTrigger>
                  <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">المستشفى</Label>
                <Select value={formData.hopital_id} onValueChange={(v) => setFormData({ ...formData, hopital_id: v })}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm"><SelectValue placeholder="اختر المستشفى (اختياري)" /></SelectTrigger>
                  <SelectContent>{hopitaux.map((h) => <SelectItem key={h.id} value={h.id.toString()}>{h.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
                <button type="button" onClick={() => setOpen(false)} className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto">إلغاء</button>
                <button type="submit" className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/edit solde dialog */}
      <Dialog open={soldeDialogOpen} onOpenChange={setSoldeDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right text-lg font-bold text-slate-900">
              {editingSolde ? 'تعديل الرصيد' : 'إضافة رصيد'}
            </DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-600">
              {editingSolde ? 'تعديل معلومات رصيد الرخصة' : 'إضافة رصيد رخصة جديد لهذا الموظف'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSoldeSubmit} className="space-y-4 text-right">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">السنة <span className="text-red-500">*</span></Label>
              <Input type="number" min="2000" max="2100" value={soldeFormData.annee}
                onChange={(e) => setSoldeFormData({ ...soldeFormData, annee: e.target.value })}
                required className="h-10 rounded-xl border-slate-300 text-right text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">نوع الرخصة <span className="text-red-500">*</span></Label>
              <Select value={soldeFormData.type_conge_id} onValueChange={(v) => setSoldeFormData({ ...soldeFormData, type_conge_id: v })} required>
                <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm"><SelectValue placeholder="اختر نوع الرخصة" /></SelectTrigger>
                <SelectContent>{typesConge.map((t) => <SelectItem key={t.id} value={t.id.toString()}>{t.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">الأيام الإجمالية <span className="text-red-500">*</span></Label>
              <Input type="number" min="1" value={soldeFormData.jours_total}
                onChange={(e) => {
                  const v = e.target.value
                  setSoldeFormData({ ...soldeFormData, jours_total: v, jours_restants: editingSolde ? soldeFormData.jours_restants : v })
                }}
                required className="h-10 rounded-xl border-slate-300 text-right text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">الأيام المتبقية <span className="text-red-500">*</span></Label>
              <Input type="number" min="0" max={soldeFormData.jours_total || 999} value={soldeFormData.jours_restants}
                onChange={(e) => setSoldeFormData({ ...soldeFormData, jours_restants: e.target.value })}
                required className="h-10 rounded-xl border-slate-300 text-right text-sm" />
            </div>
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
              <button type="button" onClick={() => setSoldeDialogOpen(false)} className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto">إلغاء</button>
              <button type="submit" className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto">
                {editingSolde ? 'حفظ التعديلات' : 'إضافة الرصيد'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete solde confirm dialog */}
      <Dialog open={deleteSoldeDialogOpen} onOpenChange={(v) => { setDeleteSoldeDialogOpen(v); if (!v) setSoldeToDelete(null) }}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right text-lg font-bold text-slate-900">تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-700">
              هل أنت متأكد من حذف رصيد سنة <strong>{soldeToDelete?.annee}</strong>؟ هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
            <button type="button" onClick={() => { setDeleteSoldeDialogOpen(false); setSoldeToDelete(null) }} className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto">إلغاء</button>
            <button type="button" onClick={handleDeleteSoldeConfirm} className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 sm:w-auto">حذف</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete decision confirm dialog */}
      <Dialog open={deleteDecisionDialogOpen} onOpenChange={(v) => { setDeleteDecisionDialogOpen(v); if (!v) setDeleteDecisionTargetId(null) }}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right text-lg font-bold text-slate-900">حذف القرار</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-700">
              هل تريد إزالة وثيقة القرار من هذه الرخصة؟
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
            <button type="button" onClick={() => { setDeleteDecisionDialogOpen(false); setDeleteDecisionTargetId(null) }} className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto">إلغاء</button>
            <button type="button" onClick={handleDeleteDecision} className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 sm:w-auto">حذف</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right text-lg font-bold text-red-600">خطأ</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-700 whitespace-pre-line">{errorMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-start pt-1">
            <button type="button" onClick={() => setErrorDialogOpen(false)} className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">إغلاق</button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
