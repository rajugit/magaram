# Google Workspace SMTP relay

The application now supports `EMAIL_PROVIDER=workspace_smtp`. It remains disabled by default and does not change the current live configuration.

Recommended Google Admin configuration:

1. Open **Admin console → Apps → Google Workspace → Gmail → Routing → SMTP relay service**.
2. Create a relay restricted to the Lightsail static IP `65.2.18.204`.
3. Require TLS. Use IP authentication and do not store the `admin@magarammedia.in` mailbox password in the application.
4. Allow only the `admin@magarammedia.in` sender address (or the smallest approved sender set).
5. Allow up to 24 hours for Workspace routing changes to settle.

Server-only settings, stored in the root-owned runtime secret file, are:

```text
EMAIL_PROVIDER=workspace_smtp
WORKSPACE_SMTP_HOST=smtp-relay.gmail.com
WORKSPACE_SMTP_PORT=587
WORKSPACE_SMTP_FROM_EMAIL=admin@magarammedia.in
PASSWORD_RESET_BASE_URL=https://magarammedia.in
```

The optional `WORKSPACE_SMTP_USERNAME` and `WORKSPACE_SMTP_PASSWORD` fields are intentionally omitted for IP-authenticated relay. Never commit them, paste them into chat, or place them in the web/worker containers. Before enabling production delivery, send a harmless password-reset test to an owner-controlled test address and inspect only delivery status, not mailbox contents.
