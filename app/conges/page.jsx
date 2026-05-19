'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Pagination } from '@/components/ui/pagination'
import { CalendarCheck, FileText, Plus, X } from 'lucide-react'

const ITEMS_PER_PAGE = 8

/** Étend les plages de jours fériés en ensemble de clés YYYY-MM-DD (dates locales). */
function expandJourFerieRangesToYmdSet(joursFeries) {
  const set = new Set()
  for (const j of joursFeries) {
    if (!j?.date_debut || !j?.date_fin) continue
    const start = new Date(j.date_debut)
    const end = new Date(j.date_fin)
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    while (cur <= endDay) {
      const ymd =
        cur.getFullYear() +
        '-' +
        String(cur.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(cur.getDate()).padStart(2, '0')
      set.add(ymd)
      cur.setDate(cur.getDate() + 1)
    }
  }
  return set
}

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
  } catch (_) {
    // Compatibilité avec les anciennes valeurs texte.
  }
  return { referenceNumber: value, fileUrl: '', fileName: '', fileType: '' }
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

function getProfLabel(conge) {
  if (!conge.professeur) return '—'
  const t = conge.professeur.titre?.nom ? `${conge.professeur.titre.nom} ` : ''
  return `${t}${conge.professeur.prenom || ''} ${conge.professeur.nom || ''}`.trim() || '—'
}

export default function CongesPage() {
  const [conges, setConges] = useState([])
  const [professeurs, setProfesseurs] = useState([])
  const [typesConge, setTypesConge] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingConge, setEditingConge] = useState(null)
  const [congeToDelete, setCongeToDelete] = useState(null)
  const [filters, setFilters] = useState({
    professeur_id: 'all',
    type_conge_id: 'all',
    duree: '',
  })
  const [formData, setFormData] = useState({
    professeur_id: '',
    type_conge_id: '',
    date_debut: '',
    date_fin: '',
    duree_jours: '',
    reference_doc: '',
    nom_interim: '',
    prenom_interim: '',
  })
  const [professeurSearch, setProfesseurSearch] = useState('')
  const [professeurSearchOpen, setProfesseurSearchOpen] = useState(false)
  const [interimSearch, setInterimSearch] = useState('')
  const [interimSearchOpen, setInterimSearchOpen] = useState(false)
  const [selectedInterimId, setSelectedInterimId] = useState('')
  const [calculatingDateRetour, setCalculatingDateRetour] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState('')
  const [existingReferenceFile, setExistingReferenceFile] = useState(null)
  // Date de reprise au travail (jour suivant le dernier jour de congé) — affichée comme "date de retour"
  const [dateRetourTravailDisplay, setDateRetourTravailDisplay] = useState('')
  const [horsSolde, setHorsSolde] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const fetchData = async () => {
    try {
      const [congesRes, professeursRes, typesRes] = await Promise.all([
        fetch('/api/conges'),
        fetch('/api/professeurs'),
        fetch('/api/types-conge'),
      ])

      if (congesRes.ok) {
        const congesData = await congesRes.json()
        setConges(congesData)
      }

      if (professeursRes.ok) {
        const professeursData = await professeursRes.json()
        setProfesseurs(professeursData)
      }

      if (typesRes.ok) {
        const typesData = await typesRes.json()
        setTypesConge(typesData)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  // Retourne le prochain jour ouvrable après une date (hors week-end et jours fériés)
  const nextWorkingDayAfter = (ymd, ferieSet) => {
    const d = new Date(ymd + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    const maxDays = 14
    for (let i = 0; i < maxDays; i++) {
      const str = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0')
      const dayOfWeek = d.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isFerie = ferieSet.has(str)
      if (!isWeekend && !isFerie) return str
      d.setDate(d.getDate() + 1)
    }
    return ''
  }

  // Calcule le dernier jour de congé (date_fin pour l'API) et la date de reprise au travail (affichée comme "date de retour")
  const calculateDateRetour = async (dateDebut, dureeJours) => {
    if (!dateDebut || !dureeJours || parseInt(dureeJours, 10) < 1) {
      setCalculatingDateRetour(false)
      return
    }
    setCalculatingDateRetour(true)
    const start = new Date(dateDebut + 'T00:00:00')
    const n = parseInt(dureeJours, 10)
    if (isNaN(n) || n < 1) {
      setCalculatingDateRetour(false)
      return
    }

    const endRange = new Date(start)
    endRange.setDate(endRange.getDate() + Math.max(n * 2 + 30, 60))
    const toStr = endRange.getFullYear() + '-' +
      String(endRange.getMonth() + 1).padStart(2, '0') + '-' +
      String(endRange.getDate()).padStart(2, '0')

    let ferieSet = new Set()
    try {
      const res = await fetch(`/api/jours-feries?from=${dateDebut}&to=${toStr}`)
      if (res.ok) {
        const joursFeries = await res.json()
        ferieSet = expandJourFerieRangesToYmdSet(joursFeries)
      }
    } catch (e) {
      console.error('Erreur chargement jours fériés:', e)
    }

    let count = 0
    const current = new Date(start)
    const maxDays = 400
    let days = 0
    while (count < n && days < maxDays) {
      const ymd = current.getFullYear() + '-' +
        String(current.getMonth() + 1).padStart(2, '0') + '-' +
        String(current.getDate()).padStart(2, '0')
      const dayOfWeek = current.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isFerie = ferieSet.has(ymd)
      if (!isWeekend && !isFerie) count++
      if (count === n) {
        const dateReprise = nextWorkingDayAfter(ymd, ferieSet)
        setFormData(prev => ({ ...prev, date_fin: ymd }))
        setDateRetourTravailDisplay(dateReprise)
        setCalculatingDateRetour(false)
        return
      }
      current.setDate(current.getDate() + 1)
      days++
    }
    setFormData(prev => ({ ...prev, date_fin: '' }))
    setDateRetourTravailDisplay('')
    setCalculatingDateRetour(false)
  }

  // Calcul automatique de la date de retour quand la date de départ ou la durée change
  useEffect(() => {
    if (formData.date_debut && formData.duree_jours && parseInt(formData.duree_jours, 10) >= 1) {
      calculateDateRetour(formData.date_debut, formData.duree_jours)
    }
  }, [formData.date_debut, formData.duree_jours])

  const resetForm = () => {
    setFormData({
      professeur_id: '',
      type_conge_id: '',
      date_debut: '',
      date_fin: '',
      duree_jours: '',
      reference_doc: '',
      nom_interim: '',
      prenom_interim: '',
    })
    setDateRetourTravailDisplay('')
    setSelectedFile(null)
    setFilePreviewUrl('')
    setExistingReferenceFile(null)
    setHorsSolde(false)
    setEditingConge(null)
    setInterimSearch('')
    setInterimSearchOpen(false)
    setSelectedInterimId('')
  }

  const clearReferenceFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl)
    setFilePreviewUrl('')
    setSelectedFile(null)
    setExistingReferenceFile(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Ne pas envoyer NaN (évite "Tous les champs obligatoires") : garder type_conge_id en string si vide, et bloquer si date_fin non calculée
    if (!formData.date_fin && !dateRetourTravailDisplay) {
      setErrorMessage('الرجاء انتظار اكتمال حساب تاريخ الرجوع قبل التسجيل.')
      setErrorDialogOpen(true)
      return
    }
    if (!formData.professeur_id) {
      setErrorMessage('الرجاء اختيار موظف من القائمة (ابحث ثم انقر على الاسم).')
      setErrorDialogOpen(true)
      return
    }
    const typeCongeId = formData.type_conge_id !== '' && !isNaN(parseInt(formData.type_conge_id, 10))
      ? parseInt(formData.type_conge_id, 10)
      : formData.type_conge_id
    if (typeCongeId === '' || typeCongeId == null) {
      setErrorMessage('الرجاء اختيار نوع الرخصة.')
      setErrorDialogOpen(true)
      return
    }
    setSubmitLoading(true)
    try {
      const url = editingConge ? `/api/conges/${editingConge.id}` : '/api/conges'
      const method = editingConge ? 'PUT' : 'POST'
      let uploadedFile = existingReferenceFile

      if (selectedFile) {
        const uploadData = new FormData()
        uploadData.append('file', selectedFile)
        const uploadRes = await fetch('/api/conges/upload', {
          method: 'POST',
          body: uploadData,
        })
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => null)
          throw new Error(err?.error || 'Échec de l\'upload de la pièce justificative')
        }
        uploadedFile = await uploadRes.json()
      }

      const referencePayload = uploadedFile?.fileUrl
        ? JSON.stringify({
            fileUrl: uploadedFile.fileUrl,
            fileName: uploadedFile.fileName || '',
            fileType: uploadedFile.fileType || '',
          })
        : ''

      const payload = {
        ...formData,
        type_conge_id: typeCongeId,
        duree_jours: parseInt(formData.duree_jours, 10) || 0,
        reference_doc: referencePayload,
      }
      if (!editingConge) {
        payload.hors_solde = horsSolde
      }
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setOpen(false)
        setEditOpen(false)
        resetForm()
        setProfesseurSearch('')
        setProfesseurSearchOpen(false)
        setCurrentPage(1)
        setToast(editingConge ? 'تم تعديل الرخصة بنجاح' : 'تمت إضافة الرخصة بنجاح')
        fetchData()
      } else {
        let message = `حدث خطأ أثناء ${editingConge ? 'التعديل' : 'الإضافة'} (${response.status})`
        try {
          const data = await response.json()
          if (data?.error) message = data.error
        } catch (_) { /* response non JSON */ }
        setErrorMessage(message)
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage(error?.message || `حدث خطأ أثناء ${editingConge ? 'التعديل' : 'الإضافة'}`)
      setErrorDialogOpen(true)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEdit = (conge) => {
    // Formater les dates pour les inputs de type date (YYYY-MM-DD)
    const formatDateForInput = (dateString) => {
      const date = new Date(dateString)
      return date.toISOString().split('T')[0]
    }

    const lastDay = formatDateForInput(conge.date_fin)
    setEditingConge(conge)
    setFormData({
      professeur_id: conge.professeur_id,
      type_conge_id: conge.type_conge_id.toString(),
      date_debut: formatDateForInput(conge.date_debut),
      date_fin: lastDay,
      duree_jours: conge.duree_jours.toString(),
      reference_doc: conge.reference_doc || '',
      nom_interim: conge.nom_interim || '',
      prenom_interim: '',
    })
    const reference = parseReferenceDoc(conge.reference_doc)
    setExistingReferenceFile(
      reference.fileUrl
        ? {
            fileUrl: reference.fileUrl,
            fileName: reference.fileName,
            fileType: reference.fileType,
          }
        : null
    )
    setSelectedFile(null)
    setFilePreviewUrl('')
    setHorsSolde(!!conge.hors_solde)
    setDateRetourTravailDisplay(nextWorkingDayAfter(lastDay, new Set()))
    // Preload interim selector with stored display name
    setSelectedInterimId('')
    setInterimSearch(conge.nom_interim || '')
    setEditOpen(true)
  }

  const handleDeleteClick = (conge) => {
    setCongeToDelete(conge)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!congeToDelete) return
    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/conges/${congeToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDeleteDialogOpen(false)
        setCongeToDelete(null)
        setCurrentPage(1)
        setToast('تم حذف الرخصة بنجاح')
        fetchData()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'حدث خطأ أثناء الحذف')
        setErrorDialogOpen(true)
        setDeleteDialogOpen(false)
        setCongeToDelete(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('حدث خطأ غير متوقع')
      setErrorDialogOpen(true)
      setDeleteDialogOpen(false)
      setCongeToDelete(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleOpenChange = (next) => {
    setOpen(next)
    if (!next) {
      resetForm()
      setProfesseurSearch('')
      setProfesseurSearchOpen(false)
    }
  }

  const handleEditOpenChange = (next) => {
    setEditOpen(next)
    if (next && formData.professeur_id) {
      const prof = professeurs.find(p => p.id === formData.professeur_id)
      if (prof) {
        setProfesseurSearch(`${prof.titre?.nom ? `${prof.titre.nom} ` : ''}${prof.prenom} ${prof.nom}${prof.ppr ? ` (${prof.ppr})` : ''}`)
      }
    } else if (!next) {
      setProfesseurSearch('')
      setProfesseurSearchOpen(false)
    }
    if (!next) {
      resetForm()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
        <span className="size-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        <p className="text-sm text-slate-600">جاري تحميل الرخص...</p>
      </div>
    )
  }

  // Filter conges based on filters
  const filteredConges = conges.filter((conge) => {
    if (filters.professeur_id !== 'all' && conge.professeur_id !== filters.professeur_id) {
      return false
    }
    if (filters.type_conge_id !== 'all' && conge.type_conge_id.toString() !== filters.type_conge_id) {
      return false
    }
    if (filters.duree && conge.duree_jours.toString() !== filters.duree) {
      return false
    }
    return true
  })

  const totalPages = Math.ceil(filteredConges.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedConges = filteredConges.slice(startIndex, endIndex)

  const handleClearFilters = () => {
    setFilters({ professeur_id: 'all', type_conge_id: 'all', duree: '' })
    setCurrentPage(1)
  }

  const hasActiveFilters = filters.professeur_id !== 'all' || filters.type_conge_id !== 'all' || filters.duree !== ''

  // Shared professor search dropdown markup (used in both create and edit forms)
  const ProfesseurDropdown = ({ idPrefix }) => {
    const selectedProf = formData.professeur_id ? professeurs.find(p => p.id === formData.professeur_id) : null
    const displayValue = selectedProf
      ? `${selectedProf.titre?.nom ? `${selectedProf.titre.nom} ` : ''}${selectedProf.prenom} ${selectedProf.nom}${selectedProf.ppr ? ` (${selectedProf.ppr})` : ''}`.trim()
      : professeurSearch
    const searchLower = professeurSearch.toLowerCase()
    const filtered = professeurs.filter((prof) => {
      const nomComplet = `${prof.titre?.nom || ''} ${prof.prenom} ${prof.nom} ${prof.ppr || ''}`.toLowerCase()
      return nomComplet.includes(searchLower)
    }).slice(0, 10)
    return (
      <div className="relative">
        <Input
          id={`${idPrefix}_professeur_id`}
          placeholder="البحث عن موظف (الاسم، اللقب، PPR)..."
          value={displayValue}
          onChange={(e) => {
            setProfesseurSearch(e.target.value)
            setFormData(prev => ({ ...prev, professeur_id: '' }))
            setProfesseurSearchOpen(true)
          }}
          onFocus={() => setProfesseurSearchOpen(true)}
          onBlur={() => setTimeout(() => setProfesseurSearchOpen(false), 220)}
          required
          autoComplete="off"
          className="h-10 rounded-xl border-slate-300 text-right text-sm"
        />
        {professeurSearchOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto text-right">
            {filtered.length > 0 ? (
              filtered.map((prof) => (
                <div
                  key={prof.id}
                  className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer text-slate-800"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setFormData(prev => ({ ...prev, professeur_id: prof.id }))
                    setProfesseurSearch('')
                    setProfesseurSearchOpen(false)
                  }}
                >
                  {prof.titre?.nom ? `${prof.titre.nom} ` : ''}{prof.prenom} {prof.nom}{prof.ppr ? ` (${prof.ppr})` : ''}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500">لا يوجد أستاذ مطابق</div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Shared interim (المعوض) employee selector
  const InterimDropdown = ({ idPrefix }) => {
    const selectedInterim = selectedInterimId ? professeurs.find(p => p.id === selectedInterimId) : null
    const displayValue = selectedInterim
      ? `${selectedInterim.titre?.nom ? `${selectedInterim.titre.nom} ` : ''}${selectedInterim.prenom} ${selectedInterim.nom}${selectedInterim.ppr ? ` (${selectedInterim.ppr})` : ''}`.trim()
      : interimSearch
    const searchLower = interimSearch.toLowerCase()
    const filtered = professeurs.filter((prof) => {
      const nomComplet = `${prof.titre?.nom || ''} ${prof.prenom} ${prof.nom} ${prof.ppr || ''}`.toLowerCase()
      return nomComplet.includes(searchLower)
    }).slice(0, 10)
    return (
      <div className="relative">
        <div className="flex gap-1.5">
          <Input
            id={`${idPrefix}_interim`}
            placeholder="البحث عن موظف..."
            value={displayValue}
            onChange={(e) => {
              setInterimSearch(e.target.value)
              setSelectedInterimId('')
              setFormData(prev => ({ ...prev, nom_interim: '', prenom_interim: '' }))
              setInterimSearchOpen(true)
            }}
            onFocus={() => setInterimSearchOpen(true)}
            onBlur={() => setTimeout(() => setInterimSearchOpen(false), 220)}
            autoComplete="off"
            className="h-10 flex-1 rounded-xl border-slate-300 text-right text-sm"
          />
          {(selectedInterimId || interimSearch) && (
            <button
              type="button"
              onClick={() => {
                setSelectedInterimId('')
                setInterimSearch('')
                setFormData(prev => ({ ...prev, nom_interim: '', prenom_interim: '' }))
              }}
              className="cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {interimSearchOpen && (
          <div className="absolute z-50 mt-1 w-full overflow-auto rounded-xl border border-slate-200 bg-white text-right shadow-lg max-h-60">
            {filtered.length > 0 ? (
              filtered.map((prof) => {
                const label = `${prof.titre?.nom ? `${prof.titre.nom} ` : ''}${prof.prenom} ${prof.nom}${prof.ppr ? ` (${prof.ppr})` : ''}`.trim()
                return (
                  <div
                    key={prof.id}
                    className="cursor-pointer px-3 py-2 hover:bg-slate-50"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setSelectedInterimId(prof.id)
                      setInterimSearch('')
                      setFormData(prev => ({ ...prev, nom_interim: label, prenom_interim: '' }))
                      setInterimSearchOpen(false)
                    }}
                  >
                    <div className="text-sm font-medium text-slate-800">{label}</div>
                    {prof.ppr && <div className="text-xs text-slate-500">{prof.ppr}</div>}
                  </div>
                )
              })
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500">لا يوجد موظف مطابق</div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Shared file upload section
  const ReferenceFileSection = ({ idPrefix }) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Input
          id={`${idPrefix}_reference_file`}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl)
            setSelectedFile(file)
            setExistingReferenceFile(null)
            if (file.type.startsWith('image/')) {
              setFilePreviewUrl(URL.createObjectURL(file))
            } else {
              setFilePreviewUrl('')
            }
          }}
          className="h-10 rounded-xl border-slate-300 text-sm"
        />
        {(selectedFile || existingReferenceFile) && (
          <button
            type="button"
            onClick={clearReferenceFile}
            className="cursor-pointer flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {(selectedFile || existingReferenceFile) && (
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          {((selectedFile?.type || existingReferenceFile?.fileType || '').startsWith('image/')) ? (
            <img
              src={filePreviewUrl || toCongesUploadApiUrl(existingReferenceFile?.fileUrl)}
              alt="معاينة الوثيقة"
              className="h-20 w-20 object-cover rounded-lg border border-slate-200"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <FileText className="h-4 w-4 text-red-600" />
              <span>{selectedFile?.name || existingReferenceFile?.fileName || 'وثيقة PDF'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-5" dir="rtl">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700 shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 text-right">
            <div className="flex items-center gap-2">
              <CalendarCheck className="size-5 text-blue-600" />
              <h1 className="text-2xl font-semibold text-slate-950">إدارة الرخص</h1>
            </div>
            <p className="text-sm text-slate-600">تدبير وتتبع رخص الموظفين وحساب أيام الغياب</p>
            <div className="flex items-center gap-4 pt-1 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-500" />
                <span className="font-semibold text-slate-900">{conges.length}</span>
                <span className="text-slate-600">رخصة مسجلة</span>
              </span>
              {hasActiveFilters && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="font-semibold text-slate-900">{filteredConges.length}</span>
                    <span className="text-slate-600">بعد الفلتر</span>
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { resetForm(); setProfesseurSearch(''); setOpen(true) }}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
          >
            <Plus className="size-4" />
            إضافة رخصة
          </button>
        </div>
      </section>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label className="mb-1.5 block text-xs font-medium text-slate-600">الموظف</Label>
            <Select
              value={filters.professeur_id}
              onValueChange={(value) => { setFilters({ ...filters, professeur_id: value }); setCurrentPage(1) }}
            >
              <SelectTrigger className="h-10 rounded-xl border-slate-300 bg-white text-right text-sm text-slate-900">
                <SelectValue placeholder="جميع الموظفين" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الموظفين</SelectItem>
                {professeurs.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.prenom} {prof.nom}{prof.ppr ? ` (${prof.ppr})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="mb-1.5 block text-xs font-medium text-slate-600">نوع الرخصة</Label>
            <Select
              value={filters.type_conge_id}
              onValueChange={(value) => { setFilters({ ...filters, type_conge_id: value }); setCurrentPage(1) }}
            >
              <SelectTrigger className="h-10 rounded-xl border-slate-300 bg-white text-right text-sm text-slate-900">
                <SelectValue placeholder="جميع الأنواع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                {typesConge.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-36">
            <Label className="mb-1.5 block text-xs font-medium text-slate-600">المدة (أيام)</Label>
            <Input
              type="number"
              placeholder="المدة..."
              value={filters.duree}
              onChange={(e) => { setFilters({ ...filters, duree: e.target.value }); setCurrentPage(1) }}
              className="h-10 rounded-xl border-slate-300 text-right text-sm"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
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
          <span className="font-bold text-slate-900">{filteredConges.length}</span>{' '}
          رخصة
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F1F5F9]">
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">الموظف</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">نوع الرخصة</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">تاريخ المغادرة</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">تاريخ النهاية</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">المدة</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">المعوض</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">الوثيقة</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700">أنشئ من قبل</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-slate-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConges.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                      <CalendarCheck className="size-9 text-slate-300" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-slate-700">
                        {conges.length === 0 ? 'لا توجد رخص مسجلة' : 'لا توجد رخص مطابقة للفلتر'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="text-xs text-blue-600 underline hover:text-blue-800"
                        >
                          مسح الفلاتر
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedConges.map((conge) => (
                  <tr key={conge.id} className="bg-white transition-colors hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className="block max-w-[180px] truncate text-sm font-medium text-slate-900"
                        title={getProfLabel(conge)}
                      >
                        {getProfLabel(conge)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className="inline-flex max-w-[140px] items-center overflow-hidden rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700"
                        title={conge.type_conge?.nom || '—'}
                      >
                        <span className="truncate">{conge.type_conge?.nom || '—'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span dir="ltr" className="text-sm text-slate-700">{formatDate(conge.date_debut)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span dir="ltr" className="text-sm text-slate-700">{formatDate(conge.date_fin)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-medium text-slate-800">{conge.duree_jours} أيام</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className="block max-w-[160px] truncate text-sm text-slate-700"
                        title={conge.nom_interim || '—'}
                      >
                        {conge.nom_interim || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {(() => {
                        const ref = parseReferenceDoc(conge.reference_doc)
                        if (!ref.referenceNumber && !ref.fileUrl) return <span className="text-sm text-slate-400">—</span>
                        return (
                          <div className="space-y-1">
                            {ref.referenceNumber && (
                              <div
                                className="max-w-[120px] truncate text-xs text-slate-700"
                                title={ref.referenceNumber}
                              >
                                {ref.referenceNumber}
                              </div>
                            )}
                            {ref.fileUrl && (
                              ref.fileType?.startsWith('image/') ? (
                                <a href={toCongesUploadApiUrl(ref.fileUrl)} target="_blank" rel="noreferrer" className="inline-block">
                                  <img
                                    src={toCongesUploadApiUrl(ref.fileUrl)}
                                    alt={ref.fileName || 'وثيقة'}
                                    className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={toCongesUploadApiUrl(ref.fileUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex max-w-[120px] items-center gap-1 overflow-hidden text-xs text-blue-600 hover:underline"
                                  title={ref.fileName || 'فتح PDF'}
                                >
                                  <FileText className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{ref.fileName || 'فتح PDF'}</span>
                                </a>
                              )
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className="block max-w-[140px] truncate text-sm text-slate-600"
                        title={conge.cree_par_rh?.nom_complet || '—'}
                      >
                        {conge.cree_par_rh?.nom_complet || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(conge)}
                          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                        >
                          تعديل
                        </button>
                        <span className="text-slate-200">|</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(conge)}
                          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-xl sm:max-w-2xl" dir="rtl">
          <DialogHeader className="flex-shrink-0 border-b border-slate-100 px-6 pb-4 pt-6 text-right">
            <DialogTitle className="text-right text-lg font-bold text-slate-900">إضافة رخصة جديدة</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-600">
              أدخل معلومات الرخصة وسيتم حساب تاريخ الرجوع تلقائياً
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  الموظف <span className="text-red-500">*</span>
                </Label>
                <ProfesseurDropdown idPrefix="create" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  نوع الرخصة <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type_conge_id}
                  onValueChange={(value) => setFormData({ ...formData, type_conge_id: value })}
                  required
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm">
                    <SelectValue placeholder="اختر نوع الرخصة" />
                  </SelectTrigger>
                  <SelectContent>
                    {typesConge.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create_date_debut" className="text-sm font-medium text-slate-700">
                  تاريخ المغادرة <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create_date_debut"
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
                  className="h-10 rounded-xl border-slate-300 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create_duree_jours" className="text-sm font-medium text-slate-700">
                  مدة الرخصة بالأيام المفتوحة <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create_duree_jours"
                  type="number"
                  min={1}
                  value={formData.duree_jours}
                  onChange={(e) => setFormData(prev => ({ ...prev, duree_jours: e.target.value }))}
                  placeholder="مثال: 5"
                  className="h-10 rounded-xl border-slate-300 text-right text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create_date_fin" className="text-sm font-medium text-slate-700">
                  تاريخ الرجوع للعمل
                  {calculatingDateRetour && (
                    <span className="mr-2 text-xs font-normal text-blue-600">جاري الحساب...</span>
                  )}
                </Label>
                <Input
                  id="create_date_fin"
                  type="date"
                  value={dateRetourTravailDisplay || formData.date_fin}
                  readOnly
                  className="h-10 rounded-xl border-slate-200 bg-slate-100 text-sm text-slate-600"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">المعوض</Label>
                <InterimDropdown idPrefix="create" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">الوثيقة المرجعية</Label>
                <ReferenceFileSection idPrefix="create" />
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <input
                  id="create_hors_solde"
                  type="checkbox"
                  checked={horsSolde}
                  onChange={(e) => setHorsSolde(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-blue-600"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="create_hors_solde" className="cursor-pointer text-sm font-medium text-slate-800">
                    خارج الرصيد
                  </Label>
                  <p className="text-xs text-slate-500">
                    تسجيل هذه الرخصة دون خصم أيام من الرصيد (لا يُشترط وجود رصيد).
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={submitLoading}
                  className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitLoading || calculatingDateRetour || !formData.date_fin}
                  className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {calculatingDateRetour ? 'جاري حساب تاريخ الرجوع...' : submitLoading ? 'جاري الحفظ...' : 'إضافة الرخصة'}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-xl sm:max-w-2xl" dir="rtl">
          <DialogHeader className="flex-shrink-0 border-b border-slate-100 px-6 pb-4 pt-6 text-right">
            <DialogTitle className="text-right text-lg font-bold text-slate-900">تعديل الرخصة</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-600">
              تعديل معلومات الرخصة المسجلة
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  الموظف <span className="text-red-500">*</span>
                </Label>
                <ProfesseurDropdown idPrefix="edit" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  نوع الرخصة <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type_conge_id}
                  onValueChange={(value) => setFormData({ ...formData, type_conge_id: value })}
                  required
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-300 text-right text-sm">
                    <SelectValue placeholder="اختر نوع الرخصة" />
                  </SelectTrigger>
                  <SelectContent>
                    {typesConge.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_date_debut" className="text-sm font-medium text-slate-700">
                  تاريخ المغادرة <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_date_debut"
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
                  className="h-10 rounded-xl border-slate-300 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_duree_jours" className="text-sm font-medium text-slate-700">
                  مدة الرخصة بالأيام المفتوحة <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_duree_jours"
                  type="number"
                  min={1}
                  value={formData.duree_jours}
                  onChange={(e) => setFormData(prev => ({ ...prev, duree_jours: e.target.value }))}
                  className="h-10 rounded-xl border-slate-300 text-right text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_date_fin" className="text-sm font-medium text-slate-700">
                  تاريخ الرجوع للعمل
                  {calculatingDateRetour && (
                    <span className="mr-2 text-xs font-normal text-blue-600">جاري الحساب...</span>
                  )}
                </Label>
                <Input
                  id="edit_date_fin"
                  type="date"
                  value={dateRetourTravailDisplay || formData.date_fin}
                  readOnly
                  className="h-10 rounded-xl border-slate-200 bg-slate-100 text-sm text-slate-600"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">المعوض</Label>
                <InterimDropdown idPrefix="edit" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">الوثيقة المرجعية</Label>
                <ReferenceFileSection idPrefix="edit" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                <span className="font-medium text-slate-800">خارج الرصيد: </span>
                {editingConge?.hors_solde ? 'نعم' : 'لا'}
                <span className="mt-1 block text-xs text-slate-500">
                  لا يمكن تغيير هذا الخيار هنا. احذف الرخصة وأعد إنشاءها لتغييره.
                </span>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={submitLoading}
                  className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitLoading || calculatingDateRetour}
                  className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {calculatingDateRetour ? 'جاري الحساب...' : submitLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(v) => { if (!deleteLoading) setDeleteDialogOpen(v) }}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right text-lg font-bold text-slate-900">تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-600">
              هل أنت متأكد من حذف هذه الرخصة؟ هذا الإجراء لا يمكن التراجع عنه.
              {congeToDelete && (
                <span className="mt-3 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="block text-sm font-medium text-slate-800">{getProfLabel(congeToDelete)}</span>
                  <span className="block text-xs text-slate-600 mt-0.5" dir="ltr">
                    {formatDate(congeToDelete.date_debut)} — {formatDate(congeToDelete.date_fin)}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-start">
            <button
              type="button"
              onClick={() => { setDeleteDialogOpen(false); setCongeToDelete(null) }}
              disabled={deleteLoading}
              className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {deleteLoading ? 'جاري الحذف...' : 'حذف'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right text-lg font-bold text-red-600">خطأ</DialogTitle>
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
