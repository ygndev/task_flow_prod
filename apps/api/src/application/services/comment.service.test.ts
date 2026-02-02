import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Role } from '../../domain/enums/Role';
import { Task } from '../../domain/entities/Task';
import { TaskStatus } from '../../domain/enums/TaskStatus';
import { Priority } from '../../domain/enums/Priority';
import { ICommentRepository } from '../../data/repositories/interfaces/ICommentRepository';
import { ITaskRepository } from '../../data/repositories/interfaces/ITaskRepository';
import * as commentService from './comment.service';
import * as activityService from './activity.service';

// Mock repositories
class MockCommentRepository implements ICommentRepository {
  private comments: Map<string, any> = new Map();

  async create(comment: any): Promise<any> {
    this.comments.set(comment.id, comment);
    return comment;
  }

  async findByTaskId(taskId: string): Promise<any[]> {
    return Array.from(this.comments.values()).filter((c) => c.taskId === taskId);
  }

  async findById(id: string): Promise<any | null> {
    return this.comments.get(id) || null;
  }

  async delete(id: string): Promise<void> {
    this.comments.delete(id);
  }
}

class MockTaskRepository implements ITaskRepository {
  private tasks: Map<string, Task> = new Map();

  async findById(id: string): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  async create(task: Task): Promise<Task> {
    this.tasks.set(task.id, task);
    return task;
  }

  async update(_id: string, _patch: Partial<Task>): Promise<Task | null> {
    return null;
  }

  async listAll(): Promise<Task[]> {
    return [];
  }

  async listByAssignee(_userId: string): Promise<Task[]> {
    return [];
  }

  async searchAndFilter(): Promise<Task[]> {
    return [];
  }

  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }
}

describe('CommentService', () => {
  let mockCommentRepo: MockCommentRepository;
  let mockTaskRepo: MockTaskRepository;

  beforeEach(() => {
    mockCommentRepo = new MockCommentRepository();
    mockTaskRepo = new MockTaskRepository();
    commentService.setCommentRepository(mockCommentRepo);
    commentService.setTaskRepositoryForComment(mockTaskRepo);
    activityService.setActivityRepository(null);
    vi.spyOn(activityService, 'createActivity').mockResolvedValue({} as any);
  });

  afterEach(() => {
    commentService.setCommentRepository(null);
    commentService.setTaskRepositoryForComment(null);
  });

  it('should allow ADMIN to comment on any task', async () => {
    const task = new Task('task1', 'Task', 'Desc', TaskStatus.TODO, 'admin', 'member1', Priority.MEDIUM, null, []);
    mockTaskRepo.addTask(task);

    const comment = await commentService.createComment('task1', 'admin1', Role.ADMIN, 'Test comment');

    expect(comment).toBeDefined();
    expect(comment.text).toBe('Test comment');
  });

  it('should allow MEMBER to comment on assigned task', async () => {
    const task = new Task('task1', 'Task', 'Desc', TaskStatus.TODO, 'admin', 'member1', Priority.MEDIUM, null, []);
    mockTaskRepo.addTask(task);

    const comment = await commentService.createComment('task1', 'member1', Role.MEMBER, 'Test comment');

    expect(comment).toBeDefined();
    expect(comment.text).toBe('Test comment');
  });

  it('should reject MEMBER commenting on unassigned task', async () => {
    const task = new Task('task1', 'Task', 'Desc', TaskStatus.TODO, 'admin', null, Priority.MEDIUM, null, []);
    mockTaskRepo.addTask(task);

    await expect(
      commentService.createComment('task1', 'member1', Role.MEMBER, 'Test comment')
    ).rejects.toThrow('Forbidden: You can only comment on tasks assigned to you');
  });

  it('should reject MEMBER commenting on task assigned to another user', async () => {
    const task = new Task('task1', 'Task', 'Desc', TaskStatus.TODO, 'admin', 'member2', Priority.MEDIUM, null, []);
    mockTaskRepo.addTask(task);

    await expect(
      commentService.createComment('task1', 'member1', Role.MEMBER, 'Test comment')
    ).rejects.toThrow('Forbidden: You can only comment on tasks assigned to you');
  });

  it('should list comments for task', async () => {
    const task = new Task('task1', 'Task', 'Desc', TaskStatus.TODO, 'admin', 'member1', Priority.MEDIUM, null, []);
    mockTaskRepo.addTask(task);

    await commentService.createComment('task1', 'member1', Role.MEMBER, 'Comment 1');
    await commentService.createComment('task1', 'member1', Role.MEMBER, 'Comment 2');

    const comments = await commentService.listComments('task1', 'member1', Role.MEMBER);

    expect(comments).toHaveLength(2);
  });
});
