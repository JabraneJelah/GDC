import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_DECISIONS = ['CONVAINCANTE', 'NON_CONVAINCANTE']

const STATUS_BY_DECISION = {
  CONVAINCANTE: 'REPONSE_CONVAINCANTE',
  NON_CONVAINCANTE: 'REPONSE_NON_CONVAINCANTE',
}

// First evaluation from REPONSE_RECUE, plus correction before final states
const ALLOWED_EVALUATION_STATUSES = [
  'REPONSE_RECUE',
  'REPONSE_CONVAINCANTE',
  'REPONSE_NON_CONVAINCANTE',
  'PROCEDURE_SUIVANTE_GENEREE',
]

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

    const body = await request.json()
    const { decision_reponse } = body

    if (!decision_reponse) {
      return NextResponse.json(
        { error: 'La decision de reponse est obligatoire' },
        { status: 400 }
      )
    }

    if (!ALLOWED_DECISIONS.includes(decision_reponse)) {
      return NextResponse.json(
        { error: 'Decision de reponse invalide' },
        { status: 400 }
      )
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      select: {
        id: true,
        statut: true,
        decision_reponse: true,
      },
    })

    if (!dossier) {
      return NextResponse.json(
        { error: 'Dossier explicatif non trouve' },
        { status: 404 }
      )
    }

    if (!ALLOWED_EVALUATION_STATUSES.includes(dossier.statut)) {
      return NextResponse.json(
        { error: 'La reponse ne peut etre evaluee ou corrigee dans le statut actuel du dossier' },
        { status: 400 }
      )
    }

    const statut = STATUS_BY_DECISION[decision_reponse]

    const updatedDossier = await prisma.dossierExplicatif.update({
      where: { id: dossier.id },
      data: {
        decision_reponse,
        statut,
        decision_par_rh: {
          connect: { id: currentUser.userId },
        },
      },
      select: {
        id: true,
        statut: true,
        decision_reponse: true,
      },
    })

    const isCorrection = dossier.statut !== 'REPONSE_RECUE'

    return NextResponse.json({
      message: isCorrection ? 'Evaluation mise a jour avec succes' : 'Reponse evaluee avec succes',
      dossier_id: updatedDossier.id,
      statut: updatedDossier.statut,
      decision_reponse: updatedDossier.decision_reponse,
    })
  } catch (error) {
    console.error("Erreur lors de l'evaluation de la reponse:", error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
