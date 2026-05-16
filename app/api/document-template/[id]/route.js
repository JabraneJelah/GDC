import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const VALID_USAGES = ['LETTRE_EXPLICATIVE', 'BORDEREAU_NOTIFICATION', 'AVERTISSEMENT', 'RETENUE', 'PROCEDURE_DISCIPLINAIRE']

function parseTypeFauteId(value) {
  if (value == null || value === '') return null
  return typeof value === 'number' ? value : parseInt(value, 10)
}

export async function PUT(request, { params }) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const existing = await prisma.documentTemplate.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Template de document non trouvé' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      nom,
      identifiant,
      type_faute_id: typeFauteIdRaw,
      usage,
      description,
      actif,
    } = body

    const nextNom = typeof nom === 'string' ? nom.trim() : ''
    const nextIdentifiant = typeof identifiant === 'string' ? identifiant.trim() : ''
    const nextTypeFauteId = parseTypeFauteId(typeFauteIdRaw)

    if (!nextNom || !nextIdentifiant || nextTypeFauteId == null || Number.isNaN(nextTypeFauteId) || !usage) {
      return NextResponse.json(
        { error: 'Le nom, l’identifiant, le type de faute et l’usage sont obligatoires' },
        { status: 400 }
      )
    }

    if (!VALID_USAGES.includes(usage)) {
      return NextResponse.json(
        { error: 'Usage invalide' },
        { status: 400 }
      )
    }

    const typeFaute = await prisma.typeFaute.findUnique({
      where: { id: nextTypeFauteId },
    })

    if (!typeFaute) {
      return NextResponse.json(
        { error: 'Type de faute non trouvé' },
        { status: 404 }
      )
    }

    if (nextIdentifiant.toLowerCase() !== existing.identifiant.toLowerCase()) {
      const identifiantExists = await prisma.documentTemplate.findFirst({
        where: {
          identifiant: { equals: nextIdentifiant, mode: 'insensitive' },
          NOT: { id },
        },
      })

      if (identifiantExists) {
        return NextResponse.json(
          { error: 'Cet identifiant de template existe déjà' },
          { status: 400 }
        )
      }
    }

    const usagePairChanged =
      Number(nextTypeFauteId) !== Number(existing.type_faute_id) || usage !== existing.usage

    if (usagePairChanged) {
      const usagePairExists = await prisma.documentTemplate.findFirst({
        where: { type_faute_id: nextTypeFauteId, usage, NOT: { id } },
      })

      if (usagePairExists) {
        return NextResponse.json(
          { error: 'Un template avec ce type de faute et cet usage existe déjà' },
          { status: 400 }
        )
      }
    }

    const template = await prisma.documentTemplate.update({
      where: { id },
      data: {
        nom: nextNom,
        identifiant: nextIdentifiant,
        type_faute_id: nextTypeFauteId,
        usage,
        description: typeof description === 'string' && description.trim() ? description.trim() : null,
        actif: typeof actif === 'boolean' ? actif : existing.actif,
      },
      include: {
        type_faute: {
          select: {
            id: true,
            code: true,
            nom: true,
            actif: true,
          },
        },
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du template de document:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request, { params }) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const existing = await prisma.documentTemplate.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Template de document non trouvé' },
        { status: 404 }
      )
    }

    const usedDocumentsCount = await prisma.dossierDocument.count({
      where: { template_id: id },
    })

    if (usedDocumentsCount > 0) {
      await prisma.documentTemplate.update({
        where: { id },
        data: { actif: false },
      })

      return NextResponse.json({
        message: 'Template de document désactivé avec succès',
        deactivated: true,
      })
    }

    await prisma.documentTemplate.delete({
      where: { id },
    })

    return NextResponse.json({
      message: 'Template de document supprimé avec succès',
      deleted: true,
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du template de document:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
