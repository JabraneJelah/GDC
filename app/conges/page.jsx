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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'

const ITEMS_PER_PAGE = 10

export default function CongesPage() {
  const [conges, setConges] = useState([])
  const [professeurs, setProfesseurs] = useState([])
  const [typesConge, setTypesConge] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [formData, setFormData] = useState({
    professeur_id: '',
    type_conge_id: '',
    date_debut: '',
    date_fin: '',
    duree_jours: '',
    reference_doc: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [congesRes, professeursRes, typesRes] = await Promise.all([
        fetch('/api/conges'),
        fetch('/api/professeurs'),
        fetch('/api/types-conge'),
      ])

      if (congesRes.ok) {
        const congesData = await congesRes.json()
        setConges(congesData)
      }

      if (professeursRes.ok) {
        const professeursData = await professeursRes.json()
        setProfesseurs(professeursData)
      }

      if (typesRes.ok) {
        const typesData = await typesRes.json()
        setTypesConge(typesData)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDays = () => {
    if (formData.date_debut && formData.date_fin) {
      const start = new Date(formData.date_debut)
      const end = new Date(formData.date_fin)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      setFormData({ ...formData, duree_jours: diffDays.toString() })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/conges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          type_conge_id: parseInt(formData.type_conge_id),
          duree_jours: parseInt(formData.duree_jours),
        }),
      })

      if (response.ok) {
        setOpen(false)
        setFormData({
          professeur_id: '',
          type_conge_id: '',
          date_debut: '',
          date_fin: '',
          duree_jours: '',
          reference_doc: '',
        })
        setCurrentPage(1)
        fetchData()
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

  const totalPages = Math.ceil(conges.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedConges = conges.slice(startIndex, endIndex)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Congés</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">Nouveau Congé</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouveau Congé</DialogTitle>
              <DialogDescription>
                Enregistrer un nouveau congé depuis un document papier
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="professeur_id">Professeur *</Label>
                <Select
                  value={formData.professeur_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, professeur_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un professeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {professeurs.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.prenom} {prof.nom} ({prof.ppr})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type_conge_id">Type de congé *</Label>
                <Select
                  value={formData.type_conge_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type_conge_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typesConge.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_debut">Date début *</Label>
                  <Input
                    id="date_debut"
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => {
                      setFormData({ ...formData, date_debut: e.target.value })
                      calculateDays()
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_fin">Date fin *</Label>
                  <Input
                    id="date_fin"
                    type="date"
                    value={formData.date_fin}
                    onChange={(e) => {
                      setFormData({ ...formData, date_fin: e.target.value })
                      calculateDays()
                    }}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duree_jours">Durée (jours) *</Label>
                <Input
                  id="duree_jours"
                  type="number"
                  value={formData.duree_jours}
                  onChange={(e) =>
                    setFormData({ ...formData, duree_jours: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_doc">Référence document</Label>
                <Input
                  id="reference_doc"
                  value={formData.reference_doc}
                  onChange={(e) =>
                    setFormData({ ...formData, reference_doc: e.target.value })
                  }
                  placeholder="Réf. du document papier"
                />
              </div>
              <Button type="submit" className="w-full">
                Enregistrer
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Professeur</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date début</TableHead>
              <TableHead>Date fin</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Créé par</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Aucun congé enregistré
                </TableCell>
              </TableRow>
            ) : (
              paginatedConges.map((conge) => (
                <TableRow key={conge.id}>
                  <TableCell>
                    {conge.professeur.prenom} {conge.professeur.nom}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {conge.type_conge.nom}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(conge.date_debut).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    {new Date(conge.date_fin).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>{conge.duree_jours} jours</TableCell>
                  <TableCell>{conge.reference_doc || '-'}</TableCell>
                  <TableCell>{conge.cree_par_rh.nom_complet}</TableCell>
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

