import { Request, Response } from 'express';
import { listActivities } from '../../application/services/activity.service';
import { Role } from '../../domain/enums/Role';
import { logger } from '../../infrastructure/logger';

export const activityController = {
  /**
   * GET /api/tasks/:id/activity
   * List activity log for a task
   */
  list: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id: taskId } = req.params;
      const activities = await listActivities(taskId, req.user.uid, req.user.role as Role);

      res.status(200).json(activities);
    } catch (error) {
      logger.error('Error listing activities', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to list activities' });
    }
  },
};
