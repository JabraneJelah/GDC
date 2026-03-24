import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function normalizeDayStart(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d
}

// PUT - Mettre à jour un jour férié
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID du jour férié manquant' },
        { status: 400 }
      )
    }

    const jourFerieId = parseInt(id, 10)
    if (isNaN(jourFerieId)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { date_debut, date_fin, nom, actif } = body

    const existing = await prisma.jourFerie.findUnique({
      where: { id: jourFerieId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Jour férié non trouvé' },
        { status: 404 }
      )
    }

    const updateData = {}

    if (date_debut !== undefined || date_fin !== undefined) {
      if (date_debut === undefined || date_fin === undefined) {
        return NextResponse.json(
          { error: 'date_debut et date_fin doivent être fournies ensemble' },
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
      updateData.date_debut = debut
      updateData.date_fin = fin
    }

    if (nom !== undefined) {
      updateData.nom = nom
    }

    if (actif !== undefined) {
      updateData.actif = actif
    }

    const jourFerie = await prisma.jourFerie.update({
      where: { id: jourFerieId },
      data: updateData,
    })

    return NextResponse.json(jourFerie)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du jour férié:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un jour férié
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID du jour férié manquant' },
        { status: 400 }
      )
    }

    const jourFerieId = parseInt(id, 10)
    if (isNaN(jourFerieId)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const existing = await prisma.jourFerie.findUnique({
      where: { id: jourFerieId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Jour férié non trouvé' },
        { status: 404 }
      )
    }

    await prisma.jourFerie.delete({
      where: { id: jourFerieId },
    })

    return NextResponse.json({ message: 'Jour férié supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du jour férié:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
