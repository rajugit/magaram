// Creates one least-privilege runtime key, writes it to an owner-only temporary file,
// and never writes the key to Git, stdout or a local AWS profile.
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const profile = process.env.MAGARAM_AWS_PROFILE || 'magaram';
const region = process.env.MAGARAM_AWS_REGION || 'ap-south-1';
const userName = 'magaram-runtime';
const policyName = 'MagaramAmazonRuntime';
const aws = (args) =>
  execFileSync('aws', [...args, '--profile', profile, '--region', region, '--output', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
const account = JSON.parse(aws(['sts', 'get-caller-identity'])).Account;
const profileArn = `arn:aws:bedrock:${region}:${account}:inference-profile/apac.amazon.nova-micro-v1:0`;
const modelArns = [
  'ap-southeast-2',
  'ap-northeast-1',
  region,
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-northeast-3',
].map((modelRegion) =>
  `arn:aws:bedrock:${modelRegion}::foundation-model/amazon.nova-micro-v1:0`,
);
const policy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'InvokeOnlyApprovedNovaMicroProfile',
      Effect: 'Allow',
      Action: ['bedrock:InvokeModel'],
      Resource: [profileArn, ...modelArns],
    },
    {
      Sid: 'SendOnlyFromApprovedMagaramAddress',
      Effect: 'Allow',
      Action: ['ses:SendEmail'],
      Resource: `arn:aws:ses:${region}:${account}:identity/magaram.in@gmail.com`,
    },
  ],
};
try {
  aws(['iam', 'get-user', '--user-name', userName]);
} catch (error) {
  const details = error instanceof Error && 'stderr' in error ? String(error.stderr || '') : '';
  if (!details.includes('NoSuchEntity')) throw error;
  aws([
    'iam',
    'create-user',
    '--user-name',
    userName,
    '--tags',
    'Key=Application,Value=MagaramMedia',
    'Key=Purpose,Value=RuntimeAmazonIntegrations',
  ]);
}
aws([
  'iam',
  'put-user-policy',
  '--user-name',
  userName,
  '--policy-name',
  policyName,
  '--policy-document',
  JSON.stringify(policy),
]);
const existing = JSON.parse(aws(['iam', 'list-access-keys', '--user-name', userName]));
if (existing.AccessKeyMetadata?.length)
  throw new Error('magaram-runtime already has an access key; rotate it explicitly instead of creating another.');
const created = JSON.parse(aws(['iam', 'create-access-key', '--user-name', userName])).AccessKey;
if (!created?.AccessKeyId || !created?.SecretAccessKey) throw new Error('AWS did not create a runtime key.');
const directory = mkdtempSync(join(tmpdir(), 'magaram-aws-runtime-'));
chmodSync(directory, 0o700);
const credentialsFile = join(directory, 'aws.env');
writeFileSync(
  credentialsFile,
  `AWS_ACCESS_KEY_ID=${created.AccessKeyId}\nAWS_SECRET_ACCESS_KEY=${created.SecretAccessKey}\nAWS_REGION=${region}\n`,
  { mode: 0o600 },
);
console.info(`Created the least-privilege runtime identity. Owner-only temporary credential file: ${credentialsFile}`);
