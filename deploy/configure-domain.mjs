// Run as root after the DNS A record for a production domain resolves here.
// It requests a domain certificate, preserves the IP preview endpoint, and keeps
// private runtime settings in place while changing only the public application origin.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [domain, email] = process.argv.slice(2);
const validDomain = /^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;
if (!validDomain.test(domain ?? '')) throw new Error('A valid production domain is required');
if (!/^\S+@\S+\.\S+$/.test(email ?? '')) throw new Error('A certificate contact email is required');

const www = `www.${domain}`;
const runtimePath = '/etc/magaram/runtime.env';
const nginxPath = '/etc/nginx/sites-available/default';
const ip = '65.2.18.204';

execFileSync('/opt/magaram-certbot/bin/certbot', [
  'certonly', '--webroot', '-w', '/var/www/acme',
  '--cert-name', domain, '-d', domain, '-d', www,
  '--non-interactive', '--agree-tos', '-m', email, '--keep-until-expiring',
], { stdio: 'inherit' });

const setEnv = (content, name, value) => {
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  return pattern.test(content)
    ? content.replace(pattern, `${name}=${value}`)
    : `${content.replace(/\n?$/, '\n')}${name}=${value}\n`;
};
const runtime = setEnv(readFileSync(runtimePath, 'utf8'), 'WEB_ORIGIN', `https://${domain}`);
writeFileSync(runtimePath, runtime, { mode: 0o600 });

const proxy = `location /api/v1/ {
  proxy_pass http://127.0.0.1:4000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto https;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto https;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
location = /ready { proxy_pass http://127.0.0.1:4000/ready; }
location = /health { proxy_pass http://127.0.0.1:4000/health; }
location = /version { proxy_pass http://127.0.0.1:4000/version; }`;

writeFileSync(nginxPath, `server {
  listen 80 default_server;
  server_name ${domain} ${www} ${ip};
  location /.well-known/acme-challenge/ { root /var/www/acme; }
  location / { return 301 https://${domain}$request_uri; }
}

server {
  listen 443 ssl default_server;
  server_name ${ip};
  ssl_certificate /etc/letsencrypt/live/magaram-ip/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/magaram-ip/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  client_max_body_size 10m;
  add_header X-Robots-Tag "noindex, nofollow" always;
  ${proxy}
}

server {
  listen 443 ssl;
  server_name ${domain};
  ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  client_max_body_size 10m;
  ${proxy}
}

server {
  listen 443 ssl;
  server_name ${www};
  ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  return 301 https://${domain}$request_uri;
}
`, { mode: 0o644 });

execFileSync('nginx', ['-t'], { stdio: 'inherit' });
execFileSync('systemctl', ['reload', 'nginx']);
console.log(`Configured ${domain}; private runtime values were not displayed.`);
