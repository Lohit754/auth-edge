import { PermissionKey } from '../rbac/permissions';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      userRole?: {
        id: string;
        name: string;
        permissions: string[];
      } | null;
      permissions?: Set<PermissionKey>;
    }
  }
}

export {};

