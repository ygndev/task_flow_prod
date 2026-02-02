import { ITimeEntryRepository } from '../../data/repositories/interfaces/ITimeEntryRepository';
import { FirestoreTimeEntryRepository } from '../../data/repositories/implementations/FirestoreTimeEntryRepository';
import { logger } from '../../infrastructure/logger';

/**
 * Reports Service
 * Handles reporting and analytics operations (ADMIN only)
 */

// Singleton repository instance
let timeEntryRepository: ITimeEntryRepository | null = null;

function getTimeEntryRepository(): ITimeEntryRepository {
  if (!timeEntryRepository) {
    timeEntryRepository = new FirestoreTimeEntryRepository();
  }
  return timeEntryRepository;
}

// Export for testing - allows injection of mock repository
export function setTimeEntryRepositoryForReports(repo: ITimeEntryRepository | null): void {
  timeEntryRepository = repo;
}

export interface TimeTotalByUser {
  userId: string;
  totalDurationSeconds: number;
}

export interface TimeReportResult {
  from: string;
  to: string;
  totals: TimeTotalByUser[];
}

/**
 * Get time totals aggregated by user for a date range
 * Only includes completed time entries (endTime != null)
 * Filters by startTime within [from, to] (inclusive)
 */
export async function getTimeTotalsByUser(
  from: Date,
  to: Date
): Promise<TimeReportResult> {
  const timeEntryRepo = getTimeEntryRepository();

  // Validate date range
  if (from > to) {
    throw new Error('Invalid date range: "from" date must be before or equal to "to" date');
  }

  // Fetch completed time entries in range
  const timeEntries = await timeEntryRepo.listCompletedInRange(from, to);

  // Aggregate by user
  const userTotals = new Map<string, number>();

  for (const entry of timeEntries) {
    // Double-check: only include entries with durationSeconds
    if (entry.durationSeconds !== null && entry.durationSeconds > 0) {
      const currentTotal = userTotals.get(entry.userId) || 0;
      userTotals.set(entry.userId, currentTotal + entry.durationSeconds);
    }
  }

  // Convert to array and sort by userId for consistent output
  const totals: TimeTotalByUser[] = Array.from(userTotals.entries())
    .map(([userId, totalDurationSeconds]) => ({
      userId,
      totalDurationSeconds,
    }))
    .sort((a, b) => a.userId.localeCompare(b.userId));

  logger.info(`Time report generated: ${totals.length} users, from ${from.toISOString()} to ${to.toISOString()}`);

  return {
    from: from.toISOString().split('T')[0], // YYYY-MM-DD format
    to: to.toISOString().split('T')[0], // YYYY-MM-DD format
    totals,
  };
}
