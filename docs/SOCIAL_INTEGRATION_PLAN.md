# Magaram Media social integration plan

## Browser account discovery

The current Chrome profile has signed-in pages for Facebook, Instagram profile `magarammedia.in`, X, YouTube channel `@magaramin`, and WhatsApp Web. This confirms browser sessions only. No cookies, local storage, passwords, access tokens or private messages are extracted or stored. Browser automation will not be used for publishing.

## Official connection matrix

| Channel | Project connection | Required authorization | Current state |
| --- | --- | --- | --- |
| Facebook Page | Meta Graph API OAuth | Page publishing and Page read permissions, approved for the selected Page | Provider adapter inactive |
| Instagram | Instagram Graph API | Professional account linked to a Facebook Page; content publishing permission; public media URL | Provider adapter inactive |
| X | X API OAuth 2.0 PKCE | Developer project with write access and user authorization | Provider adapter inactive |
| YouTube | YouTube Data API OAuth | Channel owner authorization with the narrowest required scope | Channel `@magaramin` observed; provider adapter inactive |
| Telegram | Bot API | Bot token and channel admin rights | No logged-in Telegram tab observed |
| WhatsApp | WhatsApp Business Cloud API | Business portfolio, WABA, phone number, approved templates and explicit opt-in | WhatsApp Web is insufficient; do not connect it |

## Implementation sequence

1. Add encrypted social account records and an admin-only connection screen. Store provider, account identifier, display name, scopes, token metadata, refresh expiry and status; never return token values.
2. Add OAuth state, PKCE where supported, callback validation, redirect allowlisting and token encryption using the server-side secret mechanism.
3. Implement official adapters one at a time: Meta Page and Instagram first, then Telegram, YouTube, and X. Keep WhatsApp as a separate opt-in/template workflow.
4. Add durable publishing jobs with idempotency keys, retries, rate limits, dead-letter status, provider post IDs, status polling and audit records.
5. Require an approved website article and canonical URL before publishing. Keep every post human-approved until real provider tests pass.
6. Run provider-specific dry runs and one owner-approved test post per channel. Revoke test posts and credentials after validation where the provider permits it.

## Required owner actions

- Identify the exact Facebook Page and confirm that `magarammedia.in` is an Instagram Professional account linked to that Page.
- Create or select a Meta developer app and complete the required permissions review for production use.
- Create an X developer project with write access, a YouTube API OAuth client, and a Telegram bot/channel if those channels are wanted.
- Decide whether WhatsApp Business Cloud API is required; WhatsApp Web login cannot be reused for server publishing.
- Authorize each connection through the project’s HTTPS callback. Enter no tokens into chat, Git, browser automation or logs.

## Cost and safety

No paid social API or provider has been enabled. The project must fail closed when a provider is unavailable, must not auto-publish unverified news, and must preserve sponsorship disclosures and consent records.
