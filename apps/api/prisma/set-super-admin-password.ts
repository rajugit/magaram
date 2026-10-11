import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const rl = createInterface({ input, output });

async function run() {
  const username = (process.env.SUPER_ADMIN_USERNAME || 'magarammedia').trim().toLowerCase();
  const password = await rl.question(`Temporary password for ${username}: `);
  if (password.length < 16 || password.length > 72) throw new Error('Password must be 16-72 characters.');
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error('Super administrator username was not found.');
  const role = await prisma.userRole.findFirst({ where: { userId: user.id, role: { code: 'SUPER_ADMIN' } } });
  if (!role) throw new Error('The account is not a SUPER_ADMIN.');
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 12), passwordChangedAt: new Date(), mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null },
  });
  console.info('Super administrator password updated. Change it immediately after first sign-in.');
}

run().catch(() => { console.error('Super administrator password update failed.'); process.exitCode = 1; }).finally(async () => { rl.close(); await prisma.$disconnect(); });
