import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d'

/**
 * Hash un mot de passe avec bcrypt
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

/**
 * Vérifie un mot de passe avec bcrypt
 */
export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Génère un JWT token
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * Vérifie et décode un JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

/**
 * Définit le cookie JWT (HTTP-only)
 */
export async function setAuthCookie(token) {
  const cookieStore = await cookies()
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: '/',
  })
}

/**
 * Récupère le token depuis le cookie
 */
export async function getAuthToken() {
  const cookieStore = await cookies()
  return cookieStore.get('auth_token')?.value || null
}

/**
 * Supprime le cookie d'authentification
 */
export async function removeAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
}

/**
 * Récupère l'utilisateur authentifié depuis le cookie
 */
export async function getCurrentUser() {
  const token = await getAuthToken()
  if (!token) return null
  return verifyToken(token)
}

