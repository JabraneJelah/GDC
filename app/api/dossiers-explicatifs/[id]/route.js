import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getExtraFieldsForCode } from '@/lib/dossiers-explicatifs/extraFields'

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
      },
    })

    if (!dossier) {
      return NextResponse.json(
        { error: 'Dossier explicatif non trouve' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...dossier,
      documents: dossier.documents.map((document) => ({
        ...document,
        nom: document.titre,
        created_at: document.cree_le,
      })),
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
