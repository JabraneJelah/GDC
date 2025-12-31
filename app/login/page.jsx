'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [mot_de_passe, setMotDePasse] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

const handleSubmit = async (e) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, mot_de_passe }),
      credentials: 'include', // Ensure cookies are included
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error || 'Erreur de connexion')
      setLoading(false)
      return
    }

    // Small delay to ensure cookie is set
    await new Promise(resolve => setTimeout(resolve, 100))
    
    setLoading(false)
    // Use window.location for a full page reload to ensure cookie is read
    window.location.href = '/dashboard'

  } catch (err) {
    console.error('Login error:', err)
    setError('Erreur de connexion')
    setLoading(false)
  }
}


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-semibold text-slate-800">
            Connexion RH
          </CardTitle>
          <CardDescription className="text-slate-600">
            Connectez-vous pour accéder à l'application de gestion des congés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700">
                Nom d'utilisateur
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Entrez votre nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mot_de_passe" className="text-slate-700">
                Mot de passe
              </Label>
              <Input
                id="mot_de_passe"
                type="password"
                placeholder="Entrez votre mot de passe"
                value={mot_de_passe}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
                className="h-10"
              />
            </div>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 text-center">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-10 font-medium" 
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

