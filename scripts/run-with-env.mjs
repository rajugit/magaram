import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
const child = spawn(process.execPath, process.argv.slice(2), {env:process.env,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code||0));
