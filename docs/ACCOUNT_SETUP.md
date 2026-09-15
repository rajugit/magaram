# Local account setup

## Project choices

- Publication contact: `magaram.in@gmail.com`.
- Git author: `rajugit` / `raju.mca.r@gmail.com`.
- Hosting: AWS, Mumbai (`ap-south-1`).
- Dedicated AWS profile: `magaram`. Existing unrelated profiles must remain unchanged.
- GitHub repository: `https://github.com/rajugit/magaram.git` (public), connected as `origin` on local branch `main`.

## AWS credentials

The credentials shared in conversation must be revoked and replaced. They are deliberately absent from application files, scripts, logs, and this document. Conversation content cannot be erased by a repository change.

Configure replacement credentials directly in your own Terminal, not through a chat message:

```sh
aws configure --profile magaram
```

Supply the replacement access key ID, secret access key, default region `ap-south-1`, and output format `json`. AWS CLI stores standard IAM credentials locally in `~/.aws/credentials`; this is a plaintext user file, not an encrypted vault. Restrict it to your user. It must never be copied into the repository, container, CI variables, or a task message. A temporary STS credential also needs its session token.

Where AWS IAM Identity Center is available, prefer:

```sh
aws configure sso --profile magaram
aws sso login --profile magaram
```

SSO needs a start/issuer URL, SSO region, account, permission set/role, and the application region. Login happens through your browser; no long-lived secret needs to be entered into chat. CLI tokens are still cached locally by AWS CLI.

Validate the configured identity without displaying keys:

```sh
node scripts/aws-preflight.mjs
```

## Deployment access

The low-cost Lightsail preview has no AWS credentials inside its application containers. Fresh database/session secrets live in root-only server configuration. Future AWS-integrated compute should use an instance/task role; CI should use GitHub OIDC with a deployment role scoped to the chosen repository/branch. Do not embed IAM access keys in application `.env` files or GitHub secrets. A later managed-service deployment should inject provider secrets through Secrets Manager or SSM.

The dedicated AWS login is verified. The user authorized the low-cost preview deployment; Lightsail `magaram-preview` and its attached static IP have been created in Mumbai. The target budget is approximately $35/month before tax, not a hard spending cap. Domain mapping is deferred. See `docs/DEPLOYMENT.md` for release and access details.

## References

- [AWS access-key security](https://docs.aws.amazon.com/IAM/latest/UserGuide/securing_access-keys.html)
- [AWS CLI SSO configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- [AWS credentials storage](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
