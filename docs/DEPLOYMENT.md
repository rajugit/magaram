# Low-cost AWS preview deployment

This deploys the current foundation and partial CMS, not a production-complete platform.

## Infrastructure

- Dedicated AWS profile `magaram`, Mumbai `ap-south-1`.
- Lightsail `magaram-preview`, Ubuntu 24.04, public-IPv4 bundle `medium_3_1`: $24/month before taxes.
- Attached static IP `magaram-preview-ip`; no custom DNS changes.
- Native Nginx terminates TLS on the IP address using a short-lived Let's Encrypt certificate. Renewal runs twice daily and reloads Nginx. Port 80 only serves ACME challenges and HTTPS redirects.
- MySQL, Redis, API and web ports are loopback-only. Only HTTPS/HTTP are public; SSH is restricted to the deployment operator's address.
- One image is built from the committed release, with independent web/API containers and resource limits. No placeholder queue consumer runs.
- Secrets are generated on-server under root-only `/etc/magaram/`, never in Git, image layers, user-data or deployment output. The admin bootstrap password is isolated in `/etc/magaram/bootstrap.env` and must only be viewed in the owner's own secure terminal.

## Releasing

Commit and push first. Export that commit with `git archive`, transfer it through `node deploy/remote.mjs upload`, and extract into `/opt/magaram/releases/<full-commit-sha>`.

Run `deploy/configure-host.mjs <static-ip> prepare` once as root, issue the IP certificate with Certbot 5.4+ (`--preferred-profile shortlived --webroot -w /var/www/acme --ip-address <static-ip> --cert-name magaram-ip`), then run configure-host with mode `tls`.

Run `sudo bash deploy/release.sh <full-commit-sha>` from the release directory. This builds the image, applies migrations, seeds roles and bootstraps the first admin once, then checks API readiness and the preview route. The `current` symlink advances only after those checks succeed. Do not deploy concurrent releases.

## Recovery and cost controls

- Daily consistent logical MySQL dumps retain seven copies. Automatic Lightsail snapshots provide off-server host backups with separately billed storage; these are not a tested disaster-recovery guarantee.
- A failed app rollout can be rolled back using the previous image tag and compose configuration. Database migrations need separate compatibility review; never blindly roll back the database or remove its volume.
- Keep the previous release/image until the next release is verified. Review disk usage and snapshot storage regularly.
- Budget target approximately $35/month before taxes, not a hard cap. No load balancer, RDS, managed Redis, paid CDN or custom domain is provisioned by this deployment.
- Single-server failure can cause downtime. Provider integrations, full CMS acceptance, backup restoration rehearsal and load testing remain outstanding.

## Verification

Check `/health`, `/ready`, `/preview/2` and `/login` over trusted HTTPS. Confirm unauthenticated API access is denied, secure-cookie login works, the certificate renewal dry run passes, and backup files exist. Never copy a credential or session cookie into the deployment report.

References: [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/) and [IP certificate support](https://letsencrypt.org/2026/03/11/shorter-certs-certbot).
