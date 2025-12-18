# Gestion des Congés des Professeurs

Application interne RH pour la gestion des congés des professeurs dans un établissement public/hospitalier.

## 🎯 Description

Cette application permet au personnel RH de :
- Gérer les identités des professeurs
- Enregistrer manuellement les congés depuis des documents papier
- Suivre automatiquement les soldes de congés (22 jours/an, expiration après 2 ans)
- Consulter les statistiques et historiques

**Note importante** : Cette application est destinée uniquement au personnel RH. Les professeurs n'ont pas accès à l'application.

## 🛠️ Stack Technique

- **Frontend + Backend** : Next.js 16 (App Router)
- **UI** : React + shadcn/ui
- **Database** : PostgreSQL
- **ORM** : Prisma
- **Authentication** : JWT (HTTP-only cookies)
- **Deployment** : Docker + docker-compose

## 📋 Prérequis

- Node.js 20+
- Docker & Docker Compose
- npm ou yarn

## 🚀 Installation et Démarrage

### Option 1 : Avec Docker (Recommandé)

1. Cloner le projet
```bash
git clone <repository-url>
cd gestion-conges-professeurs
```

2. Copier le fichier d'environnement
```bash
cp .env.example .env
```

3. Démarrer les services
```bash
docker-compose up -d
```

4. Exécuter les migrations et le seed
```bash
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

5. Accéder à l'application
```
http://localhost:3000
```

### Option 2 : Développement Local

1. Installer les dépendances
```bash
npm install
```

2. Configurer la base de données PostgreSQL
   - Créer une base de données PostgreSQL
   - Configurer `DATABASE_URL` dans `.env`

3. Exécuter les migrations
```bash
npx prisma migrate dev
```

4. Seed la base de données
```bash
npm run db:seed
```

5. Démarrer le serveur de développement
```bash
npm run dev
```

## 🔐 Compte par défaut (Développement)

Après le seed, un compte administrateur est créé :
- **Email** : `admin@example.com`
- **Mot de passe** : `admin123`

⚠️ **Important** : Changez ces identifiants en production !

## 📁 Structure du Projet

```
gestion-conges-professeurs/
├── app/                    # Pages Next.js (App Router)
│   ├── api/               # Routes API
│   ├── dashboard/         # Page tableau de bord
│   ├── professeurs/       # Pages gestion professeurs
│   ├── conges/            # Pages gestion congés
│   └── login/              # Page de connexion
├── components/             # Composants React
│   ├── ui/                # Composants shadcn/ui
│   └── layout/            # Composants de layout
├── lib/                   # Utilitaires
│   ├── auth.ts            # Fonctions d'authentification
│   └── prisma.ts          # Client Prisma
├── prisma/                # Schéma Prisma
│   ├── schema.prisma      # Schéma de base de données
│   └── seed.ts            # Script de seed
├── middleware.ts          # Middleware d'authentification
├── Dockerfile             # Configuration Docker
└── docker-compose.yml     # Configuration Docker Compose
```

## 🗄️ Modèles de Données

### UtilisateurRH
Personnel RH qui utilise l'application.

### Professeur
Identité d'un professeur avec PPR, CIN, spécialité, etc.

### TypeConge
Types de congés (Annuel, Maladie, Exceptionnel).

### SoldeConge
Gestion automatique des soldes annuels (22 jours/an, expiration après 2 ans).

### Conge
Enregistrement d'un congé avec dates, durée, référence document, etc.

## 🔒 Règles Métier

- Chaque professeur a **22 jours de congé par an**
- Les soldes expirent **2 ans après la fin de l'année**
- Les congés annuels déduisent automatiquement le solde
- Pas de workflow d'approbation (saisie directe par RH)
- Les professeurs n'ont pas accès à l'application

## 📝 API Routes

### Authentication
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Utilisateur actuel

### Professeurs
- `GET /api/professeurs` - Liste des professeurs
- `POST /api/professeurs` - Créer un professeur
- `GET /api/professeurs/[id]` - Détails d'un professeur
- `PUT /api/professeurs/[id]` - Mettre à jour un professeur

### Congés
- `GET /api/conges` - Liste des congés
- `POST /api/conges` - Créer un congé

### Types de Congé
- `GET /api/types-conge` - Liste des types

### Dashboard
- `GET /api/dashboard/stats` - Statistiques

## 🐳 Docker

### Commandes utiles

```bash
# Démarrer les services
docker-compose up -d

# Voir les logs
docker-compose logs -f app

# Arrêter les services
docker-compose down

# Rebuild l'image
docker-compose build --no-cache

# Accéder au shell du container
docker-compose exec app sh
```

## 🔧 Développement

### Migrations Prisma

```bash
# Créer une nouvelle migration
npx prisma migrate dev --name nom_migration

# Appliquer les migrations en production
npx prisma migrate deploy
```

### Générer le client Prisma

```bash
npx prisma generate
```

### Studio Prisma (Interface graphique)

```bash
npx prisma studio
```

## 📄 Licence

Ce projet est destiné à un usage interne dans un établissement public/hospitalier.

## 👥 Support

Pour toute question ou problème, contactez l'équipe de développement.
