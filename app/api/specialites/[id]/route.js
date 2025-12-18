import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PUT - Mettre à jour une spécialité
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const id = parseInt(resolvedParams?.id)

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { nom } = body

    const existing = await prisma.specialite.findUnique({
      where: { id },
      include: {
        _count: {
          select: { professeurs: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Spécialité non trouvée' },
        { status: 404 }
      )
    }

    if (nom && nom !== existing.nom) {
      const nomExists = await prisma.specialite.findFirst({
        where: {
          nom: { equals: nom, mode: 'insensitive' },
          NOT: { id },
        },
      })

      if (nomExists) {
        return NextResponse.json(
          { error: 'Ce nom de spécialité existe déjà' },
          { status: 400 }
        )
      }
    }

    const specialite = await prisma.specialite.update({
      where: { id },
      data: { nom: nom || existing.nom },
    })

    return NextResponse.json(specialite)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la spécialité:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une spécialité
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const id = parseInt(resolvedParams?.id)

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const existing = await prisma.specialite.findUnique({
      where: { id },
      include: {
        _count: {
          select: { professeurs: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Spécialité non trouvée' },
        { status: 404 }
      )
    }

    if (existing._count.professeurs > 0) {
      return NextResponse.json(
        {
          error: `Cette spécialité est utilisée par ${existing._count.professeurs} professeur(s) et ne peut pas être supprimée`,
        },
        { status: 400 }
      )
    }

    await prisma.specialite.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Spécialité supprimée avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression de la spécialité:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

