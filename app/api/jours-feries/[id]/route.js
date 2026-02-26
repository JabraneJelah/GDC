import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
    const { date, nom, actif } = body

    // Vérifier si le jour férié existe
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

    // Si la date est modifiée, vérifier qu'elle n'existe pas déjà
    if (date) {
      const dateObj = new Date(date)
      dateObj.setHours(0, 0, 0, 0)

      if (dateObj.getTime() !== existing.date.getTime()) {
        const dateExists = await prisma.jourFerie.findFirst({
          where: {
            date: dateObj,
            NOT: { id: jourFerieId },
          },
        })

        if (dateExists) {
          return NextResponse.json(
            { error: 'Un jour férié existe déjà pour cette date' },
            { status: 400 }
          )
        }
      }

      updateData.date = dateObj
    }

    if (nom !== undefined) {
      updateData.nom = nom
    }

    if (actif !== undefined) {
      updateData.actif = actif
    }

    // Mettre à jour le jour férié
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

    // Vérifier si le jour férié existe
    const existing = await prisma.jourFerie.findUnique({
      where: { id: jourFerieId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Jour férié non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer le jour férié
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
