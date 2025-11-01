import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../prisma/client';

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
  process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-min-32-chars-long';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-min-32-chars-long';
  process.env.ACCESS_TOKEN_TTL = '15m';
  process.env.REFRESH_TOKEN_TTL = '7d';
});

afterAll(async () => {
  await prisma.$disconnect();
});

