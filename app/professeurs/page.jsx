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
import { Pagination } from '@/components/ui/pagination'
import { X } from 'lucide-react'

const ITEMS_PER_PAGE = 10

export default function ProfesseursPage() {
  const [professeurs, setProfesseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('nom_prenom')
  const [filterValue, setFilterValue] = useState('')
  const [open, setOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState([])
  const [specialites, setSpecialites] = useState([])
  const [titres, setTitres] = useState([])
  const [services, setServices] = useState([])
  const [hopitaux, setHopitaux] = useState([])
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    ppr: '',
    specialite_id: '',
    categorie_personnel_id: '',
    titre_id: '',
    service_id: '',
    hopital_id: '',
    telephone: '',
  })

  useEffect(() => {
    fetchProfesseurs()
    fetchOptions()
    setCurrentPage(1)
  }, [filterType, filterValue])

  const fetchOptions = async () => {
    try {
      const [categoriesRes, specialitesRes, titresRes, servicesRes, hopitauxRes] = await Promise.all([
        fetch('/api/categories-personnel'),
        fetch('/api/specialites'),
        fetch('/api/titres'),
        fetch('/api/services'),
        fetch('/api/hopitaux'),
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
      if (hopitauxRes.ok) {
        const data = await hopitauxRes.json()
        setHopitaux(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des options:', error)
    }
  }

  const fetchProfesseurs = async () => {
    try {
      let url = '/api/professeurs'
      if (filterValue.trim()) {
        const params = new URLSearchParams()
        if (filterType === 'ppr') {
          params.append('ppr', filterValue.trim())
        } else if (filterType === 'nom_prenom') {
          params.append('search', filterValue.trim())
        }
        url += `?${params.toString()}`
      }
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

  const handleClearFilter = () => {
    setFilterValue('')
    setFilterType('nom_prenom')
    setCurrentPage(1)
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
          specialite_id: '',
          categorie_personnel_id: '',
          titre_id: '',
          service_id: '',
          hopital_id: '',
          telephone: '',
        })
        setCurrentPage(1)
        fetchProfesseurs()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Erreur lors de la création')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur lors de la création')
      setErrorDialogOpen(true)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Chargement...</div>
  }

  const totalPages = Math.ceil(professeurs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedProfesseurs = professeurs.slice(startIndex, endIndex)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Professeurs</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">Nouveau Professeur</Button>
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
                <Label htmlFor="hopital_id">Hôpital *</Label>
                <Select
                  value={formData.hopital_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, hopital_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un hôpital" />
                  </SelectTrigger>
                  <SelectContent>
                    {hopitaux.map((hopital) => (
                      <SelectItem key={hopital.id} value={hopital.id.toString()}>
                        {hopital.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full sm:w-auto">
            <Label htmlFor="filter-type" className="text-xs text-slate-600 mb-1.5 block">
              Filtrer par
            </Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nom_prenom">Nom / Prénom</SelectItem>
                <SelectItem value="ppr">PPR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 w-full sm:flex-initial sm:w-[300px]">
            <Label htmlFor="filter-value" className="text-xs text-slate-600 mb-1.5 block">
              {filterType === 'ppr' ? 'PPR' : 'Nom ou Prénom'}
            </Label>
            <Input
              id="filter-value"
              placeholder={
                filterType === 'ppr'
                  ? 'Entrez le PPR...'
                  : 'Entrez le nom ou prénom...'
              }
              value={filterValue}
              onChange={(e) => {
                setFilterValue(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full"
            />
          </div>
          {filterValue && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilter}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-1.5" />
              Effacer
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>PPR</TableHead>
              <TableHead>Spécialité</TableHead>
              <TableHead>Solde Congé</TableHead>
              <TableHead>Congés</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white [&>tr]:bg-white [&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-white">
            {professeurs.length === 0 ? (
              <TableRow className="bg-white">
                <TableCell colSpan={7} className="text-center">
                  Aucun professeur trouvé
                </TableCell>
              </TableRow>
            ) : (
              paginatedProfesseurs.map((professeur) => {
                const soldesNonExpires = professeur.soldes || []
                const totalJoursRestants = soldesNonExpires.reduce(
                  (sum, solde) => sum + solde.jours_restants,
                  0
                )
                return (
                  <TableRow key={professeur.id} className="bg-white hover:bg-slate-50">
                    <TableCell>{professeur.nom}</TableCell>
                    <TableCell>{professeur.prenom}</TableCell>
                    <TableCell>{professeur.ppr}</TableCell>
                    <TableCell>
                      {professeur.specialite?.nom || '-'}
                    </TableCell>
                    <TableCell>
                      {soldesNonExpires.length > 0 ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-[#16A34A]">
                            Total: {totalJoursRestants} jours
                          </div>
                          <div className="text-xs text-slate-600 space-y-0.5">
                            {soldesNonExpires.map((solde) => (
                              <div key={solde.id}>
                                {solde.annee}: {solde.jours_restants} / {solde.jours_total} jours
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{professeur._count.conges}</TableCell>
                    <TableCell>
                      <Link href={`/professeurs/${professeur.id}`}>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
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
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

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

