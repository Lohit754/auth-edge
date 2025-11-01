import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateJti,
  getExpirationDate,
} from '../../lib/jwt';

describe('JWT Utils', () => {
  const mockPayload = {
    sub: 'user123',
    email: 'test@example.com',
    role: 'USER',
  };

  describe('signAccessToken', () => {
    it('should sign a valid access token', () => {
      const token = signAccessToken(mockPayload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should create a token that can be verified', () => {
      const token = signAccessToken(mockPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded.sub).toBe(mockPayload.sub);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });
  });

  describe('signRefreshToken', () => {
    it('should sign a valid refresh token with jti', () => {
      const jti = generateJti();
      const token = signRefreshToken(mockPayload, jti);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should include jti in the token', () => {
      const jti = generateJti();
      const token = signRefreshToken(mockPayload, jti);
      const decoded = verifyRefreshToken(token);

      expect(decoded.jti).toBe(jti);
      expect(decoded.sub).toBe(mockPayload.sub);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid token', () => {
      const token = signAccessToken(mockPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded.sub).toBe(mockPayload.sub);
    });

    it('should throw on invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });
  });

  describe('generateJti', () => {
    it('should generate a unique JWT ID', () => {
      const jti1 = generateJti();
      const jti2 = generateJti();

      expect(jti1).toBeTruthy();
      expect(jti2).toBeTruthy();
      expect(jti1).not.toBe(jti2);
      expect(jti1.length).toBeGreaterThan(0);
    });
  });

  describe('getExpirationDate', () => {
    it('should calculate expiration for seconds', () => {
      const now = new Date();
      const exp = getExpirationDate('30s');

      expect(exp.getTime()).toBeGreaterThan(now.getTime());
      expect(exp.getTime()).toBeLessThan(now.getTime() + 31000);
    });

    it('should calculate expiration for minutes', () => {
      const now = new Date();
      const exp = getExpirationDate('15m');

      expect(exp.getTime()).toBeGreaterThan(now.getTime());
      expect(exp.getTime()).toBeLessThan(now.getTime() + 16 * 60 * 1000);
    });

    it('should calculate expiration for hours', () => {
      const now = new Date();
      const exp = getExpirationDate('2h');

      expect(exp.getTime()).toBeGreaterThan(now.getTime());
      expect(exp.getTime()).toBeLessThan(now.getTime() + 3 * 60 * 60 * 1000);
    });

    it('should calculate expiration for days', () => {
      const now = new Date();
      const exp = getExpirationDate('7d');

      expect(exp.getTime()).toBeGreaterThan(now.getTime());
      expect(exp.getTime()).toBeLessThan(
        now.getTime() + 8 * 24 * 60 * 60 * 1000
      );
    });

    it('should throw on invalid format', () => {
      expect(() => getExpirationDate('invalid')).toThrow();
    });
  });
});

