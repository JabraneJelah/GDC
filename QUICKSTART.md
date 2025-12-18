# Guide de Démarrage Rapide

## 🚀 Démarrage avec Docker (Recommandé)

### 1. Configuration initiale

```bash
# Copier le fichier d'environnement
cp .env.example .env

# (Optionnel) Modifier .env si nécessaire
```

### 2. Démarrer l'application

```bash
# Construire et démarrer les containers
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

### 3. Initialiser la base de données

```bash
# Exécuter les migrations
docker-compose exec app npx prisma migrate deploy

# Seed la base de données (types de congé + utilisateur admin)
docker-compose exec app npm run db:seed
```

### 4. Accéder à l'application

Ouvrir dans le navigateur : http://localhost:3000

**Compte par défaut :**
- Email : `admin@example.com`
- Mot de passe : `admin123`

## 🔧 Développement Local

### 1. Prérequis

- PostgreSQL installé et démarré
- Node.js 20+

### 2. Installation

```bash
# Installer les dépendances
npm install

# Configurer la base de données dans .env
DATABASE_URL=postgresql://user:password@localhost:5432/congedb
JWT_SECRET=your-secret-key
```

### 3. Initialiser la base de données

```bash
# Créer les migrations
npx prisma migrate dev

# Seed la base de données
npm run db:seed
```

### 4. Démarrer le serveur

```bash
npm run dev
```

## 📝 Premiers Pas

1. **Se connecter** avec le compte admin
2. **Créer un professeur** depuis la page "Professeurs"
3. **Enregistrer un congé** depuis la page "Congés"
4. **Consulter les statistiques** sur le tableau de bord

## 🐛 Dépannage

### Problème de connexion à la base de données

```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps

# Voir les logs PostgreSQL
docker-compose logs postgres
```

### Réinitialiser la base de données

```bash
# Supprimer les volumes
docker-compose down -v

# Redémarrer
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run db:seed
```

### Rebuild l'application

```bash
docker-compose build --no-cache
docker-compose up -d
```

