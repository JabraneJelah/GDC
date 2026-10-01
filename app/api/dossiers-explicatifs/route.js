import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

const ALLOWED_CORRESPONDANCE_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

function sanitizeFileNamePart(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function generateDossierReference() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomPart = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
    const reference = `DOS-${datePart}-${randomPart}`

    const existing = await prisma.dossierExplicatif.findUnique({
      where: { reference },
      select: { id: true },
    })

    if (!existing) {
      return reference
    }
  }

  throw new Error('Impossible de generer une reference unique')
}

// GET - Liste des dossiers explicatifs
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const dossiers = await prisma.dossierExplicatif.findMany({
      select: {
        id: true,
        reference: true,
        nom_complet: true,
        matricule: true,
        profil: true,
        service: true,
        professeur_id: true,
        date_faute: true,
        statut: true,
        cree_le: true,
        date_archivage: true,
        type_procedure_selectionne: true,
        type_faute: {
          select: {
            id: true,
            code: true,
            nom: true,
            actif: true,
          },
        },
        professeur: {
          select: {
            nom: true,
            prenom: true,
            nom_ar: true,
            prenom_ar: true,
            hopital: {
              select: { nom: true },
            },
          },
        },
      },
      orderBy: { cree_le: 'desc' },
    })

    return NextResponse.json(dossiers)
  } catch (error) {
    console.error('Erreur lors de la recuperation des dossiers explicatifs:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Creer un nouveau dossier explicatif
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const formData = await request.formData()
    const professeur_id = formData.get('professeur_id') ?? null
    const date_faute = formData.get('date_faute') ?? null
    const typeFauteIdRaw = formData.get('type_faute_id') ?? null
    const details = formData.get('details') ?? null
    const correspondanceFile = formData.get('correspondance')

    const type_faute_id =
      typeFauteIdRaw != null && typeFauteIdRaw !== ''
        ? parseInt(String(typeFauteIdRaw), 10)
        : null

    if (!professeur_id || !date_faute || type_faute_id == null || isNaN(type_faute_id)) {
      return NextResponse.json(
        { error: 'Le professeur, la date de faute et le type de faute sont obligatoires' },
        { status: 400 }
      )
    }

    const parsedDateFaute = new Date(date_faute)
    if (Number.isNaN(parsedDateFaute.getTime())) {
      return NextResponse.json(
        { error: 'Date de faute invalide' },
        { status: 400 }
      )
    }

    const [typeFaute, utilisateur, professeur] = await Promise.all([
      prisma.typeFaute.findUnique({
        where: { id: type_faute_id },
      }),
      prisma.utilisateurRH.findUnique({
        where: { id: currentUser.userId },
        select: { id: true, nom_complet: true, actif: true },
      }),
      prisma.professeur.findUnique({
        where: { id: professeur_id },
        select: {
          id: true,
          nom: true,
          prenom: true,
          nom_ar: true,
          prenom_ar: true,
          ppr: true,
          titre: {
            select: {
              nom: true,
            },
          },
          grade: {
            select: {
              nom: true,
            },
          },
          categorie_personnel: {
            select: {
              nom: true,
            },
          },
          service: {
            select: {
              nom: true,
            },
          },
        },
      }),
    ])

    if (!typeFaute) {
      return NextResponse.json(
        { error: 'Type de faute non trouve' },
        { status: 404 }
      )
    }

    if (!typeFaute.actif) {
      return NextResponse.json(
        { error: 'Ce type de faute est inactif et ne peut pas etre utilise pour un nouveau dossier' },
        { status: 400 }
      )
    }

    if (!utilisateur) {
      return NextResponse.json(
        { error: 'Utilisateur non trouve' },
        { status: 404 }
      )
    }

    if (!professeur) {
      return NextResponse.json(
        { error: 'Professeur non trouve' },
        { status: 404 }
      )
    }

    const reference = await generateDossierReference()
    const nomComplet = (professeur.nom_ar && professeur.prenom_ar)
      ? `${professeur.nom_ar} ${professeur.prenom_ar}`.trim()
      : `${professeur.prenom || ''} ${professeur.nom || ''}`.trim()
    const profilSnapshot =
      professeur.grade?.nom ||
      professeur.titre?.nom ||
      professeur.categorie_personnel?.nom ||
      ''

    // Save correspondance file to disk before transaction if provided
    let correspondancePublicPath = null
    const hasCorrespondance = correspondanceFile instanceof File && correspondanceFile.size > 0

    if (hasCorrespondance) {
      if (!ALLOWED_CORRESPONDANCE_TYPES[correspondanceFile.type]) {
        return NextResponse.json(
          { error: 'صيغة مراسلة المصلحة غير مقبولة. الصيغ المقبولة: PDF أو JPG أو PNG' },
          { status: 400 }
        )
      }
      const ext = ALLOWED_CORRESPONDANCE_TYPES[correspondanceFile.type]
      const safeName = sanitizeFileNamePart(path.parse(correspondanceFile.name || 'correspondance').name) || 'correspondance'
      const fileName = `${sanitizeFileNamePart(reference)}-${Date.now()}-${safeName}.${ext}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'correspondances')
      await mkdir(uploadDir, { recursive: true })
      const bytes = Buffer.from(await correspondanceFile.arrayBuffer())
      await writeFile(path.join(uploadDir, fileName), bytes, { flag: 'wx' })
      correspondancePublicPath = `/uploads/correspondances/${fileName}`
    }

    const dossier = await prisma.$transaction(async (tx) => {
      const created = await tx.dossierExplicatif.create({
        data: {
          reference,
          nom_complet: nomComplet,
          matricule: professeur.ppr || '',
          profil: profilSnapshot,
          service: professeur.service?.nom || '',
          professeur_id: professeur.id,
          date_faute: parsedDateFaute,
          details: details || null,
          statut: 'ENREGISTRE',
          type_faute_id,
          cree_par_rh_id: utilisateur.id,
        },
        include: {
          type_faute: {
            select: { id: true, code: true, nom: true, actif: true },
          },
          cree_par_rh: {
            select: { id: true, nom_complet: true, username: true },
          },
        },
      })

      if (correspondancePublicPath) {
        await tx.dossierDocument.create({
          data: {
            identifiant: `CORR-${created.id}`,
            titre: `مراسلة المصلحة - ${correspondanceFile.name || 'correspondance'}`,
            chemin_fichier: correspondancePublicPath,
            origine: 'TELEVERSE',
            categorie: 'correspondance_service',
            dossier_id: created.id,
            cree_par_rh_id: utilisateur.id,
          },
        })
      }

      return created
    })

    return NextResponse.json(dossier, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la creation du dossier explicatif:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
