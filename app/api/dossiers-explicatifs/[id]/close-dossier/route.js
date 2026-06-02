import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CLOSABLE_STATUSES = ['REPONSE_CONVAINCANTE', 'PROCEDURE_SUIVANTE_GENEREE']

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

    let commentaire_cloture = null
    try {
      const body = await request.json()
      commentaire_cloture = typeof body?.commentaire_cloture === 'string'
        ? body.commentaire_cloture.trim()
        : null
    } catch {
      commentaire_cloture = null
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      select: {
        id: true,
        statut: true,
      },
    })

    if (!dossier) {
      return NextResponse.json(
        { error: 'Dossier explicatif non trouve' },
        { status: 404 }
      )
    }

    if (['CLOTURE', 'A_ARCHIVER', 'ARCHIVE'].includes(dossier.statut)) {
      return NextResponse.json(
        { error: 'Ce dossier est deja cloture' },
        { status: 400 }
      )
    }

    if (!CLOSABLE_STATUSES.includes(dossier.statut)) {
      return NextResponse.json(
        { error: 'Ce dossier ne peut etre cloture uniquement apres une reponse convaincante ou une procedure suivante generee' },
        { status: 400 }
      )
    }

    const updatedDossier = await prisma.$transaction(async (tx) => {
      return tx.dossierExplicatif.update({
        where: { id: dossier.id },
        data: {
          statut: 'A_ARCHIVER',
          cloture_par_rh_id: currentUser.userId,
        },
        select: {
          id: true,
          statut: true,
        },
      })
    })

    return NextResponse.json({
      message: 'Dossier cloture avec succes',
      dossier_id: updatedDossier.id,
      statut: updatedDossier.statut,
      commentaire_cloture_recu: Boolean(commentaire_cloture),
    })
  } catch (error) {
    console.error('Erreur lors de la cloture du dossier:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
