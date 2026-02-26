import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des jours fériés
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const actif = searchParams.get('actif')

    const where = {}
    
    // Filtrer par date si fourni
    if (from && to) {
      where.date = {
        gte: new Date(from),
        lte: new Date(to),
      }
    }
    
    // Filtrer par statut actif si fourni
    if (actif !== null && actif !== undefined && actif !== 'all') {
      where.actif = actif === 'true'
    } else if (actif !== 'all') {
      // Par défaut, ne retourner que les jours fériés actifs (sauf si 'all' est demandé)
      where.actif = true
    }

    const joursFeries = await prisma.jourFerie.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    return NextResponse.json(joursFeries)
  } catch (error) {
    console.error('Erreur lors de la récupération des jours fériés:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau jour férié
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { date, nom, actif } = body

    if (!date || !nom) {
      return NextResponse.json(
        { error: 'La date et le nom sont obligatoires' },
        { status: 400 }
      )
    }

    // Normaliser la date à 00:00:00
    const dateObj = new Date(date)
    dateObj.setHours(0, 0, 0, 0)

    // Vérifier si un jour férié existe déjà pour cette date
    const existing = await prisma.jourFerie.findFirst({
      where: {
        date: dateObj,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Un jour férié existe déjà pour cette date' },
        { status: 400 }
      )
    }

    const jourFerie = await prisma.jourFerie.create({
      data: {
        date: dateObj,
        nom,
        actif: actif !== undefined ? actif : true,
      },
    })

    return NextResponse.json(jourFerie, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du jour férié:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    )
  }
}
