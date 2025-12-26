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
import { Pencil, Trash2, X } from 'lucide-react'

const ITEMS_PER_PAGE = 8

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

  const calculateDays = (dateDebut, dateFin) => {
    if (dateDebut && dateFin) {
      const start = new Date(dateDebut + 'T00:00:00')
      const end = new Date(dateFin + 'T00:00:00')
      
      // Vérifier que la date de fin est après la date de début
      if (end < start) {
        setFormData(prev => ({ ...prev, duree_jours: '0' }))
        return
      }
      
      // Compter uniquement les jours ouvrables (exclure samedi et dimanche)
      let workingDays = 0
      const currentDate = new Date(start)
      
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay() // 0 = dimanche, 6 = samedi
        // Compter seulement du lundi (1) au vendredi (5)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDays++
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      setFormData(prev => ({ 
        ...prev, 
        duree_jours: workingDays.toString() 
      }))
    }
  }

  // Calcul automatique de la durée quand les dates changent
  useEffect(() => {
    if (formData.date_debut && formData.date_fin) {
      calculateDays(formData.date_debut, formData.date_fin)
    }
  }, [formData.date_debut, formData.date_fin])

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
    setEditingConge(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingConge ? `/api/conges/${editingConge.id}` : '/api/conges'
      const method = editingConge ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          type_conge_id: parseInt(formData.type_conge_id),
          duree_jours: parseInt(formData.duree_jours),
        }),
      })

      if (response.ok) {
        setOpen(false)
        setEditOpen(false)
        resetForm()
        setCurrentPage(1)
        fetchData()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || `Erreur lors de la ${editingConge ? 'modification' : 'création'}`)
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage(`Erreur lors de la ${editingConge ? 'modification' : 'création'}`)
      setErrorDialogOpen(true)
    }
  }

  const handleEdit = (conge) => {
    // Formater les dates pour les inputs de type date (YYYY-MM-DD)
    const formatDateForInput = (dateString) => {
      const date = new Date(dateString)
      return date.toISOString().split('T')[0]
    }

    setEditingConge(conge)
    setFormData({
      professeur_id: conge.professeur_id,
      type_conge_id: conge.type_conge_id.toString(),
      date_debut: formatDateForInput(conge.date_debut),
      date_fin: formatDateForInput(conge.date_fin),
      duree_jours: conge.duree_jours.toString(),
      reference_doc: conge.reference_doc || '',
      nom_interim: conge.nom_interim || '',
      prenom_interim: conge.prenom_interim || '',
    })
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
    }
  }

  const handleEditOpenChange = (open) => {
    setEditOpen(open)
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingConge ? 'Modifier le Congé' : 'Nouveau Congé'}</DialogTitle>
              <DialogDescription>
                {editingConge
                  ? 'Modifier les informations du congé'
                  : 'Enregistrer un nouveau congé depuis un document papier'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="professeur_id">Professeur *</Label>
                <Select
                  value={formData.professeur_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, professeur_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un professeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {professeurs.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.prenom} {prof.nom} ({prof.ppr})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_debut">Date début *</Label>
                  <Input
                    id="date_debut"
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => {
                      const newDateDebut = e.target.value
                      setFormData(prev => ({ ...prev, date_debut: newDateDebut }))
                      if (newDateDebut && formData.date_fin) {
                        calculateDays(newDateDebut, formData.date_fin)
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_fin">Date fin *</Label>
                  <Input
                    id="date_fin"
                    type="date"
                    value={formData.date_fin}
                    min={formData.date_debut || undefined}
                    onChange={(e) => {
                      const newDateFin = e.target.value
                      setFormData(prev => ({ ...prev, date_fin: newDateFin }))
                      if (formData.date_debut && newDateFin) {
                        calculateDays(formData.date_debut, newDateFin)
                      }
                    }}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duree_jours">Durée (jours ouvrables) *</Label>
                <Input
                  id="duree_jours"
                  type="number"
                  value={formData.duree_jours}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed"
                  required
                />
                <p className="text-xs text-slate-500">Samedi et dimanche exclus du calcul</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_doc">Référence document</Label>
                <Input
                  id="reference_doc"
                  value={formData.reference_doc}
                  onChange={(e) =>
                    setFormData({ ...formData, reference_doc: e.target.value })
                  }
                  placeholder="Réf. du document papier"
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
              <Button type="submit" className="w-full">
                {editingConge ? 'Modifier' : 'Enregistrer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/*  modification model */}
        <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier le Congé</DialogTitle>
              <DialogDescription>
                Modifier les informations du congé
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_professeur_id">Professeur *</Label>
                <Select
                  value={formData.professeur_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, professeur_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un professeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {professeurs.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.prenom} {prof.nom} ({prof.ppr})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_date_debut">Date début *</Label>
                  <Input
                    id="edit_date_debut"
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => {
                      const newDateDebut = e.target.value
                      setFormData(prev => ({ ...prev, date_debut: newDateDebut }))
                      if (newDateDebut && formData.date_fin) {
                        calculateDays(newDateDebut, formData.date_fin)
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_date_fin">Date fin *</Label>
                  <Input
                    id="edit_date_fin"
                    type="date"
                    value={formData.date_fin}
                    min={formData.date_debut || undefined}
                    onChange={(e) => {
                      const newDateFin = e.target.value
                      setFormData(prev => ({ ...prev, date_fin: newDateFin }))
                      if (formData.date_debut && newDateFin) {
                        calculateDays(formData.date_debut, newDateFin)
                      }
                    }}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_duree_jours">Durée (jours ouvrables) *</Label>
                <Input
                  id="edit_duree_jours"
                  type="number"
                  value={formData.duree_jours}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed"
                  required
                />
                <p className="text-xs text-slate-500">Samedi et dimanche exclus du calcul</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_reference_doc">Référence document</Label>
                <Input
                  id="edit_reference_doc"
                  value={formData.reference_doc}
                  onChange={(e) =>
                    setFormData({ ...formData, reference_doc: e.target.value })
                  }
                  placeholder="Réf. du document papier"
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
              <Button type="submit" className="w-full">
                Modifier
              </Button>
            </form>
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
                        ? `${congeToDelete.professeur.prenom || ''} ${congeToDelete.professeur.nom || ''}`.trim() || 'Professeur inconnu'
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
                    {prof.prenom} {prof.nom} ({prof.ppr})
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
                      ? `${conge.professeur.prenom || ''} ${conge.professeur.nom || ''}`.trim() || '-'
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
                  <TableCell>{conge.reference_doc || '-'}</TableCell>
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


