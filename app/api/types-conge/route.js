import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des types de congé
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const types = await prisma.typeConge.findMany({
      orderBy: { id: 'asc' },
    })

    return NextResponse.json(types)
  } catch (error) {
    console.error('Erreur lors de la récupération des types de congé:', error)
    const msg = error?.message || ''
    const friendly = /prisma|invocation|ECONNREFUSED|database/i.test(msg)
      ? 'Impossible de charger les types de congé. Vérifiez que la base de données est accessible.'
      : 'Une erreur est survenue.'
    return NextResponse.json(
      { error: friendly },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau type de congé
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { nom, document_obligatoire } = body

    if (!nom) {
      return NextResponse.json(
        { error: 'Le nom est obligatoire' },
        { status: 400 }
      )
    }

    // Vérifier si le type existe déjà
    const existing = await prisma.typeConge.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ce type de congé existe déjà' },
        { status: 400 }
      )
    }

    const typeConge = await prisma.typeConge.create({
      data: {
        nom,
        document_obligatoire: document_obligatoire ?? false,
      },
    })

    return NextResponse.json(typeConge, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du type de congé:', error)
    const msg = error?.message || ''
    const friendly = /prisma|invocation|ECONNREFUSED|database/i.test(msg)
      ? 'Impossible d\'ajouter le type de congé. Vérifiez que la base de données est accessible.'
      : /unique|duplicate|exists/i.test(msg)
        ? 'Ce type de congé existe déjà.'
        : 'Impossible d\'ajouter le type. Réessayez.'
    return NextResponse.json(
      { error: friendly },
      { status: 500 }
    )
  }
}

