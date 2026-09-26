# Magaram account connections and secure setup

Checked 2026-09-25. This is a limited account/configuration review, not a complete security audit. No passwords, session cookies, OAuth tokens, recovery codes or secret values are included here. Browser sign-in is not an application API connection.

## Verified and changed

| Service | Observed state | Action/result |
| --- | --- | --- |
| YouTube | Owner controls available for `@magaramin`; website link absent | Saved `https://magarammedia.in` as the channel website, titled `மகரம் மீடியா \| Website`; Studio returned to saved state with Publish disabled |
| Instagram | `@magaram.in` has professional/business settings; website field points to the old domain | Preserved the existing Tamil bio and added `https://magarammedia.in`; reloaded and verified persistence |
| Instagram website field | Desktop editor explicitly says links can only be edited on mobile | Mobile owner action remains; no workaround or private API used |
| Email | SES sender verification was previously FAILED; account remains sandboxed | Owner approved resending verification; AWS now reports SUCCESS; AWS production-access control is disabled until `magarammedia.in` is verified as a sending domain |
| AWS root security | MFA enabled; zero root access keys and signing certificates | No change necessary |
| Firewall | Public TCP 80/443; SSH restricted to one IPv4 /32; no public IPv6 rules | No widening of access |
| Backups | Seven listed daily snapshots report Success; backup timer active | Restore rehearsal still pending |
| Secret files | `/etc/magaram` root-owned mode 700; runtime/AWS/bootstrap files root-owned mode 600 | Checked metadata only; no secret values displayed |
| Running services | Web/API/worker/Redis running; MySQL healthy; Nginx active | No restart or configuration change necessary |

Gmail was open to an account-recovery email. Its contents and recovery link were not inspected. No inbox export, contact import or message reading was needed. Other account MFA settings and third-party app permissions were not fully audited.

## Owner steps remaining

1. In the Instagram mobile app, open Profile → Edit profile → Links. Change the existing website URL to `https://magarammedia.in` and save. The desktop bio now contains the current address, but that does not replace the old clickable link.
2. Create an SES identity for `magarammedia.in`, copy the generated DKIM records, and add them at the authoritative DNS provider. This requires access to the domain DNS account; do not invent records or paste credentials into chat.
3. After DNS verification succeeds, request SES production access for transactional password-reset email. Describe the low-volume, consent-triggered use case and explain bounce/complaint handling. Keep `EMAIL_PROVIDER=inactive` until AWS approves it and delivery tests pass.

## Connect publishing securely

The application currently uses inactive social adapters. Do not extract browser cookies to enable automation.

1. Implement the provider OAuth callback, one-time state validation, account binding, token encryption/storage, refresh/revocation and audit behavior before registering the live redirect URL.
2. Configure a dedicated provider application and request only the permissions required by the actual publishing workflow. Do not request Gmail inbox access for SES email delivery.
3. Keep application secrets and encryption keys outside Git and the web bundle. Use the protected server secret path or an approved managed secret store; never paste secrets into assistant conversations.
4. The owner completes provider consent directly. New access grants need a review of the exact scopes and destination. Enter credentials or verification challenges personally; do not expose them to automation output.
5. Test private/draft uploads where supported, independent editorial approval, retries, deduplication and revocation before enabling public delivery. Do not publish an actual news item as a connectivity test.
6. Display honest connection status in Magaram. A successful browser login or a public profile link must never be represented as a working API integration.

Official references: [YouTube server-side OAuth](https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps), [SES production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).
