# Local and live preview testing

## Local system

Run `pnpm setup:local` only if `.env` is absent; it preserves existing configuration. Start the local Docker runtime, then `pnpm infra:up`, `pnpm db:deploy`, `pnpm --filter @magaram/api db:seed` and `pnpm dev`. The development server is at <http://localhost:3000>, API at <http://127.0.0.1:4000>, with the worker in the same command. The first administrator must already exist or be bootstrapped once; never reset an existing account as part of a test.

Run:

```sh
node scripts/system-smoke.mjs http://localhost:3000 http://127.0.0.1:4000 --local-auth
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm build
```

The smoke script reads local admin credentials from `.env` only with `--local-auth` and only for loopback destinations. It does not print credentials, cookies or private record contents. It checks public routes, database readiness, private-route denial, CSRF rejection, persisted sign-in and logout revocation. It creates no businesses, enquiries or articles. Database workflow tests create and clean up their own guarded disposable schema.

For manual testing use `/login`, `/admin/businesses`, `/local` and `/preview/7`. Sample mode cannot save. Sign in with the existing local account to test real workflows. Use clearly named test records only in the local system; never post test stories to the public live site.

## Live site

The live domain currently hosts the AWS preview; “live” does not mean all production-readiness gates have passed. Run public read-only checks:

```sh
node scripts/system-smoke.mjs https://magarammedia.in
```

For authorized authenticated acceptance, run `deploy/smoke.mjs <expected-full-commit-sha>` as root on the existing server, or inside its release image with the existing root-only environment directory mounted read-only. That script reads credentials on the server, tests secure cookies, permissions, provider state and logout without printing credentials or data. Do not copy the server bootstrap secret to the local machine or into chat.

A release passes only if the installed `/version` matches the intended commit and all required checks pass. The current live version may legitimately lack new routes before deployment; report those as missing, not as passing. Do not run destructive database integration or load tests against the live site.

## Browser acceptance

Check Tamil text, visible error/empty states, keyboard focus, navigation and form labels at desktop and a narrow mobile viewport. For staff workflows verify registration → verification → offer draft/activation → enquiry follow-up, then edit/suspend and confirm public hiding. Use the labelled preview for layout checks; record separately when a signed-in browser workflow has actually been tested.
