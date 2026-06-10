import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

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

    // Supprimer automatiquement les soldes expirés pour ce professeur
    const maintenant = new Date()
    await prisma.soldeConge.deleteMany({
      where: {
        professeur_id: id,
        expire_le: { lt: maintenant },
      },
    })

    const professeur = await prisma.professeur.findUnique({
      where: { id },
      include: {
        specialite: true,
        categorie_personnel: true,
        titre: true,
        service: true,
        hopital: true,
        grade: true,
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
          include: { type_conge: true },
          orderBy: [{ annee: 'desc' }, { type_conge_id: 'asc' }],
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
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

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
      adresse,
      sexe,
      lieu_naissance,
      ville,
      specialite_id,
      categorie_personnel_id,
      titre_id,
      service_id,
      hopital_id,
      grade_id,
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

    const newPpr =
      ppr === undefined
        ? undefined
        : ppr == null || String(ppr).trim() === ''
          ? null
          : String(ppr).trim()

    // Vérifier si le PPR est modifié et s'il existe déjà
    if (newPpr !== undefined && newPpr !== existing.ppr && newPpr) {
      const pprExists = await prisma.professeur.findFirst({
        where: { ppr: newPpr, NOT: { id } },
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
      ...(newPpr !== undefined ? { ppr: newPpr } : {}),
      telephone: telephone !== undefined ? telephone : existing.telephone,
      adresse: adresse !== undefined ? adresse : existing.adresse,
      sexe: sexe !== undefined ? sexe : existing.sexe,
      lieu_naissance: lieu_naissance !== undefined ? lieu_naissance : existing.lieu_naissance,
      ville: ville !== undefined ? ville : existing.ville,
    }

    // Mettre à jour les IDs si fournis (ou les mettre à null si explicitement undefined)
    if (specialite_id !== undefined) {
      if (specialite_id === null || specialite_id === '') {
        updateData.specialite_id = null
      } else {
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
    }

    if (categorie_personnel_id !== undefined) {
      if (categorie_personnel_id === null || categorie_personnel_id === '') {
        updateData.categorie_personnel_id = null
      } else {
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
    }

    if (titre_id !== undefined) {
      if (titre_id === null || titre_id === '') {
        updateData.titre_id = null
      } else {
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
    }

    if (service_id !== undefined) {
      if (service_id === null || service_id === '') {
        updateData.service_id = null
      } else {
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
    }

    if (hopital_id !== undefined) {
      if (hopital_id === null || hopital_id === '') {
        updateData.hopital_id = null
      } else {
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
    }

    if (grade_id !== undefined) {
      if (grade_id === null || grade_id === '') {
        updateData.grade_id = null
      } else {
        const gradeIdInt = parseInt(grade_id, 10)
        if (!isNaN(gradeIdInt)) {
          const gradeExists = await prisma.grade.findUnique({
            where: { id: gradeIdInt },
          })
          if (gradeExists) {
            updateData.grade_id = gradeIdInt
          }
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

// DELETE - Supprimer un professeur
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    // Handle both sync and async params (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID du professeur manquant' },
        { status: 400 }
      )
    }

    // Vérifier si le professeur existe et compter les congés
    const professeur = await prisma.professeur.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            conges: true,
            soldes: true,
          },
        },
      },
    })

    if (!professeur) {
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer le professeur (les congés seront supprimés en cascade grâce à onDelete: Cascade)
    await prisma.professeur.delete({
      where: { id },
    })

    return NextResponse.json({
      message: 'Professeur supprimé avec succès',
      deletedConges: professeur._count.conges,
      deletedSoldes: professeur._count.soldes,
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du professeur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

