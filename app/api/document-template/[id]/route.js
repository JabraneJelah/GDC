import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

const VALID_USAGES = ['LETTRE_EXPLICATIVE', 'BORDEREAU_NOTIFICATION', 'AVERTISSEMENT', 'RETENUE', 'PROCEDURE_DISCIPLINAIRE']

function parseTypeFauteId(value) {
  if (value == null || value === '') return null
  return typeof value === 'number' ? value : parseInt(value, 10)
}

export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

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
    // null means generic (applies to all fault types); undefined/missing falls back
    const nextTypeFauteId = 'type_faute_id' in body
      ? (typeFauteIdRaw === null ? null : parseTypeFauteId(typeFauteIdRaw))
      : existing.type_faute_id

    if (!nextNom || !nextIdentifiant || !usage) {
      return NextResponse.json(
        { error: "Le nom, l'identifiant et l'usage sont obligatoires" },
        { status: 400 }
      )
    }

    if (nextTypeFauteId !== null && Number.isNaN(nextTypeFauteId)) {
      return NextResponse.json(
        { error: 'Type de faute invalide' },
        { status: 400 }
      )
    }

    if (!VALID_USAGES.includes(usage)) {
      return NextResponse.json(
        { error: 'Usage invalide' },
        { status: 400 }
      )
    }

    if (nextTypeFauteId !== null) {
      const typeFaute = await prisma.typeFaute.findUnique({
        where: { id: nextTypeFauteId },
      })

      if (!typeFaute) {
        return NextResponse.json(
          { error: 'Type de faute non trouvé' },
          { status: 404 }
        )
      }
    }

    // When reactivating (actif: false → true), check for active conflicts before
    // any field-level checks, since those will also run and may be redundant.
    const isReactivating = typeof actif === 'boolean' && actif === true && existing.actif === false

    if (isReactivating) {
      const [activeDuplicateIdentifiant, activeUsagePair] = await Promise.all([
        prisma.documentTemplate.findFirst({
          where: {
            identifiant: { equals: nextIdentifiant, mode: 'insensitive' },
            actif: true,
            NOT: { id },
          },
        }),
        prisma.documentTemplate.findFirst({
          where: { type_faute_id: nextTypeFauteId, usage, actif: true, NOT: { id } },
        }),
      ])

      if (activeDuplicateIdentifiant || activeUsagePair) {
        return NextResponse.json(
          { error: 'لا يمكن تفعيل هذا النموذج لوجود نموذج نشط بنفس الخصائص' },
          { status: 409 }
        )
      }
    }

    if (nextIdentifiant.toLowerCase() !== existing.identifiant.toLowerCase()) {
      const identifiantExists = await prisma.documentTemplate.findFirst({
        where: {
          identifiant: { equals: nextIdentifiant, mode: 'insensitive' },
          actif: true,
          NOT: { id },
        },
      })

      if (identifiantExists) {
        return NextResponse.json(
          { error: 'يوجد بالفعل نموذج نشط بنفس المعرف' },
          { status: 409 }
        )
      }
    }

    const usagePairChanged =
      nextTypeFauteId !== existing.type_faute_id || usage !== existing.usage

    if (usagePairChanged) {
      const usagePairExists = await prisma.documentTemplate.findFirst({
        where: { type_faute_id: nextTypeFauteId, usage, actif: true, NOT: { id } },
      })

      if (usagePairExists) {
        return NextResponse.json(
          { error: 'يوجد بالفعل نموذج نشط بنفس نوع المخالفة ونوع الاستعمال' },
          { status: 409 }
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
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

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
