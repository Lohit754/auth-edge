import express from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermissions } from '../middleware/roles';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from '../services/roleService';
import { createRoleSchema, updateRoleSchema } from '../rbac/validation';
import { z } from 'zod';

const router = express.Router();

/**
 * GET /roles - List all roles
 * Requires: VIEW_ROLES permission
 */
router.get(
  '/',
  authenticate,
  requirePermissions('VIEW_ROLES'),
  async (req, res, next) => {
    try {
      const roles = await getAllRoles();
      res.json(roles);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /roles/:id - Get a specific role
 * Requires: VIEW_ROLES permission
 */
router.get(
  '/:id',
  authenticate,
  requirePermissions('VIEW_ROLES'),
  async (req, res, next) => {
    try {
      const role = await getRoleById(req.params.id);

      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      res.json(role);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /roles - Create a new role
 * Requires: CREATE_ROLE permission
 * Body: { name: string, permissions: string[] }
 */
router.post(
  '/',
  authenticate,
  requirePermissions('CREATE_ROLE'),
  async (req, res, next) => {
    try {
      const input = createRoleSchema.parse(req.body);
      const role = await createRole(input);
      res.status(201).json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }
      next(error);
    }
  }
);

/**
 * PATCH /roles/:id - Update a role
 * Requires: EDIT_ROLE permission
 * Body: { name?: string, permissions?: string[] }
 */
router.patch(
  '/:id',
  authenticate,
  requirePermissions('EDIT_ROLE'),
  async (req, res, next) => {
    try {
      const input = updateRoleSchema.parse(req.body);
      const role = await updateRole(req.params.id, input);
      res.json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }
      next(error);
    }
  }
);

/**
 * DELETE /roles/:id - Delete a role (hard delete)
 * Requires: DELETE_ROLE permission
 * Will fail if role is assigned to any users
 */
router.delete(
  '/:id',
  authenticate,
  requirePermissions('DELETE_ROLE'),
  async (req, res, next) => {
    try {
      await deleteRole(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;

