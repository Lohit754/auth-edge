import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import crypto from 'crypto';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
}

export interface RefreshTokenPayload extends AccessTokenPayload {
  jti: string; // JWT ID for tracking
}

/**
 * Sign an access token with short TTL
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as any,
  });
}

/**
 * Sign a refresh token with longer TTL and a unique jti
 */
export function signRefreshToken(
  payload: AccessTokenPayload,
  jti: string
): string {
  const refreshPayload: RefreshTokenPayload = {
    ...payload,
    jti,
  };

  return jwt.sign(refreshPayload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL as any,
  });
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload;
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
}

/**
 * Generate a unique JWT ID (jti)
 */
export function generateJti(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Get expiration date from TTL string (e.g., "7d", "15m")
 */
export function getExpirationDate(ttl: string): Date {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const now = new Date();
  switch (unit) {
    case 's':
      return new Date(now.getTime() + value * 1000);
    case 'm':
      return new Date(now.getTime() + value * 60 * 1000);
    case 'h':
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'd':
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

