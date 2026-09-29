import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const ALLOWED_TYPES_PROCEDURE = ['AVERTISSEMENT', 'RETENUE']

// Manual upload replaces automatic generation for these two transitions only:
// first registration from a non-convincing response, and replacement while
// the procedure document is still the current step.
const FIRST_REGISTRATION_STATUS = 'REPONSE_NON_CONVAINCANTE'
const REPLACEMENT_STATUS = 'PROCEDURE_SUIVANTE_GENEREE'
const ALLOWED_STATUSES = [FIRST_REGISTRATION_STATUS, REPLACEMENT_STATUS]

function buildDocumentIdentifiant(dossierId, isFirstRegistration) {
  return isFirstRegistration ? `PROC-MANUEL-${dossierId}` : `PROC-MANUEL-${dossierId}-UPD-${Date.now()}`
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
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      select: { id: true, reference: true, statut: true },
    })

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier non trouve' }, { status: 404 })
    }

    if (!ALLOWED_STATUSES.includes(dossier.statut)) {
      return NextResponse.json(
        { error: 'لا يمكن رفع وثيقة المسطرة التأديبية في الحالة الحالية للملف' },
        { status: 400 }
      )
    }

    const isFirstRegistration = dossier.statut === FIRST_REGISTRATION_STATUS

    const formData = await request.formData()
    const type_procedure = formData.get('type_procedure')
    const file = formData.get('file')

    if (!type_procedure || !ALLOWED_TYPES_PROCEDURE.includes(type_procedure)) {
      return NextResponse.json({ error: 'نوع المسطرة غير صالح' }, { status: 400 })
    }

    if (!file || typeof file === 'string' || file.size === 0) {
      return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'صيغة الملف غير مقبولة. الصيغ المقبولة: PDF أو JPG أو PNG أو DOCX' },
        { status: 400 }
      )
    }

    // Create-or-update: covers no existing row, a stale pending:// placeholder,
    // and a real previously uploaded/generated document alike.
    const existingDoc = await prisma.dossierDocument.findFirst({
      where: { dossier_id: id, categorie: 'procedure_suivante' },
      select: { id: true },
    })

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'procedures')
    await mkdir(uploadDir, { recursive: true })

    const safeRef = dossier.reference.replace(/[^a-zA-Z0-9_-]/g, '-')
    const rawExt = file.name.includes('.') ? file.name.split('.').pop() : 'pdf'
    const ext = rawExt.toLowerCase()
    const fileName = `${safeRef}_procedure_${Date.now()}.${ext}`
    const filePath = path.join(uploadDir, fileName)
    const publicPath = `/uploads/procedures/${fileName}`

    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    const result = await prisma.$transaction(async (tx) => {
      let procedureDocument

      if (existingDoc) {
        procedureDocument = await tx.dossierDocument.update({
          where: { id: existingDoc.id },
          data: {
            chemin_fichier: publicPath,
            titre: file.name,
            origine: 'TELEVERSE',
            template_id: null,
            cree_par_rh_id: currentUser.userId,
          },
          select: {
            id: true,
            identifiant: true,
            titre: true,
            chemin_fichier: true,
            categorie: true,
            origine: true,
            cree_le: true,
          },
        })
      } else {
        procedureDocument = await tx.dossierDocument.create({
          data: {
            identifiant: buildDocumentIdentifiant(dossier.id, isFirstRegistration),
            titre: file.name,
            chemin_fichier: publicPath,
            origine: 'TELEVERSE',
            categorie: 'procedure_suivante',
            dossier_id: dossier.id,
            template_id: null,
            cree_par_rh_id: currentUser.userId,
          },
          select: {
            id: true,
            identifiant: true,
            titre: true,
            chemin_fichier: true,
            categorie: true,
            origine: true,
            cree_le: true,
          },
        })
      }

      const updatedDossier = await tx.dossierExplicatif.update({
        where: { id: dossier.id },
        data: {
          type_procedure_selectionne: type_procedure,
          template_procedure_id: null,
          statut: 'PROCEDURE_SUIVANTE_GENEREE',
        },
        select: {
          id: true,
          statut: true,
          type_procedure_selectionne: true,
        },
      })

      return { procedureDocument, updatedDossier }
    })

    return NextResponse.json({
      message: 'تم رفع وثيقة طلب استكمال المسطرة التأديبية بنجاح',
      dossier_id: result.updatedDossier.id,
      statut: result.updatedDossier.statut,
      type_procedure: result.updatedDossier.type_procedure_selectionne,
      document: result.procedureDocument,
    })
  } catch (error) {
    console.error('Erreur lors de la mise a jour du document de procedure:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
