import { Request, Response } from 'express';
import { Role } from '../../domain/enums/Role';
import {
  createTask,
  updateTaskAsAdmin,
  assignTask,
  listTasksForAdmin,
  listTasksForMember,
  updateTaskStatusAsMember,
  completeTask,
} from '../../application/services/task.service';
import { CreateTaskDTO } from '../dto/CreateTaskDTO';
import { UpdateTaskDTO } from '../dto/UpdateTaskDTO';
import { UpdateTaskStatusDTO } from '../dto/UpdateTaskStatusDTO';
import { logger } from '../../infrastructure/logger';

/**
 * Task Controller
 * Handles HTTP requests for task operations with RBAC
 */

export const taskController = {
  /**
   * POST /api/tasks
   * Create a new task (Admin or Member)
   * - Admin: can create tasks with any assignee
   * - Member: can only create tasks assigned to themselves
   */
  create: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto = new CreateTaskDTO(req.body);
      dto.validate();

      // For members, force assigneeUserId to themselves and use defaults
      if (req.user.role === Role.MEMBER) {
        const task = await createTask(
          'self', // createdByAdminId for self-created tasks
          dto.title,
          dto.description || '',
          req.user.uid, // Force assign to current user
          undefined, // Use default priority (MEDIUM)
          null, // No due date
          [] // No tags
        );
        res.status(201).json(task);
        return;
      }

      // Admin flow (existing)
      if (req.user.role !== Role.ADMIN) {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }

      const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      const task = await createTask(
        req.user.uid,
        dto.title,
        dto.description,
        dto.assigneeUserId ?? null,
        dto.priority,
        dueDate,
        dto.tags || []
      );

      res.status(201).json(task);
    } catch (error) {
      logger.error('Error creating task', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to create task' });
    }
  },

  /**
   * GET /api/tasks
   * List tasks (Admin: all tasks, Member: only assigned tasks)
   * Query params: status, priority, tag, q (search), sortBy, sortOrder
   */
  list: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { status, priority, tag, q, sortBy, sortOrder } = req.query;
      const filters: any = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (tag) filters.tag = tag;
      if (q) filters.searchQuery = q as string;
      if (sortBy) filters.sortBy = sortBy;
      if (sortOrder) filters.sortOrder = sortOrder;

      let tasks;
      if (req.user.role === Role.ADMIN) {
        tasks = await listTasksForAdmin(Object.keys(filters).length > 0 ? filters : undefined);
      } else {
        tasks = await listTasksForMember(req.user.uid, Object.keys(filters).length > 0 ? filters : undefined);
      }

      res.status(200).json(tasks);
    } catch (error) {
      logger.error('Error listing tasks', error);
      res.status(500).json({ error: 'Failed to list tasks' });
    }
  },

  /**
   * PATCH /api/tasks/:id
   * Update task fields (Admin only)
   */
  update: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== Role.ADMIN) {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }

      const { id } = req.params;
      const dto = new UpdateTaskDTO(req.body);
      dto.validate();

      const dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;
      const updated = await updateTaskAsAdmin(
        id,
        {
          title: dto.title,
          description: dto.description,
          status: dto.status,
          assigneeUserId: dto.assigneeUserId,
          priority: dto.priority,
          dueDate: dueDate !== undefined ? dueDate : null,
          tags: dto.tags,
        },
        req.user.uid
      );

      if (!updated) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.status(200).json(updated);
    } catch (error) {
      logger.error('Error updating task', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to update task' });
    }
  },

  /**
   * POST /api/tasks/:id/assign
   * Assign task to a member (Admin only)
   */
  assign: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== Role.ADMIN) {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }

      const { id } = req.params;
      const { assigneeUserId } = req.body;

      if (assigneeUserId !== null && assigneeUserId !== undefined && typeof assigneeUserId !== 'string') {
        res.status(400).json({ error: 'Invalid assigneeUserId' });
        return;
      }

      const updated = await assignTask(id, assigneeUserId ?? null, req.user.uid);

      if (!updated) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.status(200).json(updated);
    } catch (error) {
      logger.error('Error assigning task', error);
      res.status(500).json({ error: 'Failed to assign task' });
    }
  },

  /**
   * PATCH /api/tasks/:id/status
   * Update task status (Member only, for their assigned tasks)
   */
  updateStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== Role.MEMBER) {
        res.status(403).json({ error: 'Forbidden: Member access required' });
        return;
      }

      const { id } = req.params;
      const dto = new UpdateTaskStatusDTO(req.body);
      dto.validate();

      const updated = await updateTaskStatusAsMember(id, req.user.uid, dto.status);

      if (!updated) {
        res.status(404).json({ error: 'Task not found or not assigned to you' });
        return;
      }

      res.status(200).json(updated);
    } catch (error) {
      logger.error('Error updating task status', error);
      if (error instanceof Error) {
        if (error.message.includes('Forbidden')) {
          res.status(403).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to update task status' });
    }
  },

  /**
   * POST /api/tasks/:id/complete
   * Complete a task (stop timer if active, then mark DONE) (Member only)
   */
  complete: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== Role.MEMBER) {
        res.status(403).json({ error: 'Forbidden: Member access required' });
        return;
      }

      const { id } = req.params;
      const result = await completeTask(id, req.user.uid);

      res.status(200).json({
        task: result.task,
        stoppedTimeEntry: result.stoppedTimeEntry ? {
          id: result.stoppedTimeEntry.id,
          taskId: result.stoppedTimeEntry.taskId,
          userId: result.stoppedTimeEntry.userId,
          startTime: result.stoppedTimeEntry.startTime.toISOString(),
          endTime: result.stoppedTimeEntry.endTime ? result.stoppedTimeEntry.endTime.toISOString() : null,
          durationSeconds: result.stoppedTimeEntry.durationSeconds,
          createdAt: result.stoppedTimeEntry.createdAt.toISOString(),
          updatedAt: result.stoppedTimeEntry.updatedAt.toISOString(),
        } : null,
      });
    } catch (error) {
      logger.error('Error completing task', error);
      if (error instanceof Error) {
        if (error.message.includes('Forbidden')) {
          res.status(403).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to complete task' });
    }
  },
};
