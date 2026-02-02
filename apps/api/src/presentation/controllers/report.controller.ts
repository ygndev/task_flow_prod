import { Request, Response } from 'express';
import { Role } from '../../domain/enums/Role';
import { getTimeTotalsByUser } from '../../application/services/reports.service';
import { logger } from '../../infrastructure/logger';

/**
 * Report Controller
 * Handles HTTP requests for reporting operations (ADMIN only)
 */

export const reportController = {
  /**
   * GET /api/reports/time?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Get time totals aggregated by user for a date range (Admin only)
   */
  getTimeReport: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== Role.ADMIN) {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }

      const { from, to } = req.query;

      if (!from || !to) {
        res.status(400).json({ error: 'Missing required query parameters: from and to (format: YYYY-MM-DD)' });
        return;
      }

      // Parse dates
      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);

      // Validate dates
      if (isNaN(fromDate.getTime())) {
        res.status(400).json({ error: 'Invalid "from" date format. Use YYYY-MM-DD' });
        return;
      }

      if (isNaN(toDate.getTime())) {
        res.status(400).json({ error: 'Invalid "to" date format. Use YYYY-MM-DD' });
        return;
      }

      // Set time to start of day for "from" and end of day for "to" to include full days
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);

      const report = await getTimeTotalsByUser(fromDate, toDate);

      res.status(200).json(report);
    } catch (error) {
      logger.error('Error generating time report', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to generate time report' });
    }
  },
};
