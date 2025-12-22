import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PUT - Mettre à jour un service
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

    const existing = await prisma.service.findUnique({
      where: { id },
      include: {
        _count: {
          select: { professeurs: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Service non trouvé' },
        { status: 404 }
      )
    }

    if (nom && nom !== existing.nom) {
      const nomExists = await prisma.service.findFirst({
        where: {
          nom: { equals: nom, mode: 'insensitive' },
          NOT: { id },
        },
      })

      if (nomExists) {
        return NextResponse.json(
          { error: 'Ce nom de service existe déjà' },
          { status: 400 }
        )
      }
    }

    const service = await prisma.service.update({
      where: { id },
      data: { nom: nom || existing.nom },
    })

    return NextResponse.json(service)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du service:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un service
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

    const existing = await prisma.service.findUnique({
      where: { id },
      include: {
        _count: {
          select: { professeurs: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Service non trouvé' },
        { status: 404 }
      )
    }

    if (existing._count.professeurs > 0) {
      return NextResponse.json(
        {
          error: `Ce service est utilisé par ${existing._count.professeurs} professeur(s) et ne peut pas être supprimé`,
        },
        { status: 400 }
      )
    }

    await prisma.service.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Service supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du service:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

