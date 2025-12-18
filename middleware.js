import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Routes publiques (pas besoin d'authentification)
  if (pathname === '/login' || pathname === '/api/auth/login') {
    return NextResponse.next()
  }

  // Récupérer le token depuis le cookie
  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    // Rediriger vers login si pas de token
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Vérifier le token
  try {
    jwt.verify(token, JWT_SECRET)
    return NextResponse.next()
  } catch {
    // Token invalide
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth_token')
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

