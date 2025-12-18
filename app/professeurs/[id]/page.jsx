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
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ProfesseurDetailsPage() {
  const params = useParams()
  const [professeur, setProfesseur] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchProfesseur()
    }
  }, [params.id])

  const fetchProfesseur = async () => {
    try {
      const response = await fetch(`/api/professeurs/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProfesseur(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setLoading(false)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/professeurs">
            <Button variant="outline">← Retour</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {professeur.prenom} {professeur.nom}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">PPR</p>
              <p className="font-medium">{professeur.ppr}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">CIN</p>
              <p className="font-medium">{professeur.cin}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Spécialité</p>
              <p className="font-medium">{professeur.specialite}</p>
            </div>
            {professeur.telephone && (
              <div>
                <p className="text-sm text-gray-600">Téléphone</p>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Jours totaux</p>
                <p className="text-2xl font-bold">{soldeActuel.jours_total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Jours restants</p>
                <p className="text-2xl font-bold text-green-600">
                  {soldeActuel.jours_restants}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expire le</p>
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
    </div>
  )
}

