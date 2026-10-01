# Authentication and authorization

Re-verified against `lib/auth.js`, `lib/roles.js`, `middleware.js`, and the relevant route handlers at commit `3ba4298` on 2026-09-30; no discrepancies found against the 2026-09-15 version of this document.

This document describes current enforcement, including inconsistencies. It does not treat intended security as guaranteed behavior.

## Authentication model

The application uses a signed JWT stored in the `auth_token` cookie. Professors do not authenticate; accounts are `UtilisateurRH` records.

Primary helpers in `lib/auth.js`:

- `hashPassword()` and `verifyPassword()` use `bcryptjs` with cost 10;
- `generateToken()` signs with `jsonwebtoken` and a seven-day lifetime;
- `verifyToken()` returns the decoded payload or null;
- `getAuthToken()` reads `auth_token` through `next/headers`;
- `getCurrentUser()` returns only the verified token payload;
- `setAuthCookie()` would use `secure` in production, `sameSite: lax`, seven-day max age, and `/` path;
- `removeAuthCookie()` deletes the cookie.

Both `lib/auth.js` and `middleware.js` fall back to `your-secret-key-change-in-production` when `JWT_SECRET` is absent. Docker entrypoint prevents that fallback in its production startup path, but non-Docker launches can still use it.

## Login

`POST /api/auth/login` accepts `username` and `mot_de_passe`. It does not authenticate by email.

The route:

1. performs a case-insensitive username lookup with a ten-second Promise timeout;
2. detects bcrypt hashes by prefix/length;
3. compares legacy non-bcrypt values as plaintext;
4. upgrades a successfully matched legacy plaintext password to bcrypt;
5. rejects `actif === false`;
6. signs `{ userId, username, role }`, defaulting a missing role to `UTILISATEUR_RH`;
7. writes the cookie and returns basic user data.

The login handler creates the cookie directly with `httpOnly: true`, `sameSite: lax`, seven-day max age, and **`secure: false`**, even in production. It does not use `setAuthCookie()`.

The code logs login flow details and usernames to standard output.

## Middleware

`middleware.js` matches all paths except `_next/static`, `_next/image`, and `favicon.ico`.

Explicit exemptions:

- `/login`
- every path beginning `/api/auth`
- every path beginning `/api/init`

The former exemptions for `/api/migrate-services` and `/api/migrate-indexes` were removed, along with the two route files themselves, after a security review found them unauthenticated, executing raw unaudited DDL outside Prisma migration tracking, and called by no application or deployment code. See [Technical debt](technical-debt.md).

For other paths:

- no cookie + API path → JSON 401;
- no cookie + page path → redirect to `/login`;
- valid JWT → continue;
- invalid/expired JWT → delete cookie and redirect to `/login`.

The invalid-token branch does not special-case APIs, so an API request with an invalid token receives a redirect rather than the no-token JSON 401 behavior.

Middleware verifies signature/expiry only. It does not load the database user, active flag, or current role.

## Current user

`GET /api/auth/me`:

- calls `getCurrentUser()`;
- loads the database user by JWT `userId`;
- returns `id`, `username`, `nom_complet`, and current database `role`.

It does not select or reject on `actif`. Thus it can return a deactivated user while their still-valid JWT remains accepted.

`components/UserContext.jsx` fetches this endpoint once when `PageShell` mounts and exposes `{ user, loading }`. Header separately calls the same endpoint for initials.

## Roles

Current application role constants:

| Role | Intended current behavior |
|---|---|
| `UTILISATEUR_RH` | Normal RH read/write access. |
| `LECTEUR_RH` | Read-only access. |

The database column is `String`, not an enum or check constraint.

`rejectIfLecteur(currentUser)` reads the role from the decoded JWT and returns 403 for `LECTEUR_RH`. Old tokens without a role default to `UTILISATEUR_RH`.

There is no distinct administrator role. Regular `UTILISATEUR_RH` accounts can access current user-management mutations. Sidebar properties named `adminOnly` only hide items from `LECTEUR_RH`.

## Frontend role handling

Pages use `useCurrentUser()` and frontend `isLecteurRH(user)` to hide or disable mutations. Current examples include:

- professor management;
- leave management;
- dossier lists and workflow detail;
- document templates;
- user management;
- multiple referential pages;
- dashboard actions.

Sidebar hides user management and application settings from readers. Frontend handling improves ergonomics but is not authorization.

## Backend role handling

Most current mutation routes explicitly call:

1. `getCurrentUser()`;
2. `rejectIfLecteur(currentUser)`.

This includes current professor, leave, balance, dossier, template, settings, and most referential mutations.

Known inconsistency: legacy `POST /api/utilisateurs-rh` checks authentication but does not reject `LECTEUR_RH`. Route-by-route verification is required; there is no centralized mutation policy.

Because backend role checks use the JWT payload, changing a user’s role in PostgreSQL does not change authorization for an already-issued token. `/api/auth/me` may show the new role while a mutation route still sees the old one.

## Account activation

Login rejects inactive accounts. Existing tokens are not revoked or revalidated against `actif` by middleware or `getCurrentUser()`. Deactivation therefore prevents the next login but does not reliably terminate a current seven-day session.

User-management routes can create accounts, update username/name/role/active state, and reset passwords. The valid role allowlist is applied by `/api/utilisateurs`, but the database itself permits other strings.

## Profile and password

- `GET /api/auth/profile` returns authenticated profile information.
- `PUT /api/auth/profile` updates the current user’s profile fields.
- `PUT /api/auth/password` verifies and changes the current user’s password.
- `POST /api/auth/logout` deletes `auth_token`.

All `/api/auth/**` paths bypass middleware, so each handler must enforce its own requirements. Current profile/password/me handlers do; login/logout are intentionally callable without an existing valid session.

## Bootstrap, emergency, and legacy routes

### `/api/init/rh`

- Explicitly exempt from middleware.
- Uses `bcrypt`, not the main `bcryptjs` helper.
- Intended to create a first RH account.
- Current condition is reversed: it rejects when `count < 1` and proceeds when one or more users exist.
- It has no role or secret/bootstrap-token check.

### `/api/create-user`

- Not explicitly exempt, so middleware normally protects it.
- Mutates state through GET.
- Creates or reveals fixed `admin@example.com` / `admin123` development credentials.
- Creates an email-only user, while current login requires username.
- Should be treated as legacy/unsafe operational surface.

### `/api/emergency/activate-account`

- Source comments say it is accessible without authentication, but middleware does not exempt `/api/emergency`; it is currently token-protected by the matcher.
- POST reactivates by username or email without a role check.
- GET lists user identifiers and active states without handler-level authentication.

### Migration endpoints (removed)

`/api/migrate-services` and `/api/migrate-indexes`, which were explicitly exempt from middleware and executed raw DDL, have been deleted along with their middleware exemptions. See [Technical debt](technical-debt.md).

## Current security inconsistencies

1. Login sets `secure: false` even in production.
2. The fallback JWT secret remains available outside protected Docker startup.
3. Role changes and deactivation do not invalidate or refresh existing JWT claims.
4. `/api/auth/me` reads the database role, while backend mutation authorization generally uses the possibly stale token role.
5. `LECTEUR_RH` enforcement is duplicated and incomplete.
6. No administrator role separates user/settings administration from ordinary RH work.
7. The first-user initializer’s count condition appears reversed.
8. Legacy create/emergency endpoints have behavior inconsistent with their names, comments, or current login model.
9. Invalid API tokens produce redirects while missing tokens produce JSON 401.

These are verified current issues, not instructions to depend on the behavior.
