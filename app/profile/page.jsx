"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [profileData, setProfileData] = useState({
    username: "",
    nom_complet: "",
  });

  const [passwordData, setPasswordData] = useState({
    mot_de_passe_actuel: "",
    nouveau_mot_de_passe: "",
    confirmer_mot_de_passe: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/auth/profile");
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setProfileData({
          username: data.username || "",
          nom_complet: data.nom_complet || "",
        });
      } else {
        setErrorMessage("Erreur lors du chargement du profil");
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error("Erreur:", error);
      setErrorMessage("Erreur lors du chargement du profil");
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setSuccessMessage("Profil mis à jour avec succès");
        setSuccessDialogOpen(true);
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Erreur lors de la mise à jour");
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error("Erreur:", error);
      setErrorMessage("Erreur lors de la mise à jour");
      setErrorDialogOpen(true);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (
      passwordData.nouveau_mot_de_passe !== passwordData.confirmer_mot_de_passe
    ) {
      setErrorMessage("Les mots de passe ne correspondent pas");
      setErrorDialogOpen(true);
      return;
    }

    if (passwordData.nouveau_mot_de_passe.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères");
      setErrorDialogOpen(true);
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mot_de_passe_actuel: passwordData.mot_de_passe_actuel,
          nouveau_mot_de_passe: passwordData.nouveau_mot_de_passe,
        }),
      });

      if (response.ok) {
        setSuccessMessage("Mot de passe mis à jour avec succès");
        setSuccessDialogOpen(true);
        setPasswordData({
          mot_de_passe_actuel: "",
          nouveau_mot_de_passe: "",
          confirmer_mot_de_passe: "",
        });
      } else {
        const data = await response.json();
        setErrorMessage(
          data.error || "Erreur lors de la mise à jour du mot de passe"
        );
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error("Erreur:", error);
      setErrorMessage("Erreur lors de la mise à jour du mot de passe");
      setErrorDialogOpen(true);
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
       
        <p className="text-sm text-slate-600 mt-2">
          Gérez vos informations personnelles et votre mot de passe
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-700">
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur *</Label>
                <Input
                  id="username"
                  type="text"
                  value={profileData.username}
                  onChange={(e) =>
                    setProfileData({ ...profileData, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom_complet">Nom complet *</Label>
                <Input
                  id="nom_complet"
                  value={profileData.nom_complet}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      nom_complet: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={updatingProfile}
                className="w-full sm:w-auto"
              >
                {updatingProfile ? "Mise à jour..." : "Mettre à jour"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-slate-700">
              Changer le mot de passe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mot_de_passe_actuel">
                  Mot de passe actuel *
                </Label>
                <Input
                  id="mot_de_passe_actuel"
                  type="password"
                  value={passwordData.mot_de_passe_actuel}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      mot_de_passe_actuel: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nouveau_mot_de_passe">
                  Nouveau mot de passe *
                </Label>
                <Input
                  id="nouveau_mot_de_passe"
                  type="password"
                  value={passwordData.nouveau_mot_de_passe}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      nouveau_mot_de_passe: e.target.value,
                    })
                  }
                  required
                  minLength={6}
                />
                <p className="text-xs text-slate-500">Minimum 6 caractères</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmer_mot_de_passe">
                  Confirmer le nouveau mot de passe *
                </Label>
                <Input
                  id="confirmer_mot_de_passe"
                  type="password"
                  value={passwordData.confirmer_mot_de_passe}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmer_mot_de_passe: e.target.value,
                    })
                  }
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                disabled={updatingPassword}
                className="w-full sm:w-auto"
              >
                {updatingPassword
                  ? "Mise à jour..."
                  : "Changer le mot de passe"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-700">
              Informations du compte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-700">Date de création</p>
                <p className="font-medium">
                  {new Date(user.cree_le).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            <DialogTitle className="text-green-600">Succès</DialogTitle>
            <DialogDescription className="text-slate-700">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              className="cursor-pointer"
              onClick={() => setSuccessDialogOpen(false)}
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
