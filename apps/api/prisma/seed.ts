import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  { code: '*', description: 'Full platform access; assign only to SUPER_ADMIN.' },
  { code: 'settings:read', description: 'View non-secret platform configuration.' },
  { code: 'audit:read', description: 'View governance audit records.' },
  { code: 'articles:draft', description: 'Create and edit article drafts.' },
  { code: 'articles:review', description: 'Review editorial content.' },
  { code: 'articles:fact-check', description: 'Record fact-check assessments.' },
  { code: 'social:manage', description: 'Manage social distribution configuration.' },
  { code: 'sales:manage', description: 'Manage sales and advertiser records.' },
  { code: 'finance:read', description: 'View financial records.' },
  { code: 'analytics:read', description: 'View privacy-safe analytics.' },
] as const;

const roles = [
  { code: 'SUPER_ADMIN', name: 'Super administrator', permissions: ['*'] },
  { code: 'ADMIN', name: 'Administrator', permissions: ['settings:read', 'audit:read'] },
  { code: 'EDITOR', name: 'Editor', permissions: ['articles:draft', 'articles:review'] },
  { code: 'REPORTER', name: 'Reporter', permissions: ['articles:draft'] },
  { code: 'FACT_CHECKER', name: 'Fact checker', permissions: ['articles:fact-check'] },
  { code: 'SOCIAL_MANAGER', name: 'Social manager', permissions: ['social:manage'] },
  { code: 'SALES_MANAGER', name: 'Sales manager', permissions: ['sales:manage'] },
  { code: 'ADVERTISER', name: 'Advertiser', permissions: [] },
  { code: 'BUSINESS_OWNER', name: 'Business owner', permissions: [] },
  { code: 'RECRUITER', name: 'Recruiter', permissions: [] },
  { code: 'FINANCE', name: 'Finance analyst', permissions: ['finance:read'] },
  { code: 'ANALYST', name: 'Analyst', permissions: ['analytics:read'] },
  { code: 'CONTRIBUTOR', name: 'Contributor', permissions: [] },
] as const;

async function seed() {
  for (const [kind, slug, name] of [
    ['category', 'local', 'உள்ளூர்'],
    ['category', 'tamil-nadu', 'தமிழ்நாடு'],
    ['category', 'business', 'வணிகம்'],
    ['category', 'education', 'கல்வி'],
    ['category', 'life', 'வாழ்க்கை'],
    ['category', 'arts', 'கலை'],
    ['category', 'politics', 'அரசியல்'],
    ['location', 'chennai', 'சென்னை'],
    ['location', 'coimbatore', 'கோவை'],
    ['location', 'madurai', 'மதுரை'],
    ['location', 'thanjavur', 'தஞ்சாவூர்'],
  ])
    await prisma.taxonomy.upsert({
      where: { kind_slug: { kind, slug } },
      update: {},
      create: { kind, slug, name },
    });
  const permissionRecords = new Map<string, { id: string }>();
  for (const permission of permissions) {
    const record = await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description },
      create: permission,
    });
    permissionRecords.set(permission.code, record);
  }

  for (const role of roles) {
    const record = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name },
      create: { code: role.code, name: role.name },
    });

    for (const permissionCode of role.permissions) {
      const permission = permissionRecords.get(permissionCode);
      if (!permission) {
        throw new Error(`Missing declared permission: ${permissionCode}`);
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: record.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: record.id, permissionId: permission.id },
      });
    }
  }
}

seed()
  .then(() =>
    console.info(JSON.stringify({ level: 'info', message: 'Roles and permissions seeded' })),
  )
  .catch((error: unknown) => {
    void error;
    console.error(JSON.stringify({ level: 'error', message: 'Role seed failed' }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
