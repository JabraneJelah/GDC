import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_TYPES_PROCEDURE = ['AVERTISSEMENT', 'RETENUE']

function buildDocumentIdentifiant(templateId, dossierId) {
  return `PROC-${templateId}-${dossierId}`
}

function buildPlaceholderPath(templateId, dossierId) {
  return `pending://procedure/template/${templateId}/dossier/${dossierId}`
}

function buildDocumentTitle(templateName) {
  return `Procedure suivante - ${templateName}`
}

export async function POST(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id || !UUID_PATTERN.test(id)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { type_procedure, template_id } = body

    if (!type_procedure) {
      return NextResponse.json(
        { error: 'Le type de procedure est obligatoire' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES_PROCEDURE.includes(type_procedure)) {
      return NextResponse.json(
        { error: 'Type de procedure invalide' },
        { status: 400 }
      )
    }

    if (!template_id || !UUID_PATTERN.test(template_id)) {
      return NextResponse.json(
        { error: 'Template de procedure invalide' },
        { status: 400 }
      )
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      select: {
        id: true,
        statut: true,
        type_faute_id: true,
        type_procedure_selectionne: true,
        template_procedure_id: true,
      },
    })

    if (!dossier) {
      return NextResponse.json(
        { error: 'Dossier explicatif non trouve' },
        { status: 404 }
      )
    }

    if (dossier.statut !== 'REPONSE_NON_CONVAINCANTE') {
      return NextResponse.json(
        { error: 'La procedure suivante ne peut etre generee que pour un dossier avec reponse non convaincante' },
        { status: 400 }
      )
    }

    if (dossier.type_procedure_selectionne || dossier.template_procedure_id) {
      return NextResponse.json(
        { error: 'La procedure suivante a deja ete generee pour ce dossier' },
        { status: 400 }
      )
    }

    const template = await prisma.documentTemplate.findUnique({
      where: { id: template_id },
      select: {
        id: true,
        nom: true,
        actif: true,
        type_faute_id: true,
        usage: true,
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template de procedure non trouve' },
        { status: 404 }
      )
    }

    if (!template.actif) {
      return NextResponse.json(
        { error: 'Le template de procedure selectionne est inactif' },
        { status: 400 }
      )
    }

    if (template.type_faute_id !== dossier.type_faute_id) {
      return NextResponse.json(
        { error: 'Le template de procedure selectionne ne correspond pas au type de faute du dossier' },
        { status: 400 }
      )
    }

    if (template.usage !== type_procedure) {
      return NextResponse.json(
        { error: 'Le template de procedure selectionne ne correspond pas au type de procedure choisi' },
        { status: 400 }
      )
    }

    const existingProcedureDocument = await prisma.dossierDocument.findFirst({
      where: {
        dossier_id: dossier.id,
        origine: 'GENERE',
        categorie: 'procedure_suivante',
      },
      select: {
        id: true,
        titre: true,
      },
    })

    if (existingProcedureDocument) {
      return NextResponse.json(
        {
          error: 'La procedure suivante a deja ete generee pour ce dossier',
          existing_document: existingProcedureDocument,
        },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdDocument = await tx.dossierDocument.create({
        data: {
          identifiant: buildDocumentIdentifiant(template.id, dossier.id),
          titre: buildDocumentTitle(template.nom),
          chemin_fichier: buildPlaceholderPath(template.id, dossier.id),
          origine: 'GENERE',
          categorie: 'procedure_suivante',
          dossier_id: dossier.id,
          template_id: template.id,
          cree_par_rh_id: currentUser.userId,
        },
        select: {
          id: true,
          identifiant: true,
          titre: true,
          template_id: true,
          chemin_fichier: true,
          origine: true,
          categorie: true,
          cree_le: true,
        },
      })

      const updatedDossier = await tx.dossierExplicatif.update({
        where: { id: dossier.id },
        data: {
          type_procedure_selectionne: type_procedure,
          template_procedure_id: template.id,
          statut: 'PROCEDURE_SUIVANTE_GENEREE',
        },
        select: {
          id: true,
          statut: true,
          type_procedure_selectionne: true,
          template_procedure_id: true,
        },
      })

      return {
        createdDocument,
        updatedDossier,
      }
    })

    return NextResponse.json({
      message: 'Procedure suivante generee avec succes',
      dossier_id: result.updatedDossier.id,
      statut: result.updatedDossier.statut,
      type_procedure: result.updatedDossier.type_procedure_selectionne,
      template_id: result.updatedDossier.template_procedure_id,
      created_document: result.createdDocument,
    })
  } catch (error) {
    console.error('Erreur lors de la generation de la procedure suivante:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
