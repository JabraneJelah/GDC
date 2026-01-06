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

export default function TitresPage() {
  const [titres, setTitres] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [titreToDelete, setTitreToDelete] = useState(null)
  const [editingTitre, setEditingTitre] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [formData, setFormData] = useState({
    nom: '',
  })

  useEffect(() => {
    fetchTitres()
  }, [])

  const fetchTitres = async () => {
    try {
      const response = await fetch('/api/titres')
      if (response.ok) {
        const data = await response.json()
        setTitres(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des titres:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingTitre
        ? `/api/titres/${editingTitre.id}`
        : '/api/titres'
      const method = editingTitre ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setOpen(false)
        setEditingTitre(null)
        setFormData({ nom: '' })
        setCurrentPage(1)
        fetchTitres()
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

  const handleEdit = (titre) => {
    setEditingTitre(titre)
    setFormData({ nom: titre.nom })
    setOpen(true)
  }

  const handleDeleteClick = (titre) => {
    setTitreToDelete(titre)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!titreToDelete) return

    try {
      const response = await fetch(`/api/titres/${titreToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCurrentPage(1)
        setDeleteDialogOpen(false)
        setTitreToDelete(null)
        fetchTitres()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Erreur lors de la suppression')
        setErrorDialogOpen(true)
        setDeleteDialogOpen(false)
        setTitreToDelete(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur lors de la suppression')
      setErrorDialogOpen(true)
      setDeleteDialogOpen(false)
      setTitreToDelete(null)
    }
  }

  const handleOpenChange = (open) => {
    setOpen(open)
    if (!open) {
      setEditingTitre(null)
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

  const totalPages = Math.ceil(titres.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedTitres = titres.slice(startIndex, endIndex)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Titres</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">Nouveau Titre</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTitre ? 'Modifier le Titre' : 'Nouveau Titre'}
              </DialogTitle>
              <DialogDescription>
                {editingTitre
                  ? 'Modifier les informations du titre'
                  : 'Créer un nouveau titre'}
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
                  placeholder="Ex: Professeur, Docteur, etc."
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingTitre ? 'Modifier' : 'Créer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white [&>tr]:bg-white [&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-white">
            {titres.length === 0 ? (
              <TableRow className="bg-white">
                <TableCell colSpan={3} className="text-center">
                  Aucun titre trouvé
                </TableCell>
              </TableRow>
            ) : (
              paginatedTitres.map((titre) => (
                <TableRow key={titre.id} className="bg-white hover:bg-slate-50">
                  <TableCell>{titre.id}</TableCell>
                  <TableCell className="font-medium">{titre.nom}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleEdit(titre)}
                        title="Modifier"
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => handleDeleteClick(titre)}
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
              Êtes-vous sûr de vouloir supprimer le titre "{titreToDelete?.nom}" ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setTitreToDelete(null)
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

