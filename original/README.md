# Comunication_LTD – Secure variant (`original/`)

Web system for **Comunication_LTD**: users, customers, **packages**, and **sectors** catalog.
This folder is the **non-vulnerable** submission for Part B (fixes: parameterized SQL, HTML encoding).

See the repository root [README.md](../README.md) and [PART_B_GUIDE.md](../PART_B_GUIDE.md).
The deliberately vulnerable code lives in **`../vulnerable-version/`**.

## Tech stack

- **Backend**: Node.js + Express, `pg` (parameterized queries), `express-session` with
  `connect-pg-simple`, `helmet`, `cors`, `nodemailer`.
- **Frontend**: React (Vite) + React Router + Material UI + Axios.
- **Database**: PostgreSQL.

## Project layout

```
final_project_siber/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── db/                 (pool.js, schema.sql, init.js)
│   │   ├── config/             (password-policy.json, common-passwords.txt, index.js)
│   │   ├── services/           (password / token / email)
│   │   ├── middleware/         (requireAuth, errorHandler)
│   │   ├── controllers/        (auth, customers)
│   │   └── routes/             (auth.routes, customers.routes)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/              (Login, Register, ChangePassword, ForgotPassword, ResetPassword, Dashboard)
│   │   ├── components/         (NavBar, ProtectedRoute, PasswordPolicyHint)
│   │   ├── state/              (AuthContext)
│   │   ├── api/client.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+ running locally (or remote)
- An SMTP account for outbound mail (Gmail App Password, Mailtrap, SendGrid, etc.)

## Setup

### 1. PostgreSQL database

Create an empty database and a user that can connect to it. Example with `psql`:

```sql
CREATE DATABASE comunication_ltd;
CREATE USER comunication_ltd_app WITH PASSWORD 'change_me';
GRANT ALL PRIVILEGES ON DATABASE comunication_ltd TO comunication_ltd_app;
```

### 2. Backend

```
cd backend
npm install
copy .env.example .env       (Windows)   |   cp .env.example .env   (macOS/Linux)
```

Edit `backend/.env` and fill in real values:

- `DATABASE_URL` - PostgreSQL connection string.
- `SESSION_SECRET` - long random value (used to sign session cookies).
- `PEPPER` - long random value (server-side secret used inside the HMAC).
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` - your SMTP credentials.
- `FRONTEND_URL` - usually `http://localhost:3000`.

Initialize the database schema:

```
npm run db:init
```

Start the API (port 4000):

```
npm run dev
```

### 3. Frontend

```
cd frontend
npm install
npm run dev
```

The web app is served at `http://localhost:3000` and proxies `/api/*` to the backend.

## Application flow

1. **Register** (`/register`) - create user with username + email + complex password.
2. **Login** (`/login`) - sign in with username + password.
3. **Dashboard** (`/dashboard`) - add a new Comunication_LTD customer; the dashboard
   displays the name of the customer that was just added (per project requirement) and
   lists the most recent customers below.
4. **Change password** (`/change-password`) - while authenticated; requires current password.
5. **Forgot password** (`/forgot-password`) - enter email; the server generates a random
   reset code, stores its SHA-1 hash, and emails the original code to the user.
6. **Reset password** (`/reset-password`) - paste the code from the email and choose a
   new password; the server hashes the input with SHA-1 and matches it against the stored
   hash before allowing the reset.

## Security mechanisms (Part A requirements)

### Password storage - HMAC + Salt
- For every user, a 32-byte random salt is generated (`crypto.randomBytes`).
- The stored hash is `HMAC-SHA256(key = PEPPER, message = salt + plainPassword)`.
- `PEPPER` is a server-side secret kept only in `.env`, never written to the database.
- Password comparison uses `crypto.timingSafeEqual` to avoid timing attacks.

### Password policy from configuration file
File: `backend/src/config/password-policy.json` - controls all rules without code changes:

- `minLength`, `requireUppercase`, `requireLowercase`, `requireDigit`, `requireSpecial`
- `blockCommonPasswords` + `commonPasswordsFile` (dictionary check vs `common-passwords.txt`)
- `history.enabled` + `history.previousCount` (cannot reuse the last N passwords)
- `lockout.enabled` + `lockout.maxAttempts` + `lockout.lockMinutes`
- `resetTokenExpiryMinutes` (lifetime for forgot-password codes)

Editing this file and restarting the backend is enough to change policy.

### Password history
On every successful registration / change / reset, the new (hash, salt) pair is appended
to `password_history`. New password attempts are recomputed against each historical pair
and rejected if they match within the configured window.

### Account lockout
A failed login increments `users.failed_attempts`. When the counter reaches
`lockout.maxAttempts`, `users.locked_until` is set to `now() + lockMinutes`. While locked,
even a correct password is rejected. A successful login resets the counter.

### Forgot-password token (SHA-1 per project requirement)
- Server generates a 20-byte random raw token (`crypto.randomBytes(20).toString('hex')`).
- The raw token is sent to the user's email.
- The server stores only `SHA-1(rawToken)` together with `expires_at` and `used_at`.
- On reset, the server computes `SHA-1(userInput)` and compares to the stored value.
- Tokens are single-use and have a configurable expiry. Submitting `forgot-password` again
  invalidates any previous unused token for that user.

### Sessions
- `express-session` with PostgreSQL-backed storage (`connect-pg-simple`, `session` table).
- Cookie flags: `httpOnly: true`, `sameSite: 'lax'`, `secure: true` in production.
- `req.session.regenerate` is called on successful login to mitigate session fixation.

### SQL Injection prevention
Every database call uses **parameterized queries** (`pool.query(text, [params])`). User
input is never concatenated into SQL strings.

### Other defenses
- `helmet` adds standard security headers.
- `cors` is configured with `credentials: true` and a single allowed origin.
- Email content is HTML-escaped before insertion into outbound HTML messages.
- The `forgot-password` endpoint returns the same response whether or not the email exists,
  so attackers cannot enumerate registered emails through that endpoint.

## API summary

| Method | Path                         | Auth | Description                            |
|--------|------------------------------|------|----------------------------------------|
| GET    | `/api/health`                | -    | Health probe                           |
| GET    | `/api/auth/policy`           | -    | Returns active password policy         |
| POST   | `/api/auth/register`         | -    | Register new user                      |
| POST   | `/api/auth/login`            | -    | Sign in (counts failures, lockout)     |
| POST   | `/api/auth/logout`           | -    | Destroy session                        |
| GET    | `/api/auth/me`               | yes  | Current user                           |
| POST   | `/api/auth/change-password`  | yes  | Change password (current required)     |
| POST   | `/api/auth/forgot-password`  | -    | Send reset code by email (SHA-1)       |
| POST   | `/api/auth/reset-password`   | -    | Consume reset code + set new password  |
| GET    | `/api/catalog/packages`      | yes  | Internet packages catalog              |
| GET    | `/api/catalog/sectors`       | yes  | Marketing sectors catalog              |
| POST   | `/api/customers`             | yes  | Add Comunication_LTD customer          |
| GET    | `/api/customers`             | yes  | List most-recent customers             |

## Environment variables (backend)

See `backend/.env.example`. The most security-relevant ones:

- `PEPPER` - **required**. Long random value. Without it, password hashing fails.
- `SESSION_SECRET` - **required** in production for session cookie signing.
- `SMTP_*` - required for the forgot-password flow to deliver real email.

## Part B fixes (this variant)

| Section | Mechanism | Where |
|---------|-----------|--------|
| 1 – encoding | `escapeHtml()` on Register username echo + customer names | `frontend/src/utils/escapeHtml.js`, `Register.jsx`, `Dashboard.jsx` |
| 1, 3, 4 – SQLi | Parameterized queries | `auth.controller.js`, `customers.controller.js` |
| 4 – Stored XSS | No raw HTML rendering of `full_name` | `Dashboard.jsx` |

## Database upgrade

If you used an older schema (with `package_name` / `sector` columns on `customers`), drop the
database or run `DROP TABLE customers;` then `npm run db:init` to recreate tables and seed data.
