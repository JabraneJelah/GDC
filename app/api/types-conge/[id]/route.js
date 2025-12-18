import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PUT - Mettre à jour un type de congé
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { nom, document_obligatoire } = body

    // Vérifier si le type existe
    const existing = await prisma.typeConge.findUnique({
      where: { id: parseInt(params.id) },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Type de congé non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si le nom est modifié et s'il existe déjà
    if (nom && nom !== existing.nom) {
      const nomExists = await prisma.typeConge.findFirst({
        where: {
          nom: { equals: nom, mode: 'insensitive' },
          NOT: { id: parseInt(params.id) },
        },
      })

      if (nomExists) {
        return NextResponse.json(
          { error: 'Ce nom de type de congé existe déjà' },
          { status: 400 }
        )
      }
    }

    // Mettre à jour le type
    const typeConge = await prisma.typeConge.update({
      where: { id: parseInt(params.id) },
      data: {
        nom: nom || existing.nom,
        document_obligatoire:
          document_obligatoire !== undefined
            ? document_obligatoire
            : existing.document_obligatoire,
      },
    })

    return NextResponse.json(typeConge)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du type de congé:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un type de congé
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const typeId = parseInt(params.id)

    // Vérifier si le type existe
    const existing = await prisma.typeConge.findUnique({
      where: { id: typeId },
      include: {
        _count: {
          select: { conges: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Type de congé non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si le type est utilisé par des congés
    if (existing._count.conges > 0) {
      return NextResponse.json(
        {
          error: `Ce type de congé est utilisé par ${existing._count.conges} congé(s) et ne peut pas être supprimé`,
        },
        { status: 400 }
      )
    }

    // Supprimer le type
    await prisma.typeConge.delete({
      where: { id: typeId },
    })

    return NextResponse.json({ message: 'Type de congé supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du type de congé:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

