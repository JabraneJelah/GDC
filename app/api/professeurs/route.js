import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

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
    const service_id = searchParams.get('service_id') || ''
    const grade_id = searchParams.get('grade_id') || ''

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
          hopital_id: hopitalIdInt
        })
      }
    }

    if (service_id) {
      const serviceIdInt = parseInt(service_id, 10)
      if (!isNaN(serviceIdInt)) {
        conditions.push({ service_id: serviceIdInt })
      }
    }

    if (grade_id) {
      const gradeIdInt = parseInt(grade_id, 10)
      if (!isNaN(gradeIdInt)) {
        conditions.push({ grade_id: gradeIdInt })
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
        nom_ar: true,
        prenom_ar: true,
        ppr: true,
        cin: true,
        adresse: true,
        sexe: true,
        lieu_naissance: true,
        ville: true,
        telephone: true,
        _count: {
          select: { 
            conges: true,
            soldes: true,
          },
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
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    // 2️⃣ Lire le body
    const body = await request.json()
    const {
      nom,
      prenom,
      nom_ar,
      prenom_ar,
      ppr,
      cin,
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

    // 3️⃣ Validation basique - nom, prénom, spécialité, catégorie et titre sont obligatoires (PPR optionnel)
    if (!nom || !prenom) {
      return NextResponse.json(
        { error: 'Les champs Nom et Prénom sont obligatoires' },
        { status: 400 }
      )
    }

    const pprTrim =
      ppr != null && String(ppr).trim() !== '' ? String(ppr).trim() : null

    const specialiteId = specialite_id ? Number(specialite_id) : null
    const categoriePersonnelId = categorie_personnel_id ? Number(categorie_personnel_id) : null
    const titreId = titre_id ? Number(titre_id) : null

    if (specialiteId == null || isNaN(specialiteId) || specialiteId < 1) {
      return NextResponse.json(
        { error: 'La spécialité est obligatoire' },
        { status: 400 }
      )
    }
    if (categoriePersonnelId == null || isNaN(categoriePersonnelId) || categoriePersonnelId < 1) {
      return NextResponse.json(
        { error: 'La catégorie personnel est obligatoire' },
        { status: 400 }
      )
    }
    if (titreId == null || isNaN(titreId) || titreId < 1) {
      return NextResponse.json(
        { error: 'Le titre est obligatoire' },
        { status: 400 }
      )
    }

    // 4️⃣ Parsing IDs optionnels (service, hopital, grade)
    const serviceId = service_id ? Number(service_id) : null
    const hopitalId = hopital_id ? Number(hopital_id) : null
    const gradeId = grade_id ? Number(grade_id) : null

    // Vérifier que les IDs fournis sont valides
    const idsToCheck = [
      { value: specialiteId, name: 'spécialité' },
      { value: categoriePersonnelId, name: 'catégorie personnel' },
      { value: titreId, name: 'titre' },
      { value: serviceId, name: 'service' },
      { value: hopitalId, name: 'hôpital' },
      { value: gradeId, name: 'grade' },
    ]

    for (const { value, name } of idsToCheck) {
      if (value !== null && isNaN(value)) {
        return NextResponse.json(
          { error: `ID invalide pour ${name}` },
          { status: 400 }
        )
      }
    }

    // 5️⃣ Vérifier existence des relations (seulement si fournies)
    const checks = []
    if (specialiteId !== null) {
      checks.push(prisma.specialite.findUnique({ where: { id: specialiteId } }).then(r => ({ type: 'specialite', result: r })))
    }
    if (categoriePersonnelId !== null) {
      checks.push(prisma.categoriePersonnel.findUnique({ where: { id: categoriePersonnelId } }).then(r => ({ type: 'categorie', result: r })))
    }
    if (titreId !== null) {
      checks.push(prisma.titre.findUnique({ where: { id: titreId } }).then(r => ({ type: 'titre', result: r })))
    }
    if (serviceId !== null) {
      checks.push(prisma.service.findUnique({ where: { id: serviceId } }).then(r => ({ type: 'service', result: r })))
    }
    if (hopitalId !== null) {
      checks.push(prisma.hopital.findUnique({ where: { id: hopitalId } }).then(r => ({ type: 'hopital', result: r })))
    }
    if (gradeId !== null) {
      checks.push(prisma.grade.findUnique({ where: { id: gradeId } }).then(r => ({ type: 'grade', result: r })))
    }

    const checkResults = await Promise.all(checks)
    
    for (const check of checkResults) {
      if (!check.result) {
        return NextResponse.json(
          { error: `Relation introuvable: ${check.type}` },
          { status: 404 }
        )
      }
    }

    // 6️⃣ Vérifier unicité du PPR (si renseigné)
    if (pprTrim) {
      const existingPpr = await prisma.professeur.findFirst({
        where: { ppr: pprTrim },
      })

      if (existingPpr) {
        return NextResponse.json(
          { error: 'Ce PPR est déjà utilisé' },
          { status: 400 }
        )
      }
    }

    // 7️⃣ Création du professeur (utiliser les IDs directement pour les champs optionnels)
    const data = {
      nom,
      prenom,
      nom_ar: nom_ar != null && String(nom_ar).trim() !== '' ? String(nom_ar).trim() : null,
      prenom_ar: prenom_ar != null && String(prenom_ar).trim() !== '' ? String(prenom_ar).trim() : null,
      ppr: pprTrim,
      cin: cin != null && String(cin).trim() !== '' ? String(cin).trim() : null,
      adresse: adresse != null && String(adresse).trim() !== '' ? String(adresse).trim() : null,
      sexe: sexe != null && String(sexe).trim() !== '' ? String(sexe).trim() : null,
      lieu_naissance: lieu_naissance != null && String(lieu_naissance).trim() !== '' ? String(lieu_naissance).trim() : null,
      ville: ville != null && String(ville).trim() !== '' ? String(ville).trim() : null,
      telephone: telephone || null,
    }

    // Ajouter les IDs seulement s'ils sont fournis (non null)
    if (specialiteId !== null) {
      data.specialite_id = specialiteId
    }
    if (categoriePersonnelId !== null) {
      data.categorie_personnel_id = categoriePersonnelId
    }
    if (titreId !== null) {
      data.titre_id = titreId
    }
    if (serviceId !== null) {
      data.service_id = serviceId
    }
    if (hopitalId !== null) {
      data.hopital_id = hopitalId
    }
    if (gradeId !== null) {
      data.grade_id = gradeId
    }

    const professeur = await prisma.professeur.create({
      data,
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

// DELETE - Supprimer plusieurs professeurs
export async function DELETE(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Aucun ID de professeur fourni' },
        { status: 400 }
      )
    }

    // Vérifier que tous les IDs sont valides
    const validIds = ids.filter(id => typeof id === 'string' && id.trim() !== '')
    
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: 'Aucun ID valide fourni' },
        { status: 400 }
      )
    }

    // Récupérer les professeurs avec leurs compteurs avant suppression
    const professeurs = await prisma.professeur.findMany({
      where: {
        id: { in: validIds },
      },
      include: {
        _count: {
          select: {
            conges: true,
            soldes: true,
          },
        },
      },
    })

    if (professeurs.length === 0) {
      return NextResponse.json(
        { error: 'Aucun professeur trouvé avec les IDs fournis' },
        { status: 404 }
      )
    }

    // Supprimer les professeurs (les congés et soldes seront supprimés en cascade)
    await prisma.professeur.deleteMany({
      where: {
        id: { in: validIds },
      },
    })

    // Calculer les totaux
    const totalConges = professeurs.reduce((sum, p) => sum + p._count.conges, 0)
    const totalSoldes = professeurs.reduce((sum, p) => sum + p._count.soldes, 0)

    return NextResponse.json({
      message: `${professeurs.length} professeur(s) supprimé(s) avec succès`,
      deletedCount: professeurs.length,
      deletedConges: totalConges,
      deletedSoldes: totalSoldes,
    })
  } catch (error) {
    console.error('Erreur lors de la suppression multiple:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

