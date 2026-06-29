import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

    if (q.length < 2) {
      return NextResponse.json({ professeurs: [], dossiers: [] })
    }

    const [professeurs, dossiers] = await Promise.all([
      prisma.professeur.findMany({
        where: {
          OR: [
            { nom: { contains: q, mode: 'insensitive' } },
            { prenom: { contains: q, mode: 'insensitive' } },
            { nom_ar: { contains: q, mode: 'insensitive' } },
            { prenom_ar: { contains: q, mode: 'insensitive' } },
            { ppr: { contains: q, mode: 'insensitive' } },
            { cin: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          nom: true,
          prenom: true,
          nom_ar: true,
          prenom_ar: true,
          ppr: true,
        },
        take: 5,
      }),
      prisma.dossierExplicatif.findMany({
        where: {
          OR: [
            { reference: { contains: q, mode: 'insensitive' } },
            { nom_complet: { contains: q, mode: 'insensitive' } },
            { matricule: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          reference: true,
          nom_complet: true,
          statut: true,
        },
        take: 5,
      }),
    ])

    return NextResponse.json({ professeurs, dossiers })
  } catch (error) {
    console.error('Erreur search:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
