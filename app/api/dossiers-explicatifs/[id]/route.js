import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'
import { getExtraFieldsForCode } from '@/lib/dossiers-explicatifs/extraFields'
import {
  deriveOrdreRetenuePolicy,
  isOrdreRetenueTimestampConsistent,
} from '@/lib/dossiers-explicatifs/ordreRetenuePolicy'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const FINAL_STATUSES = ['CLOTURE', 'A_ARCHIVER', 'ARCHIVE']

// GET - Detail d'un dossier explicatif
export async function GET(_request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      include: {
        type_faute: {
          select: {
            id: true,
            code: true,
            nom: true,
            description: true,
            actif: true,
          },
        },
        cree_par_rh: {
          select: {
            id: true,
            username: true,
            nom_complet: true,
          },
        },
        documents: {
          orderBy: { cree_le: 'asc' },
          select: {
            id: true,
            identifiant: true,
            titre: true,
            chemin_fichier: true,
            origine: true,
            categorie: true,
            cree_le: true,
            template: {
              select: {
                id: true,
                nom: true,
                identifiant: true,
                usage: true,
              },
            },
          },
        },
        historique: {
          where: { action: 'ORDRE_RETENUE_TELEVERSE' },
          orderBy: [{ cree_le: 'asc' }, { id: 'asc' }],
          take: 1,
          select: {
            id: true,
            action: true,
            ancien_statut: true,
            nouveau_statut: true,
            cree_le: true,
          },
        },
      },
    })

    if (!dossier) {
      return NextResponse.json(
        { error: 'Dossier explicatif non trouve' },
        { status: 404 }
      )
    }

    const mappedDocuments = dossier.documents.map((document) => ({
      ...document,
      nom: document.titre,
      created_at: document.cree_le,
    }))
    const ordreRetenueDocuments = mappedDocuments.filter(
      (document) => document.categorie === 'ordre_retenue',
    )
    const hasMultipleOrdreRetenueDocuments = ordreRetenueDocuments.length > 1
    const ordreRetenueDocument = ordreRetenueDocuments.length === 1
      ? ordreRetenueDocuments[0]
      : null
    const firstUploadHistory = dossier.historique[0] || null
    const ordreRetenuePolicy = deriveOrdreRetenuePolicy({
      statut: dossier.statut,
      typeProcedure: dossier.type_procedure_selectionne,
      document: ordreRetenueDocument,
      firstUploadHistory,
      hasMultipleDocuments: hasMultipleOrdreRetenueDocuments,
    })

    if (ordreRetenueDocument && !isOrdreRetenueTimestampConsistent({
      documentCreatedAt: ordreRetenueDocument.cree_le,
      archiveDate: dossier.date_archivage,
      firstUploadPhase: ordreRetenuePolicy.firstUploadPhase,
    })) {
      console.warn(`Incoherence temporelle ordre_retenue pour le dossier ${id}`)
    }

    const { historique: _historique, ...publicDossier } = dossier

    return NextResponse.json({
      ...publicDossier,
      documents: mappedDocuments,
      ordre_retenue: {
        document: ordreRetenueDocument,
        firstUploadPhase: ordreRetenuePolicy.firstUploadPhase,
        canUpload: ordreRetenuePolicy.canUpload,
        canReplace: ordreRetenuePolicy.canReplace,
        lockedAfterArchive:
          ordreRetenuePolicy.lockedAfterArchive || hasMultipleOrdreRetenueDocuments,
        ambiguous: hasMultipleOrdreRetenueDocuments,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la recuperation du dossier explicatif:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PATCH - Update donnees_supplementaires
export async function PATCH(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id || !UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const body = await request.json()
    const { donnees_supplementaires } = body

    if (!donnees_supplementaires || typeof donnees_supplementaires !== 'object' || Array.isArray(donnees_supplementaires)) {
      return NextResponse.json({ error: 'donnees_supplementaires doit etre un objet JSON' }, { status: 400 })
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      select: {
        id: true,
        statut: true,
        donnees_supplementaires: true,
        type_faute: { select: { code: true } },
      },
    })

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier non trouve' }, { status: 404 })
    }

    if (FINAL_STATUSES.includes(dossier.statut)) {
      return NextResponse.json({ error: 'Impossible de modifier un dossier en etat final' }, { status: 409 })
    }

    const allowedFields = getExtraFieldsForCode(dossier.type_faute?.code)
    const allowedKeys = new Set(allowedFields.map((f) => f.key))
    const sanitized = {}
    for (const [key, value] of Object.entries(donnees_supplementaires)) {
      if (allowedKeys.has(key)) {
        sanitized[key] = value
      }
    }

    const existing = dossier.donnees_supplementaires && typeof dossier.donnees_supplementaires === 'object'
      ? dossier.donnees_supplementaires
      : {}

    const merged = { ...existing, ...sanitized }

    const updated = await prisma.dossierExplicatif.update({
      where: { id },
      data: { donnees_supplementaires: merged },
      select: { id: true, donnees_supplementaires: true },
    })

    return NextResponse.json({ donnees_supplementaires: updated.donnees_supplementaires })
  } catch (error) {
    console.error('Erreur lors de la mise a jour des donnees supplementaires:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
