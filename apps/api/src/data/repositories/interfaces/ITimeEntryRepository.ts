import { TimeEntry } from '../../../domain/entities/TimeEntry';

export interface ITimeEntryRepository {
  create(timeEntry: TimeEntry): Promise<TimeEntry>;
  findById(id: string): Promise<TimeEntry | null>;
  update(id: string, patch: Partial<TimeEntry>): Promise<TimeEntry | null>;
  findActiveByUser(userId: string): Promise<TimeEntry | null>;
  findByTaskAndUser(taskId: string, userId: string): Promise<TimeEntry[]>;
  listCompletedInRange(from: Date, to: Date): Promise<TimeEntry[]>;
}
