import { Request, Response } from 'express';
import { createComment, listComments } from '../../application/services/comment.service';
import { Role } from '../../domain/enums/Role';
import { logger } from '../../infrastructure/logger';

export const commentController = {
  /**
   * POST /api/tasks/:id/comments
   * Create a comment on a task
   */
  create: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id: taskId } = req.params;
      const { text } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        res.status(400).json({ error: 'Comment text is required' });
        return;
      }

      if (text.length > 2000) {
        res.status(400).json({ error: 'Comment text must be 2000 characters or less' });
        return;
      }

      const comment = await createComment(taskId, req.user.uid, req.user.role as Role, text.trim());

      res.status(201).json(comment);
    } catch (error) {
      logger.error('Error creating comment', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to create comment' });
    }
  },

  /**
   * GET /api/tasks/:id/comments
   * List comments for a task
   */
  list: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id: taskId } = req.params;
      const comments = await listComments(taskId, req.user.uid, req.user.role as Role);

      res.status(200).json(comments);
    } catch (error) {
      logger.error('Error listing comments', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to list comments' });
    }
  },
};
