// This mirrors stable database enums so domain code remains testable without a live database.
// Keep synchronized with prisma/schema.prisma.
export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DISABLED';

export type AppRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'EDITOR'
  | 'REPORTER'
  | 'FACT_CHECKER'
  | 'SOCIAL_MANAGER'
  | 'SALES_MANAGER'
  | 'ADVERTISER'
  | 'BUSINESS_OWNER'
  | 'RECRUITER'
  | 'FINANCE'
  | 'ANALYST'
  | 'CONTRIBUTOR';
