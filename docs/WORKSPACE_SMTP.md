# Google Workspace SMTP relay

The application supports `EMAIL_PROVIDER=workspace_smtp`. It remains disabled by default and does not change the current live configuration.

Recommended Google Admin configuration:

For mailbox SMTP, use `smtp.gmail.com` on port `587`, require TLS, and authenticate as `admin@magarammedia.in` with a Google app password. Do not use the normal Google password.

For an IP-allowlisted Workspace relay, use `smtp-relay.gmail.com` on port `587`, configure the relay in Admin Console, and omit mailbox credentials.

Server-only settings, stored in the root-owned runtime secret file, are:

```text
EMAIL_PROVIDER=workspace_smtp
WORKSPACE_SMTP_HOST=smtp.gmail.com
WORKSPACE_SMTP_PORT=587
WORKSPACE_SMTP_FROM_EMAIL=admin@magarammedia.in
WORKSPACE_SMTP_USERNAME=admin@magarammedia.in
WORKSPACE_SMTP_PASSWORD=<server-only Google app password>
PASSWORD_RESET_BASE_URL=https://magarammedia.in
```

Never commit the app password, paste it into chat, or place it in the web/worker containers. Before enabling production delivery, send a harmless password-reset test to an owner-controlled test address and inspect only delivery status, not mailbox contents.
