import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des services
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const services = await prisma.service.findMany({
      orderBy: { nom: 'asc' },
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error('Erreur lors de la récupération des services:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau service
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { nom } = body

    if (!nom) {
      return NextResponse.json(
        { error: 'Le nom est obligatoire' },
        { status: 400 }
      )
    }

    // Vérifier si le service existe déjà
    const existing = await prisma.service.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'هذه المصلحة موجودة مسبقاً' },
        { status: 400 }
      )
    }

    const service = await prisma.service.create({
      data: { nom },
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du service:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

