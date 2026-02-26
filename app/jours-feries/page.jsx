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
import { Pagination } from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2 } from 'lucide-react'

const ITEMS_PER_PAGE = 10

export default function JoursFeriesPage() {
  const [joursFeries, setJoursFeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [jourToDelete, setJourToDelete] = useState(null)
  const [editingJour, setEditingJour] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [formData, setFormData] = useState({
    date: '',
    nom: '',
    actif: true,
  })

  useEffect(() => {
    fetchJoursFeries()
  }, [])

  const fetchJoursFeries = async () => {
    try {
      const response = await fetch('/api/jours-feries?actif=all')
      if (response.ok) {
        const data = await response.json()
        setJoursFeries(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des jours fériés:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingJour
        ? `/api/jours-feries/${editingJour.id}`
        : '/api/jours-feries'
      const method = editingJour ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setOpen(false)
        setEditingJour(null)
        setFormData({
          date: '',
          nom: '',
          actif: true,
        })
        setCurrentPage(1)
        fetchJoursFeries()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Erreur lors de la sauvegarde')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur lors de la sauvegarde')
      setErrorDialogOpen(true)
    }
  }

  const handleEdit = (jour) => {
    setEditingJour(jour)
    // Formater la date pour l'input (YYYY-MM-DD)
    const dateStr = new Date(jour.date).toISOString().split('T')[0]
    setFormData({
      date: dateStr,
      nom: jour.nom,
      actif: jour.actif,
    })
    setOpen(true)
  }

  const handleDeleteClick = (jour) => {
    setJourToDelete(jour)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!jourToDelete) return

    try {
      const response = await fetch(`/api/jours-feries/${jourToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCurrentPage(1)
        setDeleteDialogOpen(false)
        setJourToDelete(null)
        fetchJoursFeries()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Erreur lors de la suppression')
        setErrorDialogOpen(true)
        setDeleteDialogOpen(false)
        setJourToDelete(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur lors de la suppression')
      setErrorDialogOpen(true)
      setDeleteDialogOpen(false)
      setJourToDelete(null)
    }
  }

  const handleOpenChange = (open) => {
    setOpen(open)
    if (!open) {
      setEditingJour(null)
      setFormData({
        date: '',
        nom: '',
        actif: true,
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        Chargement...
      </div>
    )
  }

  const totalPages = Math.ceil(joursFeries.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedJoursFeries = joursFeries.slice(startIndex, endIndex)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Jours Fériés</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">Nouveau Jour Férié</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingJour ? 'Modifier le Jour Férié' : 'Nouveau Jour Férié'}
              </DialogTitle>
              <DialogDescription>
                {editingJour
                  ? 'Modifier les informations du jour férié'
                  : 'Ajouter un nouveau jour férié au référentiel'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) =>
                    setFormData({ ...formData, nom: e.target.value })
                  }
                  placeholder="Ex: Fête du Travail"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="actif"
                  checked={formData.actif}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actif: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="actif" className="cursor-pointer">
                  Actif (utilisé dans le calcul des congés)
                </Label>
              </div>
              <Button type="submit" className="w-full">
                {editingJour ? 'Modifier' : 'Créer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white [&>tr]:bg-white [&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-white">
            {joursFeries.length === 0 ? (
              <TableRow className="bg-white">
                <TableCell colSpan={4} className="text-center">
                  Aucun jour férié trouvé
                </TableCell>
              </TableRow>
            ) : (
              paginatedJoursFeries.map((jour) => (
                <TableRow key={jour.id} className="bg-white hover:bg-slate-50">
                  <TableCell className="font-medium">
                    {new Date(jour.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>{jour.nom}</TableCell>
                  <TableCell>
                    {jour.actif ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Actif
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500 border-gray-500">
                        Inactif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleEdit(jour)}
                        title="Modifier"
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => handleDeleteClick(jour)}
                        title="Supprimer"
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le jour férié "{jourToDelete?.nom}" du {jourToDelete && new Date(jourToDelete.date).toLocaleDateString('fr-FR')} ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setJourToDelete(null)
              }}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto"
            >
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
