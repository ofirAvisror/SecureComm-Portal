# Comunication_LTD – Cyber Final Project
## Submitted by

- Ziv Amsili - ID: 322834466
- Hen Mandelbaum - ID: 209533587
- Orel Cohen - ID: 214266819
- Ofir Avisror - ID: 324974088
- Roni Zadik - ID: 322380502

Web system for **Comunication_LTD** (customers, internet packages, marketing sectors), with **two variants** as required for Part B.

## Project layout

| Folder | Role |
|--------|------|
| **`secure-version/`** | **Secure** variant – Part A + Part B fixes (parameters, HTML encoding) |
| **`vulnerable-version/`** | **Vulnerable** variant – Part A + intentional SQLi (sections 1, 3, 4) and Stored XSS (section 4) |

**Run:** open the chosen folder, configure `backend/.env`, run `npm run db:init` in `backend`, then `npm run dev` in both `backend` and `frontend`.

Full setup details: `secure-version/README.md` (same structure in `vulnerable-version`).

## Part A

Both variants include: Register, Login, change password, forgot password (SHA-1), system screen (new customer + display name), password policy from `password-policy.json`, HMAC + salt.

## Part B

| Requirement | `vulnerable-version` | `secure-version` |
|-------------|----------------------|------------|
| Stored XSS – section 4 (Dashboard) | `dangerouslySetInnerHTML` on customer name | `escapeHtml` + safe text |
| SQLi – sections 1, 3, 4 | String concatenation in SQL | Prepared statements (`$1`, `$2`, …) |
| Character encoding – section 1 (Register) | Reflected XSS on entered username | `frontend/src/utils/escapeHtml.js` |
| Parameters – sections 1, 3, 4 | — | `auth` / `customers` controllers |

**Attack demos** – vulnerable variant only. **Fix demos** – secure variant (same payloads should not succeed).

Payload guide (no screenshots): **[PART_B_GUIDE.md](./PART_B_GUIDE.md)**.

## Database

PostgreSQL. Tables: `users`, `customers`, **`packages`**, **`sectors`**, `password_history`, `password_resets`, `session`.

After a schema change, use a fresh database or `DROP` old tables, then:

```bash
cd secure-version/backend   # or vulnerable-version/backend
npm run db:init
```
