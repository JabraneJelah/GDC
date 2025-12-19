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

const ITEMS_PER_PAGE = 10

export default function TypesCongePage() {
  const [typesConge, setTypesConge] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [typeToDelete, setTypeToDelete] = useState(null)
  const [editingType, setEditingType] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [formData, setFormData] = useState({
    nom: '',
    document_obligatoire: false,
  })

  useEffect(() => {
    fetchTypesConge()
  }, [])

  const fetchTypesConge = async () => {
    try {
      const response = await fetch('/api/types-conge')
      if (response.ok) {
        const data = await response.json()
        setTypesConge(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des types de congé:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingType
        ? `/api/types-conge/${editingType.id}`
        : '/api/types-conge'
      const method = editingType ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setOpen(false)
        setEditingType(null)
        setFormData({
          nom: '',
          document_obligatoire: false,
        })
        setCurrentPage(1)
        fetchTypesConge()
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

  const handleEdit = (type) => {
    setEditingType(type)
    setFormData({
      nom: type.nom,
      document_obligatoire: type.document_obligatoire,
    })
    setOpen(true)
  }

  const handleDeleteClick = (type) => {
    setTypeToDelete(type)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!typeToDelete) return

    try {
      const response = await fetch(`/api/types-conge/${typeToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCurrentPage(1)
        setDeleteDialogOpen(false)
        setTypeToDelete(null)
        fetchTypesConge()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Erreur lors de la suppression')
        setErrorDialogOpen(true)
        setDeleteDialogOpen(false)
        setTypeToDelete(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur lors de la suppression')
      setErrorDialogOpen(true)
      setDeleteDialogOpen(false)
      setTypeToDelete(null)
    }
  }

  const handleOpenChange = (open) => {
    setOpen(open)
    if (!open) {
      setEditingType(null)
      setFormData({
        nom: '',
        document_obligatoire: false,
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

  const totalPages = Math.ceil(typesConge.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedTypesConge = typesConge.slice(startIndex, endIndex)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Types de Congé</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">Nouveau Type</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Modifier le Type' : 'Nouveau Type de Congé'}
              </DialogTitle>
              <DialogDescription>
                {editingType
                  ? 'Modifier les informations du type de congé'
                  : 'Créer un nouveau type de congé'}
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
                  placeholder="Ex: Congé de Maternité"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="document_obligatoire"
                  checked={formData.document_obligatoire}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      document_obligatoire: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="document_obligatoire" className="cursor-pointer">
                  Document obligatoire
                </Label>
              </div>
              <Button type="submit" className="w-full">
                {editingType ? 'Modifier' : 'Créer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Document Obligatoire</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {typesConge.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Aucun type de congé trouvé
                </TableCell>
              </TableRow>
            ) : (
              paginatedTypesConge.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>{type.id}</TableCell>
                  <TableCell className="font-medium">{type.nom}</TableCell>
                  <TableCell>
                    {type.document_obligatoire ? (
                      <span className="text-green-600">Oui</span>
                    ) : (
                      <span className="text-gray-500">Non</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleEdit(type)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => handleDeleteClick(type)}
                      >
                        Supprimer
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
              Êtes-vous sûr de vouloir supprimer le type de congé "{typeToDelete?.nom}" ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setTypeToDelete(null)
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

