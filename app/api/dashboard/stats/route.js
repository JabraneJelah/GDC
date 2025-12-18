import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const totalProfesseurs = await prisma.professeur.count()
    const totalConges = await prisma.conge.count()
    const totalUtilisateursRH = await prisma.utilisateurRH.count()

    const anneeActuelle = new Date().getFullYear()
    const congesCetteAnnee = await prisma.conge.count({
      where: {
        date_debut: {
          gte: new Date(anneeActuelle, 0, 1),
          lte: new Date(anneeActuelle, 11, 31),
        },
      },
    })

    const congesParType = await prisma.conge.groupBy({
      by: ['type_conge_id'],
      _count: true,
    })

    const typesConge = await prisma.typeConge.findMany()
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

