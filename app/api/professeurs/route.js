import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des professeurs
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    const anneeActuelle = new Date().getFullYear()
    
    const professeurs = await prisma.professeur.findMany({
      where: search
        ? {
            OR: [
              { nom: { contains: search, mode: 'insensitive' } },
              { prenom: { contains: search, mode: 'insensitive' } },
              { ppr: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: { conges: true },
        },
        specialite: true,
        categorie_personnel: true,
        titre: true,
        soldes: {
          where: {
            annee: anneeActuelle,
          },
          take: 1,
        },
      },
      orderBy: { nom: 'asc' },
    })

    return NextResponse.json(professeurs)
  } catch (error) {
    console.error('Erreur lors de la récupération des professeurs:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau professeur
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const {
      nom,
      prenom,
      ppr,
      cin,
      specialite_id,
      categorie_personnel_id,
      titre_id,
      telephone,
      solde_jours,
    } = body

    if (
      !nom ||
      !prenom ||
      !ppr ||
      !cin ||
      !specialite_id ||
      !categorie_personnel_id ||
      !titre_id
    ) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    // Vérifier que les IDs existent
    const specialiteId = parseInt(specialite_id, 10)
    const categoriePersonnelId = parseInt(categorie_personnel_id, 10)
    const titreId = parseInt(titre_id, 10)

    if (isNaN(specialiteId) || isNaN(categoriePersonnelId) || isNaN(titreId)) {
      return NextResponse.json(
        { error: 'IDs invalides pour spécialité, catégorie ou titre' },
        { status: 400 }
      )
    }

    // Vérifier que les entités existent
    const [specialite, categorie, titre] = await Promise.all([
      prisma.specialite.findUnique({ where: { id: specialiteId } }),
      prisma.categoriePersonnel.findUnique({
        where: { id: categoriePersonnelId },
      }),
      prisma.titre.findUnique({ where: { id: titreId } }),
    ])

    if (!specialite || !categorie || !titre) {
      return NextResponse.json(
        { error: 'Spécialité, catégorie ou titre non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si le PPR existe déjà
    const existing = await prisma.professeur.findUnique({
      where: { ppr },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ce PPR est déjà utilisé' },
        { status: 400 }
      )
    }

    // Créer le professeur
    const professeur = await prisma.professeur.create({
      data: {
        nom,
        prenom,
        ppr,
        cin,
        specialite_id: specialiteId,
        categorie_personnel_id: categoriePersonnelId,
        titre_id: titreId,
        telephone: telephone || null,
      },
    })

    // Créer le solde initial pour l'année en cours
    const anneeActuelle = new Date().getFullYear()
    const expireLe = new Date(anneeActuelle + 2, 11, 31) // 31 décembre de l'année + 2
    const joursSolde = solde_jours ? parseInt(solde_jours, 10) : 22 // Par défaut 22 jours

    await prisma.soldeConge.create({
      data: {
        professeur_id: professeur.id,
        annee: anneeActuelle,
        jours_total: joursSolde,
        jours_restants: joursSolde,
        expire_le: expireLe,
      },
    })

    return NextResponse.json(professeur, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du professeur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

