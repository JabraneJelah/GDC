import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET - Détails d'un professeur
export async function GET(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Handle both sync and async params (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID du professeur manquant' },
        { status: 400 }
      )
    }

    const professeur = await prisma.professeur.findUnique({
      where: { id },
      include: {
        specialite: true,
        categorie_personnel: true,
        titre: true,
        service: true,
        hopital: true,
        conges: {
          include: {
            type_conge: true,
            cree_par_rh: {
              select: {
                nom_complet: true,
              },
            },
          },
          orderBy: { date_debut: 'desc' },
        },
        soldes: {
          where: {
            expire_le: { gte: new Date() }, // Seulement les soldes non expirés
          },
          orderBy: { annee: 'asc' }, // Plus ancien en premier
        },
      },
    })

    if (!professeur) {
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(professeur)
  } catch (error) {
    console.error('Erreur lors de la récupération du professeur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un professeur
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Handle both sync and async params (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID du professeur manquant' },
        { status: 400 }
      )
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

    // Vérifier si le professeur existe
    const existing = await prisma.professeur.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si le PPR est modifié et s'il existe déjà
    if (ppr && ppr !== existing.ppr) {
      const pprExists = await prisma.professeur.findUnique({
        where: { ppr },
      })

      if (pprExists) {
        return NextResponse.json(
          { error: 'Ce PPR est déjà utilisé' },
          { status: 400 }
        )
      }
    }

    // Préparer les données de mise à jour
    const updateData = {
      nom: nom || existing.nom,
      prenom: prenom || existing.prenom,
      ppr: ppr || existing.ppr,
      telephone: telephone !== undefined ? telephone : existing.telephone,
    }

    // Mettre à jour les IDs si fournis
    if (specialite_id) {
      const specialiteId = parseInt(specialite_id, 10)
      if (!isNaN(specialiteId)) {
        const specialiteExists = await prisma.specialite.findUnique({
          where: { id: specialiteId },
        })
        if (specialiteExists) {
          updateData.specialite_id = specialiteId
        }
      }
    }

    if (categorie_personnel_id) {
      const categorieId = parseInt(categorie_personnel_id, 10)
      if (!isNaN(categorieId)) {
        const categorieExists = await prisma.categoriePersonnel.findUnique({
          where: { id: categorieId },
        })
        if (categorieExists) {
          updateData.categorie_personnel_id = categorieId
        }
      }
    }

    if (titre_id) {
      const titreIdInt = parseInt(titre_id, 10)
      if (!isNaN(titreIdInt)) {
        const titreExists = await prisma.titre.findUnique({
          where: { id: titreIdInt },
        })
        if (titreExists) {
          updateData.titre_id = titreIdInt
        }
      }
    }

    if (service_id) {
      const serviceIdInt = parseInt(service_id, 10)
      if (!isNaN(serviceIdInt)) {
        const serviceExists = await prisma.service.findUnique({
          where: { id: serviceIdInt },
        })
        if (serviceExists) {
          updateData.service_id = serviceIdInt
        }
      }
    }

    if (hopital_id) {
      const hopitalIdInt = parseInt(hopital_id, 10)
      if (!isNaN(hopitalIdInt)) {
        const hopitalExists = await prisma.hopital.findUnique({
          where: { id: hopitalIdInt },
        })
        if (hopitalExists) {
          updateData.hopital_id = hopitalIdInt
        }
      }
    }

    // Mettre à jour le professeur
    const professeur = await prisma.professeur.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(professeur)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du professeur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

