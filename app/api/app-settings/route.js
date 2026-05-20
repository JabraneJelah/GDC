import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getAppSettings, saveAppSettings } from '@/lib/app-settings'

export async function GET() {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  return NextResponse.json(getAppSettings())
}

export async function PUT(request) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const body = await request.json()
  const updated = saveAppSettings(body)
  return NextResponse.json(updated)
}
