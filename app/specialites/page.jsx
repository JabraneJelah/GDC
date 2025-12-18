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

export default function SpecialitesPage() {
  const [specialites, setSpecialites] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingSpecialite, setEditingSpecialite] = useState(null)
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
        fetchSpecialites()
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  const handleEdit = (specialite) => {
    setEditingSpecialite(specialite)
    setFormData({ nom: specialite.nom })
    setOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette spécialité ?')) {
      return
    }

    try {
      const response = await fetch(`/api/specialites/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchSpecialites()
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Spécialités</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>Nouvelle Spécialité</Button>
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
            {specialites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  Aucune spécialité trouvée
                </TableCell>
              </TableRow>
            ) : (
              specialites.map((specialite) => (
                <TableRow key={specialite.id}>
                  <TableCell>{specialite.id}</TableCell>
                  <TableCell className="font-medium">{specialite.nom}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(specialite)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(specialite.id)}
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

