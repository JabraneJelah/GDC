import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken, hashPassword } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request) {
  console.log("LOGIN API CALLED");

  try {
    const body = await request.json()
    const { username, mot_de_passe } = body

    if (!username || !mot_de_passe) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur et mot de passe requis' },
        { status: 400 }
      )
    }

    const utilisateur = await prisma.utilisateurRH.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
      },
    })

    if (!utilisateur) {
      console.log("User not found:", username)
      return NextResponse.json(
        { error: 'Nom d\'utilisateur ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Check if password is stored as plain text or bcrypt hash
    // Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters long
    const isHashed = utilisateur.mot_de_passe && 
                     (utilisateur.mot_de_passe.startsWith('$2a$') || 
                      utilisateur.mot_de_passe.startsWith('$2b$') || 
                      utilisateur.mot_de_passe.startsWith('$2y$')) &&
                     utilisateur.mot_de_passe.length === 60

    let isValid = false
    let needsRehash = false

    if (isHashed) {
      // Password is hashed, use bcrypt compare
      isValid = await verifyPassword(mot_de_passe, utilisateur.mot_de_passe)
    } else {
      // Password is plain text, compare directly
      isValid = utilisateur.mot_de_passe === mot_de_passe
      if (isValid) {
        // Mark for re-hashing after successful login
        needsRehash = true
      }
    }

    if (!isValid) {
      console.log("Invalid password for user:", username)
      return NextResponse.json(
        { error: 'Nom d\'utilisateur ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // If password was plain text, hash it now and update the database
    if (needsRehash) {
      const hashedPassword = await hashPassword(mot_de_passe)
      await prisma.utilisateurRH.update({
        where: { id: utilisateur.id },
        data: { mot_de_passe: hashedPassword },
      })
      console.log("Password hashed and updated for user:", username)
    }

    // Vérifier si le compte est actif
    if (utilisateur.actif === false) {
      console.log("Account is deactivated for user:", username)
      return NextResponse.json(
        { error: 'Ce compte est désactivé. Veuillez contacter l\'administrateur.' },
        { status: 403 }
      )
    }

    const token = generateToken({
      userId: utilisateur.id,
      username: utilisateur.username,
    })
    console.log("TOKEN GENERATED successfully for user:", utilisateur.username)

    const response = NextResponse.json({
      success: true,
      user: {
        id: utilisateur.id,
        username: utilisateur.username,
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

