'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

const ITEMS_PER_PAGE = 5

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [services, setServices] = useState([])
  const [typesConge, setTypesConge] = useState([])
  const [filters, setFilters] = useState({
    service_id: 'all',
    type_conge_id: 'all',
    date_debut: '',
    date_fin: '',
    nom_complet: '',
    ppr: '',
  })

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
    }
  }

  const fetchOptions = async () => {
    try {
      const [servicesRes, typesCongeRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/types-conge'),
      ])

      if (servicesRes.ok) {
        const data = await servicesRes.json()
        setServices(data)
      }
      if (typesCongeRes.ok) {
        const data = await typesCongeRes.json()
        setTypesConge(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des options:', error)
    }
  }

  const fetchHistorique = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (filters.service_id && filters.service_id !== 'all') params.append('service_id', filters.service_id)
      if (filters.type_conge_id && filters.type_conge_id !== 'all') params.append('type_conge_id', filters.type_conge_id)
      if (filters.date_debut) params.append('date_debut', filters.date_debut)
      if (filters.date_fin) params.append('date_fin', filters.date_fin)
      if (filters.nom_complet) params.append('nom_complet', filters.nom_complet)
      if (filters.ppr) params.append('ppr', filters.ppr)

      const url = `/api/dashboard/historique-conges${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setHistorique(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchStats()
    fetchOptions()
    // Chargement initial sans filtres
    const loadInitial = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/dashboard/historique-conges')
        if (response.ok) {
          const data = await response.json()
          setHistorique(data)
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error)
      } finally {
        setLoading(false)
      }
    }
    loadInitial()
  }, [])

  useEffect(() => {
    // Debounce pour les champs de texte (nom_complet, ppr)
    const timeoutId = setTimeout(() => {
      fetchHistorique()
      setCurrentPage(1)
    }, filters.nom_complet || filters.ppr ? 500 : 0) // 500ms de délai pour les champs texte

    return () => clearTimeout(timeoutId)
  }, [filters, fetchHistorique])

  const handleClearFilters = () => {
    setFilters({
      service_id: 'all',
      type_conge_id: 'all',
      date_debut: '',
      date_fin: '',
      nom_complet: '',
      ppr: '',
    })
    setCurrentPage(1)
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'service_id' || key === 'type_conge_id') {
      return value !== 'all'
    }
    return value !== ''
  })

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const totalPages = Math.ceil(historique.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedHistorique = historique.slice(startIndex, endIndex)

  if (loading && historique.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-[#334155]">Tableau de suivi des congés des professeurs – CHU Tanger
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des Congés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 bg-white p-4 mb-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-service" className="text-xs text-slate-600">
                    Service
                  </Label>
                  <Select
                    value={filters.service_id || 'all'}
                    onValueChange={(value) =>
                      setFilters({ ...filters, service_id: value })
                    }
                  >
                    <SelectTrigger id="filter-service" className="h-9">
                      <SelectValue placeholder="Tous les services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les services</SelectItem>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-type" className="text-xs text-slate-600">
                    Type de Congé
                  </Label>
                  <Select
                    value={filters.type_conge_id || 'all'}
                    onValueChange={(value) =>
                      setFilters({ ...filters, type_conge_id: value })
                    }
                  >
                    <SelectTrigger id="filter-type" className="h-9">
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      {typesConge.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-nom-complet" className="text-xs text-slate-600">
                    Nom complet
                  </Label>
                  <Input
                    id="filter-nom-complet"
                    placeholder="Nom complet (titre, prénom, nom)..."
                    value={filters.nom_complet}
                    onChange={(e) => setFilters({ ...filters, nom_complet: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-ppr" className="text-xs text-slate-600">
                    PPR
                  </Label>
                  <Input
                    id="filter-ppr"
                    placeholder="PPR..."
                    value={filters.ppr}
                    onChange={(e) => setFilters({ ...filters, ppr: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-date-debut" className="text-xs text-slate-600">
                    Date Début
                  </Label>
                  <Input
                    id="filter-date-debut"
                    type="date"
                    value={filters.date_debut}
                    onChange={(e) => setFilters({ ...filters, date_debut: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-date-fin" className="text-xs text-slate-600">
                    Date Fin
                  </Label>
                  <Input
                    id="filter-date-fin"
                    type="date"
                    value={filters.date_fin}
                    onChange={(e) => setFilters({ ...filters, date_fin: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2 flex items-end">
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      className="w-full h-9"
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Effacer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>PPR</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Type de Congé</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Jours</TableHead>
                  <TableHead>Intérim</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody className="bg-white [&>tr]:bg-white [&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-white">
                {loading ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={9} className="text-center">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : historique.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={9} className="text-center">
                      Aucun congé enregistré
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedHistorique.map((conge) => (
                    <TableRow key={conge.id} className="bg-white hover:bg-slate-50">
                      <TableCell className="font-medium">
                        {conge.titre ? `${conge.titre} ` : ''}{conge.prenom} {conge.nom}
                      </TableCell>
                      <TableCell>{conge.ppr}</TableCell>
                      <TableCell>{conge.grade}</TableCell>
                      <TableCell>{conge.service}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {conge.type_conge}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(conge.date_debut)} - {formatDate(conge.date_fin)}
                      </TableCell>
                      <TableCell>{conge.duree_jours} jour(s)</TableCell>
                      <TableCell>
                        {conge.nom_interim && conge.prenom_interim
                          ? `${conge.nom_interim} ${conge.prenom_interim}`
                          : '-'}
                      </TableCell>
                      {/* <TableCell>
                        {conge.soldes && conge.soldes.length > 0 ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-[#16A34A]">
                              Total: {conge.solde_restant_total} jour(s)
                            </div>
                            <div className="text-xs text-[#64748B] space-y-0.5">
                              {conge.soldes.map((solde) => (
                                <div key={solde.annee}>
                                  {solde.annee}: {solde.jours_restants} / {solde.jours_total} jours
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell> */}
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
        </CardContent>
      </Card>
    </div>
  )
}


