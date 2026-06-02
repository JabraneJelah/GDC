import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

// PUT - Mettre à jour un hopital
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

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

    const existing = await prisma.hopital.findUnique({
      where: { id },
      include: {
        _count: {
          select: { professeurs: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Hopital non trouvé' },
        { status: 404 }
      )
    }

    if (nom && nom !== existing.nom) {
      const nomExists = await prisma.hopital.findFirst({
        where: {
          nom: { equals: nom, mode: 'insensitive' },
          NOT: { id },
        },
      })

      if (nomExists) {
        return NextResponse.json(
          { error: 'Ce nom d\'hopital existe déjà' },
          { status: 400 }
        )
      }
    }

    const hopital = await prisma.hopital.update({
      where: { id },
      data: { nom: nom || existing.nom },
    })

    return NextResponse.json(hopital)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'hopital:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un hopital
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const resolvedParams = params instanceof Promise ? await params : params
    const id = parseInt(resolvedParams?.id)

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const existing = await prisma.hopital.findUnique({
      where: { id },
      include: {
        _count: {
          select: { professeurs: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Hopital non trouvé' },
        { status: 404 }
      )
    }

    if (existing._count.professeurs > 0) {
      return NextResponse.json(
        {
          error: `Cet hopital est utilisé par ${existing._count.professeurs} professeur(s) et ne peut pas être supprimé`,
        },
        { status: 400 }
      )
    }

    await prisma.hopital.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Hopital supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'hopital:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

