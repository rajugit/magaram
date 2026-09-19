# Low-cost AWS preview deployment

This deploys the current foundation and partial CMS, not a production-complete platform.

Preview: <https://magarammedia.in/preview/2>. Live login: <https://magarammedia.in/login>. First verified deployment: 2026-09-16 (Asia/Kolkata).

## Infrastructure

- Dedicated AWS profile `magaram`, Mumbai `ap-south-1`.
- Lightsail `magaram-preview`, Ubuntu 24.04, public-IPv4 bundle `medium_3_1`: $24/month before taxes.
- Attached static IP `magaram-preview-ip`, mapped to `magarammedia.in` through the externally managed GoDaddy DNS zone. `www` redirects to the main domain.
- Native Nginx terminates TLS for `magarammedia.in` using a trusted Let's Encrypt certificate. Renewal runs twice daily and reloads Nginx. Port 80 only serves ACME challenges and HTTPS redirects.
- MySQL, Redis, API and web ports are loopback-only. Only HTTPS/HTTP are public; SSH is restricted to the deployment operator's address.
- One image is built from the committed release, with independent web/API containers and resource limits. No placeholder queue consumer runs.
- Secrets are generated on-server under root-only `/etc/magaram/`, never in Git, image layers, user-data or deployment output. The admin bootstrap password is isolated in `/etc/magaram/bootstrap.env` and must only be viewed in the owner's own secure terminal.
- Amazon runtime credentials, when enabled, live only in root-owned `/etc/magaram/aws.env` and are mounted into the API container alone. The key is restricted to the APAC Nova Micro inference profile and SES sends from `magaram.in@gmail.com`; it is not stored in Git, the image or the web/worker containers.

## Releasing

Commit and push first. Export that commit with `git archive`, transfer it through `node deploy/remote.mjs upload`, and extract into `/opt/magaram/releases/<full-commit-sha>`.

Run `deploy/configure-host.mjs <static-ip> prepare` once as root, issue the IP certificate with Certbot 5.4+ (`--preferred-profile shortlived --webroot -w /var/www/acme --ip-address <static-ip> --cert-name magaram-ip`), then run configure-host with mode `tls`.

Run `sudo bash deploy/release.sh <full-commit-sha>` from the release directory. This builds the image, applies migrations, seeds roles and bootstraps the first admin once, then checks API readiness and the preview route. The `current` symlink advances only after those checks succeed. Do not deploy concurrent releases.

## Recovery and cost controls

- Daily consistent logical MySQL dumps retain seven copies. Automatic Lightsail snapshots provide off-server host backups with separately billed storage; these are not a tested disaster-recovery guarantee.
- A failed app rollout can be rolled back using the previous image tag and compose configuration. Database migrations need separate compatibility review; never blindly roll back the database or remove its volume.
- Keep the previous release/image until the next release is verified. Review disk usage and snapshot storage regularly.
- Budget target approximately $35/month before taxes, not a hard cap. No load balancer, RDS, managed Redis or paid CDN is provisioned by this deployment. The domain remains externally managed, without Route 53 charges.
- Budget `magaram-lightsail-mumbai` monitors Mumbai Lightsail costs against $35/month, with 80% and 100% email alerts to `magaram.in@gmail.com`. It does not monitor unrelated AWS services or prevent spending.
- Single-server failure can cause downtime. Provider integrations, full CMS acceptance, backup restoration rehearsal and load testing remain outstanding.

## Verification

Check `/health`, `/ready`, `/preview/2` and `/login` through `https://magarammedia.in`. Confirm unauthenticated API access is denied, secure-cookie login works, the certificate renewal dry run passes, and backup files exist. Never copy a credential or session cookie into the deployment report.

The initial cloud smoke test passed readiness, preview rendering, unauthorized-access rejection, persisted administrator login, secure/HttpOnly cookies, authorized article-list access and logout. The first logical backup was generated and the TLS renewal dry run passed. `deploy/smoke.mjs` repeats the secret-safe server checks. Full restore rehearsal and editorial end-to-end acceptance remain outstanding.

The dependency scan identified GHSA-ggr8-5vv4-36mx in Prisma's transitive `deepmerge-ts` dependency. The workspace pins the patched 8.0.0 version; Prisma generation, all 11 current tests, type checks and the production dependency audit pass with this override.

References: [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/) and [IP certificate support](https://letsencrypt.org/2026/03/11/shorter-certs-certbot).

## Owner-only administrator access

The Amazon-integration release adds an official Bedrock Converse adapter, a secure Amazon SES password-reset delivery adapter and a reset page. It starts disabled until the root-only runtime configuration explicitly enables it. The initial Bedrock caps are 10 requests per user and 50 platform-wide per UTC day, with 12,000 input characters, 1,200 output tokens and a 30-second timeout. Enable SES only after the sender verification completes; SES sandbox restrictions still apply to recipients.

Administrator email: `magaram.in@gmail.com`. To retrieve the generated password, run the following yourself in your own Terminal from the repository, with the `magaram` AWS profile configured. Do not ask an assistant to run this password-display command or paste its output into chat:

```sh
node deploy/remote.mjs run "sudo sed -n 's/^SUPER_ADMIN_PASSWORD=//p' /etc/magaram/bootstrap.env"
```

SSH is restricted to the original deployment operator's public IP. If your internet address changes, update only the server's SSH source rule before using the helper; do not open SSH globally. The helper pins server host keys from AWS and removes its temporary SSH key files when it exits normally.
