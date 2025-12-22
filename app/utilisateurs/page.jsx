'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react'

export default function UtilisateursPage() {
  const [utilisateurs, setUtilisateurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    nom_complet: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editFormData, setEditFormData] = useState({
    email: '',
    nom_complet: '',
  })
  const [actionLoadingId, setActionLoadingId] = useState(null)

  useEffect(() => {
    fetchUtilisateurs()
  }, [])

  const fetchUtilisateurs = async () => {
    try {
      const res = await fetch('/api/utilisateurs')
      if (res.ok) {
        const data = await res.json()
        setUtilisateurs(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
      setErrorMessage('Erreur lors du chargement des utilisateurs')
      setErrorDialogOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/utilisateurs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setFormData({ email: '', nom_complet: '' })
        setSuccessDialogOpen(true)
        fetchUtilisateurs()
      } else {
        const data = await res.json()
        setErrorMessage(data.error || 'Erreur lors de la création')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error)
      setErrorMessage('Erreur lors de la création')
      setErrorDialogOpen(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setEditFormData({
      email: user.email,
      nom_complet: user.nom_complet,
    })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/utilisateurs/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      })
      if (res.ok) {
        setEditingUser(null)
        setEditFormData({ email: '', nom_complet: '' })
        setSuccessDialogOpen(true)
        fetchUtilisateurs()
      } else {
        const data = await res.json()
        setErrorMessage(data.error || 'Erreur lors de la mise à jour')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error)
      setErrorMessage('Erreur lors de la mise à jour')
      setErrorDialogOpen(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActif = async (user) => {
    setActionLoadingId(user.id)
    try {
      const res = await fetch(`/api/utilisateurs/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !user.actif }),
      })
      if (res.ok) {
        fetchUtilisateurs()
      } else {
        const data = await res.json()
        setErrorMessage(data.error || 'Erreur lors de la mise à jour du statut')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error)
      setErrorMessage('Erreur lors de la mise à jour du statut')
      setErrorDialogOpen(true)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleResetPassword = async () => {
    if (!editingUser) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/utilisateurs/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_password: true }),
      })
      if (res.ok) {
        setSuccessDialogOpen(true)
      } else {
        const data = await res.json()
        setErrorMessage(data.error || 'Erreur lors de la réinitialisation')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error)
      setErrorMessage('Erreur lors de la réinitialisation')
      setErrorDialogOpen(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">
          Utilisateurs RH
        </h1>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">
          Créer un utilisateur RH
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Le mot de passe par défaut est <span className="font-semibold">123456</span>.
          L&apos;utilisateur pourra le changer dans son profil.
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="rh@example.com"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="nom_complet">Nom complet *</Label>
            <Input
              id="nom_complet"
              required
              value={formData.nom_complet}
              onChange={(e) =>
                setFormData({ ...formData, nom_complet: e.target.value })
              }
              placeholder="Nom et prénom"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-md border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nom complet</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : utilisateurs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  Aucun utilisateur RH
                </TableCell>
              </TableRow>
            ) : (
              utilisateurs.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.nom_complet}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.actif
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          user.actif ? 'bg-green-500' : 'bg-slate-400'
                        }`}
                      />
                      {user.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(user.cree_le).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActif(user)}
                        className="w-full sm:w-auto flex items-center gap-2"
                        disabled={actionLoadingId === user.id}
                      >
                        {actionLoadingId === user.id ? (
                          '...'
                        ) : user.actif ? (
                          <>
                            <ToggleRight className="h-4 w-4 text-green-600" />
                            Actif
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 text-slate-500" />
                            Inactif
                          </>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEdit(user)}
                        className="w-full sm:w-auto"
                      >
                        Modifier
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-slate-700">Mettre à jour l’utilisateur</DialogTitle>
            <DialogDescription className="text-slate-700">
              Modifier les informations du compte RH.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email *</Label>
              <Input
                id="edit_email"
                type="email"
                required
                value={editFormData.email}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_nom">Nom complet *</Label>
              <Input
                id="edit_nom"
                required
                value={editFormData.nom_complet}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, nom_complet: e.target.value })
                }
              />
            </div>
            <div className="">

              
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button
                type="button"
                variant="outline"
                onClick={handleResetPassword}
                disabled={submitting}
                className="w-full sm:w-auto flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Réinitialiser le mot de passe
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
                className="w-full sm:w-auto cursor-pointer"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto cursor-pointer">
                {submitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Erreur</DialogTitle>
            <DialogDescription className="text-slate-700 whitespace-pre-line">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setErrorDialogOpen(false)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-slate-700">Utilisateur créé</DialogTitle>
            <DialogDescription className="text-slate-700">
              Le compte a été créé avec succès.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setSuccessDialogOpen(false)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


