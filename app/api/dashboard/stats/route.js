import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const anneeActuelle = new Date().getFullYear()
    const dateDebutAnnee = new Date(anneeActuelle, 0, 1)
    const dateFinAnnee = new Date(anneeActuelle, 11, 31, 23, 59, 59)

    // Exécuter toutes les requêtes en parallèle pour améliorer les performances
    const [
      totalProfesseurs,
      totalConges,
      totalUtilisateursRH,
      congesCetteAnnee,
      congesParType,
      typesConge,
    ] = await Promise.all([
      prisma.professeur.count(),
      prisma.conge.count(),
      prisma.utilisateurRH.count(),
      prisma.conge.count({
        where: {
          date_debut: {
            gte: dateDebutAnnee,
            lte: dateFinAnnee,
          },
        },
      }),
      prisma.conge.groupBy({
        by: ['type_conge_id'],
        _count: true,
      }),
      prisma.typeConge.findMany(),
    ])
    const congesParTypeNom = congesParType.map((item) => {
      const type = typesConge.find((t) => t.id === item.type_conge_id)
      return {
        type: type?.nom || 'Inconnu',
        count: item._count,
      }
    })

    return NextResponse.json({
      totalProfesseurs,
      totalConges,
      totalUtilisateursRH,
      congesCetteAnnee,
      congesParType: congesParTypeNom,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

