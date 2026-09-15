import { spawnSync } from 'node:child_process';

// Uses the system AWS credential chain. Never accepts access keys as arguments.
const profile=process.env.AWS_PROFILE || 'magaram';
const region=process.env.AWS_REGION || 'ap-south-1';
const result=spawnSync('aws',['sts','get-caller-identity','--profile',profile,'--region',region,'--output','json','--no-cli-pager'],{encoding:'utf8'});
if(result.status!==0){
  console.error(`AWS profile ${profile} is not ready. Configure it directly in your terminal; do not paste credentials into chat.`);
  process.exit(1);
}
const identity=JSON.parse(result.stdout);
console.info(JSON.stringify({profile,region,account:identity.Account,principal:identity.Arn,mode:'read-only; no resources created'},null,2));
