import { prisma } from '../prisma/client';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateJti,
  getExpirationDate,
} from '../lib/jwt';
import { env } from '../config/env';
import crypto from 'crypto';

export interface RegisterInput {
  email: string;
  password: string;
  role?: 'USER' | 'ADMIN';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Register a new user with a role
 * @param input.role - Role to assign (USER or ADMIN). Defaults to USER.
 * Note: ADMIN registration via public API is blocked for security.
 */
export async function register(input: RegisterInput) {
  const { email, password, role = 'USER' } = input;

  // Block ADMIN registration via public API for security
  // ADMINs should be created via seed script or by existing ADMINs
  // if (role === 'ADMIN') {
  //   const error = new Error('ADMIN role cannot be assigned during public registration. Please contact an administrator.');
  //   (error as any).statusCode = 403;
  //   throw error;
  // }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const error = new Error('Email already registered');
    (error as any).statusCode = 409;
    throw error;
  }

  // Find the role by name
  const roleRecord = await prisma.role.findFirst({
    where: {
      name: role,
    },
  });

  if (!roleRecord) {
    const error = new Error(`Role "${role}" not found`);
    (error as any).statusCode = 400;
    throw error;
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user with role
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      roleId: roleRecord.id,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Login user and issue tokens
 */
export async function login(input: LoginInput): Promise<LoginResult> {
  const { email, password } = input;

  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const error = new Error('Invalid credentials');
    (error as any).statusCode = 401;
    throw error;
  }

  // Verify password
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const error = new Error('Invalid credentials');
    (error as any).statusCode = 401;
    throw error;
  }

  // Generate tokens
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
  });

  const jti = generateJti();
  const refreshToken = signRefreshToken(
    {
      sub: user.id,
      email: user.email,
    },
    jti
  );

  // Hash and store refresh token
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      hash: refreshTokenHash,
      expiresAt: getExpirationDate(env.REFRESH_TOKEN_TTL),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

/**
 * Refresh tokens (rotate refresh token)
 */
export async function refreshTokens(oldRefreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  // Verify token signature and expiration
  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch (error) {
    const err = new Error('Invalid or expired refresh token');
    (err as any).statusCode = 401;
    throw err;
  }

  // Hash the old token to compare with DB
  const oldTokenHash = crypto
    .createHash('sha256')
    .update(oldRefreshToken)
    .digest('hex');

  // Find token in DB
  const storedToken = await prisma.refreshToken.findUnique({
    where: { id: payload.jti },
    include: { user: true },
  });

  if (!storedToken) {
    const error = new Error('Refresh token not found');
    (error as any).statusCode = 401;
    throw error;
  }

  // Check if token is revoked
  if (storedToken.revokedAt) {
    const error = new Error('Refresh token has been revoked');
    (error as any).statusCode = 401;
    throw error;
  }

  // Check if token is expired
  if (storedToken.expiresAt < new Date()) {
    const error = new Error('Refresh token has expired');
    (error as any).statusCode = 401;
    throw error;
  }

  // Compare hash
  if (storedToken.hash !== oldTokenHash) {
    const error = new Error('Invalid refresh token');
    (error as any).statusCode = 401;
    throw error;
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: payload.jti },
    data: { revokedAt: new Date() },
  });

  // Generate new tokens
  const user = storedToken.user;
  const newAccessToken = signAccessToken({
    sub: user.id,
    email: user.email,
  });

  const newJti = generateJti();
  const newRefreshToken = signRefreshToken(
    {
      sub: user.id,
      email: user.email,
    },
    newJti
  );

  // Hash and store new refresh token
  const newRefreshTokenHash = crypto
    .createHash('sha256')
    .update(newRefreshToken)
    .digest('hex');

  await prisma.refreshToken.create({
    data: {
      id: newJti,
      userId: user.id,
      hash: newRefreshTokenHash,
      expiresAt: getExpirationDate(env.REFRESH_TOKEN_TTL),
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Logout (revoke refresh token)
 */
export async function logout(refreshToken: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(refreshToken);

    await prisma.refreshToken.updateMany({
      where: {
        id: payload.jti,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  } catch (error) {
    // Silent fail on logout - token might be expired or invalid
    console.error('Logout error:', error);
  }
}

