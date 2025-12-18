import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, mot_de_passe } = body

    if (!email || !mot_de_passe) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    // Trouver l'utilisateur RH
    const utilisateur = await prisma.utilisateurRH.findUnique({
      where: { email },
    })

    if (!utilisateur) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Vérifier le mot de passe
    const isValid = await verifyPassword(mot_de_passe, utilisateur.mot_de_passe)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Générer le token
    const token = generateToken({
      userId: utilisateur.id,
      email: utilisateur.email,
    })

    // Définir le cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: utilisateur.id,
        email: utilisateur.email,
        nom_complet: utilisateur.nom_complet,
      },
    })

    // Définir le cookie dans la réponse
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erreur lors de la connexion:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

