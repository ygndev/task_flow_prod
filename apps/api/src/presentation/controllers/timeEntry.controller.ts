import { Request, Response } from 'express';
import { Role } from '../../domain/enums/Role';
import {
  startTimeEntry,
  stopTimeEntry,
  getActiveTimeEntry,
} from '../../application/services/timeEntry.service';
import { StartTimeEntryDTO } from '../dto/StartTimeEntryDTO';
import { StopTimeEntryDTO } from '../dto/StopTimeEntryDTO';
import { logger } from '../../infrastructure/logger';

/**
 * Time Entry Controller
 * Handles HTTP requests for time tracking operations (MEMBER only)
 */

export const timeEntryController = {
  /**
   * POST /api/time-entries/start
   * Start a time entry for a task (Member only)
   */
  start: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== Role.MEMBER) {
        res.status(403).json({ error: 'Forbidden: Member access required' });
        return;
      }

      const dto = new StartTimeEntryDTO(req.body);
      dto.validate();

      const timeEntry = await startTimeEntry(req.user.uid, dto.taskId);

      // Serialize TimeEntry to JSON with ISO date strings
      const response = {
        id: timeEntry.id,
        taskId: timeEntry.taskId,
        userId: timeEntry.userId,
        startTime: timeEntry.startTime.toISOString(),
        endTime: timeEntry.endTime ? timeEntry.endTime.toISOString() : null,
        durationSeconds: timeEntry.durationSeconds,
        createdAt: timeEntry.createdAt.toISOString(),
        updatedAt: timeEntry.updatedAt.toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Error starting time entry', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to start time entry' });
    }
  },

  /**
   * POST /api/time-entries/stop
   * Stop an active time entry (Member only)
   */
  stop: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== Role.MEMBER) {
        res.status(403).json({ error: 'Forbidden: Member access required' });
        return;
      }

      const dto = new StopTimeEntryDTO(req.body);
      dto.validate();

      const timeEntry = await stopTimeEntry(req.user.uid, dto.timeEntryId);

      if (!timeEntry) {
        res.status(404).json({ error: 'Time entry not found' });
        return;
      }

      // Ensure all fields are serialized correctly, especially endTime and durationSeconds
      const response = {
        id: timeEntry.id,
        taskId: timeEntry.taskId,
        userId: timeEntry.userId,
        startTime: timeEntry.startTime.toISOString(),
        endTime: timeEntry.endTime ? timeEntry.endTime.toISOString() : null,
        durationSeconds: timeEntry.durationSeconds,
        createdAt: timeEntry.createdAt.toISOString(),
        updatedAt: timeEntry.updatedAt.toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error stopping time entry', error);
      if (error instanceof Error) {
        if (error.message.includes('Forbidden')) {
          res.status(403).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to stop time entry' });
    }
  },

  /**
   * GET /api/time-entries/active
   * Get active time entry for current user (Member only)
   */
  getActive: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== Role.MEMBER) {
        res.status(403).json({ error: 'Forbidden: Member access required' });
        return;
      }

      const timeEntry = await getActiveTimeEntry(req.user.uid);

      if (!timeEntry) {
        res.status(200).json(null);
        return;
      }

      // Serialize TimeEntry to JSON with ISO date strings
      const response = {
        id: timeEntry.id,
        taskId: timeEntry.taskId,
        userId: timeEntry.userId,
        startTime: timeEntry.startTime.toISOString(),
        endTime: timeEntry.endTime ? timeEntry.endTime.toISOString() : null,
        durationSeconds: timeEntry.durationSeconds,
        createdAt: timeEntry.createdAt.toISOString(),
        updatedAt: timeEntry.updatedAt.toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting active time entry', error);
      res.status(500).json({ error: 'Failed to get active time entry' });
    }
  },

  /**
   * GET /api/time-entries/summary/today
   * Get today's time tracking summary (Member only)
   */
  getTodaySummary: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== Role.MEMBER) {
        res.status(403).json({ error: 'Forbidden: Member access required' });
        return;
      }

      const { getTodaySummary } = await import('../../application/services/timeEntry.service');
      const summary = await getTodaySummary(req.user.uid);

      res.status(200).json(summary);
    } catch (error) {
      logger.error('Error getting today summary', error);
      res.status(500).json({ error: 'Failed to get today summary' });
    }
  },
};
