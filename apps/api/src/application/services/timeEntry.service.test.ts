import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeEntry } from '../../domain/entities/TimeEntry';
import { Task } from '../../domain/entities/Task';
import { TaskStatus } from '../../domain/enums/TaskStatus';
import { Priority } from '../../domain/enums/Priority';
import { ITimeEntryRepository } from '../../data/repositories/interfaces/ITimeEntryRepository';
import { ITaskRepository } from '../../data/repositories/interfaces/ITaskRepository';
import * as timeEntryService from './timeEntry.service';
import * as activityService from './activity.service';

/**
 * Time Entry Service Unit Tests
 * Tests business logic rules, especially RBAC constraints
 */

// Mock repository implementations
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
      if (entry.endTime === null) return false;
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

class MockTaskRepository implements ITaskRepository {
  private tasks: Map<string, Task> = new Map();

  async create(task: Task): Promise<Task> {
    this.tasks.set(task.id, task);
    return task;
  }

  async findById(id: string): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  async update(id: string, patch: Partial<Task>): Promise<Task | null> {
    const task = this.tasks.get(id);
    if (!task) return null;

    const updated = new Task(
      task.id,
      patch.title ?? task.title,
      patch.description ?? task.description,
      patch.status ?? task.status,
      task.createdByAdminId,
      patch.assigneeUserId !== undefined ? patch.assigneeUserId : task.assigneeUserId,
      patch.priority ?? task.priority,
      patch.dueDate ?? task.dueDate,
      patch.tags ?? task.tags,
      task.createdAt,
      new Date()
    );
    this.tasks.set(id, updated);
    return updated;
  }

  async listAll(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async listByAssignee(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter((t) => t.assigneeUserId === userId);
  }

  async searchAndFilter(filters: {
    status?: TaskStatus;
    priority?: Priority;
    assigneeUserId?: string;
    tag?: string;
    searchQuery?: string;
    sortBy?: 'dueDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());
    if (filters.status) tasks = tasks.filter((t) => t.status === filters.status);
    if (filters.priority) tasks = tasks.filter((t) => t.priority === filters.priority);
    if (filters.assigneeUserId) tasks = tasks.filter((t) => t.assigneeUserId === filters.assigneeUserId);
    if (filters.tag) tasks = tasks.filter((t) => t.tags.includes(filters.tag!));
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return tasks;
  }

  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  clear(): void {
    this.tasks.clear();
  }
}

describe('TimeEntryService', () => {
  let mockTimeEntryRepo: MockTimeEntryRepository;
  let mockTaskRepo: MockTaskRepository;

  beforeEach(() => {
    mockTimeEntryRepo = new MockTimeEntryRepository();
    mockTaskRepo = new MockTaskRepository();
    // Inject mock repositories
    timeEntryService.setTimeEntryRepository(mockTimeEntryRepo);
    timeEntryService.setTaskRepositoryForTimeEntry(mockTaskRepo);
    // Mock activity service to avoid Firebase initialization
    activityService.setActivityRepository(null);
    vi.spyOn(activityService, 'createActivity').mockResolvedValue({} as any);
  });

  afterEach(() => {
    // Reset to null so it will use real repositories in production
    timeEntryService.setTimeEntryRepository(null);
    timeEntryService.setTaskRepositoryForTimeEntry(null);
  });

  describe('startTimeEntry', () => {
    it('should start a time entry successfully for assigned task', async () => {
      const userId = 'member123';
      const taskId = 'task1';
      const task = new Task(taskId, 'Test Task', 'Description', TaskStatus.TODO, 'admin', userId, Priority.MEDIUM, null, []);
      mockTaskRepo.addTask(task);

      const timeEntry = await timeEntryService.startTimeEntry(userId, taskId);

      expect(timeEntry).toBeDefined();
      expect(timeEntry.taskId).toBe(taskId);
      expect(timeEntry.userId).toBe(userId);
      expect(timeEntry.endTime).toBeNull();
      expect(timeEntry.durationSeconds).toBeNull();
    });

    it('should reject starting timer for unassigned task', async () => {
      const userId = 'member123';
      const taskId = 'task1';
      const task = new Task(taskId, 'Test Task', 'Description', TaskStatus.TODO, 'admin', null, Priority.MEDIUM, null, []);
      mockTaskRepo.addTask(task);

      await expect(timeEntryService.startTimeEntry(userId, taskId)).rejects.toThrow(
        'Forbidden: You can only start timer for tasks assigned to you'
      );
    });

    it('should reject starting timer for task assigned to another user', async () => {
      const userId = 'member123';
      const otherUserId = 'member456';
      const taskId = 'task1';
      const task = new Task(
        taskId,
        'Test Task',
        'Description',
        TaskStatus.TODO,
        'admin',
        otherUserId,
        Priority.MEDIUM,
        null,
        []
      );
      mockTaskRepo.addTask(task);

      await expect(timeEntryService.startTimeEntry(userId, taskId)).rejects.toThrow(
        'Forbidden: You can only start timer for tasks assigned to you'
      );
    });

    it('should reject starting if another active entry exists', async () => {
      const userId = 'member123';
      const taskId1 = 'task1';
      const taskId2 = 'task2';

      const task1 = new Task(taskId1, 'Task 1', 'Desc', TaskStatus.TODO, 'admin', userId, Priority.MEDIUM, null, []);
      const task2 = new Task(taskId2, 'Task 2', 'Desc', TaskStatus.TODO, 'admin', userId, Priority.MEDIUM, null, []);
      mockTaskRepo.addTask(task1);
      mockTaskRepo.addTask(task2);

      // Start first time entry
      const firstEntry = await timeEntryService.startTimeEntry(userId, taskId1);
      expect(firstEntry).toBeDefined();

      // Try to start second - should fail
      await expect(timeEntryService.startTimeEntry(userId, taskId2)).rejects.toThrow(
        'You already have an active time entry. Please stop it first.'
      );
    });

    it('should reject starting for non-existent task', async () => {
      const userId = 'member123';
      const taskId = 'nonexistent';

      await expect(timeEntryService.startTimeEntry(userId, taskId)).rejects.toThrow(
        'Task not found'
      );
    });
  });

  describe('stopTimeEntry', () => {
    it('should stop an active time entry and compute duration', async () => {
      const userId = 'member123';
      const taskId = 'task1';
      const startTime = new Date(Date.now() - 5000); // 5 seconds ago
      const timeEntry = new TimeEntry('entry1', taskId, userId, startTime, null, null);
      mockTimeEntryRepo.addTimeEntry(timeEntry);

      const stopped = await timeEntryService.stopTimeEntry(userId, 'entry1');

      expect(stopped).toBeDefined();
      expect(stopped?.endTime).not.toBeNull();
      expect(stopped?.durationSeconds).toBeGreaterThanOrEqual(4); // At least 4 seconds
      expect(stopped?.durationSeconds).toBeLessThan(10); // Less than 10 seconds
    });

    it('should reject stopping someone else\'s entry', async () => {
      const userId = 'member123';
      const otherUserId = 'member456';
      const taskId = 'task1';
      const startTime = new Date();
      const timeEntry = new TimeEntry('entry1', taskId, otherUserId, startTime, null, null);
      mockTimeEntryRepo.addTimeEntry(timeEntry);

      await expect(timeEntryService.stopTimeEntry(userId, 'entry1')).rejects.toThrow(
        'Forbidden: You can only stop your own time entries'
      );
    });

    it('should reject stopping already stopped entry', async () => {
      const userId = 'member123';
      const taskId = 'task1';
      const startTime = new Date(Date.now() - 10000);
      const endTime = new Date(Date.now() - 5000);
      const timeEntry = new TimeEntry('entry1', taskId, userId, startTime, endTime, 5);
      mockTimeEntryRepo.addTimeEntry(timeEntry);

      await expect(timeEntryService.stopTimeEntry(userId, 'entry1')).rejects.toThrow(
        'Time entry is already stopped'
      );
    });

    it('should return null if time entry does not exist', async () => {
      const userId = 'member123';

      const stopped = await timeEntryService.stopTimeEntry(userId, 'nonexistent');

      expect(stopped).toBeNull();
    });
  });

  describe('getActiveTimeEntry', () => {
    it('should return active time entry for user', async () => {
      const userId = 'member123';
      const taskId = 'task1';
      const startTime = new Date();
      const timeEntry = new TimeEntry('entry1', taskId, userId, startTime, null, null);
      mockTimeEntryRepo.addTimeEntry(timeEntry);

      const active = await timeEntryService.getActiveTimeEntry(userId);

      expect(active).toBeDefined();
      expect(active?.id).toBe('entry1');
      expect(active?.endTime).toBeNull();
    });

    it('should return null if no active entry exists', async () => {
      const userId = 'member123';

      const active = await timeEntryService.getActiveTimeEntry(userId);

      expect(active).toBeNull();
    });
  });
});
