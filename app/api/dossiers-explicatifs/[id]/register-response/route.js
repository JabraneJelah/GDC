import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
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

function buildResponseDocumentIdentifiant(dossierId) {
  return `REP-${dossierId}`
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

    if (dossier.statut !== 'NOTIFIE') {
      return NextResponse.json(
        { error: 'La reponse ne peut etre enregistree que pour un dossier notifie' },
        { status: 400 }
      )
    }

    const existingResponseDocument = await prisma.dossierDocument.findFirst({
      where: {
        dossier_id: dossier.id,
        origine: 'TELEVERSE',
        categorie: 'reponse_agent',
      },
      select: {
        id: true,
        titre: true,
      },
    })

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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'responses')
    const fileName = buildResponseFileName({
      dossierId: dossier.id,
      originalName: responseFile.name,
      mimeType: responseFile.type,
    })
    const diskPath = path.join(uploadDir, fileName)
    const publicPath = `/uploads/responses/${fileName}`

    await mkdir(uploadDir, { recursive: true })
    const bytes = Buffer.from(await responseFile.arrayBuffer())
    await writeFile(diskPath, bytes, { flag: 'wx' })

    await prisma.$transaction(async (tx) => {
      await tx.dossierDocument.create({
        data: {
          identifiant: buildResponseDocumentIdentifiant(dossier.id),
          titre: `${RESPONSE_DOCUMENT_TITLE_PREFIX} - ${responseFile.name || 'reponse_agent'}`,
          chemin_fichier: publicPath,
          origine: 'TELEVERSE',
          categorie: 'reponse_agent',
          dossier_id: dossier.id,
          template_id: null,
          cree_par_rh_id: currentUser.userId,
        },
      })

      await tx.dossierExplicatif.update({
        where: { id: dossier.id },
        data: {
          date_reponse_recue: parsedResponseDate,
          statut: 'REPONSE_RECUE',
        },
      })
    })

    return NextResponse.json({
      message: 'Reponse enregistree avec succes',
      dossier_id: dossier.id,
      statut: 'REPONSE_RECUE',
    })
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la reponse:", error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
