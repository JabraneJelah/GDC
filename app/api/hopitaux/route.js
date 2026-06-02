import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

// GET - Liste des hopitaux
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const hopitaux = await prisma.hopital.findMany({
      orderBy: { nom: 'asc' },
    })

    return NextResponse.json(hopitaux)
  } catch (error) {
    console.error('Erreur lors de la récupération des hopitaux:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouvel hopital
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
    // Vérifier si l'hopital existe déjà
    const existing = await prisma.hopital.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'هذا المستشفى موجود مسبقاً' },
        { status: 400 }
      )
    }

    const hopital = await prisma.hopital.create({
      data: { nom },
    })

    return NextResponse.json(hopital, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de l\'hopital:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

