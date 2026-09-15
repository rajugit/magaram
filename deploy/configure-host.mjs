// Run as root on the dedicated server. Secrets are generated there, never on a client.
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { execFileSync } from 'node:child_process';
const [ip, mode='prepare'] = process.argv.slice(2);
if (isIP(ip)!==4 || !['prepare','tls'].includes(mode)) throw new Error('Valid IPv4 and mode required');
const save=(path,content,mode=0o600)=>writeFileSync(path,content,{mode});
mkdirSync('/etc/magaram',{recursive:true,mode:0o700});
if(!existsSync('/etc/magaram/runtime.env')) {
  const password=randomBytes(32).toString('hex');
  save('/etc/magaram/mysql.env',`MYSQL_DATABASE=magaram_media\nMYSQL_USER=magaram\nMYSQL_PASSWORD=${password}\nMYSQL_ROOT_PASSWORD=${randomBytes(32).toString('hex')}\n`);
  save('/etc/magaram/runtime.env',`NODE_ENV=production\nAPP_VERSION=0.2.0\nWEB_ORIGIN=https://${ip}\nAPI_PORT=4000\nTRUST_PROXY=true\nDATABASE_URL=mysql://magaram:${password}@127.0.0.1:33316/magaram_media\nREDIS_URL=redis://127.0.0.1:36379\nSESSION_SECRET=${randomBytes(48).toString('hex')}\n`);
  save('/etc/magaram/bootstrap.env',`SUPER_ADMIN_EMAIL=magaram.in@gmail.com\nSUPER_ADMIN_NAME=Magaram Administrator\nSUPER_ADMIN_PASSWORD=${randomBytes(32).toString('hex')}\n`);
}
const tls=mode==='tls';
const proxy=`location /api/v1/ { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto https; proxy_set_header X-Forwarded-For $remote_addr; }
location / { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto https; proxy_set_header X-Forwarded-For $remote_addr; }
location = /ready { proxy_pass http://127.0.0.1:4000/ready; }
location = /health { proxy_pass http://127.0.0.1:4000/health; }`;
save('/etc/nginx/sites-available/default',`server {
listen 80 default_server;
server_name ${ip};
location /.well-known/acme-challenge/ { root /var/www/acme; }
location / { ${tls?`return 301 https://${ip}$request_uri;`:'return 503;'} }
}
${tls?`server {
listen 443 ssl;
server_name ${ip};
ssl_certificate /etc/letsencrypt/live/magaram-ip/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/magaram-ip/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
client_max_body_size 10m;
add_header X-Robots-Tag "noindex, nofollow" always;
${proxy}
}`:''}
`,0o644);
execFileSync('nginx',['-t'],{stdio:'inherit'});
execFileSync('systemctl',['reload','nginx']);
if(tls){
  save('/etc/systemd/system/magaram-cert-renew.service',`[Unit]\nDescription=Renew Magaram IP TLS certificate\n[Service]\nType=oneshot\nExecStart=/opt/magaram-certbot/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"\n`,0o644);
  save('/etc/systemd/system/magaram-cert-renew.timer',`[Unit]\nDescription=Check short-lived certificate twice daily\n[Timer]\nOnCalendar=*-*-* 00,12:00:00\nRandomizedDelaySec=1800\nPersistent=true\n[Install]\nWantedBy=timers.target\n`,0o644);
  execFileSync('systemctl',['daemon-reload']);
  execFileSync('systemctl',['enable','--now','magaram-cert-renew.timer']);
}
console.log('Host configuration installed; credentials not printed.');
