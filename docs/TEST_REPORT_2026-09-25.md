# Local and live acceptance — 2026-09-25

Application release: `ab04f6ea714396a0ef007aa33ee8ad02f6874e3e`. This is the deployed AWS preview, not full production sign-off.

| Check                       | Result        | Evidence / scope                                                                                                                            |
| --------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| API/unit suite              | Pass          | 45 tests in the release candidate                                                                                                           |
| Isolated MySQL/Redis suite  | Pass          | 12 tests; all six migrations; disposable schema removed by its harness                                                                      |
| Typecheck, lint and builds  | Pass          | API, web and worker release candidate                                                                                                       |
| Production dependency audit | Pass          | No known vulnerabilities reported by `pnpm audit --prod --audit-level high`                                                                 |
| Local system smoke          | Pass          | 29 checks: health/readiness, public routes, private-route denial, CSRF rejection, persisted sign-in, local management and logout revocation |
| Release                     | Pass          | Exact pushed archive; backup completed; three additive migrations applied; roles seeded; web/API/worker started; release health passed      |
| Live authenticated smoke    | Pass          | `deploy/smoke.mjs` verifies TLS, secure/HttpOnly cookies, login, permission gates, public feeds/routes, provider state and logout           |
| Exact live version          | Pass          | Public `/version` matches `ab04f6ea714396a0ef007aa33ee8ad02f6874e3e`                                                                        |
| Requested testing login     | Pass          | EDITOR + SALES_MANAGER; newsroom/local management allowed; administrator settings denied; session revoked after logout                      |
| Project skills              | Pass          | Both official skill validations passed; installed in the user's Codex skills directory; versioned sources under `skills/`                   |
| Browser layout              | Targeted pass | Phase 7 sample directory/forms and staff layout inspected on desktop and 390px mobile; signed-in browser acceptance is still separate       |

## Issues fixed during acceptance

- CI omitted explicit Prisma generation and excluded HTTP authentication tests. It now generates the client and runs the full API/unit suite. The hosted CI run itself is not claimed verified by these local results.
- Public `/version` initially returned 404 because Nginx only forwarded health/readiness. Both TLS blocks now include the version route; configuration validation and reload succeeded. Configuration generators preserve this route for future host setup.
- The operator's public IP changed during the resumed session. The SSH rule was refreshed to a single current IPv4 address while preserving other ports. `deploy/refresh-ssh.mjs` supports repeating this narrowly scoped operation without opening SSH globally.

## Test links

- Local site: <http://localhost:3000>
- Live directory: <https://magarammedia.in/local>
- Live labelled preview: <https://magarammedia.in/preview/7>
- Live staff sign-in: <https://magarammedia.in/login>

Credentials are not part of this report, Git, or public previews. The owner received the requested testing login through a private ignored local file.

Broader production acceptance, signed-in browser workflow, accessibility/load testing, restore/rollback rehearsal and provider delivery verification remain open. Passing configuration-state checks does not prove real AI/email delivery. Later product phases remain governed by `PHASE_ACCEPTANCE.md`.
