import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { getMissingRequiredFields, getExtraFieldsForCode } from '@/lib/dossiers-explicatifs/extraFields'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INITIAL_TEMPLATE_USAGES = ['LETTRE_EXPLICATIVE', 'BORDEREAU_NOTIFICATION']

function buildDocumentIdentifiant(templateId, dossierId) {
  return `INIT-${templateId}-${dossierId}`
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

  await writeFile(generatedFilePath, buffer, { flag: 'wx' })

  return publicPath
}

export async function POST(_request, { params }) {
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
          select: {
            nom: true,
            code: true,
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

    if (dossier.statut !== 'ENREGISTRE') {
      return NextResponse.json(
        { error: 'Les documents initiaux ne peuvent etre generes que pour un dossier enregistre' },
        { status: 400 }
      )
    }

    const missingFields = getMissingRequiredFields(
      dossier.type_faute?.code,
      dossier.donnees_supplementaires
    )
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'EXTRA_FIELDS_REQUIRED',
          message: 'يرجى إكمال المعطيات الإضافية قبل إنشاء الوثائق.',
          missingFields,
        },
        { status: 400 }
      )
    }

    if (!dossier.type_faute) {
      return NextResponse.json(
        { error: 'Type de faute non trouve' },
        { status: 404 }
      )
    }

    const templates = await prisma.documentTemplate.findMany({
      where: {
        type_faute_id: dossier.type_faute_id,
        usage: { in: INITIAL_TEMPLATE_USAGES },
        actif: true,
      },
      orderBy: { cree_le: 'asc' },
      select: {
        id: true,
        identifiant: true,
        nom: true,
        chemin_fichier: true,
        usage: true,
      },
    })

    if (templates.length === 0) {
      return NextResponse.json(
        { error: 'Aucun template actif lie a ce type de faute. Generation impossible.' },
        { status: 400 }
      )
    }

    const templateIds = templates.map((template) => template.id)

    const existingDocuments = await prisma.dossierDocument.findMany({
      where: {
        dossier_id: dossier.id,
        template_id: { in: templateIds },
        origine: 'GENERE',
      },
      select: {
        id: true,
        template_id: true,
        titre: true,
      },
    })

    if (existingDocuments.length > 0) {
      return NextResponse.json(
        {
          error: 'Les documents initiaux ont deja ete generes pour ce dossier',
          existing_documents_count: existingDocuments.length,
          existing_documents: existingDocuments,
        },
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
    const generatedDocuments = []

    for (const template of templates) {
      try {
        const generatedPath = await generateDocumentFromTemplate({
          dossier,
          template,
          templateData,
          ...docxLibraries,
        })

        generatedDocuments.push({
          template,
          chemin_fichier: generatedPath,
        })
      } catch (error) {
        console.error(`Erreur lors de la generation du document initial depuis le template ${template.id}:`, error)
      }
    }

    if (generatedDocuments.length === 0) {
      return NextResponse.json(
        { error: 'Aucun document initial n a pu etre genere' },
        { status: 500 }
      )
    }

    const createdDocuments = await prisma.$transaction(async (tx) => {
      const documents = []

      for (const generatedDocument of generatedDocuments) {
        const { template, chemin_fichier } = generatedDocument
        const categorieByUsage = {
          LETTRE_EXPLICATIVE: 'lettre_explicative',
          BORDEREAU_NOTIFICATION: 'bordereau_notification',
        }
        const document = await tx.dossierDocument.create({
          data: {
            identifiant: buildDocumentIdentifiant(template.id, dossier.id),
            titre: template.nom,
            chemin_fichier,
            origine: 'GENERE',
            categorie: categorieByUsage[template.usage] || null,
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
          },
        })

        documents.push(document)
      }

      await tx.dossierExplicatif.update({
        where: { id: dossier.id },
        data: { statut: 'DOCUMENTS_INITIAUX_GENERES' },
      })

      return documents
    })

    return NextResponse.json({
      message: 'Documents initiaux generes avec succes',
      created_documents_count: createdDocuments.length,
      created_documents: createdDocuments,
    })
  } catch (error) {
    console.error('Erreur lors de la generation des documents initiaux:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
