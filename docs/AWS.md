# AWS and Deployment Assessment

## Current assessment

No AWS configuration, infrastructure-as-code, Dockerfiles, container manifests, Nginx configuration, PM2 configuration, CI/CD workflow, environment inventory, health checks, backup policy, or monitoring setup is present.

## Proposed staged infrastructure

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
