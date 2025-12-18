'use client'

import { useEffect, useState } from 'react'
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
import Link from 'next/link'

export default function ProfesseursPage() {
  const [professeurs, setProfesseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    ppr: '',
    cin: '',
    specialite: '',
    telephone: '',
  })

  useEffect(() => {
    fetchProfesseurs()
  }, [search])

  const fetchProfesseurs = async () => {
    try {
      const url = search
        ? `/api/professeurs?search=${encodeURIComponent(search)}`
        : '/api/professeurs'
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
          cin: '',
          specialite: '',
          telephone: '',
        })
        fetchProfesseurs()
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la création')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la création')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Professeurs</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Nouveau Professeur</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau Professeur</DialogTitle>
              <DialogDescription>
                Créer une nouvelle fiche professeur
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
                <Label htmlFor="ppr">PPR *</Label>
                <Input
                  id="ppr"
                  value={formData.ppr}
                  onChange={(e) =>
                    setFormData({ ...formData, ppr: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cin">CIN *</Label>
                <Input
                  id="cin"
                  value={formData.cin}
                  onChange={(e) =>
                    setFormData({ ...formData, cin: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialite">Spécialité *</Label>
                <Input
                  id="specialite"
                  value={formData.specialite}
                  onChange={(e) =>
                    setFormData({ ...formData, specialite: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) =>
                    setFormData({ ...formData, telephone: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full">
                Créer
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Input
          placeholder="Rechercher par nom, prénom ou PPR..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>PPR</TableHead>
              <TableHead>CIN</TableHead>
              <TableHead>Spécialité</TableHead>
              <TableHead>Congés</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {professeurs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Aucun professeur trouvé
                </TableCell>
              </TableRow>
            ) : (
              professeurs.map((professeur) => (
                <TableRow key={professeur.id}>
                  <TableCell>{professeur.nom}</TableCell>
                  <TableCell>{professeur.prenom}</TableCell>
                  <TableCell>{professeur.ppr}</TableCell>
                  <TableCell>{professeur.cin}</TableCell>
                  <TableCell>{professeur.specialite}</TableCell>
                  <TableCell>{professeur._count.conges}</TableCell>
                  <TableCell>
                    <Link href={`/professeurs/${professeur.id}`}>
                      <Button variant="outline" size="sm">
                        Voir détails
                      </Button>
                    </Link>
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

