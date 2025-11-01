import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermissions } from '../middleware/roles';

const router = Router();

/**
 * GET /admin/secret
 * Admin-only endpoint
 * Requires: VIEW_USERS and VIEW_ROLES permissions (for demonstration)
 * In practice, you might add an ADMIN_PANEL_ACCESS permission
 */
router.get(
  '/secret',
  authenticate,
  requirePermissions('VIEW_USERS', 'VIEW_ROLES'),
  async (req: AuthRequest, res: Response) => {
    try {
      res.json({
        secret: 'This is a secret message only admins can see! 🔐',
        admin: req.user?.email,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  }
);

export default router;

