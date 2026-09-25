// Refresh only the dedicated preview's single-IPv4 SSH rule; preserve other ports.
import { execFileSync } from 'node:child_process';
import { isIP } from 'node:net';
const options = ['--profile', 'magaram', '--region', 'ap-south-1', '--output', 'json'];
function aws(operation, args = []) {
  return JSON.parse(
    execFileSync(
      'aws',
      ['lightsail', operation, '--instance-name', 'magaram-preview', ...args, ...options],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ),
  );
}
const response = await fetch('https://checkip.amazonaws.com', {
  signal: AbortSignal.timeout(10000),
});
if (!response.ok) throw new Error('Current connection address unavailable; firewall unchanged.');
const ip = (await response.text()).trim();
if (isIP(ip) !== 4) throw new Error('Expected an IPv4 operator address; firewall unchanged.');
const { portStates } = aws('get-instance-port-states');
const ssh = portStates.filter(
  (rule) => rule.fromPort <= 22 && rule.toPort >= 22 && ['tcp', 'all'].includes(rule.protocol),
);
if (
  ssh.some(
    (rule) =>
      rule.fromPort !== 22 ||
      rule.toPort !== 22 ||
      rule.protocol !== 'tcp' ||
      rule.ipv6Cidrs?.length ||
      rule.cidrListAliases?.length ||
      rule.cidrs?.some((cidr) => !cidr.endsWith('/32')),
  )
)
  throw new Error('Unexpected SSH policy; firewall unchanged.');
if (ssh.length === 1 && ssh[0].cidrs?.length === 1 && ssh[0].cidrs[0] === `${ip}/32`) {
  console.info('SSH already restricted to this connection.');
} else {
  const rules = portStates
    .filter((rule) => rule.state === 'open' && !ssh.includes(rule))
    .map(({ fromPort, toPort, protocol, cidrs, ipv6Cidrs, cidrListAliases }) => ({
      fromPort,
      toPort,
      protocol,
      cidrs,
      ipv6Cidrs,
      cidrListAliases,
    }));
  rules.push({ fromPort: 22, toPort: 22, protocol: 'tcp', cidrs: [`${ip}/32`] });
  const result = aws('put-instance-public-ports', ['--port-infos', JSON.stringify(rules)]);
  console.info(
    `SSH source refreshed to the current single IP: ${result.operation?.status || 'requested'}. Other ports preserved.`,
  );
}
