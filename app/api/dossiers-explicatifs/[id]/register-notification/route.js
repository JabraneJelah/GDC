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

function buildNotificationDocumentIdentifiant(dossierId) {
  return `NOTIF-${dossierId}`
}

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
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
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

    if (dossier.statut !== 'DOCUMENTS_INITIAUX_GENERES') {
      return NextResponse.json(
        { error: 'La notification ne peut etre enregistree que pour un dossier avec documents initiaux generes' },
        { status: 400 }
      )
    }

    const existingNotificationDocument = await prisma.dossierDocument.findFirst({
      where: {
        dossier_id: dossier.id,
        categorie: 'preuve_notification',
      },
      select: {
        id: true,
        titre: true,
      },
    })

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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proofs')
    const fileName = buildProofFileName({
      dossierId: dossier.id,
      originalName: proofFile.name,
      mimeType: proofFile.type,
    })
    const diskPath = path.join(uploadDir, fileName)
    const publicPath = `/uploads/proofs/${fileName}`

    await mkdir(uploadDir, { recursive: true })
    const bytes = Buffer.from(await proofFile.arrayBuffer())
    await writeFile(diskPath, bytes, { flag: 'wx' })

    await prisma.$transaction(async (tx) => {
      await tx.dossierDocument.create({
        data: {
          identifiant: buildNotificationDocumentIdentifiant(dossier.id),
          titre: `وصل الاستلام - ${proofFile.name || 'preuve_notification'}`,
          chemin_fichier: publicPath,
          origine: 'TELEVERSE',
          categorie: 'preuve_notification',
          dossier_id: dossier.id,
          template_id: null,
          cree_par_rh_id: currentUser.userId,
        },
      })

      await tx.dossierExplicatif.update({
        where: { id: dossier.id },
        data: {
          date_notification: parsedNotificationDate,
          statut: 'NOTIFIE',
        },
      })
    })

    return NextResponse.json({
      message: 'Notification enregistree avec succes',
      dossier_id: dossier.id,
      statut: 'NOTIFIE',
    })
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la notification:", error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
