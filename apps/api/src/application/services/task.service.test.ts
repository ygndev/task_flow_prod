import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Task } from '../../domain/entities/Task';
import { TaskStatus } from '../../domain/enums/TaskStatus';
import { Priority } from '../../domain/enums/Priority';
import { ITaskRepository } from '../../data/repositories/interfaces/ITaskRepository';
import * as taskService from './task.service';
import * as activityService from './activity.service';

/**
 * Task Service Unit Tests
 * Tests business logic rules, especially RBAC constraints
 */

// Mock repository implementation
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

    if (filters.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }
    if (filters.priority) {
      tasks = tasks.filter((t) => t.priority === filters.priority);
    }
    if (filters.assigneeUserId) {
      tasks = tasks.filter((t) => t.assigneeUserId === filters.assigneeUserId);
    }
    if (filters.tag) {
      tasks = tasks.filter((t) => t.tags.includes(filters.tag!));
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      tasks = tasks.filter(
        (t) => t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)
      );
    }

    return tasks;
  }

  // Helper to add tasks for testing
  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  clear(): void {
    this.tasks.clear();
  }
}

describe('TaskService', () => {
  let mockRepo: MockTaskRepository;

  beforeEach(() => {
    mockRepo = new MockTaskRepository();
    // Inject mock repository
    taskService.setTaskRepository(mockRepo);
    // Mock activity service to avoid Firebase initialization
    activityService.setActivityRepository(null);
    vi.spyOn(activityService, 'createActivity').mockResolvedValue({} as any);
  });

  afterEach(() => {
    // Reset to null so it will use real repository in production
    taskService.setTaskRepository(null);
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const adminId = 'admin123';
      const task = await taskService.createTask(adminId, 'Test Task', 'Test Description', null);

      expect(task).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.status).toBe(TaskStatus.TODO);
      expect(task.createdByAdminId).toBe(adminId);
      expect(task.assigneeUserId).toBeNull();
    });

    it('should create a task with assignee', async () => {
      const adminId = 'admin123';
      const memberId = 'member456';
      const task = await taskService.createTask(adminId, 'Test Task', 'Test Description', memberId);

      expect(task.assigneeUserId).toBe(memberId);
    });
  });

  describe('updateTaskStatusAsMember - RBAC Rules', () => {
    it('should allow member to update status of assigned task', async () => {
      const memberId = 'member123';
      const task = new Task(
        'task1',
        'Test Task',
        'Description',
        TaskStatus.TODO,
        'admin123',
        memberId,
        Priority.MEDIUM,
        null,
        []
      );
      mockRepo.addTask(task);

      const updated = await taskService.updateTaskStatusAsMember('task1', memberId, TaskStatus.IN_PROGRESS);

      expect(updated).toBeDefined();
      expect(updated?.status).toBe(TaskStatus.IN_PROGRESS);
      expect(updated?.assigneeUserId).toBe(memberId);
    });

    it('should reject member updating status of task not assigned to them', async () => {
      const memberId = 'member123';
      const otherMemberId = 'member456';
      const task = new Task(
        'task1',
        'Test Task',
        'Description',
        TaskStatus.TODO,
        'admin123',
        otherMemberId, // Task assigned to different member
        Priority.MEDIUM,
        null,
        []
      );
      mockRepo.addTask(task);

      await expect(
        taskService.updateTaskStatusAsMember('task1', memberId, TaskStatus.IN_PROGRESS)
      ).rejects.toThrow('Forbidden: You can only update status of tasks assigned to you');
    });

    it('should return null if task does not exist', async () => {
      const memberId = 'member123';

      const updated = await taskService.updateTaskStatusAsMember('nonexistent', memberId, TaskStatus.DONE);

      expect(updated).toBeNull();
    });

    it('should reject member updating unassigned task', async () => {
      const memberId = 'member123';
      const task = new Task(
        'task1',
        'Test Task',
        'Description',
        TaskStatus.TODO,
        'admin123',
        null, // Unassigned task
        Priority.MEDIUM,
        null,
        []
      );
      mockRepo.addTask(task);

      await expect(
        taskService.updateTaskStatusAsMember('task1', memberId, TaskStatus.IN_PROGRESS)
      ).rejects.toThrow('Forbidden: You can only update status of tasks assigned to you');
    });
  });

  describe('listTasksForMember', () => {
    it('should return only tasks assigned to the member', async () => {
      const memberId = 'member123';
      const otherMemberId = 'member456';

      // Create tasks
      const task1 = new Task('task1', 'Task 1', 'Desc', TaskStatus.TODO, 'admin', memberId);
      const task2 = new Task('task2', 'Task 2', 'Desc', TaskStatus.TODO, 'admin', memberId);
      const task3 = new Task('task3', 'Task 3', 'Desc', TaskStatus.TODO, 'admin', otherMemberId, Priority.MEDIUM, null, []);
      const task4 = new Task('task4', 'Task 4', 'Desc', TaskStatus.TODO, 'admin', null, Priority.MEDIUM, null, []);

      mockRepo.addTask(task1);
      mockRepo.addTask(task2);
      mockRepo.addTask(task3);
      mockRepo.addTask(task4);

      const tasks = await taskService.listTasksForMember(memberId);

      expect(tasks).toHaveLength(2);
      expect(tasks.every((t) => t.assigneeUserId === memberId)).toBe(true);
      expect(tasks.find((t) => t.id === 'task3')).toBeUndefined();
      expect(tasks.find((t) => t.id === 'task4')).toBeUndefined();
    });

    it('should return empty array if member has no assigned tasks', async () => {
      const memberId = 'member123';
      const otherMemberId = 'member456';

      const task = new Task('task1', 'Task 1', 'Desc', TaskStatus.TODO, 'admin', otherMemberId, Priority.MEDIUM, null, []);
      mockRepo.addTask(task);

      const tasks = await taskService.listTasksForMember(memberId);

      expect(tasks).toHaveLength(0);
    });
  });
});
