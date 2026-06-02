import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

function normalizeDayStart(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d
}

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

    // Plages qui chevauchent [from, to] (inclus)
    if (from && to) {
      const periodStart = new Date(`${from}T00:00:00`)
      const periodEnd = new Date(`${to}T23:59:59.999`)
      where.date_debut = { lte: periodEnd }
      where.date_fin = { gte: periodStart }
    }

    if (actif !== null && actif !== undefined && actif !== 'all') {
      where.actif = actif === 'true'
    } else if (actif !== 'all') {
      where.actif = true
    }

    const joursFeries = await prisma.jourFerie.findMany({
      where,
      orderBy: { date_debut: 'asc' },
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
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const body = await request.json()
    const { date_debut, date_fin, nom, actif } = body

    if (!date_debut || !date_fin || !nom) {
      return NextResponse.json(
        { error: 'La date de début, la date de fin et le nom sont obligatoires' },
        { status: 400 }
      )
    }

    const debut = normalizeDayStart(date_debut)
    const fin = normalizeDayStart(date_fin)
    if (!debut || !fin) {
      return NextResponse.json(
        { error: 'Dates invalides' },
        { status: 400 }
      )
    }
    if (fin < debut) {
      return NextResponse.json(
        { error: 'La date de fin doit être postérieure ou égale à la date de début' },
        { status: 400 }
      )
    }

    const jourFerie = await prisma.jourFerie.create({
      data: {
        date_debut: debut,
        date_fin: fin,
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
