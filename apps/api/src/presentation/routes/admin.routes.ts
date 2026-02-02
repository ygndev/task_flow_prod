import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import { adminController } from '../controllers/admin.controller';

export const adminRouter = Router();

// All admin routes require authentication and admin role
adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

// Update user role
adminRouter.post('/users/:uid/role', adminController.updateUserRole);
