import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { getExtraFieldsForCode } from '@/lib/dossiers-explicatifs/extraFields'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_TYPES_PROCEDURE = ['AVERTISSEMENT', 'RETENUE']

function buildDocumentIdentifiant(templateId, dossierId) {
  return `PROC-${templateId}-${dossierId}`
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('fr-MA').format(value)
}

function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function formatDateTime(value) {
  if (!value) return ''
  const date = formatDate(value)
  const time = formatTime(value)
  if (!time || time === '00:00') return date
  return `${date} على الساعة ${time}`
}

function buildExtraData(dossier) {
  const raw = dossier.donnees_supplementaires
  if (!raw || typeof raw !== 'object') return {}
  const fieldDefs = getExtraFieldsForCode(dossier.type_faute?.code)
  const result = {}
  for (const [key, value] of Object.entries(raw)) {
    const def = fieldDefs.find((f) => f.key === key)
    if (def?.type === 'date' && value) {
      result[key] = formatDate(new Date(value))
    } else {
      result[key] = value || ''
    }
  }
  return result
}

function buildTemplateData(dossier) {
  return {
    nom_complet: dossier.nom_complet || '',
    matricule: dossier.matricule || '',
    profil: dossier.profil || '',
    service: dossier.service || '',
    date_faute: formatDate(dossier.date_faute),
    heure_faute: formatTime(dossier.date_faute),
    date_heure_faute: formatDateTime(dossier.date_faute),
    type_faute: dossier.type_faute?.nom || '',
    details: dossier.details || '',
    cin: dossier.professeur?.cin || '',
    adresse: dossier.professeur?.adresse || '',
    ...buildExtraData(dossier),
  }
}

function resolvePublicFilePath(publicPath) {
  const relativePath = publicPath.replace(/^\/+/, '')
  const normalizedPath = path.normalize(relativePath)
  const publicDir = path.join(process.cwd(), 'public')
  const filePath = path.join(publicDir, normalizedPath)
  const relativeToPublic = path.relative(publicDir, filePath)

  if (relativeToPublic.startsWith('..') || path.isAbsolute(relativeToPublic)) {
    throw new Error('Chemin de fichier invalide')
  }

  return filePath
}

function buildGeneratedFileName(dossierReference, templateIdentifiant) {
  const safeReference = dossierReference.replace(/[^a-zA-Z0-9_-]/g, '-')
  const safeIdentifiant = templateIdentifiant.replace(/[^a-zA-Z0-9_-]/g, '-')
  return `${safeReference}_${safeIdentifiant}.docx`
}

async function loadDocxLibraries() {
  const pizzipPackage = 'pizzip'
  const docxtemplaterPackage = 'docxtemplater'
  const [{ default: PizZip }, { default: Docxtemplater }] = await Promise.all([
    import(pizzipPackage),
    import(docxtemplaterPackage),
  ])
  return { PizZip, Docxtemplater }
}

async function generateDocumentFromTemplate({ dossier, template, templateData, PizZip, Docxtemplater }) {
  const templateFilePath = resolvePublicFilePath(template.chemin_fichier)
  const generatedDir = path.join(process.cwd(), 'public', 'uploads', 'generated')
  const fileName = buildGeneratedFileName(dossier.reference, template.identifiant)
  const generatedFilePath = path.join(generatedDir, fileName)
  const publicPath = `/uploads/generated/${fileName}`

  await mkdir(generatedDir, { recursive: true })

  const content = await readFile(templateFilePath)
  const zip = new PizZip(content)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })

  doc.render(templateData)

  const buffer = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })

  await writeFile(generatedFilePath, buffer, { flag: 'w' })

  return publicPath
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

    const body = await request.json()
    const { type_procedure } = body

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

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        nom_complet: true,
        matricule: true,
        profil: true,
        service: true,
        date_faute: true,
        details: true,
        statut: true,
        type_faute_id: true,
        donnees_supplementaires: true,
        type_faute: {
          select: { nom: true, code: true },
        },
        professeur: {
          select: {
            cin: true,
            adresse: true,
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

    const GENERATABLE_STATUSES = ['REPONSE_NON_CONVAINCANTE', 'PROCEDURE_SUIVANTE_GENEREE']

    if (!GENERATABLE_STATUSES.includes(dossier.statut)) {
      return NextResponse.json(
        { error: 'La procedure suivante ne peut etre generee que pour un dossier avec reponse non convaincante' },
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
        chemin_fichier: true,
      },
    })

    const template = await prisma.documentTemplate.findFirst({
      where: {
        type_faute_id: dossier.type_faute_id,
        usage: 'PROCEDURE_DISCIPLINAIRE',
        actif: true,
      },
      select: {
        id: true,
        nom: true,
        identifiant: true,
        chemin_fichier: true,
        actif: true,
        type_faute_id: true,
        usage: true,
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'لا يوجد نموذج خاص باستكمال المسطرة التأديبية لهذا النوع من المخالفة' },
        { status: 400 }
      )
    }

    let docxLibraries
    try {
      docxLibraries = await loadDocxLibraries()
    } catch (error) {
      console.error('Bibliotheques DOCX manquantes:', error)
      return NextResponse.json(
        { error: 'Generation DOCX indisponible' },
        { status: 500 }
      )
    }

    const templateData = buildTemplateData(dossier)
    const generatedPath = await generateDocumentFromTemplate({
      dossier,
      template,
      templateData,
      ...docxLibraries,
    })

    const documentIdentifiant = buildDocumentIdentifiant(template.id, dossier.id)

    const result = await prisma.$transaction(async (tx) => {
      let createdDocument

      if (existingProcedureDocument) {
        createdDocument = await tx.dossierDocument.update({
          where: { id: existingProcedureDocument.id },
          data: {
            chemin_fichier: generatedPath,
            titre: template.nom,
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
      } else {
        createdDocument = await tx.dossierDocument.create({
          data: {
            identifiant: documentIdentifiant,
            titre: template.nom,
            chemin_fichier: generatedPath,
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
      }

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

      return { createdDocument, updatedDossier }
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
