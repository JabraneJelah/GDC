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

export default function TypesCongePage() {
  const [typesConge, setTypesConge] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingType, setEditingType] = useState(null)
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
        fetchTypesConge()
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la sauvegarde')
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

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type de congé ?')) {
      return
    }

    try {
      const response = await fetch(`/api/types-conge/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchTypesConge()
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Types de Congé</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>Nouveau Type</Button>
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

      <div className="rounded-md border">
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
              typesConge.map((type) => (
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
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(type)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(type.id)}
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

