import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

// GET - Liste des spécialités
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const specialites = await prisma.specialite.findMany({
      orderBy: { nom: 'asc' },
    })

    return NextResponse.json(specialites)
  } catch (error) {
    console.error('Erreur lors de la récupération des spécialités:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle spécialité
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

    // Vérifier si la spécialité existe déjà
    const existing = await prisma.specialite.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'هذا التخصص موجود مسبقاً' },
        { status: 400 }
      )
    }

    const specialite = await prisma.specialite.create({
      data: { nom },
    })

    return NextResponse.json(specialite, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de la spécialité:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

