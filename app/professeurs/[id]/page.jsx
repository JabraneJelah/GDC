'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ProfesseurDetailsPage() {
  const params = useParams()
  const [professeur, setProfesseur] = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
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
  })

  useEffect(() => {
    if (params.id) {
      fetchProfesseur()
      fetchOptions()
    }
  }, [params.id])

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

  const fetchProfesseur = async () => {
    try {
      const response = await fetch(`/api/professeurs/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProfesseur(data)
        // Pré-remplir le formulaire avec les données du professeur
        setFormData({
          nom: data.nom || '',
          prenom: data.prenom || '',
          ppr: data.ppr || '',
          cin: data.cin || '',
          specialite_id: data.specialite_id?.toString() || '',
          categorie_personnel_id: data.categorie_personnel_id?.toString() || '',
          titre_id: data.titre_id?.toString() || '',
          telephone: data.telephone || '',
        })
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        console.error('Erreur API:', errorData.error || 'Professeur non trouvé')
        setProfesseur(null)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
      setProfesseur(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/professeurs/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          specialite_id: formData.specialite_id ? parseInt(formData.specialite_id, 10) : undefined,
          categorie_personnel_id: formData.categorie_personnel_id ? parseInt(formData.categorie_personnel_id, 10) : undefined,
          titre_id: formData.titre_id ? parseInt(formData.titre_id, 10) : undefined,
        }),
      })

      if (response.ok) {
        setOpen(false)
        fetchProfesseur()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Erreur lors de la mise à jour')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur lors de la mise à jour')
      setErrorDialogOpen(true)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Chargement...</div>
  }

  if (!professeur) {
    return <div>Professeur non trouvé</div>
  }

  const soldeActuel = professeur.soldes[0] || null

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href="/professeurs">
            <Button variant="outline" className="w-full sm:w-auto">← Retour</Button>
          </Link>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">Modifier les informations</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Modifier les informations du professeur</DialogTitle>
              <DialogDescription>
                Modifier les informations du professeur
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
                <Button type="submit" className="w-full">
                  Enregistrer les modifications
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {professeur.prenom} {professeur.nom}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-700">PPR</p>
              <p className="font-medium">{professeur.ppr}</p>
            </div>
            <div>
              <p className="text-sm text-slate-700">CIN</p>
              <p className="font-medium">{professeur.cin}</p>
            </div>
            <div>
              <p className="text-sm text-slate-700">Catégorie Personnel</p>
              <p className="font-medium">
                {professeur.categorie_personnel?.nom || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-700">Spécialité</p>
              <p className="font-medium">
                {professeur.specialite?.nom || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-700">Titre</p>
              <p className="font-medium">
                {professeur.titre?.nom || '-'}
              </p>
            </div>
            {professeur.telephone && (
              <div>
                <p className="text-sm text-slate-700">Téléphone</p>
                <p className="font-medium">{professeur.telephone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {soldeActuel && (
        <Card>
          <CardHeader>
            <CardTitle>Solde de Congé ({soldeActuel.annee})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-700">Jours totaux</p>
                <p className="text-xl font-semibold">{soldeActuel.jours_total}</p>
              </div>
              <div>
                <p className="text-sm text-slate-700">Jours restants</p>
                <p className="text-xl font-semibold text-green-600">
                  {soldeActuel.jours_restants}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-700">Expire le</p>
                <p className="font-medium">
                  {new Date(soldeActuel.expire_le).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historique des Congés</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date début</TableHead>
                <TableHead>Date fin</TableHead>
                <TableHead>Durée (jours)</TableHead>
                <TableHead>Référence doc</TableHead>
                <TableHead>Créé par</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {professeur.conges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Aucun congé enregistré
                  </TableCell>
                </TableRow>
              ) : (
                professeur.conges.map((conge) => (
                  <TableRow key={conge.id}>
                    <TableCell>{conge.type_conge.nom}</TableCell>
                    <TableCell>
                      {new Date(conge.date_debut).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      {new Date(conge.date_fin).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>{conge.duree_jours}</TableCell>
                    <TableCell>{conge.reference_doc || '-'}</TableCell>
                    <TableCell>{conge.cree_par_rh.nom_complet}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

