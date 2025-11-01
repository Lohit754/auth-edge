import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /me
 * Get current user information with role and permissions
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Convert Set to Array for JSON serialization
    const permissions = req.permissions
      ? Array.from(req.permissions)
      : [];

    res.json({
      id: req.user!.id,
      email: req.user!.email,
      role: req.userRole,
      permissions,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;

