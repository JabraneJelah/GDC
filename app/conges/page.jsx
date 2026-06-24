'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCurrentUser, isLecteurRH } from '@/components/UserContext'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
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
import { CalendarCheck, CalendarDays, FileText, Plus, X } from 'lucide-react'

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
  const { user } = useCurrentUser()
  const readOnly = isLecteurRH(user)

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
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState('')
  const [existingReferenceFile, setExistingReferenceFile] = useState(null)
  // Premier jour de retour au travail, sélectionné par l'utilisateur
  const [dateRetour, setDateRetour] = useState('')
  const [horsSolde, setHorsSolde] = useState(true)
  const [soldeInfo, setSoldeInfo] = useState(null)
  const [soldeLoading, setSoldeLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [joursFeriesAll, setJoursFeriesAll] = useState([])
  const [appSettings, setAppSettings] = useState({ block_holiday_selection: false, block_weekend_selection: false })
  const [debutCalendarOpen, setDebutCalendarOpen] = useState(false)
  const [debutCalendarMonth, setDebutCalendarMonth] = useState(new Date())
  const [interimClearedByConflict, setInterimClearedByConflict] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    fetch('/api/jours-feries')
      .then(r => r.ok ? r.json() : [])
      .then(data => setJoursFeriesAll(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/app-settings')
      .then(r => r.ok ? r.json() : {})
      .then(data => setAppSettings(prev => ({ ...prev, ...data })))
      .catch(() => {})
  }, [])

  // Auto-clear interim if the same employee is selected as both الموظف and المعوض
  useEffect(() => {
    if (!formData.professeur_id) return
    if (selectedInterimId && selectedInterimId === formData.professeur_id) {
      setSelectedInterimId('')
      setInterimSearch('')
      setFormData(prev => ({ ...prev, nom_interim: '', prenom_interim: '' }))
      setInterimClearedByConflict(true)
    } else {
      setInterimClearedByConflict(false)
    }
  }, [formData.professeur_id])

  // Fetch remaining solde for the selected professor + type (for display only, not validation)
  useEffect(() => {
    const typeId = parseInt(formData.type_conge_id, 10)
    if (!formData.professeur_id || !typeId) {
      setSoldeInfo(null)
      return
    }
    setSoldeLoading(true)
    const maintenant = new Date()
    fetch(`/api/professeurs/${formData.professeur_id}/soldes`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const total = Array.isArray(data)
          ? data
              .filter(s => s.type_conge_id === typeId && new Date(s.expire_le) >= maintenant)
              .reduce((sum, s) => sum + s.jours_restants, 0)
          : 0
        setSoldeInfo({ total })
      })
      .catch(() => setSoldeInfo(null))
      .finally(() => setSoldeLoading(false))
  }, [formData.professeur_id, formData.type_conge_id])

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

  // Prochain jour ouvrable après une date (hors week-end et jours fériés)
  const nextWorkingDayAfter = (ymd, ferieSet) => {
    const d = new Date(ymd + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    for (let i = 0; i < 30; i++) {
      const str = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0')
      const dayOfWeek = d.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !ferieSet.has(str)) return str
      d.setDate(d.getDate() + 1)
    }
    return ''
  }

  // Recalcule date_fin et dateRetour depuis date_debut + duree_jours (jamais depuis l'ancienne valeur)
  useEffect(() => {
    const duree = parseInt(formData.duree_jours, 10)
    if (!formData.date_debut || !duree || duree <= 0) {
      setFormData(prev => ({ ...prev, date_fin: '' }))
      setDateRetour('')
      return
    }
    const ferieSet = expandJourFerieRangesToYmdSet(joursFeriesAll)
    let count = 0
    let lastWorkingDay = ''
    const current = new Date(formData.date_debut + 'T00:00:00')
    const maxIter = duree * 3 + 60
    for (let i = 0; i < maxIter; i++) {
      const ymd = current.getFullYear() + '-' +
        String(current.getMonth() + 1).padStart(2, '0') + '-' +
        String(current.getDate()).padStart(2, '0')
      const dow = current.getDay()
      if (dow !== 0 && dow !== 6 && !ferieSet.has(ymd)) {
        count++
        lastWorkingDay = ymd
        if (count === duree) break
      }
      current.setDate(current.getDate() + 1)
    }
    setFormData(prev => ({ ...prev, date_fin: lastWorkingDay }))
    setDateRetour(lastWorkingDay ? nextWorkingDayAfter(lastWorkingDay, ferieSet) : '')
  }, [formData.date_debut, formData.duree_jours, joursFeriesAll])

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
    setDateRetour('')
    setSelectedFile(null)
    setFilePreviewUrl('')
    setExistingReferenceFile(null)
    setHorsSolde(true)
    setSoldeInfo(null)
    setInterimClearedByConflict(false)
    setEditingConge(null)
    setInterimSearch('')
    setInterimSearchOpen(false)
    setSelectedInterimId('')
    setDebutCalendarOpen(false)
  }

  const clearReferenceFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl)
    setFilePreviewUrl('')
    setSelectedFile(null)
    setExistingReferenceFile(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.duree_jours || parseInt(formData.duree_jours, 10) <= 0) {
      setErrorMessage('الرجاء إدخال مدة الرخصة.')
      setErrorDialogOpen(true)
      return
    }
    if (!formData.date_debut) {
      setErrorMessage('الرجاء اختيار تاريخ المغادرة.')
      setErrorDialogOpen(true)
      return
    }
    if (!formData.date_fin) {
      setErrorMessage('الرجاء انتظار اكتمال حساب تاريخ الرجوع قبل التسجيل.')
      setErrorDialogOpen(true)
      return
    }
    if (!formData.professeur_id) {
      setErrorMessage('الرجاء اختيار موظف من القائمة (ابحث ثم انقر على الاسم).')
      setErrorDialogOpen(true)
      return
    }
    if (appSettings.block_holiday_selection || appSettings.block_weekend_selection) {
      if (isNonWorkingDay(formData.date_debut)) {
        setErrorMessage('لا يمكن اختيار يوم عطلة رسمية أو غير مفتوح كتاريخ مغادرة.')
        setErrorDialogOpen(true)
        return
      }
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
    // dateRetour is computed by useEffect from date_debut + duree_jours
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

  // Holiday highlight data for the date picker (must be before any early return)
  const [holidayDatesArray, holidayNamesMap] = useMemo(() => {
    const dates = []
    const names = {}
    for (const j of joursFeriesAll) {
      if (!j?.date_debut || !j?.date_fin) continue
      const start = new Date(j.date_debut)
      const end = new Date(j.date_fin)
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      while (cur <= endDay) {
        dates.push(new Date(cur))
        const ymd = cur.getFullYear() + '-' +
          String(cur.getMonth() + 1).padStart(2, '0') + '-' +
          String(cur.getDate()).padStart(2, '0')
        names[ymd] = j.nom
        cur.setDate(cur.getDate() + 1)
      }
    }
    return [dates, names]
  }, [joursFeriesAll])

  // Disabled days: conditional on appSettings
  const disabledDays = useMemo(() => {
    const days = []
    if (appSettings.block_weekend_selection) days.push({ dayOfWeek: [0, 6] })
    if (appSettings.block_holiday_selection) days.push(...holidayDatesArray)
    return days
  }, [holidayDatesArray, appSettings])

  // Custom DayButton: highlights holidays in amber, adds tooltip for non-working days
  const HolidayDayButton = useMemo(() => {
    return function HolidayDayButtonInner({ className, day, modifiers, ...props }) {
      const ymd = day.date.getFullYear() + '-' +
        String(day.date.getMonth() + 1).padStart(2, '0') + '-' +
        String(day.date.getDate()).padStart(2, '0')
      const holidayName = holidayNamesMap[ymd]
      const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6
      const holidayStyle = (holidayName && !modifiers.selected)
        ? { backgroundColor: 'rgb(254 243 199)', color: 'rgb(146 64 14)', ...props.style }
        : props.style
      const titleAttr = holidayName || (isWeekend ? 'يوم غير مفتوح' : undefined)
      return (
        <CalendarDayButton
          className={className}
          day={day}
          modifiers={modifiers}
          {...props}
          style={holidayStyle}
          title={titleAttr}
        />
      )
    }
  }, [holidayNamesMap])

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
        <span className="size-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        <p className="text-sm text-slate-600">جاري تحميل الرخص...</p>
      </div>
    )
  }

  // Returns true if a YYYY-MM-DD string is a weekend or active holiday
  const isNonWorkingDay = (ymd) => {
    if (!ymd) return false
    const d = new Date(ymd + 'T00:00:00')
    if (d.getDay() === 0 || d.getDay() === 6) return true
    return Boolean(holidayNamesMap[ymd])
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

  // Professor search dropdown — create mode only
  const ProfesseurDropdown = ({ idPrefix }) => {
    const selectedProf = formData.professeur_id ? professeurs.find(p => p.id === formData.professeur_id) : null
    const selectedLabel = selectedProf
      ? `${selectedProf.titre?.nom ? `${selectedProf.titre.nom} ` : ''}${selectedProf.prenom} ${selectedProf.nom}`.trim()
      : null
    const searchLower = professeurSearch.toLowerCase()
    const filtered = professeurs.filter((prof) => {
      const nomComplet = `${prof.titre?.nom || ''} ${prof.prenom} ${prof.nom} ${prof.ppr || ''}`.toLowerCase()
      return nomComplet.includes(searchLower)
    }).slice(0, 10)
    return (
      <div>
        {/* Selected employee chip — shown when a selection is confirmed */}
        {selectedLabel && (
          <div className="flex h-9 items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 mb-1.5">
            <span className="truncate text-sm font-medium text-blue-900">{selectedLabel}</span>
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, professeur_id: '' }))
                setProfesseurSearch('')
                setProfesseurSearchOpen(false)
              }}
              className="cursor-pointer shrink-0 ms-2 text-blue-400 transition-colors hover:text-blue-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {/* Search input — value is always the raw search term, never the selected label */}
        <div className="relative">
          <Input
            id={`${idPrefix}_professeur_id`}
            placeholder="البحث عن موظف..."
            value={professeurSearch}
            onChange={(e) => {
              setProfesseurSearch(e.target.value)
              if (formData.professeur_id) setFormData(prev => ({ ...prev, professeur_id: '' }))
              setProfesseurSearchOpen(true)
            }}
            onFocus={() => setProfesseurSearchOpen(true)}
            onBlur={() => setTimeout(() => setProfesseurSearchOpen(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setProfesseurSearchOpen(false); e.stopPropagation() } }}
            autoComplete="off"
            className="h-10 rounded-xl border-slate-300 text-right text-sm"
          />
          {professeurSearchOpen && (
            <div className="absolute z-[60] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto text-right">
              {filtered.length > 0 ? (
                filtered.map((prof) => {
                  const label = `${prof.titre?.nom ? `${prof.titre.nom} ` : ''}${prof.prenom} ${prof.nom}`.trim()
                  return (
                    <div
                      key={prof.id}
                      className="cursor-pointer px-3 py-2.5 hover:bg-slate-50"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setFormData(prev => ({ ...prev, professeur_id: prof.id }))
                        setProfesseurSearch('')
                        setProfesseurSearchOpen(false)
                      }}
                    >
                      <div className="text-sm font-medium text-slate-800">{label}</div>
                      {prof.ppr && <div className="text-xs text-slate-500">{prof.ppr}</div>}
                    </div>
                  )
                })
              ) : (
                <div className="px-3 py-2 text-sm text-slate-500">لا توجد نتائج</div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Professor read-only display — edit mode only (employee cannot be changed)
  const ProfesseurReadOnly = () => {
    const prof = professeurs.find(p => p.id === formData.professeur_id)
    const name = prof
      ? `${prof.titre?.nom ? `${prof.titre.nom} ` : ''}${prof.prenom} ${prof.nom}`.trim()
      : formData.professeur_id
    return (
      <div className="flex h-10 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3">
        <span className="text-sm font-medium text-slate-800">{name}</span>
        {prof?.ppr && <span className="text-xs text-slate-400">{prof.ppr}</span>}
      </div>
    )
  }

  // Shared interim (المعوض) employee selector
  const InterimDropdown = ({ idPrefix }) => {
    const selectedInterim = selectedInterimId ? professeurs.find(p => p.id === selectedInterimId) : null
    const selectedLabel = selectedInterim
      ? `${selectedInterim.titre?.nom ? `${selectedInterim.titre.nom} ` : ''}${selectedInterim.prenom} ${selectedInterim.nom}`.trim()
      : null
    const searchLower = interimSearch.toLowerCase()
    const filtered = professeurs.filter((prof) => {
      if (prof.id === formData.professeur_id) return false
      const nomComplet = `${prof.titre?.nom || ''} ${prof.prenom} ${prof.nom} ${prof.ppr || ''}`.toLowerCase()
      return nomComplet.includes(searchLower)
    }).slice(0, 10)
    return (
      <div>
        {selectedLabel && (
          <div className="flex h-9 items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 mb-1.5">
            <span className="truncate text-sm font-medium text-blue-900">{selectedLabel}</span>
            <button
              type="button"
              onClick={() => {
                setSelectedInterimId('')
                setInterimSearch('')
                setFormData(prev => ({ ...prev, nom_interim: '', prenom_interim: '' }))
              }}
              className="cursor-pointer shrink-0 ms-2 text-blue-400 transition-colors hover:text-blue-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="relative">
          <Input
            id={`${idPrefix}_interim`}
            placeholder="البحث عن موظف..."
            value={interimSearch}
            onChange={(e) => {
              setInterimSearch(e.target.value)
              if (selectedInterimId) {
                setSelectedInterimId('')
                setFormData(prev => ({ ...prev, nom_interim: '', prenom_interim: '' }))
              }
              setInterimClearedByConflict(false)
              setInterimSearchOpen(true)
            }}
            onFocus={() => setInterimSearchOpen(true)}
            onBlur={() => setTimeout(() => setInterimSearchOpen(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setInterimSearchOpen(false); e.stopPropagation() } }}
            autoComplete="off"
            className="h-10 rounded-xl border-slate-300 text-right text-sm"
          />
          {interimSearchOpen && (
            <div className="absolute z-[60] mt-1 w-full overflow-auto rounded-xl border border-slate-200 bg-white text-right shadow-lg max-h-60">
              {filtered.length > 0 ? (
                filtered.map((prof) => {
                  const label = `${prof.titre?.nom ? `${prof.titre.nom} ` : ''}${prof.prenom} ${prof.nom}`.trim()
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

  // Date picker for تاريخ المغادرة with holiday highlights
  const DateDebutPicker = () => {
    const selectedDate = formData.date_debut
      ? new Date(formData.date_debut + 'T00:00:00')
      : undefined
    const displayText = formData.date_debut
      ? new Date(formData.date_debut + 'T00:00:00').toLocaleDateString('fr-FR')
      : null
    return (
      <div
        className="relative"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setDebutCalendarOpen(false)
          }
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (!debutCalendarOpen && formData.date_debut) {
              setDebutCalendarMonth(new Date(formData.date_debut + 'T00:00:00'))
            }
            setDebutCalendarOpen(v => !v)
          }}
          className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className={displayText ? 'text-slate-900' : 'text-slate-400'} dir="ltr">
            {displayText || 'اختر التاريخ'}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
        {debutCalendarOpen && (
          <div className="absolute right-0 z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" dir="ltr">
            <Calendar
              mode="single"
              selected={selectedDate}
              month={debutCalendarMonth}
              onMonthChange={setDebutCalendarMonth}
              disabled={disabledDays}
              onSelect={(date) => {
                if (!date) return
                const ymd = date.getFullYear() + '-' +
                  String(date.getMonth() + 1).padStart(2, '0') + '-' +
                  String(date.getDate()).padStart(2, '0')
                setFormData(prev => ({ ...prev, date_debut: ymd }))
                setDebutCalendarOpen(false)
              }}
              components={{ DayButton: HolidayDayButton }}
            />
            {holidayDatesArray.length > 0 && (
              <div className="flex items-center gap-1.5 border-t border-slate-100 px-3 pb-2.5 pt-2 text-xs text-slate-500" dir="rtl">
                <span className="inline-block h-3 w-3 shrink-0 rounded-sm bg-amber-100 ring-1 ring-amber-200" />
                عطلة رسمية
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Read-only display for تاريخ الرجوع للعمل (computed from date_debut + duree_jours)
  const DateRetourDisplay = () => {
    const displayText = dateRetour
      ? new Date(dateRetour + 'T00:00:00').toLocaleDateString('fr-FR')
      : null
    return (
      <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3">
        <CalendarCheck className="h-4 w-4 shrink-0 text-slate-400" />
        {displayText ? (
          <span className="text-sm font-medium text-slate-800" dir="ltr">{displayText}</span>
        ) : (
          <span className="text-sm text-slate-400">يُحسب تلقائياً بعد إدخال المدة والتاريخ</span>
        )}
      </div>
    )
  }

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
          {!readOnly && (
            <button
              type="button"
              onClick={() => { resetForm(); setProfesseurSearch(''); setOpen(true) }}
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
            >
              <Plus className="size-4" />
              إضافة رخصة
            </button>
          )}
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
                      {readOnly ? (
                        <div className="text-center text-xs text-slate-400">—</div>
                      ) : (
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
                      )}
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
              أدخل المدة وتاريخ المغادرة، وسيتم حساب تاريخ الرجوع تلقائياً
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              {/* 1. Hors solde toggle — first decision */}
              <div className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${horsSolde ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                <input
                  id="create_hors_solde"
                  type="checkbox"
                  checked={horsSolde}
                  onChange={(e) => setHorsSolde(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-blue-600"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="create_hors_solde" className="cursor-pointer text-sm font-medium text-slate-800">
                    رخصة خارج الرصيد
                  </Label>
                  <p className="text-xs text-slate-500">
                    لن يتم خصم هذه الرخصة من رصيد الموظف.
                  </p>
                </div>
              </div>
              {/* 2. Remaining solde — shown only if hors_solde is false */}
              {!horsSolde && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">الرصيد المتبقي</Label>
                  <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
                    {soldeLoading ? (
                      <span className="text-sm text-slate-400">جاري التحميل...</span>
                    ) : soldeInfo !== null && formData.professeur_id && formData.type_conge_id ? (
                      <span className={`text-sm font-semibold ${soldeInfo.total > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {soldeInfo.total} {soldeInfo.total === 1 ? 'يوم' : 'أيام'}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">اختر الموظف ونوع الرخصة أولاً</span>
                    )}
                  </div>
                </div>
              )}
              {/* 3. Professeur */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  الموظف <span className="text-red-500">*</span>
                </Label>
                <ProfesseurDropdown idPrefix="create" />
              </div>
              {/* 4. Type conge */}
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
              {/* 5. Duration */}
              <div className="space-y-1.5">
                <Label htmlFor="create_duree_jours" className="text-sm font-medium text-slate-700">
                  مدة الرخصة (أيام) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create_duree_jours"
                  type="number"
                  min="1"
                  placeholder="عدد الأيام..."
                  value={formData.duree_jours}
                  onChange={(e) => setFormData(prev => ({ ...prev, duree_jours: e.target.value }))}
                  className="h-10 rounded-xl border-slate-300 text-right text-sm"
                />
              </div>
              {/* 6. Departure date */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  تاريخ المغادرة <span className="text-red-500">*</span>
                </Label>
                <DateDebutPicker />
              </div>
              {/* 7. Return date (readonly) */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">تاريخ الرجوع للعمل</Label>
                <DateRetourDisplay />
              </div>
              {/* 8. Interim */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">المعوض</Label>
                <InterimDropdown idPrefix="create" />
                {interimClearedByConflict && (
                  <p className="text-xs text-amber-600">تم مسح المعوض لأنه لا يمكن أن يكون نفس الموظف.</p>
                )}
              </div>
              {/* 9. Document */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">الوثيقة المرجعية</Label>
                <ReferenceFileSection idPrefix="create" />
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
                  disabled={submitLoading || !formData.date_fin || !formData.duree_jours}
                  className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {submitLoading ? 'جاري الحفظ...' : 'إضافة الرخصة'}
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
              {/* 1. Hors solde status — read-only in edit mode */}
              <div className={`rounded-xl border px-3 py-2.5 text-sm ${editingConge?.hors_solde ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                <span className="font-medium">خارج الرصيد: </span>
                {editingConge?.hors_solde ? 'نعم' : 'لا'}
                <span className="mt-1 block text-xs text-slate-500">
                  لا يمكن تغيير هذا الخيار هنا. احذف الرخصة وأعد إنشاءها لتغييره.
                </span>
              </div>
              {/* 2. Remaining solde — shown only if not hors_solde */}
              {!editingConge?.hors_solde && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">الرصيد المتبقي</Label>
                  <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
                    {soldeLoading ? (
                      <span className="text-sm text-slate-400">جاري التحميل...</span>
                    ) : soldeInfo !== null && formData.professeur_id && formData.type_conge_id ? (
                      <span className={`text-sm font-semibold ${soldeInfo.total > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {soldeInfo.total} {soldeInfo.total === 1 ? 'يوم' : 'أيام'}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">اختر نوع الرخصة أولاً</span>
                    )}
                  </div>
                </div>
              )}
              {/* 3. Professeur — read-only in edit mode */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">الموظف</Label>
                <ProfesseurReadOnly />
                <p className="text-xs text-slate-400">لا يمكن تغيير الموظف. احذف الرخصة وأنشئ رخصة جديدة إذا لزم الأمر.</p>
              </div>
              {/* 4. Type conge */}
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
              {/* 5. Duration */}
              <div className="space-y-1.5">
                <Label htmlFor="edit_duree_jours" className="text-sm font-medium text-slate-700">
                  مدة الرخصة (أيام) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_duree_jours"
                  type="number"
                  min="1"
                  placeholder="عدد الأيام..."
                  value={formData.duree_jours}
                  onChange={(e) => setFormData(prev => ({ ...prev, duree_jours: e.target.value }))}
                  className="h-10 rounded-xl border-slate-300 text-right text-sm"
                />
              </div>
              {/* 6. Departure date */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  تاريخ المغادرة <span className="text-red-500">*</span>
                </Label>
                <DateDebutPicker />
              </div>
              {/* 7. Return date (readonly) */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">تاريخ الرجوع للعمل</Label>
                <DateRetourDisplay />
              </div>
              {/* 8. Interim */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">المعوض</Label>
                <InterimDropdown idPrefix="edit" />
                {interimClearedByConflict && (
                  <p className="text-xs text-amber-600">تم مسح المعوض لأنه لا يمكن أن يكون نفس الموظف.</p>
                )}
              </div>
              {/* 9. Document */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">الوثيقة المرجعية</Label>
                <ReferenceFileSection idPrefix="edit" />
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
                  disabled={submitLoading || !formData.date_fin || !formData.duree_jours}
                  className="cursor-pointer inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {submitLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
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
