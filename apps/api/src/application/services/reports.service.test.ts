import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TimeEntry } from '../../domain/entities/TimeEntry';
import { ITimeEntryRepository } from '../../data/repositories/interfaces/ITimeEntryRepository';
import * as reportsService from './reports.service';

/**
 * Reports Service Unit Tests
 * Tests aggregation logic for time reports
 */

// Mock repository implementation
class MockTimeEntryRepository implements ITimeEntryRepository {
  private timeEntries: Map<string, TimeEntry> = new Map();

  async create(timeEntry: TimeEntry): Promise<TimeEntry> {
    this.timeEntries.set(timeEntry.id, timeEntry);
    return timeEntry;
  }

  async findById(id: string): Promise<TimeEntry | null> {
    return this.timeEntries.get(id) || null;
  }

  async update(id: string, patch: Partial<TimeEntry>): Promise<TimeEntry | null> {
    const timeEntry = this.timeEntries.get(id);
    if (!timeEntry) return null;

    const updated = new TimeEntry(
      timeEntry.id,
      timeEntry.taskId,
      timeEntry.userId,
      patch.startTime ?? timeEntry.startTime,
      patch.endTime !== undefined ? patch.endTime : timeEntry.endTime,
      patch.durationSeconds !== undefined ? patch.durationSeconds : timeEntry.durationSeconds,
      timeEntry.createdAt,
      new Date()
    );
    this.timeEntries.set(id, updated);
    return updated;
  }

  async findActiveByUser(userId: string): Promise<TimeEntry | null> {
    const entries = Array.from(this.timeEntries.values());
    return entries.find((e) => e.userId === userId && e.endTime === null) || null;
  }

  async findByTaskAndUser(taskId: string, userId: string): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values()).filter(
      (e) => e.taskId === taskId && e.userId === userId
    );
  }

  async listCompletedInRange(from: Date, to: Date): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values()).filter((entry) => {
      // Only completed entries
      if (entry.endTime === null) return false;
      // Start time within range (inclusive)
      return entry.startTime >= from && entry.startTime <= to;
    });
  }

  addTimeEntry(timeEntry: TimeEntry): void {
    this.timeEntries.set(timeEntry.id, timeEntry);
  }

  clear(): void {
    this.timeEntries.clear();
  }
}

describe('ReportsService', () => {
  let mockRepo: MockTimeEntryRepository;

  beforeEach(() => {
    mockRepo = new MockTimeEntryRepository();
    // Inject mock repository
    reportsService.setTimeEntryRepositoryForReports(mockRepo);
  });

  afterEach(() => {
    // Reset to null so it will use real repository in production
    reportsService.setTimeEntryRepositoryForReports(null);
  });

  describe('getTimeTotalsByUser', () => {
    it('should aggregate time totals by user correctly', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');

      // User 1: 2 entries totaling 3600 seconds (1 hour)
      const entry1 = new TimeEntry(
        'entry1',
        'task1',
        'user1',
        new Date('2024-01-15T10:00:00'),
        new Date('2024-01-15T10:30:00'),
        1800 // 30 minutes
      );
      const entry2 = new TimeEntry(
        'entry2',
        'task2',
        'user1',
        new Date('2024-01-20T14:00:00'),
        new Date('2024-01-20T14:30:00'),
        1800 // 30 minutes
      );

      // User 2: 1 entry totaling 7200 seconds (2 hours)
      const entry3 = new TimeEntry(
        'entry3',
        'task3',
        'user2',
        new Date('2024-01-10T09:00:00'),
        new Date('2024-01-10T11:00:00'),
        7200 // 2 hours
      );

      mockRepo.addTimeEntry(entry1);
      mockRepo.addTimeEntry(entry2);
      mockRepo.addTimeEntry(entry3);

      const result = await reportsService.getTimeTotalsByUser(from, to);

      expect(result.from).toBe('2024-01-01');
      expect(result.to).toBe('2024-01-31');
      expect(result.totals).toHaveLength(2);
      expect(result.totals[0].userId).toBe('user1');
      expect(result.totals[0].totalDurationSeconds).toBe(3600);
      expect(result.totals[1].userId).toBe('user2');
      expect(result.totals[1].totalDurationSeconds).toBe(7200);
    });

    it('should exclude entries outside date range', async () => {
      const from = new Date('2024-01-15');
      const to = new Date('2024-01-20');

      // Entry before range
      const entry1 = new TimeEntry(
        'entry1',
        'task1',
        'user1',
        new Date('2024-01-10T10:00:00'),
        new Date('2024-01-10T10:30:00'),
        1800
      );

      // Entry in range
      const entry2 = new TimeEntry(
        'entry2',
        'task2',
        'user1',
        new Date('2024-01-18T10:00:00'),
        new Date('2024-01-18T10:30:00'),
        1800
      );

      // Entry after range
      const entry3 = new TimeEntry(
        'entry3',
        'task3',
        'user1',
        new Date('2024-01-25T10:00:00'),
        new Date('2024-01-25T10:30:00'),
        1800
      );

      mockRepo.addTimeEntry(entry1);
      mockRepo.addTimeEntry(entry2);
      mockRepo.addTimeEntry(entry3);

      const result = await reportsService.getTimeTotalsByUser(from, to);

      expect(result.totals).toHaveLength(1);
      expect(result.totals[0].userId).toBe('user1');
      expect(result.totals[0].totalDurationSeconds).toBe(1800);
    });

    it('should exclude incomplete entries (endTime == null)', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');

      // Completed entry
      const entry1 = new TimeEntry(
        'entry1',
        'task1',
        'user1',
        new Date('2024-01-15T10:00:00'),
        new Date('2024-01-15T10:30:00'),
        1800
      );

      // Incomplete entry (should be excluded)
      const entry2 = new TimeEntry(
        'entry2',
        'task2',
        'user1',
        new Date('2024-01-20T10:00:00'),
        null,
        null
      );

      mockRepo.addTimeEntry(entry1);
      mockRepo.addTimeEntry(entry2);

      const result = await reportsService.getTimeTotalsByUser(from, to);

      expect(result.totals).toHaveLength(1);
      expect(result.totals[0].totalDurationSeconds).toBe(1800);
    });

    it('should exclude entries with null or zero durationSeconds', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');

      // Valid entry
      const entry1 = new TimeEntry(
        'entry1',
        'task1',
        'user1',
        new Date('2024-01-15T10:00:00'),
        new Date('2024-01-15T10:30:00'),
        1800
      );

      // Entry with null duration (should be excluded)
      const entry2 = new TimeEntry(
        'entry2',
        'task2',
        'user1',
        new Date('2024-01-20T10:00:00'),
        new Date('2024-01-20T10:30:00'),
        null
      );

      // Entry with zero duration (should be excluded)
      const entry3 = new TimeEntry(
        'entry3',
        'task3',
        'user2',
        new Date('2024-01-25T10:00:00'),
        new Date('2024-01-25T10:00:00'),
        0
      );

      mockRepo.addTimeEntry(entry1);
      mockRepo.addTimeEntry(entry2);
      mockRepo.addTimeEntry(entry3);

      const result = await reportsService.getTimeTotalsByUser(from, to);

      expect(result.totals).toHaveLength(1);
      expect(result.totals[0].userId).toBe('user1');
      expect(result.totals[0].totalDurationSeconds).toBe(1800);
    });

    it('should return empty array if no entries in range', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');

      const result = await reportsService.getTimeTotalsByUser(from, to);

      expect(result.totals).toHaveLength(0);
      expect(result.from).toBe('2024-01-01');
      expect(result.to).toBe('2024-01-31');
    });

    it('should reject invalid date range (from > to)', async () => {
      const from = new Date('2024-01-31');
      const to = new Date('2024-01-01');

      await expect(reportsService.getTimeTotalsByUser(from, to)).rejects.toThrow(
        'Invalid date range: "from" date must be before or equal to "to" date'
      );
    });

    it('should handle multiple entries for same user correctly', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');

      // User 1: 3 entries
      const entry1 = new TimeEntry(
        'entry1',
        'task1',
        'user1',
        new Date('2024-01-10T10:00:00'),
        new Date('2024-01-10T10:15:00'),
        900 // 15 minutes
      );
      const entry2 = new TimeEntry(
        'entry2',
        'task2',
        'user1',
        new Date('2024-01-15T14:00:00'),
        new Date('2024-01-15T14:20:00'),
        1200 // 20 minutes
      );
      const entry3 = new TimeEntry(
        'entry3',
        'task3',
        'user1',
        new Date('2024-01-20T09:00:00'),
        new Date('2024-01-20T09:10:00'),
        600 // 10 minutes
      );

      mockRepo.addTimeEntry(entry1);
      mockRepo.addTimeEntry(entry2);
      mockRepo.addTimeEntry(entry3);

      const result = await reportsService.getTimeTotalsByUser(from, to);

      expect(result.totals).toHaveLength(1);
      expect(result.totals[0].userId).toBe('user1');
      expect(result.totals[0].totalDurationSeconds).toBe(2700); // 900 + 1200 + 600
    });
  });
});
