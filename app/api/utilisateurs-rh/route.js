import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des utilisateurs RH
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const utilisateurs = await prisma.utilisateurRH.findMany({
      select: {
        id: true,
        email: true,
        nom_complet: true,
        cree_le: true,
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

// POST - Créer un nouvel utilisateur RH
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { email, mot_de_passe, nom_complet } = body

    if (!email || !mot_de_passe || !nom_complet) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      )
    }

    // Vérifier si l'email existe déjà
    const existing = await prisma.utilisateurRH.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(mot_de_passe)

    // Créer l'utilisateur
    const utilisateur = await prisma.utilisateurRH.create({
      data: {
        email,
        mot_de_passe: hashedPassword,
        nom_complet,
      },
      select: {
        id: true,
        email: true,
        nom_complet: true,
        cree_le: true,
      },
    })

    return NextResponse.json(utilisateur, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

