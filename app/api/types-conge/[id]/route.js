import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

// PUT - Mettre à jour un type de congé
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    // Handle both sync and async params (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID du type de congé manquant' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { nom, document_obligatoire } = body

    const typeId = parseInt(id, 10)
    if (isNaN(typeId)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    // Vérifier si le type existe
    const existing = await prisma.typeConge.findUnique({
      where: { id: typeId },
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
          NOT: { id: typeId },
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
      where: { id: typeId },
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
    const msg = error?.message || ''
    const friendly = /prisma|invocation|ECONNREFUSED|database/i.test(msg)
      ? 'Impossible de modifier le type. Vérifiez que la base de données est accessible.'
      : 'Impossible de modifier le type. Réessayez.'
    return NextResponse.json(
      { error: friendly },
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
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    // Handle both sync and async params (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID du type de congé manquant' },
        { status: 400 }
      )
    }

    const typeId = parseInt(id, 10)
    if (isNaN(typeId)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

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
    const msg = error?.message || ''
    const friendly = /prisma|invocation|ECONNREFUSED|database/i.test(msg)
      ? 'Impossible de supprimer. Vérifiez que la base de données est accessible.'
      : /foreign key|constraint/i.test(msg)
        ? 'Ce type est utilisé par des soldes ou congés et ne peut pas être supprimé.'
        : 'Impossible de supprimer. Réessayez.'
    return NextResponse.json(
      { error: friendly },
      { status: 500 }
    )
  }
}

