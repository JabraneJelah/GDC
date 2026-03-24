'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Pagination } from '@/components/ui/pagination'
import { X, Upload, FileSpreadsheet, Trash2, CalendarPlus, Download } from 'lucide-react'

const ITEMS_PER_PAGE = 8

export default function ProfesseursPage() {
  const [professeurs, setProfesseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    nom: '',
    prenom: '',
    ppr: '',
    hopital_id: '',
  })
  const [open, setOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [messageDialogIsError, setMessageDialogIsError] = useState(true)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [professeurToDelete, setProfesseurToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedProfesseurs, setSelectedProfesseurs] = useState(new Set())
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [bulkAddSoldesDialogOpen, setBulkAddSoldesDialogOpen] = useState(false)
  const [bulkAddYear, setBulkAddYear] = useState(new Date().getFullYear().toString())
  const [bulkAddLoading, setBulkAddLoading] = useState(false)
  const [bulkAddResult, setBulkAddResult] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const selectAllCheckboxRef = useRef(null)
  const [categories, setCategories] = useState([])
  const [specialites, setSpecialites] = useState([])
  const [titres, setTitres] = useState([])
  const [services, setServices] = useState([])
  const [hopitaux, setHopitaux] = useState([])
  const [grades, setGrades] = useState([])
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    ppr: '',
    specialite_id: '',
    categorie_personnel_id: '',
    titre_id: '',
    service_id: '',
    hopital_id: '',
    grade_id: '',
  })

  useEffect(() => {
    fetchProfesseurs()
    fetchOptions()
    setCurrentPage(1)
    setSelectedProfesseurs(new Set())
  }, [filters.nom, filters.prenom, filters.ppr, filters.hopital_id])

  // Set indeterminate state for select all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const paginatedProfesseurs = professeurs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      )
      const someSelected = selectedProfesseurs.size > 0 && selectedProfesseurs.size < paginatedProfesseurs.length
      selectAllCheckboxRef.current.indeterminate = someSelected
    }
  }, [professeurs, currentPage, selectedProfesseurs])

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

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data)
      }
      if (specialitesRes.ok) {
        const data = await specialitesRes.json()
        setSpecialites(data)
      }
      if (titresRes.ok) {
        const data = await titresRes.json()
        setTitres(data)
      }
      if (servicesRes.ok) {
        const data = await servicesRes.json()
        setServices(data)
      }
      if (hopitauxRes.ok) {
        const data = await hopitauxRes.json()
        setHopitaux(data)
      }
      if (gradesRes.ok) {
        const data = await gradesRes.json()
        setGrades(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des options:', error)
    }
  }

  const fetchProfesseurs = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.nom.trim()) {
        params.append('nom', filters.nom.trim())
      }
      if (filters.prenom.trim()) {
        params.append('prenom', filters.prenom.trim())
      }
      if (filters.ppr.trim()) {
        params.append('ppr', filters.ppr.trim())
      }
      if (filters.hopital_id) {
        params.append('hopital_id', filters.hopital_id)
      }
      
      const url = params.toString() ? `/api/professeurs?${params.toString()}` : '/api/professeurs'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setProfesseurs(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des professeurs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilter = () => {
    setFilters({
      nom: '',
      prenom: '',
      ppr: '',
      hopital_id: '',
    })
    setCurrentPage(1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/professeurs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setOpen(false)
        setFormData({
          nom: '',
          prenom: '',
          ppr: '',
          specialite_id: '',
          categorie_personnel_id: '',
          titre_id: '',
          service_id: '',
          hopital_id: '',
          grade_id: '',
        })
        setCurrentPage(1)
        fetchProfesseurs()
      } else {
        const data = await response.json()
        setMessageDialogIsError(true)
        setErrorMessage(data.error || 'Erreur lors de la création')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessageDialogIsError(true)
      setErrorMessage('Erreur lors de la création')
      setErrorDialogOpen(true)
    }
  }

  const handleImportExcel = async (e) => {
    e.preventDefault()
    if (!importFile) {
      setMessageDialogIsError(true)
      setErrorMessage('Veuillez sélectionner un fichier Excel')
      setErrorDialogOpen(true)
      return
    }

    setImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch('/api/soldes/import-excel', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setImportResult(data)
        setImportFile(null)
        // Recharger les professeurs pour voir les nouveaux soldes
        fetchProfesseurs()
      } else {
        let errorMsg = data.error || 'Erreur lors de l\'import'
        
        // Ajouter des détails de débogage si disponibles
        if (data.foundColumns) {
          errorMsg += `\n\nColonnes trouvées dans le fichier:\n${data.foundColumns.join(', ')}`
        }
        if (data.details) {
          errorMsg += `\n\nDétails:\n`
          errorMsg += `- Colonne "Nom" trouvée: ${data.details.nomFound ? 'Oui' : 'Non'}\n`
          errorMsg += `- Colonne "Prénom" trouvée: ${data.details.prenomFound ? 'Oui' : 'Non'}`
          if (data.details.allColumns && data.details.allColumns.length > 0) {
            errorMsg += `\n\nToutes les colonnes détectées:\n`
            data.details.allColumns.forEach((col, idx) => {
              const displayValue = col.original || '(vide)'
              errorMsg += `${idx + 1}. "${displayValue}"${col.normalized ? ` (normalisé: "${col.normalized}")` : ''}\n`
            })
          } else {
            errorMsg += `\n\nAucune colonne détectée dans la ligne d'en-têtes.`
          }
        }
        if (data.debug) {
          errorMsg += `\n\nInformations de débogage:\n`
          if (data.debug.firstFewRows) {
            errorMsg += `Premières lignes du fichier:\n`
            data.debug.firstFewRows.forEach((rowInfo) => {
              errorMsg += `Ligne ${rowInfo.rowIndex + 1}: ${rowInfo.values.join(', ')}\n`
            })
          }
        }
        
        setMessageDialogIsError(true)
        setErrorMessage(errorMsg)
        setErrorDialogOpen(true)
        setImporting(false)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessageDialogIsError(true)
      setErrorMessage('Erreur lors de l\'import')
      setErrorDialogOpen(true)
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteClick = (professeur) => {
    setProfesseurToDelete(professeur)
    setDeleteDialogOpen(true)
  }

  const handleDeleteProfesseur = async () => {
    if (!professeurToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/professeurs/${professeurToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDeleteDialogOpen(false)
        setProfesseurToDelete(null)
        setCurrentPage(1)
        setSelectedProfesseurs(new Set())
        fetchProfesseurs()
      } else {
        const data = await response.json()
        setMessageDialogIsError(true)
        setErrorMessage(data.error || 'Erreur lors de la suppression')
        setErrorDialogOpen(true)
        setDeleteDialogOpen(false)
        setProfesseurToDelete(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessageDialogIsError(true)
      setErrorMessage('Erreur lors de la suppression')
      setErrorDialogOpen(true)
      setDeleteDialogOpen(false)
      setProfesseurToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleSelectProfesseur = (professeurId) => {
    const newSelected = new Set(selectedProfesseurs)
    if (newSelected.has(professeurId)) {
      newSelected.delete(professeurId)
    } else {
      newSelected.add(professeurId)
    }
    setSelectedProfesseurs(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedProfesseurs.size === paginatedProfesseurs.length) {
      setSelectedProfesseurs(new Set())
    } else {
      setSelectedProfesseurs(new Set(paginatedProfesseurs.map(p => p.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedProfesseurs.size === 0) return

    setDeleting(true)
    try {
      const response = await fetch('/api/professeurs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: Array.from(selectedProfesseurs) }),
      })

      if (response.ok) {
        const data = await response.json()
        setBulkDeleteDialogOpen(false)
        setSelectedProfesseurs(new Set())
        setCurrentPage(1)
        fetchProfesseurs()
        setMessageDialogIsError(false)
        setErrorMessage(data.message || 'Suppression effectuée avec succès')
        setErrorDialogOpen(true)
      } else {
        const data = await response.json()
        setMessageDialogIsError(true)
        setErrorMessage(data.error || 'Erreur lors de la suppression multiple')
        setErrorDialogOpen(true)
        setBulkDeleteDialogOpen(false)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessageDialogIsError(true)
      setErrorMessage('Erreur lors de la suppression multiple')
      setErrorDialogOpen(true)
      setBulkDeleteDialogOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkAddAnnualSoldes = async (e) => {
    e.preventDefault()
    setBulkAddLoading(true)
    setBulkAddResult(null)
    try {
      const response = await fetch('/api/soldes/bulk-add-annual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annee: parseInt(bulkAddYear, 10) }),
      })
      const data = await response.json()
      if (response.ok) {
        setBulkAddResult(data)
        fetchProfesseurs()
      } else {
        setMessageDialogIsError(true)
        setErrorMessage(data.error || "Erreur lors de l'ajout en masse des soldes")
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessageDialogIsError(true)
      setErrorMessage("Erreur lors de l'ajout en masse des soldes")
      setErrorDialogOpen(true)
    } finally {
      setBulkAddLoading(false)
    }
  }

  const handleExportSoldes = async () => {
    setExportLoading(true)
    try {
      const res = await fetch('/api/soldes/export-excel', { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessageDialogIsError(true)
        setErrorMessage(data.error || 'Erreur lors de l\'export')
        setErrorDialogOpen(true)
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const filenameMatch = disposition?.match(/filename="?([^";]+)"?/)
      const filename = filenameMatch?.[1] || `soldes-conges-${new Date().toISOString().slice(0, 10)}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur export:', error)
      setMessageDialogIsError(true)
      setErrorMessage('Erreur lors de l\'export Excel')
      setErrorDialogOpen(true)
    } finally {
      setExportLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Chargement...</div>
  }

  const totalPages = Math.ceil(professeurs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedProfesseurs = professeurs.slice(startIndex, endIndex)
  const allSelected = paginatedProfesseurs.length > 0 && selectedProfesseurs.size === paginatedProfesseurs.length

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Professeurs</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={bulkAddSoldesDialogOpen} onOpenChange={(open) => {
            setBulkAddSoldesDialogOpen(open)
            if (!open) setBulkAddResult(null)
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <CalendarPlus className="h-4 w-4 mr-2" />
                Ajouter Soldes Annuels
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter les soldes annuels à tous les professeurs</DialogTitle>

              </DialogHeader>
              <form onSubmit={handleBulkAddAnnualSoldes} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-add-year">Année</Label>
                  <Select
                    value={bulkAddYear}
                    onValueChange={setBulkAddYear}
                    disabled={bulkAddLoading}
                  >
                    <SelectTrigger id="bulk-add-year">
                      <SelectValue placeholder="Sélectionner l'année" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => {
                        const y = new Date().getFullYear() - 2 + i
                        return (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {bulkAddResult ? (
                  bulkAddResult.summary.professeursTotal === 0 ? (
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                      <p className="font-medium text-slate-800">Aucun professeur</p>
                      <p className="text-sm text-slate-600">Aucun solde n&apos;a été affecté.</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-md bg-green-50 border border-green-200 space-y-2">
                      <p className="font-medium text-green-800">Opération terminée</p>
                      <p className="text-sm text-green-700">
                        {bulkAddResult.summary.professeursMisAJour} professeur(s) mis à jour sur {bulkAddResult.summary.professeursTotal} au total.
                      </p>
                      <p className="text-sm text-green-700">
                        {bulkAddResult.summary.soldesCrees} solde(s) créé(s), {bulkAddResult.summary.soldesIgnores} déjà existant(s).
                      </p>
                    </div>
                  )
                ) : null}
                <div className="flex gap-2">
                  <Button type="submit" disabled={bulkAddLoading} className="flex-1">
                    {bulkAddLoading ? 'Ajout en cours...' : 'Ajouter à tous'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkAddSoldesDialogOpen(false)}
                  >
                    Fermer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleExportSoldes}
            disabled={exportLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            {exportLoading ? 'Export...' : 'Exporter Soldes (Excel)'}
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Upload className="h-4 w-4 mr-2" />
                Importer Soldes (Excel)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Importer les Soldes de Congé depuis Excel</DialogTitle>
               
              </DialogHeader>
              <form onSubmit={handleImportExcel} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="excel-file">Fichier Excel (.xlsx ou .xls) *</Label>
                  <Input
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    required
                    disabled={importing}
                  />
                  
                </div>
                {importResult && (
                  <div className="space-y-2">
                    {importResult.summary?.importSansColonneSolde && (
                      <p className="text-sm text-blue-900 p-3 bg-blue-50 border border-blue-100 rounded-md">
                        Aucune colonne de solde détectée — les professeurs sont importés sans solde initial.
                      </p>
                    )}
                    {importResult.summary?.warnings > 0 && (
                      <p className="text-xs text-amber-900 p-2 bg-amber-50 border border-amber-100 rounded-md">
                        {importResult.summary.warnings} avertissement(s) (grade ou spécialité non reconnus sur certaines lignes — voir le détail de la réponse si besoin).
                      </p>
                    )}
                    <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded-md">
                      L'import s'est terminé. Succès : {importResult.summary.success}, Erreurs : {importResult.summary.errors}, Ignorés : {importResult.summary.skipped}.
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={importing || !importFile} className="flex-1">
                    {importing ? (
                      'Import en cours...'
                    ) : (
                      <span className="flex items-center">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Importer
                      </span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImportDialogOpen(false)
                      setImportFile(null)
                      setImportResult(null)
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto cursor-pointer">Nouveau Professeur</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] w-full max-w-[95vw] sm:max-w-2xl flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Nouveau Professeur</DialogTitle>
              
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
              <form onSubmit={handleSubmit} className="space-y-4">       
              <div className="space-y-2">
                <Label htmlFor="titre_id">Titre</Label>
                <Select
                  value={formData.titre_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, titre_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un titre (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {titres.map((titre) => (
                      <SelectItem key={titre.id} value={titre.id.toString()}>
                        {titre.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_id">Service</Label>
                <Select
                  value={formData.service_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, service_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un service (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hopital_id">Hôpital</Label>
                <Select
                  value={formData.hopital_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, hopital_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un hôpital (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {hopitaux.map((hopital) => (
                      <SelectItem key={hopital.id} value={hopital.id.toString()}>
                        {hopital.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade_id">Grade</Label>
                <Select
                  value={formData.grade_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, grade_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un grade (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id.toString()}>
                        {grade.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>       
                <div className="space-y-2">
                <Label htmlFor="categorie_personnel_id">Catégorie Personnel</Label>
                <Select
                  value={formData.categorie_personnel_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categorie_personnel_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialite_id">Spécialité</Label>
                <Select
                  value={formData.specialite_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, specialite_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une spécialité (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialites.map((spec) => (
                      <SelectItem key={spec.id} value={spec.id.toString()}>
                        {spec.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) =>
                    setFormData({ ...formData, nom: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) =>
                    setFormData({ ...formData, prenom: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ppr">PPR</Label>
                <Input
                  id="ppr"
                  value={formData.ppr}
                  onChange={(e) =>
                    setFormData({ ...formData, ppr: e.target.value })
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Créer
              </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full sm:w-auto">
              <Label htmlFor="filter-nom" className="text-xs text-slate-600 mb-1.5 block">
                Nom
              </Label>
              <Input
                id="filter-nom"
                placeholder="Entrez le nom..."
                value={filters.nom}
                onChange={(e) => {
                  setFilters({ ...filters, nom: e.target.value })
                  setCurrentPage(1)
                }}
                className="w-full"
              />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <Label htmlFor="filter-prenom" className="text-xs text-slate-600 mb-1.5 block">
                Prénom
              </Label>
              <Input
                id="filter-prenom"
                placeholder="Entrez le prénom..."
                value={filters.prenom}
                onChange={(e) => {
                  setFilters({ ...filters, prenom: e.target.value })
                  setCurrentPage(1)
                }}
                className="w-full"
              />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <Label htmlFor="filter-ppr" className="text-xs text-slate-600 mb-1.5 block">
                PPR
              </Label>
              <Input
                id="filter-ppr"
                placeholder="Entrez le PPR..."
                value={filters.ppr}
                onChange={(e) => {
                  setFilters({ ...filters, ppr: e.target.value })
                  setCurrentPage(1)
                }}
                className="w-full"
              />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <Label htmlFor="filter-hopital" className="text-xs text-slate-600 mb-1.5 block">
                Hôpital
              </Label>
              <Select
                value={filters.hopital_id || 'all'}
                onValueChange={(value) => {
                  setFilters({ ...filters, hopital_id: value === 'all' ? '' : value })
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un hôpital" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les hôpitaux</SelectItem>
                  {hopitaux.map((hopital) => (
                    <SelectItem key={hopital.id} value={hopital.id.toString()}>
                      {hopital.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(filters.nom || filters.prenom || filters.ppr || filters.hopital_id) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilter}
                className="w-full sm:w-auto"
              >
                <X className="h-4 w-4 mr-1.5" />
                Effacer
              </Button>
            )}
          </div>
        </div>
      </div>

      {selectedProfesseurs.size > 0 && (
        <div className="rounded-md border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div className="text-sm text-slate-700">
            {selectedProfesseurs.size} professeur(s) sélectionné(s)
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteDialogOpen(true)}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Supprimer la sélection
          </Button>
        </div>
      )}

      <div className="rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  ref={selectAllCheckboxRef}
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>PPR</TableHead>
              <TableHead>Spécialité</TableHead>
              <TableHead>Hopitale</TableHead>
              <TableHead>Solde Congé</TableHead>
              <TableHead>Congés</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white [&>tr]:bg-white [&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-white">
            {professeurs.length === 0 ? (
              <TableRow className="bg-white">
                <TableCell colSpan={9} className="text-center">
                  Aucun professeur trouvé
                </TableCell>
              </TableRow>
            ) : (
              paginatedProfesseurs.map((professeur) => {
                const soldesNonExpires = professeur.soldes || []
                const totalJoursRestants = soldesNonExpires.reduce(
                  (sum, solde) => sum + solde.jours_restants,
                  0
                )
                const isSelected = selectedProfesseurs.has(professeur.id)
                return (
                  <TableRow key={professeur.id} className={`bg-white hover:bg-slate-50 ${isSelected ? 'bg-slate-100' : ''}`}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectProfesseur(professeur.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>{professeur.nom}</TableCell>
                    <TableCell>{professeur.prenom}</TableCell>
                    <TableCell>{professeur.ppr ?? '—'}</TableCell>
                    <TableCell>
                      {professeur.specialite?.nom || '-'}
                    </TableCell>
                    <TableCell>
                      {professeur.hopital?.nom || '-'}
                    </TableCell>
                    <TableCell>
                      {soldesNonExpires.length > 0 ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-[#16A34A]">
                            Total: {totalJoursRestants} jours
                          </div>
                          <div className="text-xs text-slate-600 space-y-0.5">
                            {soldesNonExpires.map((solde) => (
                              <div key={solde.id}>
                                {solde.annee}: {solde.jours_restants} / {solde.jours_total} jours
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{professeur._count.conges}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/professeurs/${professeur.id}`}>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            Voir détails
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(professeur)}
                          className="w-full sm:w-auto"
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" />
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page)
              setSelectedProfesseurs(new Set())
            }}
          />
        )}
      </div>

      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={messageDialogIsError ? 'text-red-600' : 'text-green-600'}>
              {messageDialogIsError ? 'Erreur' : 'Succès'}
            </DialogTitle>
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-slate-700 space-y-2">
              {professeurToDelete && (
                <>
                  <p>
                    Êtes-vous sûr de vouloir supprimer le professeur{' '}
                    <strong>
                      {professeurToDelete.titre?.nom ? `${professeurToDelete.titre.nom} ` : ''}{professeurToDelete.prenom} {professeurToDelete.nom}
                    </strong>{' '}
                    {professeurToDelete.ppr ? `(PPR: ${professeurToDelete.ppr})` : '(sans PPR)'} ?
                  </p>
                  {professeurToDelete._count?.conges > 0 && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-amber-800 font-semibold">
                        ⚠️ Attention : Ce professeur a {professeurToDelete._count.conges} congé(s) enregistré(s).
                      </p>
                      <p className="text-amber-700 text-sm mt-1">
                        Tous les congés associés à ce professeur seront également supprimés de manière permanente.
                      </p>
                    </div>
                  )}
                  {professeurToDelete._count?.soldes > 0 && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-amber-800 font-semibold">
                        ⚠️ Ce professeur a {professeurToDelete._count.soldes} solde(s) de congé.
                      </p>
                      <p className="text-amber-700 text-sm mt-1">
                        Tous les soldes seront également supprimés.
                      </p>
                    </div>
                  )}
                  <p className="text-red-600 font-medium mt-3">
                    Cette action est irréversible.
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setProfesseurToDelete(null)
              }}
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProfesseur}
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Confirmer la suppression multiple
            </DialogTitle>
            <DialogDescription className="text-slate-700 space-y-2">
              <p>
                Êtes-vous sûr de vouloir supprimer <strong>{selectedProfesseurs.size}</strong> professeur(s) sélectionné(s) ?
              </p>
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-amber-800 font-semibold">
                  ⚠️ Attention : Cette action supprimera également tous les congés et soldes associés à ces professeurs.
                </p>
                <p className="text-amber-700 text-sm mt-1">
                  Cette action est irréversible et ne peut pas être annulée.
                </p>
              </div>

            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setBulkDeleteDialogOpen(false)
              }}
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              {deleting ? 'Suppression...' : `Supprimer ${selectedProfesseurs.size} professeur(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

