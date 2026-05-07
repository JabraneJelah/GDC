import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_PROOF_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}
const NOTIFICATION_PROOF_TITLE_PREFIX = '\u0648\u0635\u0644 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645'

// First registration only when documents are ready
const FIRST_REGISTRATION_STATUS = 'DOCUMENTS_INITIAUX_GENERES'

// Correction allowed before any closure/finalization
const CORRECTION_STATUSES = [
  'NOTIFIE',
  'REPONSE_RECUE',
  'REPONSE_CONVAINCANTE',
  'REPONSE_NON_CONVAINCANTE',
  'PROCEDURE_SUIVANTE_GENEREE',
]

const ALL_ALLOWED_STATUSES = [FIRST_REGISTRATION_STATUS, ...CORRECTION_STATUSES]

function sanitizeFileNamePart(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildProofFileName({ dossierId, originalName, mimeType }) {
  const extension = ALLOWED_PROOF_TYPES[mimeType]
  const originalBaseName = sanitizeFileNamePart(path.parse(originalName || 'preuve-notification').name)
  const safeBaseName = originalBaseName || 'preuve-notification'

  return `${sanitizeFileNamePart(dossierId)}-${Date.now()}-${safeBaseName}.${extension}`
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
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const formData = await request.formData()
    const date_notification = formData.get('date_notification')
    const proofFile = formData.get('file')

    if (typeof date_notification !== 'string' || !date_notification.trim()) {
      return NextResponse.json(
        { error: 'La date de notification est obligatoire' },
        { status: 400 }
      )
    }

    const parsedNotificationDate = new Date(date_notification)
    if (Number.isNaN(parsedNotificationDate.getTime())) {
      return NextResponse.json(
        { error: 'Date de notification invalide' },
        { status: 400 }
      )
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      select: {
        id: true,
        statut: true,
        date_notification: true,
      },
    })

    if (!dossier) {
      return NextResponse.json(
        { error: 'Dossier explicatif non trouve' },
        { status: 404 }
      )
    }

    if (!ALL_ALLOWED_STATUSES.includes(dossier.statut)) {
      return NextResponse.json(
        { error: 'La notification ne peut etre enregistree ou modifiee dans le statut actuel du dossier' },
        { status: 400 }
      )
    }

    const isFirstRegistration = dossier.statut === FIRST_REGISTRATION_STATUS
    const existingNotificationDocuments = await prisma.dossierDocument.findMany({
      where: {
        dossier_id: dossier.id,
        categorie: 'preuve_notification',
        origine: 'TELEVERSE',
      },
      orderBy: { cree_le: 'desc' },
      select: { id: true },
    })
    const existingNotificationDocument = existingNotificationDocuments[0] || null
    const duplicateNotificationDocumentIds = existingNotificationDocuments.slice(1).map((document) => document.id)

    if (isFirstRegistration) {
      // File is required for first registration
      if (!(proofFile instanceof File) || proofFile.size === 0) {
        return NextResponse.json(
          { error: 'Le justificatif de notification est obligatoire' },
          { status: 400 }
        )
      }

      if (!Object.keys(ALLOWED_PROOF_TYPES).includes(proofFile.type)) {
        return NextResponse.json(
          { error: 'Format du justificatif invalide. Les formats acceptes sont PDF, JPG et PNG' },
          { status: 400 }
        )
      }

      if (dossier.date_notification || existingNotificationDocument) {
        return NextResponse.json(
          {
            error: 'La notification a deja ete enregistree pour ce dossier',
            has_notification_date: Boolean(dossier.date_notification),
            has_notification_proof_document: Boolean(existingNotificationDocument),
          },
          { status: 400 }
        )
      }
    } else {
      // Correction mode: file is optional, but validate type if provided
      if (proofFile instanceof File && proofFile.size > 0) {
        if (!Object.keys(ALLOWED_PROOF_TYPES).includes(proofFile.type)) {
          return NextResponse.json(
            { error: 'Format du justificatif invalide. Les formats acceptes sont PDF, JPG et PNG' },
            { status: 400 }
          )
        }
      }
    }

    // Save file to disk only if provided
    let publicPath = null
    const hasNewFile = proofFile instanceof File && proofFile.size > 0

    if (hasNewFile) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proofs')
      const fileName = buildProofFileName({
        dossierId: dossier.id,
        originalName: proofFile.name,
        mimeType: proofFile.type,
      })
      const diskPath = path.join(uploadDir, fileName)
      publicPath = `/uploads/proofs/${fileName}`

      await mkdir(uploadDir, { recursive: true })
      const bytes = Buffer.from(await proofFile.arrayBuffer())
      await writeFile(diskPath, bytes, { flag: 'wx' })
    }

    await prisma.$transaction(async (tx) => {
      if (publicPath) {
        if (existingNotificationDocument) {
          await tx.dossierDocument.update({
            where: { id: existingNotificationDocument.id },
            data: {
              titre: `${NOTIFICATION_PROOF_TITLE_PREFIX} - ${proofFile.name || 'preuve_notification'}`,
              chemin_fichier: publicPath,
              cree_par_rh_id: currentUser.userId,
            },
          })
        } else {
          await tx.dossierDocument.create({
            data: {
              identifiant: `NOTIF-${dossier.id}`,
              titre: `${NOTIFICATION_PROOF_TITLE_PREFIX} - ${proofFile.name || 'preuve_notification'}`,
              chemin_fichier: publicPath,
              origine: 'TELEVERSE',
              categorie: 'preuve_notification',
              dossier_id: dossier.id,
              template_id: null,
              cree_par_rh_id: currentUser.userId,
            },
          })
        }
      }

      if (duplicateNotificationDocumentIds.length > 0) {
        await tx.dossierDocument.deleteMany({
          where: {
            id: { in: duplicateNotificationDocumentIds },
            dossier_id: dossier.id,
            categorie: 'preuve_notification',
            origine: 'TELEVERSE',
          },
        })
      }

      await tx.dossierExplicatif.update({
        where: { id: dossier.id },
        data: {
          date_notification: parsedNotificationDate,
          ...(isFirstRegistration ? { statut: 'NOTIFIE' } : {}),
        },
      })
    })

    return NextResponse.json({
      message: isFirstRegistration ? 'Notification enregistree avec succes' : 'Notification mise a jour avec succes',
      dossier_id: dossier.id,
      statut: isFirstRegistration ? 'NOTIFIE' : dossier.statut,
    })
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la notification:", error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
