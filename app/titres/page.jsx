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

export default function TitresPage() {
  const [titres, setTitres] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingTitre, setEditingTitre] = useState(null)
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
        fetchTitres()
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  const handleEdit = (titre) => {
    setEditingTitre(titre)
    setFormData({ nom: titre.nom })
    setOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce titre ?')) {
      return
    }

    try {
      const response = await fetch(`/api/titres/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchTitres()
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la suppression')
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Titres</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>Nouveau Titre</Button>
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {titres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  Aucun titre trouvé
                </TableCell>
              </TableRow>
            ) : (
              titres.map((titre) => (
                <TableRow key={titre.id}>
                  <TableCell>{titre.id}</TableCell>
                  <TableCell className="font-medium">{titre.nom}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(titre)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(titre.id)}
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
      </div>
    </div>
  )
}

