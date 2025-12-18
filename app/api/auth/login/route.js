import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request) {
  console.log("LOGIN API CALLED");

  try {
    const body = await request.json()
    const { email, mot_de_passe } = body

    if (!email || !mot_de_passe) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    const utilisateur = await prisma.utilisateurRH.findUnique({
      where: { email },
    })

    if (!utilisateur) {
      console.log("User not found:", email)
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(mot_de_passe, utilisateur.mot_de_passe)

    if (!isValid) {
      console.log("Invalid password for user:", email)
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    const token = generateToken({
      userId: utilisateur.id,
      email: utilisateur.email,
    })
    console.log("TOKEN GENERATED successfully for user:", utilisateur.email)

    const response = NextResponse.json({
      success: true,
      user: {
        id: utilisateur.id,
        email: utilisateur.email,
        nom_complet: utilisateur.nom_complet,
      },
    })

    // Set cookie with proper configuration
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, 
    })

    console.log("Cookie set successfully")
    return response
  } catch (error) {
    console.error('Erreur lors de la connexion:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    )
  }
}

