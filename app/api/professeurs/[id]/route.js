import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET - Détails d'un professeur
export async function GET(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const professeur = await prisma.professeur.findUnique({
      where: { id: params.id },
      include: {
        conges: {
          include: {
            type_conge: true,
            cree_par_rh: {
              select: {
                nom_complet: true,
              },
            },
          },
          orderBy: { date_debut: 'desc' },
        },
        soldes: {
          orderBy: { annee: 'desc' },
        },
      },
    })

    if (!professeur) {
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(professeur)
  } catch (error) {
    console.error('Erreur lors de la récupération du professeur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un professeur
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { nom, prenom, ppr, cin, specialite, telephone } = body

    // Vérifier si le professeur existe
    const existing = await prisma.professeur.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si le PPR est modifié et s'il existe déjà
    if (ppr && ppr !== existing.ppr) {
      const pprExists = await prisma.professeur.findUnique({
        where: { ppr },
      })

      if (pprExists) {
        return NextResponse.json(
          { error: 'Ce PPR est déjà utilisé' },
          { status: 400 }
        )
      }
    }

    // Mettre à jour le professeur
    const professeur = await prisma.professeur.update({
      where: { id: params.id },
      data: {
        nom: nom || existing.nom,
        prenom: prenom || existing.prenom,
        ppr: ppr || existing.ppr,
        cin: cin || existing.cin,
        specialite: specialite || existing.specialite,
        telephone: telephone !== undefined ? telephone : existing.telephone,
      },
    })

    return NextResponse.json(professeur)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du professeur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

