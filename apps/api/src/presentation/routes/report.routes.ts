import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import { reportController } from '../controllers/report.controller';

export const reportRouter = Router();

// All report routes require authentication and admin role
reportRouter.use(authenticate);
reportRouter.use(requireAdmin);

reportRouter.get('/time', reportController.getTimeReport);
