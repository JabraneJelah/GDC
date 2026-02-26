import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getExpireLe } from '@/lib/solde-expiration'

// GET - Liste des soldes d'un professeur
export async function GET(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const professeurId = resolvedParams?.id

    if (!professeurId) {
      return NextResponse.json(
        { error: 'ID du professeur manquant' },
        { status: 400 }
      )
    }

    // Supprimer automatiquement les soldes expirés pour ce professeur
    const maintenant = new Date()
    await prisma.soldeConge.deleteMany({
      where: {
        professeur_id: professeurId,
        expire_le: { lt: maintenant },
      },
    })

    const soldes = await prisma.soldeConge.findMany({
      where: { professeur_id: professeurId },
      orderBy: [{ annee: 'desc' }, { type_conge_id: 'asc' }],
      include: { type_conge: true },
    })

    return NextResponse.json(soldes)
  } catch (error) {
    console.error('Erreur lors de la récupération des soldes:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau solde pour un professeur
export async function POST(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const professeurId = resolvedParams?.id

    if (!professeurId) {
      return NextResponse.json(
        { error: 'ID du professeur manquant' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { annee, jours_total, type_conge_id } = body

    if (!annee || !jours_total || !type_conge_id) {
      return NextResponse.json(
        { error: 'L\'année, le nombre de jours et le type de congé sont obligatoires' },
        { status: 400 }
      )
    }

    const anneeInt = parseInt(annee, 10)
    const joursTotalInt = parseInt(jours_total, 10)
    const typeCongeIdInt = parseInt(type_conge_id, 10)

    if (isNaN(anneeInt) || anneeInt < 2000 || anneeInt > 2100) {
      return NextResponse.json(
        { error: 'Année invalide' },
        { status: 400 }
      )
    }

    if (isNaN(joursTotalInt) || joursTotalInt <= 0) {
      return NextResponse.json(
        { error: 'Nombre de jours invalide' },
        { status: 400 }
      )
    }

    if (isNaN(typeCongeIdInt)) {
      return NextResponse.json(
        { error: 'Type de congé invalide' },
        { status: 400 }
      )
    }

    // Vérifier si le professeur existe
    const professeur = await prisma.professeur.findUnique({
      where: { id: professeurId },
    })

    if (!professeur) {
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si le type de congé existe
    const typeConge = await prisma.typeConge.findUnique({
      where: { id: typeCongeIdInt },
    })

    if (!typeConge) {
      return NextResponse.json(
        { error: 'Type de congé non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si un solde existe déjà pour cette année et ce type
    const existingSolde = await prisma.soldeConge.findUnique({
      where: {
        professeur_id_annee_type_conge_id: {
          professeur_id: professeurId,
          annee: anneeInt,
          type_conge_id: typeCongeIdInt,
        },
      },
    })

    if (existingSolde) {
      return NextResponse.json(
        { error: `Un solde existe déjà pour l'année ${anneeInt} et ce type de congé` },
        { status: 400 }
      )
    }

    // Calculer la date d'expiration : 1 an pour exceptionnel, 2 ans pour administratif/annuel
    const expireLe = getExpireLe(anneeInt, typeConge)

    const solde = await prisma.soldeConge.create({
      data: {
        professeur_id: professeurId,
        annee: anneeInt,
        jours_total: joursTotalInt,
        jours_restants: joursTotalInt, // Initialement, tous les jours sont disponibles
        expire_le: expireLe,
        type_conge_id: typeCongeIdInt,
      },
    })

    return NextResponse.json(solde, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du solde:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

