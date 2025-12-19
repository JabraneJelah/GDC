'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Tableau de bord</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Professeurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{stats?.totalProfesseurs || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Congés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{stats?.totalConges || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Congés cette année
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {stats?.congesCetteAnnee || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilisateurs RH
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {stats?.totalUtilisateursRH || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Congés par type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats?.congesParType.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-md bg-slate-50"
              >
                <span className="text-sm font-medium">{item.type}</span>
                <span className="text-sm text-slate-700">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/professeurs" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">Gérer les Professeurs</Button>
        </Link>
        <Link href="/conges" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">Gérer les Congés</Button>
        </Link>
      </div>
    </div>
  )
}

