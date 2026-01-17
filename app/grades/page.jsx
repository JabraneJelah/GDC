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

export default function GradesPage() {
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [gradeToDelete, setGradeToDelete] = useState(null)
  const [editingGrade, setEditingGrade] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [formData, setFormData] = useState({
    nom: '',
  })

  useEffect(() => {
    fetchGrades()
  }, [])

  const fetchGrades = async () => {
    try {
      const response = await fetch('/api/grades')
      if (response.ok) {
        const data = await response.json()
        setGrades(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des grades:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingGrade
        ? `/api/grades/${editingGrade.id}`
        : '/api/grades'
      const method = editingGrade ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setOpen(false)
        setEditingGrade(null)
        setFormData({ nom: '' })
        setCurrentPage(1)
        fetchGrades()
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

  const handleEdit = (grade) => {
    setEditingGrade(grade)
    setFormData({ nom: grade.nom })
    setOpen(true)
  }

  const handleDeleteClick = (grade) => {
    setGradeToDelete(grade)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!gradeToDelete) return

    try {
      const response = await fetch(`/api/grades/${gradeToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCurrentPage(1)
        setDeleteDialogOpen(false)
        setGradeToDelete(null)
        fetchGrades()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Erreur lors de la suppression')
        setErrorDialogOpen(true)
        setDeleteDialogOpen(false)
        setGradeToDelete(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur lors de la suppressio de ce article n')
      setErrorDialogOpen(true)
      setDeleteDialogOpen(false)
      setGradeToDelete(null)
    }
  }

  const handleOpenChange = (open) => {
    setOpen(open)
    if (!open) {
      setEditingGrade(null)
      setFormData({ nom: '' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        Chargement... wait a minute
      </div>
    )
  }

  const totalPages = Math.ceil(grades.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedGrades = grades.slice(startIndex, endIndex)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Grades</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">Nouveau Grade</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGrade ? 'Modifier le Grade' : 'Nouveau Grade'}
              </DialogTitle>
              <DialogDescription>
                {editingGrade
                  ? 'Modifier les informations du grade'
                  : 'Créer un nouveau grade'}
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
                  placeholder="Ex: Professeur, Maître de conférences, etc."
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingGrade ? 'Modifier' : 'Créer'}
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
            {grades.length === 0 ? (
              <TableRow className="bg-white">
                <TableCell colSpan={3} className="text-center">
                  Aucun grade trouvé
                </TableCell>
              </TableRow>
            ) : (
              paginatedGrades.map((grade) => (
                <TableRow key={grade.id} className="bg-white hover:bg-slate-50">
                  <TableCell>{grade.id}</TableCell>
                  <TableCell className="font-medium">{grade.nom}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleEdit(grade)}
                        title="Modifier"
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => handleDeleteClick(grade)}
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
              Êtes-vous sûr de vouloir supprimer le grade "{gradeToDelete?.nom}" ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setGradeToDelete(null)
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

