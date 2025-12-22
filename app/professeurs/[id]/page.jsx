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
import { Pencil, Trash2, Plus } from 'lucide-react'

export default function ProfesseurDetailsPage() {
  const params = useParams()
  const [professeur, setProfesseur] = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [soldes, setSoldes] = useState([])
  const [soldeDialogOpen, setSoldeDialogOpen] = useState(false)
  const [deleteSoldeDialogOpen, setDeleteSoldeDialogOpen] = useState(false)
  const [soldeToDelete, setSoldeToDelete] = useState(null)
  const [editingSolde, setEditingSolde] = useState(null)
  const [soldeFormData, setSoldeFormData] = useState({
    annee: '',
    jours_total: '',
    jours_restants: '',
  })
  const [categories, setCategories] = useState([])
  const [specialites, setSpecialites] = useState([])
  const [titres, setTitres] = useState([])
  const [services, setServices] = useState([])
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    ppr: '',
    cin: '',
    specialite_id: '',
    categorie_personnel_id: '',
    titre_id: '',
    service_id: '',
    telephone: '',
  })

  useEffect(() => {
    if (params.id) {
      fetchProfesseur()
      fetchOptions()
      fetchSoldes()
    }
  }, [params.id])

  const fetchSoldes = async () => {
    try {
      const response = await fetch(`/api/professeurs/${params.id}/soldes`)
      if (response.ok) {
        const data = await response.json()
        setSoldes(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des soldes:', error)
    }
  }

  const fetchOptions = async () => {
    try {
      const [categoriesRes, specialitesRes, titresRes, servicesRes] = await Promise.all([
        fetch('/api/categories-personnel'),
        fetch('/api/specialites'),
        fetch('/api/titres'),
        fetch('/api/services'),
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
      if (servicesRes.ok) {
        const data = await servicesRes.json()
        setServices(data)
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
          service_id: data.service_id?.toString() || '',
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
          service_id: formData.service_id ? parseInt(formData.service_id, 10) : undefined,
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

  const handleOpenSoldeDialog = (solde = null) => {
    if (solde) {
      setEditingSolde(solde)
      setSoldeFormData({
        annee: solde.annee.toString(),
        jours_total: solde.jours_total.toString(),
        jours_restants: solde.jours_restants.toString(),
      })
    } else {
      setEditingSolde(null)
      setSoldeFormData({
        annee: new Date().getFullYear().toString(),
        jours_total: '22',
        jours_restants: '22',
      })
    }
    setSoldeDialogOpen(true)
  }

  const handleSoldeSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingSolde
        ? `/api/professeurs/${params.id}/soldes/${editingSolde.id}`
        : `/api/professeurs/${params.id}/soldes`
      
      const method = editingSolde ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          annee: parseInt(soldeFormData.annee, 10),
          jours_total: parseInt(soldeFormData.jours_total, 10),
          jours_restants: parseInt(soldeFormData.jours_restants, 10),
        }),
      })

      if (response.ok) {
        setSoldeDialogOpen(false)
        fetchSoldes()
        fetchProfesseur() // Rafraîchir pour mettre à jour l'affichage
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Erreur lors de l\'opération')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur lors de l\'opération')
      setErrorDialogOpen(true)
    }
  }

  const handleDeleteSoldeClick = (solde) => {
    setSoldeToDelete(solde)
    setDeleteSoldeDialogOpen(true)
  }

  const handleDeleteSoldeConfirm = async () => {
    try {
      const response = await fetch(
        `/api/professeurs/${params.id}/soldes/${soldeToDelete.id}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        setDeleteSoldeDialogOpen(false)
        setSoldeToDelete(null)
        fetchSoldes()
        fetchProfesseur()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Erreur lors de la suppression')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur lors de la suppression')
      setErrorDialogOpen(true)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Chargement...</div>
  }

  if (!professeur) {
    return <div>Professeur non trouvé</div>
  }

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
                  <Label htmlFor="service_id">Service *</Label>
                  <Select
                    value={formData.service_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, service_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.nom}
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
            <div>
              <p className="text-sm text-slate-700">Service</p>
              <p className="font-medium">
                {professeur.service?.nom || '-'}
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des Soldes de Congé</CardTitle>
            <Button
              onClick={() => handleOpenSoldeDialog()}
              size="sm"
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter un solde
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {soldes.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Aucun solde enregistré
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Année</TableHead>
                      <TableHead>Jours totaux</TableHead>
                      <TableHead>Jours restants</TableHead>
                      <TableHead>Expire le</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {soldes.map((solde) => {
                      const maintenant = new Date()
                      const expireLe = new Date(solde.expire_le)
                      const isExpired = expireLe < maintenant
                      
                      return (
                        <TableRow key={solde.id}>
                          <TableCell className="font-medium">{solde.annee}</TableCell>
                          <TableCell>{solde.jours_total}</TableCell>
                          <TableCell>
                            <span className={isExpired ? 'text-slate-400' : 'text-green-600 font-semibold'}>
                              {solde.jours_restants}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={isExpired ? 'text-slate-400' : ''}>
                              {expireLe.toLocaleDateString('fr-FR')}
                            </span>
                            {isExpired && (
                              <span className="ml-2 text-xs text-red-600">(Expiré)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenSoldeDialog(solde)}
                                className="h-7 w-7 p-0"
                                title="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSoldeClick(solde)}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Total disponible (non expiré)</p>
                  <p className="text-lg font-semibold text-green-600">
                    {soldes
                      .filter(s => new Date(s.expire_le) >= new Date() && s.jours_restants > 0)
                      .reduce((sum, solde) => sum + solde.jours_restants, 0)} jours
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Dialog pour ajouter/modifier un solde */}
      <Dialog open={soldeDialogOpen} onOpenChange={setSoldeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSolde ? 'Modifier le solde' : 'Ajouter un solde'}
            </DialogTitle>
            <DialogDescription>
              {editingSolde
                ? 'Modifier les informations du solde de congé'
                : 'Ajouter un nouveau solde de congé pour ce professeur'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSoldeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="annee">Année *</Label>
              <Input
                id="annee"
                type="number"
                min="2000"
                max="2100"
                value={soldeFormData.annee}
                onChange={(e) =>
                  setSoldeFormData({ ...soldeFormData, annee: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jours_total">Jours totaux *</Label>
              <Input
                id="jours_total"
                type="number"
                min="1"
                value={soldeFormData.jours_total}
                onChange={(e) => {
                  const joursTotal = e.target.value
                  setSoldeFormData({
                    ...soldeFormData,
                    jours_total: joursTotal,
                    // Si on crée un nouveau solde, jours_restants = jours_total
                    jours_restants: editingSolde ? soldeFormData.jours_restants : joursTotal,
                  })
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jours_restants">Jours restants *</Label>
              <Input
                id="jours_restants"
                type="number"
                min="0"
                max={soldeFormData.jours_total || 999}
                value={soldeFormData.jours_restants}
                onChange={(e) =>
                  setSoldeFormData({ ...soldeFormData, jours_restants: e.target.value })
                }
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSoldeDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingSolde ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteSoldeDialogOpen} onOpenChange={setDeleteSoldeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le solde de {soldeToDelete?.annee} ? 
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteSoldeDialogOpen(false)
                setSoldeToDelete(null)
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSoldeConfirm}
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

