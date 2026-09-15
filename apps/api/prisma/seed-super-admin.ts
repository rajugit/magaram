import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const environmentSchema = z.object({
  SUPER_ADMIN_EMAIL: z.string().trim().email().max(320),
  SUPER_ADMIN_PASSWORD: z.string().min(16).max(256),
  SUPER_ADMIN_NAME: z.string().trim().min(2).max(160).default('Magaram Super Admin'),
});

const prisma = new PrismaClient();

async function bootstrapSuperAdmin() {
  const environment = environmentSchema.parse(process.env);
  const email = environment.SUPER_ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(
      'A user with this email already exists; use an audited administrator workflow instead.',
    );
  }

  const role = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
  if (!role) {
    throw new Error('Roles are not seeded. Run db:seed before creating the first administrator.');
  }

  const passwordHash = await bcrypt.hash(environment.SUPER_ADMIN_PASSWORD, 12);
  await prisma.user.create({
    data: {
      email,
      displayName: environment.SUPER_ADMIN_NAME,
      passwordHash,
      roles: { create: { roleId: role.id } },
    },
  });
}

bootstrapSuperAdmin()
  .then(() =>
    console.info(JSON.stringify({ level: 'info', message: 'Super administrator created' })),
  )
  .catch((error: unknown) => {
    void error;
    console.error(
      JSON.stringify({ level: 'error', message: 'Super administrator bootstrap failed' }),
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
