import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des professeurs
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    const professeurs = await prisma.professeur.findMany({
      where: search
        ? {
            OR: [
              { nom: { contains: search, mode: 'insensitive' } },
              { prenom: { contains: search, mode: 'insensitive' } },
              { ppr: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: { conges: true },
        },
      },
      orderBy: { nom: 'asc' },
    })

    return NextResponse.json(professeurs)
  } catch (error) {
    console.error('Erreur lors de la récupération des professeurs:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau professeur
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { nom, prenom, ppr, cin, specialite, telephone } = body

    if (!nom || !prenom || !ppr || !cin || !specialite) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    // Vérifier si le PPR existe déjà
    const existing = await prisma.professeur.findUnique({
      where: { ppr },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ce PPR est déjà utilisé' },
        { status: 400 }
      )
    }

    // Créer le professeur
    const professeur = await prisma.professeur.create({
      data: {
        nom,
        prenom,
        ppr,
        cin,
        specialite,
        telephone: telephone || null,
      },
    })

    // Créer le solde initial pour l'année en cours
    const anneeActuelle = new Date().getFullYear()
    const expireLe = new Date(anneeActuelle + 2, 11, 31) // 31 décembre de l'année + 2

    await prisma.soldeConge.create({
      data: {
        professeur_id: professeur.id,
        annee: anneeActuelle,
        jours_total: 22,
        jours_restants: 22,
        expire_le: expireLe,
      },
    })

    return NextResponse.json(professeur, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du professeur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

