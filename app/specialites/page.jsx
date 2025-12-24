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
import { Pencil, Trash2 } from 'lucide-react'

const ITEMS_PER_PAGE = 10

export default function SpecialitesPage() {
  const [specialites, setSpecialites] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [specialiteToDelete, setSpecialiteToDelete] = useState(null)
  const [editingSpecialite, setEditingSpecialite] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [formData, setFormData] = useState({
    nom: '',
  })

  useEffect(() => {
    fetchSpecialites()
  }, [])

  const fetchSpecialites = async () => {
    try {
      const response = await fetch('/api/specialites')
      if (response.ok) {
        const data = await response.json()
        setSpecialites(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des spécialités:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingSpecialite
        ? `/api/specialites/${editingSpecialite.id}`
        : '/api/specialites'
      const method = editingSpecialite ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setOpen(false)
        setEditingSpecialite(null)
        setFormData({ nom: '' })
        setCurrentPage(1)
        fetchSpecialites()
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

  const handleEdit = (specialite) => {
    setEditingSpecialite(specialite)
    setFormData({ nom: specialite.nom })
    setOpen(true)
  }

  const handleDeleteClick = (specialite) => {
    setSpecialiteToDelete(specialite)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!specialiteToDelete) return

    try {
      const response = await fetch(`/api/specialites/${specialiteToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCurrentPage(1)
        setDeleteDialogOpen(false)
        setSpecialiteToDelete(null)
        fetchSpecialites()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Erreur lors de la suppression')
        setErrorDialogOpen(true)
        setDeleteDialogOpen(false)
        setSpecialiteToDelete(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur lors de la suppression')
      setErrorDialogOpen(true)
      setDeleteDialogOpen(false)
      setSpecialiteToDelete(null)
    }
  }

  const handleOpenChange = (open) => {
    setOpen(open)
    if (!open) {
      setEditingSpecialite(null)
      setFormData({ nom: '' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        Chargement...
      </div>
    )
  }

  const totalPages = Math.ceil(specialites.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedSpecialites = specialites.slice(startIndex, endIndex)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Spécialités</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">Nouvelle Spécialité</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSpecialite ? 'Modifier la Spécialité' : 'Nouvelle Spécialité'}
              </DialogTitle>
              <DialogDescription>
                {editingSpecialite
                  ? 'Modifier les informations de la spécialité'
                  : 'Créer une nouvelle spécialité'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) =>
                    setFormData({ ...formData, nom: e.target.value })
                  }
                  placeholder="Ex: Mathématiques, Physique, etc."
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingSpecialite ? 'Modifier' : 'Créer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white [&>tr]:bg-white [&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-white">
            {specialites.length === 0 ? (
              <TableRow className="bg-white">
                <TableCell colSpan={3} className="text-center">
                  Aucune spécialité trouvée
                </TableCell>
              </TableRow>
            ) : (
              paginatedSpecialites.map((specialite) => (
                <TableRow key={specialite.id} className="bg-white hover:bg-slate-50">
                  <TableCell>{specialite.id}</TableCell>
                  <TableCell className="font-medium">{specialite.nom}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleEdit(specialite)}
                        title="Modifier"
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => handleDeleteClick(specialite)}
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
              Êtes-vous sûr de vouloir supprimer la spécialité "{specialiteToDelete?.nom}" ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setSpecialiteToDelete(null)
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

