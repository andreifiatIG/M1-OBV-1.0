import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __globalPrisma__: PrismaClient | undefined;
}

const prisma =
  globalThis.__globalPrisma__ ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__globalPrisma__ = prisma;
}

export default prisma;
