# AWS and Deployment Assessment

## Original audit assessment

The initial empty-workspace audit found no deployment configuration. That historical assessment has been superseded by the low-cost preview implementation in `deploy/`; see `docs/DEPLOYMENT.md` for current infrastructure, TLS, backup and release controls. Full production readiness and CI/CD remain outstanding.

## Original scale-up proposal (deferred)

| Stage              | Scope                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Development        | Local app/API/worker dependencies, non-production credentials, reproducible setup documentation.                      |
| Staging            | Isolated database/cache/bucket, test domain, secrets management, monitoring, migration/release rehearsal.             |
| Initial production | Route 53, CloudFront, WAF, ALB, Nginx, app/API/worker compute, RDS MySQL, Redis, private S3, CloudWatch, backups.     |
| Scale-out          | Container orchestration, autoscaling, managed cache, isolated worker capacity, multi-AZ/DR based on load and RTO/RPO. |

## Required controls

- Separate accounts or rigorously separated environments, least-privilege IAM roles, no long-lived access keys in source.
- Private database/cache networking, security groups restricted to application paths, encrypted storage and backups.
- S3 bucket policies preventing public write; CloudFront-origin access for public delivery.
- Health (`/health`), readiness (`/ready`), and version (`/version`) endpoints that expose no secrets.
- Central log retention, error alerts, database backup restoration tests, and defined RTO/RPO.
- Infrastructure-as-code and a documented rollback strategy before production deployment.
