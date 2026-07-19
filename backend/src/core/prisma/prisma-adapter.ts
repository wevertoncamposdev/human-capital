import { PrismaPg } from '@prisma/adapter-pg';

export function createPrismaAdapter(databaseUrl: string) {
  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(
      'DATABASE_URL must start with postgresql:// or postgres://',
    );
  }

  return new PrismaPg({ connectionString: databaseUrl });
}
