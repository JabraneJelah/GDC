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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'

export default function ProfesseursPage() {
  const [professeurs, setProfesseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState([])
  const [specialites, setSpecialites] = useState([])
  const [titres, setTitres] = useState([])
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    ppr: '',
    cin: '',
    specialite_id: '',
    categorie_personnel_id: '',
    titre_id: '',
    telephone: '',
    solde_jours: '22',
  })

  useEffect(() => {
    fetchProfesseurs()
    fetchOptions()
  }, [search])

  const fetchOptions = async () => {
    try {
      const [categoriesRes, specialitesRes, titresRes] = await Promise.all([
        fetch('/api/categories-personnel'),
        fetch('/api/specialites'),
        fetch('/api/titres'),
      ])

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data)
      }
      if (specialitesRes.ok) {
        const data = await specialitesRes.json()
        setSpecialites(data)
      }
      if (titresRes.ok) {
        const data = await titresRes.json()
        setTitres(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des options:', error)
    }
  }

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
          specialite_id: '',
          categorie_personnel_id: '',
          titre_id: '',
          telephone: '',
          solde_jours: '22',
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
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Nouveau Professeur</DialogTitle>
              <DialogDescription>
                Créer une nouvelle fiche professeur
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
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
                <Label htmlFor="categorie_personnel_id">Catégorie Personnel *</Label>
                <Select
                  value={formData.categorie_personnel_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categorie_personnel_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialite_id">Spécialité *</Label>
                <Select
                  value={formData.specialite_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, specialite_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une spécialité" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialites.map((spec) => (
                      <SelectItem key={spec.id} value={spec.id.toString()}>
                        {spec.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="titre_id">Titre *</Label>
                <Select
                  value={formData.titre_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, titre_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un titre" />
                  </SelectTrigger>
                  <SelectContent>
                    {titres.map((titre) => (
                      <SelectItem key={titre.id} value={titre.id.toString()}>
                        {titre.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="space-y-2">
                <Label htmlFor="solde_jours">Solde de congé (jours) *</Label>
                <Input
                  id="solde_jours"
                  type="number"
                  min="1"
                  value={formData.solde_jours}
                  onChange={(e) =>
                    setFormData({ ...formData, solde_jours: e.target.value })
                  }
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Nombre de jours de congé annuel (par défaut: 22 jours)
                </p>
              </div>
              <Button type="submit" className="w-full">
                Créer
              </Button>
              </form>
            </div>
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
              <TableHead>Solde Congé</TableHead>
              <TableHead>Congés</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {professeurs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Aucun professeur trouvé
                </TableCell>
              </TableRow>
            ) : (
              professeurs.map((professeur) => {
                const soldeActuel = professeur.soldes && professeur.soldes.length > 0 
                  ? professeur.soldes[0] 
                  : null
                return (
                  <TableRow key={professeur.id}>
                    <TableCell>{professeur.nom}</TableCell>
                    <TableCell>{professeur.prenom}</TableCell>
                    <TableCell>{professeur.ppr}</TableCell>
                    <TableCell>{professeur.cin}</TableCell>
                    <TableCell>
                      {professeur.specialite?.nom || '-'}
                    </TableCell>
                    <TableCell>
                      {soldeActuel ? (
                        <span className="font-medium">
                          {soldeActuel.jours_restants} / {soldeActuel.jours_total} jours
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{professeur._count.conges}</TableCell>
                    <TableCell>
                      <Link href={`/professeurs/${professeur.id}`}>
                        <Button variant="outline" size="sm">
                          Voir détails
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

