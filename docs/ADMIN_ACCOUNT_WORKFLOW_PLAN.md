# Admin-managed newsroom accounts

## Requested behavior

Replace public self-service password reset with a clear **Contact admin** path. Only a super administrator may create, disable, unlock, assign roles to, and set or rotate credentials for editors, reporters, fact checkers, social managers and other newsroom users.

## Current state

The application currently uses a unique email address as the login identifier and exposes a CSRF-protected password-reset request/confirmation workflow. Sessions, password changes, lockout controls, RBAC and audit logs already exist. There is no username field or admin account-management API.

## Proposed implementation

1. Add a unique, normalized `username` field to `User`, with an additive migration and a reviewed backfill for existing accounts.
2. Decide whether the primary super-admin login identifier becomes the requested username while retaining the account email as a private contact address.
3. Remove public reset-request and reset-confirm UI/API behavior. The page becomes a safe contact-admin instruction; reset tokens and delivery settings become unused after migration.
4. Add super-admin-only account management: create user, assign approved roles, set temporary password, force password change, disable/lock/unlock, revoke sessions, and view account audit history.
5. Require a temporary password on first login and require a password change before any other protected action, unless the owner explicitly chooses a different policy.
6. Keep password hashing, rate limits, lockouts, CSRF, secure cookies, session revocation and audit transactions. Never return passwords or store them in source, docs, logs or API responses.
7. Update seed/bootstrap, admin UI, local/live smoke tests, deployment runbook and account documentation. Remove obsolete SMTP/SES reset configuration only after confirming no other email workflow depends on it.

## Required acceptance

- Existing users retain access after the username backfill.
- Only super administrators can create or manage newsroom users.
- Editors cannot create accounts, change roles, or set another user’s password.
- Temporary credentials force a change and revoke prior sessions.
- Contact-admin behavior never reveals whether an email or username exists.
- Login, lockout, CSRF, audit, session-revocation and authorization tests pass locally and in the live smoke suite.
- The supplied initial password is treated as a secret and rotated after first use.

## Confirmed decisions

- Users sign in with a normalized username such as `magarammedia`; the email remains a private contact address.
- The supplied initial credential is temporary. A first-login password change is required.
- Public password reset is disabled. Users contact `admin@magarammedia.in`.

## Secure production bootstrap

After deploying the migration, an operator with SSH access must run the interactive command below from the release directory. The operator types the temporary password directly into the prompt; it is never placed in shell history, source control, logs or chat:

```bash
sudo docker run --rm -it --network host \
  --env-file /etc/magaram/runtime.env \
  -e SUPER_ADMIN_USERNAME=magarammedia \
  -w /app/apps/api magaram:5703aee614c3e1c7745edb8bad6e252fd10a5b5c \
  node --import tsx prisma/set-super-admin-password.ts
```

The command sets the password and marks the account for a mandatory change after first sign-in. The super administrator should then sign in at `/login` using `magarammedia`, change the password under Account security, and use Team accounts to create editor accounts.
