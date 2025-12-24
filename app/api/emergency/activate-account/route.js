import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Route d'urgence pour réactiver un compte désactivé
// Cette route est accessible sans authentification pour les cas d'urgence
export async function POST(request) {
  try {
    const body = await request.json()
    const { username, email } = body

    if (!username && !email) {
      return NextResponse.json(
        { error: 'Username ou email requis' },
        { status: 400 }
      )
    }

    // Chercher l'utilisateur par username ou email
    const whereClause = username 
      ? { username }
      : { email }

    const utilisateur = await prisma.utilisateurRH.findFirst({
      where: whereClause,
    })

    if (!utilisateur) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Réactiver le compte
    const updated = await prisma.utilisateurRH.update({
      where: { id: utilisateur.id },
      data: {
        actif: true,
      },
    })

    return NextResponse.json({
      message: 'Compte réactivé avec succès',
      user: {
        id: updated.id,
        username: updated.username,
        nom_complet: updated.nom_complet,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la réactivation du compte:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// GET - Lister tous les utilisateurs (pour trouver l'ID/username)
export async function GET() {
  try {
    const utilisateurs = await prisma.utilisateurRH.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        nom_complet: true,
        actif: true,
      },
      orderBy: { cree_le: 'desc' },
    })

    return NextResponse.json(utilisateurs)
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

