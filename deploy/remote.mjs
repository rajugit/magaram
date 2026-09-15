// Temporary SSH credentials stay in a private OS temp directory and are removed on exit.
// Host keys are pinned to the authenticated Lightsail API response, never blindly accepted.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const [action,...args]=process.argv.slice(2);
if(!['run','upload'].includes(action)) throw new Error('Use run <command> or upload <file> <remote path>');
const raw=execFileSync('aws',['lightsail','get-instance-access-details','--instance-name','magaram-preview','--profile','magaram','--region','ap-south-1','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const access=JSON.parse(raw).accessDetails;
if(!access.hostKeys?.length) throw new Error('AWS host identity not available; retry after initialization');
const dir=mkdtempSync(join(tmpdir(),'magaram-ssh-'));
const key=join(dir,'identity');const cert=join(dir,'identity-cert.pub');const hosts=join(dir,'known_hosts');
try {
  writeFileSync(key,access.privateKey,{mode:0o600});
  writeFileSync(cert,access.certKey,{mode:0o600});
  writeFileSync(hosts,access.hostKeys.map(k=>`${access.ipAddress} ${k.algorithm} ${k.publicKey}`).join('\n')+'\n',{mode:0o600});
  const options=['-i',key,'-o',`CertificateFile=${cert}`,'-o',`UserKnownHostsFile=${hosts}`,'-o','StrictHostKeyChecking=yes','-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','ConnectTimeout=15'];
  const target=`${access.username}@${access.ipAddress}`;
  const result=action==='run'?spawnSync('ssh',[...options,target,args.join(' ')],{stdio:'inherit'}):spawnSync('scp',[...options,args[0],`${target}:${args[1]}`],{stdio:'inherit'});
  process.exitCode=result.status??1;
} finally {
  for(const path of [key,cert,hosts]) {try{unlinkSync(path);}catch{}}
  rmdirSync(dir);
}
