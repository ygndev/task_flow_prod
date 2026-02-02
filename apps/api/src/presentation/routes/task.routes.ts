import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin, requireMember } from '../middlewares/role.middleware';
import { taskController } from '../controllers/task.controller';
import { commentController } from '../controllers/comment.controller';
import { activityController } from '../controllers/activity.controller';

export const taskRouter = Router();

// All task routes require authentication
taskRouter.use(authenticate);

// Create task route (Admin or Member - controller handles RBAC)
taskRouter.post('/', taskController.create);
taskRouter.patch('/:id', requireAdmin, taskController.update);
taskRouter.post('/:id/assign', requireAdmin, taskController.assign);

// Member routes
taskRouter.patch('/:id/status', requireMember, taskController.updateStatus);
taskRouter.post('/:id/complete', requireMember, taskController.complete);

// Shared route (behavior depends on role)
taskRouter.get('/', taskController.list);

// Comments (authenticated users)
taskRouter.post('/:id/comments', commentController.create);
taskRouter.get('/:id/comments', commentController.list);

// Activity (authenticated users)
taskRouter.get('/:id/activity', activityController.list);
