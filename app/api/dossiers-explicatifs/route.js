import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
        type_faute: {
          select: {
            id: true,
            code: true,
            nom: true,
            actif: true,
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

    const body = await request.json()
    const {
      professeur_id,
      date_faute,
      type_faute_id: typeFauteIdRaw,
      details,
    } = body

    const type_faute_id =
      typeFauteIdRaw != null && typeFauteIdRaw !== ''
        ? (typeof typeFauteIdRaw === 'number' ? typeFauteIdRaw : parseInt(typeFauteIdRaw, 10))
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
    const nomComplet = `${professeur.prenom || ''} ${professeur.nom || ''}`.trim()
    const profilSnapshot =
      professeur.grade?.nom ||
      professeur.titre?.nom ||
      professeur.categorie_personnel?.nom ||
      ''

    const dossier = await prisma.dossierExplicatif.create({
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
          select: {
            id: true,
            code: true,
            nom: true,
            actif: true,
          },
        },
        cree_par_rh: {
          select: {
            id: true,
            nom_complet: true,
            username: true,
          },
        },
      },
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
