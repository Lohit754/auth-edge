import { Router, Request, Response } from 'express';
import { register, login, refreshTokens, logout } from '../services/authService';
import { registerSchema, loginSchema } from '../lib/validate';
import { env, isDevelopment } from '../config/env';

const router = Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const input = registerSchema.parse(req.body);
    const user = await register(input);

    res.status(201).json(user);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * POST /auth/login
 * Login and receive access token + refresh token cookie
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await login(input);

    // Set refresh token as httpOnly cookie
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: !isDevelopment, // Use secure cookies in production
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token cookie
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const oldRefreshToken = req.cookies.refresh_token;

    if (!oldRefreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const result = await refreshTokens(oldRefreshToken);

    // Set new refresh token as httpOnly cookie
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken: result.accessToken,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * POST /auth/logout
 * Logout and revoke refresh token
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (refreshToken) {
      await logout(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: 'strict',
      path: '/auth/refresh',
    });

    res.status(204).send();
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;

