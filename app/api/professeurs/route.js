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
    const ppr = searchParams.get('ppr') || ''

    const maintenant = new Date()
    
    let whereClause = undefined
    if (ppr) {
      whereClause = {
        ppr: { contains: ppr, mode: 'insensitive' },
      }
    } else if (search) {
      whereClause = {
        OR: [
          { nom: { contains: search, mode: 'insensitive' } },
          { prenom: { contains: search, mode: 'insensitive' } },
          { ppr: { contains: search, mode: 'insensitive' } },
        ],
      }
    }
    
    const professeurs = await prisma.professeur.findMany({
      where: whereClause,
      select: {
        id: true,
        nom: true,
        prenom: true,
        ppr: true,
        telephone: true,
        _count: {
          select: { conges: true },
        },
        specialite: {
          select: {
            id: true,
            nom: true,
          },
        },
        categorie_personnel: {
          select: {
            id: true,
            nom: true,
          },
        },
        titre: {
          select: {
            id: true,
            nom: true,
          },
        },
        service: {
          select: {
            id: true,
            nom: true,
          },
        },
        hopital: {
          select: {
            id: true,
            nom: true,
          },
        },
        soldes: {
          where: {
            expire_le: { gte: maintenant }, // Seulement les soldes non expirés
            jours_restants: { gt: 0 }, // Seulement ceux avec des jours restants
          },
          orderBy: { annee: 'asc' }, // Plus ancien en premier
          select: {
            id: true,
            annee: true,
            jours_restants: true,
            jours_total: true,
            expire_le: true,
          },
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
      specialite_id,
      categorie_personnel_id,
      titre_id,
      service_id,
      hopital_id,
      telephone,
    } = body

    if (
      !nom ||
      !prenom ||
      !ppr ||
      !specialite_id ||
      !categorie_personnel_id ||
      !titre_id ||
      !service_id ||
      !hopital_id
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
    const serviceId = parseInt(service_id, 10)
    const hopitalId = parseInt(hopital_id, 10)

    if (isNaN(specialiteId) || isNaN(categoriePersonnelId) || isNaN(titreId) || isNaN(serviceId) || isNaN(hopitalId)) {
      return NextResponse.json(
        { error: 'IDs invalides pour spécialité, catégorie, titre, service ou hopital' },
        { status: 400 }
      )
    }

    // Vérifier que les entités existent
    const [specialite, categorie, titre, service, hopital] = await Promise.all([
      prisma.specialite.findUnique({ where: { id: specialiteId } }),
      prisma.categoriePersonnel.findUnique({
        where: { id: categoriePersonnelId },
      }),
      prisma.titre.findUnique({ where: { id: titreId } }),
      prisma.service.findUnique({ where: { id: serviceId } }),
      prisma.hopital.findUnique({ where: { id: hopitalId } }),
    ])

    if (!specialite || !categorie || !titre || !service || !hopital) {
      return NextResponse.json(
        { error: 'Spécialité, catégorie, titre, service ou hopital non trouvé' },
        { status: 404 }
      )
    }

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
        specialite_id: specialiteId,
        categorie_personnel_id: categoriePersonnelId,
        titre_id: titreId,
        service_id: serviceId,
        hopital_id: hopitalId,
        telephone: telephone || null,
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

