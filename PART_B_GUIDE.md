# Part B – Demonstration Guide (no screenshots)

Run **`vulnerable-version`** only to demonstrate attacks, and **`secure-version`** to demonstrate blocking and fixes.

## Section 4 – Stored XSS (system screen / Dashboard)

**Vulnerable variant:** add a customer with a full name such as:

```text
<img src=x onerror="alert('Stored XSS')">
```

After saving, the “New customer added” alert or the customer table may execute the script.

**Secure variant:** the same value is stored but displayed as plain text (not HTML) via `escapeHtml`.

---

## Section 1 – Register (SQLi)

**Vulnerable variant** – Username field (username validation intentionally disabled):

```text
' OR '1'='1
```

Or register with a valid username, then test duplicate checks with a crafted string.

**Secure variant:** same input – query uses `$1`; logic should not be bypassed.

### Section 1 – Reflected XSS (Register)

**Vulnerable variant** – Username:

```text
<script>alert('Reflected XSS')</script>
```

Use an invalid password or trigger a server error – “Attempted username” is shown without encoding.

**Secure variant:** same username – shown encoded (`escapeHtml`).

---

## Section 3 – Login (SQLi)

**Vulnerable variant** – Username:

```text
' OR '1'='1' --
```

**Secure variant:** same input – “User does not exist” / wrong password, no fake login.

---

## Section 4 – Add customer (SQLi)

**Vulnerable variant** – Full name field (or other string fields):

```text
'); DELETE FROM users WHERE ('1'='1
```

**Secure variant:** same input – DB error or rejection, no separate command execution.

---

## Fixes in the secure variant (for your report)

| Section | File | Mechanism |
|---------|------|-----------|
| 1 – encoding | `frontend/src/utils/escapeHtml.js`, `Register.jsx` | HTML entity encoding |
| 1, 3, 4 – SQLi | `backend/src/controllers/auth.controller.js`, `customers.controller.js` | `pool.query(text, [params])` |
| 4 – XSS | `frontend/src/pages/Dashboard.jsx` | `escapeHtml` on `full_name` |
