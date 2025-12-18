import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PUT - Mettre à jour une catégorie
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

    // Vérifier si la catégorie existe
    const existing = await prisma.categoriePersonnel.findUnique({
      where: { id },
      include: {
        _count: {
          select: { professeurs: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier si le nom est modifié et s'il existe déjà
    if (nom && nom !== existing.nom) {
      const nomExists = await prisma.categoriePersonnel.findFirst({
        where: {
          nom: { equals: nom, mode: 'insensitive' },
          NOT: { id },
        },
      })

      if (nomExists) {
        return NextResponse.json(
          { error: 'Ce nom de catégorie existe déjà' },
          { status: 400 }
        )
      }
    }

    const categorie = await prisma.categoriePersonnel.update({
      where: { id },
      data: { nom: nom || existing.nom },
    })

    return NextResponse.json(categorie)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la catégorie:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une catégorie
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

    const existing = await prisma.categoriePersonnel.findUnique({
      where: { id },
      include: {
        _count: {
          select: { professeurs: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier si la catégorie est utilisée
    if (existing._count.professeurs > 0) {
      return NextResponse.json(
        {
          error: `Cette catégorie est utilisée par ${existing._count.professeurs} professeur(s) et ne peut pas être supprimée`,
        },
        { status: 400 }
      )
    }

    await prisma.categoriePersonnel.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Catégorie supprimée avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

