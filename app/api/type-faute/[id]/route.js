import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Mettre à jour un type de faute
export async function PUT(request, { params }) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const id = parseInt(resolvedParams?.id, 10)

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { code, nom, description, actif } = body

    const existing = await prisma.typeFaute.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Type de faute non trouvé' },
        { status: 404 }
      )
    }

    if (code && code !== existing.code) {
      const codeExists = await prisma.typeFaute.findFirst({
        where: {
          code: { equals: code, mode: 'insensitive' },
          NOT: { id },
        },
      })

      if (codeExists) {
        return NextResponse.json(
          { error: 'Ce code de type de faute existe déjà' },
          { status: 400 }
        )
      }
    }

    const typeFaute = await prisma.typeFaute.update({
      where: { id },
      data: {
        code: code || existing.code,
        nom: nom || existing.nom,
        description: description !== undefined ? description || null : existing.description,
        actif: typeof actif === 'boolean' ? actif : existing.actif,
      },
    })

    return NextResponse.json(typeFaute)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du type de faute:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Désactiver un type de faute
export async function DELETE(_request, { params }) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const id = parseInt(resolvedParams?.id, 10)

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const existing = await prisma.typeFaute.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Type de faute non trouvé' },
        { status: 404 }
      )
    }

    await prisma.typeFaute.update({
      where: { id },
      data: { actif: false },
    })

    return NextResponse.json({ message: 'Type de faute désactivé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la désactivation du type de faute:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
