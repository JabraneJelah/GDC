import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
