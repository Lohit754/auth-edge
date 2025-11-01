import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermissions, requireAnyPermission } from '../middleware/roles';
import { listUsers, getUserById } from '../services/userService';
import { getUserRole, setUserRole } from '../services/roleService';

const router = Router();

/**
 * GET /users
 * Get all users with optional search and filters
 * Requires: VIEW_USERS permission
 * Query params:
 *   - search: string (search by email)
 */
router.get(
  '/',
  authenticate,
  requirePermissions('VIEW_USERS'),
  async (req: AuthRequest, res: Response) => {
    try {
      const search = req.query.search as string | undefined;

      const users = await listUsers({ search });

      res.json({
        total: users.length,
        users,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  }
);

/**
 * GET /users/:id
 * Get a specific user by ID
 * Requires: VIEW_USERS permission OR self-access (authenticated user viewing own profile)
 */
router.get(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Allow self-access for authenticated users (no permission check needed)
      if (req.user?.id === id) {
        const user = await getUserById(id);
        return res.json(user);
      }

      // Otherwise require VIEW_USERS permission
      if (!req.permissions?.has('VIEW_USERS')) {
        return res.status(403).json({ 
          error: 'Forbidden: insufficient permissions',
          required: 'VIEW_USERS'
        });
      }

      const user = await getUserById(id);
      res.json(user);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  }
);

/**
 * GET /users/:id/role
 * Get the role assigned to a specific user
 * Requires: VIEW_USERS permission OR self-access (authenticated user viewing own role)
 */
router.get(
  '/:id/role',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Allow self-access for authenticated users (no permission check needed)
      if (req.user?.id === id) {
        const role = await getUserRole(id);
        return res.json(role);
      }

      // Otherwise require VIEW_USERS permission
      if (!req.permissions?.has('VIEW_USERS')) {
        return res.status(403).json({ 
          error: 'Forbidden: insufficient permissions',
          required: 'VIEW_USERS'
        });
      }

      const role = await getUserRole(id);
      res.json(role);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  }
);

/**
 * PUT /users/:id/role
 * Set the role for a user (replaces existing role)
 * Requires: ASSIGN_ROLE permission
 * Body: { roleId: string | null }
 */
router.put(
  '/:id/role',
  authenticate,
  requirePermissions('ASSIGN_ROLE'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { roleId } = req.body;

      if (roleId !== null && typeof roleId !== 'string') {
        return res.status(400).json({ 
          error: 'Validation error',
          details: 'roleId must be a string or null'
        });
      }

      const role = await setUserRole(id, roleId);
      res.json(role);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message });
    }
  }
);

export default router;

