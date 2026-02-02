import { Request, Response } from 'express';
import { updateUserRole } from '../../application/services/user.service.js';
import { Role } from '../../domain/enums/Role.js';
import { logger } from '../../infrastructure/logger.js';

/**
 * Admin Controller
 * Handles admin-only operations
 */

interface UpdateRoleRequest {
  role: string;
}

export const adminController = {
  /**
   * Update user role
   * POST /api/admin/users/:uid/role
   * 
   * Updates role in both Firestore (source of truth) and Firebase custom claims.
   * Requires admin authentication.
   */
  updateUserRole: async (req: Request, res: Response): Promise<void> => {
    try {
      const { uid } = req.params;
      const { role }: UpdateRoleRequest = req.body;

      // Validate role
      if (!role || (role !== Role.ADMIN && role !== Role.MEMBER)) {
        res.status(400).json({
          error: 'Invalid role',
          message: "Role must be 'ADMIN' or 'MEMBER'",
        });
        return;
      }

      // Validate uid parameter
      if (!uid) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'User ID (uid) is required',
        });
        return;
      }

      // Prevent self-role changes (optional safety check)
      if (req.user && req.user.uid === uid && role !== Role.ADMIN) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Cannot remove your own admin role',
        });
        return;
      }

      // Update role in Firestore and custom claims
      await updateUserRole(uid, role as Role);

      logger.info(`Admin ${req.user?.uid} updated role for user ${uid} to ${role}`);

      res.status(200).json({
        message: 'Role updated successfully',
        uid,
        role,
        note: 'User may need to refresh their token to see role changes in custom claims',
      });
    } catch (error) {
      logger.error('Error updating user role', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: 'User not found',
            message: error.message,
          });
          return;
        }

        if (error.message.includes('Invalid role')) {
          res.status(400).json({
            error: 'Invalid role',
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update user role',
      });
    }
  },
};
