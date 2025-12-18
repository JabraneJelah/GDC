import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des congés
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const professeurId = searchParams.get('professeur_id')

    const conges = await prisma.conge.findMany({
      where: professeurId ? { professeur_id: professeurId } : undefined,
      include: {
        professeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            ppr: true,
          },
        },
        type_conge: true,
        cree_par_rh: {
          select: {
            nom_complet: true,
          },
        },
      },
      orderBy: { date_debut: 'desc' },
    })

    return NextResponse.json(conges)
  } catch (error) {
    console.error('Erreur lors de la récupération des congés:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau congé
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const {
      professeur_id,
      type_conge_id,
      date_debut,
      date_fin,
      duree_jours,
      reference_doc,
    } = body

    if (
      !professeur_id ||
      !type_conge_id ||
      !date_debut ||
      !date_fin ||
      !duree_jours
    ) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    // Vérifier que le professeur existe
    const professeur = await prisma.professeur.findUnique({
      where: { id: professeur_id },
    })

    if (!professeur) {
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le type de congé existe
    const typeConge = await prisma.typeConge.findUnique({
      where: { id: type_conge_id },
    })

    if (!typeConge) {
      return NextResponse.json(
        { error: 'Type de congé non trouvé' },
        { status: 404 }
      )
    }

    // Si c'est un congé annuel, vérifier et mettre à jour le solde
    if (typeConge.nom === 'Annuel') {
      const annee = new Date(date_debut).getFullYear()
      const solde = await prisma.soldeConge.findUnique({
        where: {
          professeur_id_annee: {
            professeur_id: professeur_id,
            annee: annee,
          },
        },
      })

      if (!solde) {
        // Créer le solde pour cette année si inexistant
        const expireLe = new Date(annee + 2, 11, 31)
        await prisma.soldeConge.create({
          data: {
            professeur_id: professeur_id,
            annee: annee,
            jours_total: 22,
            jours_restants: 22 - duree_jours,
            expire_le: expireLe,
          },
        })
      } else {
        // Vérifier si le solde est suffisant
        if (solde.jours_restants < duree_jours) {
          return NextResponse.json(
            {
              error: `Solde insuffisant. Jours restants: ${solde.jours_restants}`,
            },
            { status: 400 }
          )
        }

        // Mettre à jour le solde
        await prisma.soldeConge.update({
          where: { id: solde.id },
          data: {
            jours_restants: solde.jours_restants - duree_jours,
          },
        })
      }
    }

    // Créer le congé
    const conge = await prisma.conge.create({
      data: {
        professeur_id,
        type_conge_id,
        date_debut: new Date(date_debut),
        date_fin: new Date(date_fin),
        duree_jours,
        reference_doc: reference_doc || null,
        cree_par_rh_id: currentUser.userId,
      },
      include: {
        professeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            ppr: true,
          },
        },
        type_conge: true,
        cree_par_rh: {
          select: {
            nom_complet: true,
          },
        },
      },
    })

    return NextResponse.json(conge, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du congé:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

