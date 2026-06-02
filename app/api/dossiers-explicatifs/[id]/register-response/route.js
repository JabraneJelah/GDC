import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_RESPONSE_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}
const RESPONSE_DOCUMENT_TITLE_PREFIX = '\u062c\u0648\u0627\u0628 \u0627\u0644\u0645\u0639\u0646\u064a \u0628\u0627\u0644\u0623\u0645\u0631'
const FIRST_REGISTRATION_STATUS = 'NOTIFIE'
const CORRECTION_STATUSES = [
  'REPONSE_RECUE',
  'REPONSE_CONVAINCANTE',
  'REPONSE_NON_CONVAINCANTE',
  'PROCEDURE_SUIVANTE_GENEREE',
]
const ALL_ALLOWED_STATUSES = [FIRST_REGISTRATION_STATUS, ...CORRECTION_STATUSES]

function buildResponseDocumentIdentifiant(dossierId, isFirstRegistration) {
  return isFirstRegistration ? `REP-${dossierId}` : `REP-${dossierId}-UPD-${Date.now()}`
}

function sanitizeFileNamePart(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildResponseFileName({ dossierId, originalName, mimeType }) {
  const extension = ALLOWED_RESPONSE_TYPES[mimeType]
  const originalBaseName = sanitizeFileNamePart(path.parse(originalName || 'reponse-agent').name)
  const safeBaseName = originalBaseName || 'reponse-agent'

  return `${sanitizeFileNamePart(dossierId)}-${Date.now()}-${safeBaseName}.${extension}`
}

export async function POST(request, { params }) {
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
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const date_reponse = formData.get('date_reponse')
    const responseFile = formData.get('file')

    if (typeof date_reponse !== 'string' || !date_reponse.trim()) {
      return NextResponse.json(
        { error: 'La date de reponse est obligatoire' },
        { status: 400 }
      )
    }

    const parsedResponseDate = new Date(date_reponse)
    if (Number.isNaN(parsedResponseDate.getTime())) {
      return NextResponse.json(
        { error: 'Date de reponse invalide' },
        { status: 400 }
      )
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      select: {
        id: true,
        statut: true,
        date_reponse_recue: true,
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
        { error: 'La reponse ne peut etre enregistree ou modifiee dans le statut actuel du dossier' },
        { status: 400 }
      )
    }

    const isFirstRegistration = dossier.statut === FIRST_REGISTRATION_STATUS

    const existingResponseDocuments = await prisma.dossierDocument.findMany({
      where: {
        dossier_id: dossier.id,
        origine: 'TELEVERSE',
        categorie: 'reponse_agent',
      },
      orderBy: { cree_le: 'desc' },
      select: { id: true },
    })
    const existingResponseDocument = existingResponseDocuments[0] || null
    const duplicateResponseDocumentIds = existingResponseDocuments.slice(1).map((document) => document.id)

    if (isFirstRegistration) {
      if (!(responseFile instanceof File) || responseFile.size === 0) {
        return NextResponse.json(
          { error: 'Le document de reponse est obligatoire' },
          { status: 400 }
        )
      }

      if (!Object.keys(ALLOWED_RESPONSE_TYPES).includes(responseFile.type)) {
        return NextResponse.json(
          { error: 'Format du document de reponse invalide. Les formats acceptes sont PDF, JPG, PNG et DOCX' },
          { status: 400 }
        )
      }

      if (dossier.date_reponse_recue || existingResponseDocument) {
        return NextResponse.json(
          {
            error: 'La reponse a deja ete enregistree pour ce dossier',
            has_response_date: Boolean(dossier.date_reponse_recue),
            has_response_document: Boolean(existingResponseDocument),
          },
          { status: 400 }
        )
      }
    } else if (responseFile instanceof File && responseFile.size > 0) {
      if (!Object.keys(ALLOWED_RESPONSE_TYPES).includes(responseFile.type)) {
        return NextResponse.json(
          { error: 'Format du document de reponse invalide. Les formats acceptes sont PDF, JPG, PNG et DOCX' },
          { status: 400 }
        )
      }
    }

    let publicPath = null
    const hasNewFile = responseFile instanceof File && responseFile.size > 0

    if (hasNewFile) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'responses')
      const fileName = buildResponseFileName({
        dossierId: dossier.id,
        originalName: responseFile.name,
        mimeType: responseFile.type,
      })
      const diskPath = path.join(uploadDir, fileName)
      publicPath = `/uploads/responses/${fileName}`

      await mkdir(uploadDir, { recursive: true })
      const bytes = Buffer.from(await responseFile.arrayBuffer())
      await writeFile(diskPath, bytes, { flag: 'wx' })
    }

    await prisma.$transaction(async (tx) => {
      if (publicPath) {
        if (existingResponseDocument) {
          await tx.dossierDocument.update({
            where: { id: existingResponseDocument.id },
            data: {
              titre: `${RESPONSE_DOCUMENT_TITLE_PREFIX} - ${responseFile.name || 'reponse_agent'}`,
              chemin_fichier: publicPath,
              cree_par_rh_id: currentUser.userId,
            },
          })
        } else {
          await tx.dossierDocument.create({
            data: {
              identifiant: buildResponseDocumentIdentifiant(dossier.id, isFirstRegistration),
              titre: `${RESPONSE_DOCUMENT_TITLE_PREFIX} - ${responseFile.name || 'reponse_agent'}`,
              chemin_fichier: publicPath,
              origine: 'TELEVERSE',
              categorie: 'reponse_agent',
              dossier_id: dossier.id,
              template_id: null,
              cree_par_rh_id: currentUser.userId,
            },
          })
        }
      }

      if (duplicateResponseDocumentIds.length > 0) {
        await tx.dossierDocument.deleteMany({
          where: {
            id: { in: duplicateResponseDocumentIds },
            dossier_id: dossier.id,
            categorie: 'reponse_agent',
            origine: 'TELEVERSE',
          },
        })
      }

      await tx.dossierExplicatif.update({
        where: { id: dossier.id },
        data: {
          date_reponse_recue: parsedResponseDate,
          ...(isFirstRegistration ? { statut: 'REPONSE_RECUE' } : {}),
        },
      })
    })

    return NextResponse.json({
      message: isFirstRegistration ? 'Reponse enregistree avec succes' : 'Reponse mise a jour avec succes',
      dossier_id: dossier.id,
      statut: isFirstRegistration ? 'REPONSE_RECUE' : dossier.statut,
    })
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la reponse:", error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
