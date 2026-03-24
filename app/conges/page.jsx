'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'
import { FileText, Pencil, Trash2, X } from 'lucide-react'

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
  const [calculatingDateRetour, setCalculatingDateRetour] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState('')
  const [existingReferenceFile, setExistingReferenceFile] = useState(null)
  // Date de reprise au travail (jour suivant le dernier jour de congé) — affichée comme "date de retour"
  const [dateRetourTravailDisplay, setDateRetourTravailDisplay] = useState('')
  const [horsSolde, setHorsSolde] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

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
      setErrorMessage('Veuillez attendre le calcul de la date de retour (dernier jour de congé) avant d\'enregistrer.')
      setErrorDialogOpen(true)
      return
    }
    if (!formData.professeur_id) {
      setErrorMessage('Veuillez sélectionner un professeur dans la liste (recherchez puis cliquez sur son nom).')
      setErrorDialogOpen(true)
      return
    }
    const typeCongeId = formData.type_conge_id !== '' && !isNaN(parseInt(formData.type_conge_id, 10))
      ? parseInt(formData.type_conge_id, 10)
      : formData.type_conge_id
    if (typeCongeId === '' || typeCongeId == null) {
      setErrorMessage('Veuillez sélectionner un type de congé.')
      setErrorDialogOpen(true)
      return
    }
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
        fetchData()
      } else {
        let message = `Erreur lors de la ${editingConge ? 'modification' : 'création'} (${response.status})`
        try {
          const data = await response.json()
          if (data?.error) message = data.error
        } catch (_) { /* response non JSON */ }
        setErrorMessage(message)
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage(error?.message || `Erreur lors de la ${editingConge ? 'modification' : 'création'}`)
      setErrorDialogOpen(true)
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
      prenom_interim: conge.prenom_interim || '',
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
    setEditOpen(true)
  }

  const handleDeleteClick = (conge) => {
    setCongeToDelete(conge)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!congeToDelete) return

    try {
      const response = await fetch(`/api/conges/${congeToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDeleteDialogOpen(false)
        setCongeToDelete(null)
        setCurrentPage(1)
        fetchData()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Erreur lors de la suppression')
        setErrorDialogOpen(true)
        setDeleteDialogOpen(false)
        setCongeToDelete(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur lors de la suppression')
      setErrorDialogOpen(true)
      setDeleteDialogOpen(false)
      setCongeToDelete(null)
    }
  }

  const handleOpenChange = (open) => {
    setOpen(open)
    if (!open) {
      resetForm()
      setProfesseurSearch('')
      setProfesseurSearchOpen(false)
    }
  }

  const handleEditOpenChange = (open) => {
    setEditOpen(open)
    if (open && formData.professeur_id) {
      const prof = professeurs.find(p => p.id === formData.professeur_id)
      if (prof) {
        setProfesseurSearch(`${prof.titre?.nom ? `${prof.titre.nom} ` : ''}${prof.prenom} ${prof.nom}${prof.ppr ? ` (${prof.ppr})` : ''}`)
      }
    } else if (!open) {
      setProfesseurSearch('')
      setProfesseurSearchOpen(false)
    }
    if (!open) {
      resetForm()
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Chargement...</div>
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
    setFilters({
      professeur_id: 'all',
      type_conge_id: 'all',
      duree: '',
    })
    setCurrentPage(1)
  }

  const hasActiveFilters = filters.professeur_id !== 'all' || filters.type_conge_id !== 'all' || filters.duree !== ''

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Congés</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">Nouveau Congé</Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="flex-shrink-0 space-y-1.5 px-6 pt-6 pb-2 pr-12 text-left">
              <DialogTitle>{editingConge ? 'Modifier le Congé' : 'Nouveau Congé'}</DialogTitle>
              <DialogDescription>
                {editingConge
                  ? 'Modifier les informations du congé'
                  : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="professeur_id">Professeur *</Label>
                <div className="relative">
                  {(() => {
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
                      <>
                        <Input
                          id="professeur_id"
                          placeholder="Rechercher un professeur (nom, prénom, PPR)..."
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
                        />
                        {professeurSearchOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            {filtered.length > 0 ? (
                              filtered.map((prof) => (
                                <div
                                  key={prof.id}
                                  className="px-3 py-2 hover:bg-slate-100 cursor-pointer"
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
                              <div className="px-3 py-2 text-sm text-slate-500">Aucun professeur trouvé</div>
                            )}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type_conge_id">Type de congé *</Label>
                <Select
                  value={formData.type_conge_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type_conge_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
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
              <div className="space-y-2">
                <Label htmlFor="date_debut">Date de départ *</Label>
                <Input
                  id="date_debut"
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duree_jours">Durée du congé (jours ouvrables) *</Label>
                <Input
                  id="duree_jours"
                  type="number"
                  min={1}
                  value={formData.duree_jours}
                  onChange={(e) => {
                    const v = e.target.value
                    setFormData(prev => ({ ...prev, duree_jours: v }))
                  }}
                  placeholder="Ex: 5"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_fin">Date de retour au travail (calculée) *</Label>
                <Input
                  id="date_fin"
                  type="date"
                  value={dateRetourTravailDisplay || formData.date_fin}
                  readOnly
                  className="bg-slate-100"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom_interim">Nom de l'intérim</Label>
                <Input
                  id="nom_interim"
                  value={formData.nom_interim}
                  onChange={(e) =>
                    setFormData({ ...formData, nom_interim: e.target.value })
                  }
                  placeholder="Nom de la personne en intérim"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom_interim">Prénom de l'intérim</Label>
                <Input
                  id="prenom_interim"
                  value={formData.prenom_interim}
                  onChange={(e) =>
                    setFormData({ ...formData, prenom_interim: e.target.value })
                  }
                  placeholder="Prénom de la personne en intérim"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_file">Pièce justificative / Référence</Label>
                <div className="rounded-md border border-slate-200 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      id="reference_file"
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
                    />
                    {(selectedFile || existingReferenceFile) && (
                      <Button type="button" variant="ghost" size="sm" onClick={clearReferenceFile} className="h-9 w-9 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {(selectedFile || existingReferenceFile) && (
                    <div className="rounded-md border border-slate-200 p-2 bg-slate-50">
                      {((selectedFile?.type || existingReferenceFile?.fileType || '').startsWith('image/')) ? (
                        <img
                          src={filePreviewUrl || existingReferenceFile?.fileUrl}
                          alt="Aperçu pièce justificative"
                          className="h-20 w-20 object-cover rounded border border-slate-200"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <FileText className="h-4 w-4 text-red-600" />
                          <span>{selectedFile?.name || existingReferenceFile?.fileName || 'Document PDF'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-md border border-slate-200 p-3">
                <input
                  id="hors_solde"
                  type="checkbox"
                  checked={horsSolde}
                  onChange={(e) => setHorsSolde(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="hors_solde" className="text-slate-800">
                    Hors solde
                  </Label>
                  <p className="text-xs text-slate-500">
                    Enregistrer ce congé sans déduire de jours de solde (aucun solde requis).
                  </p>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={calculatingDateRetour || !formData.date_fin}
              >
                {calculatingDateRetour ? 'Calcul de la date de retour...' : (editingConge ? 'Modifier' : 'Enregistrer')}
              </Button>
            </form>
            </div>
          </DialogContent>
        </Dialog>

        {/*  modification model */}
        <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
          <DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="flex-shrink-0 space-y-1.5 px-6 pt-6 pb-2 pr-12 text-left">
              <DialogTitle>Modifier le Congé</DialogTitle>
              <DialogDescription>
                Modifier les informations du congé
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_professeur_id">Professeur *</Label>
                <div className="relative">
                  {(() => {
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
                      <>
                        <Input
                          id="edit_professeur_id"
                          placeholder="Rechercher un professeur (nom, prénom, PPR)..."
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
                        />
                        {professeurSearchOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            {filtered.length > 0 ? (
                              filtered.map((prof) => (
                                <div
                                  key={prof.id}
                                  className="px-3 py-2 hover:bg-slate-100 cursor-pointer"
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
                              <div className="px-3 py-2 text-sm text-slate-500">Aucun professeur trouvé</div>
                            )}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_type_conge_id">Type de congé *</Label>
                <Select
                  value={formData.type_conge_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type_conge_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
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
              <div className="space-y-2">
                <Label htmlFor="edit_date_debut">Date de départ *</Label>
                <Input
                  id="edit_date_debut"
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_duree_jours">Durée du congé (jours ouvrables) *</Label>
                <Input
                  id="edit_duree_jours"
                  type="number"
                  min={1}
                  value={formData.duree_jours}
                  onChange={(e) => setFormData(prev => ({ ...prev, duree_jours: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_date_fin">Date de retour au travail (calculée) *</Label>
                <Input
                  id="edit_date_fin"
                  type="date"
                  value={dateRetourTravailDisplay || formData.date_fin}
                  readOnly
                  className="bg-slate-100"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_nom_interim">Nom de l'intérim</Label>
                <Input
                  id="edit_nom_interim"
                  value={formData.nom_interim}
                  onChange={(e) =>
                    setFormData({ ...formData, nom_interim: e.target.value })
                  }
                  placeholder="Nom de la personne en intérim"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_prenom_interim">Prénom de l'intérim</Label>
                <Input
                  id="edit_prenom_interim"
                  value={formData.prenom_interim}
                  onChange={(e) =>
                    setFormData({ ...formData, prenom_interim: e.target.value })
                  }
                  placeholder="Prénom de la personne en intérim"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_reference_file">Pièce justificative / Référence</Label>
                <div className="rounded-md border border-slate-200 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit_reference_file"
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
                    />
                    {(selectedFile || existingReferenceFile) && (
                      <Button type="button" variant="ghost" size="sm" onClick={clearReferenceFile} className="h-9 w-9 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {(selectedFile || existingReferenceFile) && (
                    <div className="rounded-md border border-slate-200 p-2 bg-slate-50">
                      {((selectedFile?.type || existingReferenceFile?.fileType || '').startsWith('image/')) ? (
                        <img
                          src={filePreviewUrl || existingReferenceFile?.fileUrl}
                          alt="Aperçu pièce justificative"
                          className="h-20 w-20 object-cover rounded border border-slate-200"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <FileText className="h-4 w-4 text-red-600" />
                          <span>{selectedFile?.name || existingReferenceFile?.fileName || 'Document PDF'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-medium text-slate-800">Hors solde :</span>{' '}
                {editingConge?.hors_solde ? 'Oui' : 'Non'}
                <span className="block text-xs text-slate-500 mt-1">
                  Le mode ne peut pas être modifié ici. Supprimez et recréez le congé pour changer.
                </span>
              </div>
              <Button type="submit" className="w-full" disabled={calculatingDateRetour}>
                {calculatingDateRetour ? 'Calcul...' : 'Modifier'}
              </Button>
            </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* model de suppresion */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Supprimer le congé</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer ce congé ? Cette action est irréversible.
                {congeToDelete && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-md">
                    <p className="text-sm font-medium">
                      {congeToDelete.professeur
                        ? `${congeToDelete.professeur.titre?.nom ? `${congeToDelete.professeur.titre.nom} ` : ''}${congeToDelete.professeur.prenom || ''} ${congeToDelete.professeur.nom || ''}`.trim() || 'Professeur inconnu'
                        : 'Professeur inconnu'}
                    </p>
                    <p className="text-xs text-slate-600">
                      {new Date(congeToDelete.date_debut).toLocaleDateString('fr-FR')} -{' '}
                      {new Date(congeToDelete.date_fin).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setCongeToDelete(null)
                }}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                Supprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full sm:w-auto">
            <Label htmlFor="filter-professeur" className="text-xs text-slate-600 mb-1.5 block">
              Professeur
            </Label>
            <Select
              value={filters.professeur_id}
              onValueChange={(value) => {
                setFilters({ ...filters, professeur_id: value })
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tous les professeurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les professeurs</SelectItem>
                {professeurs.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.prenom} {prof.nom}{prof.ppr ? ` (${prof.ppr})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <Label htmlFor="filter-type-conge" className="text-xs text-slate-600 mb-1.5 block">
              Type de Congé
            </Label>
            <Select
              value={filters.type_conge_id}
              onValueChange={(value) => {
                setFilters({ ...filters, type_conge_id: value })
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {typesConge.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <Label htmlFor="filter-duree" className="text-xs text-slate-600 mb-1.5 block">
              Durée (jours)
            </Label>
            <Input
              id="filter-duree"
              type="number"
              placeholder="Durée..."
              value={filters.duree}
              onChange={(e) => {
                setFilters({ ...filters, duree: e.target.value })
                setCurrentPage(1)
              }}
              className="w-full"
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-1.5" />
              Effacer
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead>Professeur</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date début</TableHead>
              <TableHead>Date fin</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Intérim</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Créé par</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white [&>tr]:bg-white [&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-white">
            {filteredConges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  {conges.length === 0 ? 'Aucun congé enregistré' : 'Aucun congé ne correspond aux filtres'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedConges.map((conge) => (
                <TableRow key={conge.id}>
                  <TableCell>
                    {conge.professeur
                      ? `${conge.professeur.titre?.nom ? `${conge.professeur.titre.nom} ` : ''}${conge.professeur.prenom || ''} ${conge.professeur.nom || ''}`.trim() || '-'
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {conge.type_conge?.nom || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(conge.date_debut).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    {new Date(conge.date_fin).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>{conge.duree_jours} jours</TableCell>
                  <TableCell>
                    {conge.nom_interim && conge.prenom_interim
                      ? `${conge.nom_interim} ${conge.prenom_interim}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const ref = parseReferenceDoc(conge.reference_doc)
                      if (!ref.referenceNumber && !ref.fileUrl) return '-'
                      return (
                        <div className="space-y-1">
                          {ref.referenceNumber && (
                            <div className="text-xs text-slate-700">{ref.referenceNumber}</div>
                          )}
                          {ref.fileUrl && (
                            ref.fileType?.startsWith('image/') ? (
                              <a href={ref.fileUrl} target="_blank" rel="noreferrer" className="inline-block">
                                <img
                                  src={ref.fileUrl}
                                  alt={ref.fileName || 'Pièce justificative'}
                                  className="h-10 w-10 rounded border border-slate-200 object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={ref.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                              >
                                <FileText className="h-3 w-3" />
                                <span>{ref.fileName || 'Ouvrir PDF'}</span>
                              </a>
                            )
                          )}
                        </div>
                      )
                    })()}
                  </TableCell>
                  <TableCell>{conge.cree_par_rh?.nom_complet || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(conge)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(conge)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Erreur</DialogTitle>
            <DialogDescription className="text-slate-700 whitespace-pre-line">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setErrorDialogOpen(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


