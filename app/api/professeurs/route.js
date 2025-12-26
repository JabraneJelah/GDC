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
    const nom = searchParams.get('nom') || ''
    const prenom = searchParams.get('prenom') || ''
    const ppr = searchParams.get('ppr') || ''
    const hopital_id = searchParams.get('hopital_id') || ''

    const maintenant = new Date()
    
    let whereClause = {}
    const conditions = []
    
    if (nom.trim()) {
      conditions.push({ nom: { contains: nom.trim(), mode: 'insensitive' } })
    }
    
    if (prenom.trim()) {
      conditions.push({ prenom: { contains: prenom.trim(), mode: 'insensitive' } })
    }
    
    if (ppr.trim()) {
      conditions.push({ ppr: { contains: ppr.trim(), mode: 'insensitive' } })
    }
    
    if (hopital_id) {
      const hopitalIdInt = parseInt(hopital_id, 10)
      if (!isNaN(hopitalIdInt)) {
        conditions.push({
          Hopital_id: hopitalIdInt
        })
      }
    }
    
    if (conditions.length > 0) {
      whereClause = { AND: conditions }
    } else {
      whereClause = undefined
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
        Hopital: {
          select: {
            id: true,
            nom: true,
          },
        },
        grade: {
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
    // 1️⃣ Vérifier l'utilisateur
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // 2️⃣ Lire le body
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
      grade_id,
      telephone,
    } = body

    // 3️⃣ Validation basique
    if (
      !nom ||
      !prenom ||
      !ppr ||
      !specialite_id ||
      !categorie_personnel_id ||
      !titre_id ||
      !service_id ||
      !hopital_id ||
      !grade_id
    ) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    // 4️⃣ Parsing IDs
    const specialiteId = Number(specialite_id)
    const categoriePersonnelId = Number(categorie_personnel_id)
    const titreId = Number(titre_id)
    const serviceId = Number(service_id)
    const hopitalId = Number(hopital_id)
    const gradeId = Number(grade_id)

    if (
      [specialiteId, categoriePersonnelId, titreId, serviceId, hopitalId, gradeId].some(
        isNaN
      )
    ) {
      return NextResponse.json(
        { error: 'IDs invalides' },
        { status: 400 }
      )
    }

    // 5️⃣ Vérifier existence des relations
    const [specialite, categorie, titre, service, hopital, grade] = await Promise.all([
      prisma.specialite.findUnique({ where: { id: specialiteId } }),
      prisma.categoriePersonnel.findUnique({ where: { id: categoriePersonnelId } }),
      prisma.titre.findUnique({ where: { id: titreId } }),
      prisma.service.findUnique({ where: { id: serviceId } }),
      prisma.hopital.findUnique({ where: { id: hopitalId } }),
      prisma.grade.findUnique({ where: { id: gradeId } }),
    ])

    if (!specialite || !categorie || !titre || !service || !hopital || !grade) {
      return NextResponse.json(
        { error: 'Relation introuvable (spécialité, catégorie, titre, service, hôpital ou grade)' },
        { status: 404 }
      )
    }

    // 6️⃣ Vérifier unicité du PPR
    const existing = await prisma.professeur.findUnique({
      where: { ppr },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ce PPR est déjà utilisé' },
        { status: 400 }
      )
    }

    // 7️⃣ Création du professeur (relations avec connect)
    const professeur = await prisma.professeur.create({
      data: {
        nom,
        prenom,
        ppr,
        telephone: telephone || null,

        specialite: {
          connect: { id: specialiteId },
        },
        categorie_personnel: {
          connect: { id: categoriePersonnelId },
        },
        titre: {
          connect: { id: titreId },
        },
        service: {
          connect: { id: serviceId },
        },
        Hopital: {
          connect: { id: hopitalId },
        },
        grade: {
          connect: { id: gradeId },
        },
      },
    })

    // 8️⃣ Retour OK
    return NextResponse.json(professeur, { status: 201 })

  } catch (error) {
    console.error('Erreur création professeur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

