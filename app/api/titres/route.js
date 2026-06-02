import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

// GET - Liste des titres
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const titres = await prisma.titre.findMany({
      orderBy: { nom: 'asc' },
    })

    return NextResponse.json(titres)
  } catch (error) {
    console.error('Erreur lors de la récupération des titres:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau titre
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const body = await request.json()
    const { nom } = body

    if (!nom) {
      return NextResponse.json(
        { error: 'Le nom est obligatoire' },
        { status: 400 }
      )
    }

    // Vérifier si le titre existe déjà
    const existing = await prisma.titre.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'هذا اللقب موجود مسبقاً' },
        { status: 400 }
      )
    }

    const titre = await prisma.titre.create({
      data: { nom },
    })

    return NextResponse.json(titre, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du titre:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

