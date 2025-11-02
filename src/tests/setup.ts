import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../prisma/client';

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
  process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-min-32-chars-long';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-min-32-chars-long';
  process.env.ACCESS_TOKEN_TTL = '15m';
  process.env.REFRESH_TOKEN_TTL = '7d';

  // Ensure default roles exist for testing
  try {
    const userRoleExists = await prisma.role.findFirst({ where: { name: 'USER' } });
    if (!userRoleExists) {
      await prisma.role.create({
        data: {
          name: 'USER',
          permissions: JSON.stringify([
            'VIEW_USERS',
            'EDIT_SELF',
            'DELETE_SELF',
          ]),
        },
      });
    }

    const adminRoleExists = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
    if (!adminRoleExists) {
      await prisma.role.create({
        data: {
          name: 'ADMIN',
          permissions: JSON.stringify([
            'VIEW_USERS',
            'EDIT_USER',
            'DELETE_USER',
            'MANAGE_ROLES',
            'EDIT_SELF',
            'DELETE_SELF',
          ]),
        },
      });
    }
  } catch (error) {
    console.error('Error seeding test roles:', error);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

