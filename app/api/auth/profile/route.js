import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Récupérer le profil de l'utilisateur connecté
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const utilisateur = await prisma.utilisateurRH.findUnique({
      where: { id: currentUser.userId },
      select: {
        id: true,
        email: true,
        nom_complet: true,
        cree_le: true,
      },
    })

    if (!utilisateur) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(utilisateur)
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour le profil (email, nom_complet)
export async function PUT(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { email, nom_complet } = body

    // Vérifier que l'utilisateur existe
    const existing = await prisma.utilisateurRH.findUnique({
      where: { id: currentUser.userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si l'email est modifié et s'il existe déjà
    if (email && email !== existing.email) {
      const emailExists = await prisma.utilisateurRH.findUnique({
        where: { email },
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 400 }
        )
      }
    }

    // Mettre à jour le profil
    const updateData = {}
    if (email) updateData.email = email
    if (nom_complet) updateData.nom_complet = nom_complet

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      )
    }

    const utilisateur = await prisma.utilisateurRH.update({
      where: { id: currentUser.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        nom_complet: true,
        cree_le: true,
      },
    })

    return NextResponse.json(utilisateur)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

