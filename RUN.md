# Guide de Démarrage Rapide

## 🚀 Option 1 : Développement Local (Recommandé pour le développement)

### Étape 1 : Installer les dépendances

```bash
cd gestion-conges-professeurs
npm install
```

### Étape 2 : Configurer l'environnement

Créez un fichier `.env` à la racine du projet :

```bash
# Sur Windows (PowerShell)
Copy-Item .env.example .env

# Sur Linux/Mac
cp .env.example .env
```

Puis modifiez `.env` avec vos paramètres de base de données :

```env
# Pour PostgreSQL local
DATABASE_URL=postgresql://username:password@localhost:5432/congedb

# JWT Secret (changez en production!)
JWT_SECRET=your-secret-key-change-in-production

# Node Environment
NODE_ENV=development
```

### Étape 3 : Configurer PostgreSQL

Assurez-vous que PostgreSQL est installé et démarré, puis créez la base de données :

```sql
CREATE DATABASE congedb;
```

### Étape 4 : Exécuter les migrations Prisma

```bash
npx prisma migrate dev
```

Cela va :
- Créer toutes les tables dans la base de données
- Générer le client Prisma

### Étape 5 : Seed la base de données

```bash
npm run db:seed
```

Cela crée :
- Les types de congé (Annuel, Maladie, Exceptionnel)
- Un utilisateur admin par défaut

### Étape 6 : Démarrer le serveur de développement

```bash
npm run dev
```

L'application sera accessible sur : **http://localhost:3000**

### 🔐 Compte par défaut

- **Email** : `admin@example.com`
- **Mot de passe** : `admin123`

---

## 🐳 Option 2 : Avec Docker (Recommandé pour la production)

### Étape 1 : Créer le fichier .env

```bash
Copy-Item .env.example .env
```

### Étape 2 : Démarrer les services

```bash
docker-compose up -d
```

Cela démarre :
- PostgreSQL (port 5432)
- L'application Next.js (port 3000)

### Étape 3 : Exécuter les migrations

```bash
docker-compose exec app npx prisma migrate deploy
```

### Étape 4 : Seed la base de données

```bash
docker-compose exec app npm run db:seed
```

### Étape 5 : Accéder à l'application

Ouvrez votre navigateur : **http://localhost:3000**

---

## 📝 Commandes Utiles

### Développement

```bash
# Démarrer le serveur de développement
npm run dev

# Build pour la production
npm run build

# Démarrer en mode production
npm start

# Générer le client Prisma
npx prisma generate

# Ouvrir Prisma Studio (interface graphique)
npx prisma studio
```

### Base de données

```bash
# Créer une nouvelle migration
npx prisma migrate dev --name nom_migration

# Appliquer les migrations en production
npx prisma migrate deploy

# Seed la base de données
npm run db:seed

# Réinitialiser la base de données (⚠️ supprime toutes les données)
npx prisma migrate reset
```

### Docker

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

---

## 🐛 Dépannage

### Erreur de connexion à la base de données

1. Vérifiez que PostgreSQL est démarré
2. Vérifiez que la base de données existe
3. Vérifiez les credentials dans `.env`

### Erreur "Prisma Client not generated"

```bash
npx prisma generate
```

### Erreur lors des migrations

```bash
# Réinitialiser et recréer
npx prisma migrate reset
npx prisma migrate dev
```

### Port 3000 déjà utilisé

Modifiez le port dans `package.json` ou arrêtez le processus qui utilise le port 3000.

---

## ✅ Vérification

Après le démarrage, vous devriez pouvoir :

1. Accéder à http://localhost:3000
2. Vous connecter avec `admin@example.com` / `admin123`
3. Voir le tableau de bord
4. Créer un professeur
5. Enregistrer un congé

---

## 📚 Structure des URLs

- `/login` - Page de connexion
- `/dashboard` - Tableau de bord
- `/professeurs` - Liste des professeurs
- `/professeurs/[id]` - Détails d'un professeur
- `/conges` - Gestion des congés

