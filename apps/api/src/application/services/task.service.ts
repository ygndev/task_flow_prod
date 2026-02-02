import { randomUUID } from 'crypto';
import { Task } from '../../domain/entities/Task';
import { TaskStatus } from '../../domain/enums/TaskStatus';
import { Priority } from '../../domain/enums/Priority';
import { ITaskRepository } from '../../data/repositories/interfaces/ITaskRepository';
import { FirestoreTaskRepository } from '../../data/repositories/implementations/FirestoreTaskRepository';
import { logger } from '../../infrastructure/logger';
import { createActivity } from './activity.service';
import { ActivityType } from '../../domain/entities/Activity';

/**
 * Task Service
 * Handles task-related business logic with RBAC rules:
 * - ADMIN: can create, update all fields, assign tasks, list all tasks
 * - MEMBER: can only list assigned tasks, update status of assigned tasks
 */

// Singleton repository instance
let taskRepository: ITaskRepository | null = null;

function getTaskRepository(): ITaskRepository {
  if (!taskRepository) {
    taskRepository = new FirestoreTaskRepository();
  }
  return taskRepository;
}

// Export for testing - allows injection of mock repository
export function setTaskRepository(repo: ITaskRepository | null): void {
  taskRepository = repo;
}

/**
 * Create a new task (Admin only)
 */
export async function createTask(
  adminId: string,
  title: string,
  description: string,
  assigneeUserId: string | null = null,
  priority: Priority = Priority.MEDIUM,
  dueDate: Date | null = null,
  tags: string[] = []
): Promise<Task> {
  const repo = getTaskRepository();
  const task = new Task(
    randomUUID(),
    title,
    description,
    TaskStatus.TODO,
    adminId,
    assigneeUserId,
    priority,
    dueDate,
    tags
  );

  const created = await repo.create(task);
  logger.info(`Task created: ${created.id} by ${adminId}`);
  
  // Log activity
  await createActivity(created.id, ActivityType.TASK_CREATED, `Task "${title}" created`, adminId);
  if (assigneeUserId) {
    await createActivity(created.id, ActivityType.TASK_ASSIGNED, `Assigned to user ${assigneeUserId}`, adminId);
  }
  
  return created;
}

/**
 * Update task as admin (can update all fields)
 */
export async function updateTaskAsAdmin(
  taskId: string,
  patch: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    assigneeUserId?: string | null;
    priority?: Priority;
    dueDate?: Date | null;
    tags?: string[];
  },
  actorUserId: string
): Promise<Task | null> {
  const repo = getTaskRepository();
  const existing = await repo.findById(taskId);
  if (!existing) {
    return null;
  }

  const updated = await repo.update(taskId, patch);

  if (updated) {
    logger.info(`Task updated by admin: ${taskId}`);
    
    // Log activity for changes
    if (patch.status !== undefined && patch.status !== existing.status) {
      await createActivity(taskId, ActivityType.TASK_STATUS_CHANGED, `Status changed to ${patch.status}`, actorUserId);
    }
    if (patch.assigneeUserId !== undefined && patch.assigneeUserId !== existing.assigneeUserId) {
      await createActivity(
        taskId,
        ActivityType.TASK_ASSIGNED,
        patch.assigneeUserId ? `Assigned to user ${patch.assigneeUserId}` : 'Unassigned',
        actorUserId
      );
    }
    if (patch.priority !== undefined && patch.priority !== existing.priority) {
      await createActivity(taskId, ActivityType.TASK_PRIORITY_CHANGED, `Priority changed to ${patch.priority}`, actorUserId);
    }
    if (patch.dueDate !== undefined) {
      const dueDateStr = patch.dueDate ? patch.dueDate.toISOString().split('T')[0] : 'None';
      await createActivity(taskId, ActivityType.TASK_DUE_DATE_CHANGED, `Due date set to ${dueDateStr}`, actorUserId);
    }
    if (patch.tags !== undefined && JSON.stringify(patch.tags) !== JSON.stringify(existing.tags)) {
      await createActivity(taskId, ActivityType.TASK_TAGS_CHANGED, `Tags updated`, actorUserId);
    }
  }

  return updated;
}

/**
 * Assign task to a member (Admin only)
 */
export async function assignTask(taskId: string, assigneeUserId: string | null, actorUserId: string): Promise<Task | null> {
  const repo = getTaskRepository();
  const updated = await repo.update(taskId, { assigneeUserId });

  if (updated) {
    logger.info(`Task ${taskId} assigned to ${assigneeUserId || 'unassigned'}`);
    await createActivity(
      taskId,
      ActivityType.TASK_ASSIGNED,
      assigneeUserId ? `Assigned to user ${assigneeUserId}` : 'Unassigned',
      actorUserId
    );
  }

  return updated;
}

/**
 * List all tasks (Admin only) with optional filtering
 */
export async function listTasksForAdmin(filters?: {
  status?: TaskStatus;
  priority?: Priority;
  assigneeUserId?: string;
  tag?: string;
  searchQuery?: string;
  sortBy?: 'dueDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}): Promise<Task[]> {
  const repo = getTaskRepository();
  if (filters && Object.keys(filters).length > 0) {
    return repo.searchAndFilter(filters);
  }
  return repo.listAll();
}

/**
 * List tasks assigned to a member with optional filtering
 */
export async function listTasksForMember(
  memberId: string,
  filters?: {
    status?: TaskStatus;
    priority?: Priority;
    tag?: string;
    searchQuery?: string;
    sortBy?: 'dueDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }
): Promise<Task[]> {
  const repo = getTaskRepository();
  const memberFilters = {
    ...filters,
    assigneeUserId: memberId,
  };
  if (filters && Object.keys(filters).length > 0) {
    return repo.searchAndFilter(memberFilters);
  }
  return repo.listByAssignee(memberId);
}

/**
 * Update task status as member
 * RULE: Member can only update status of tasks assigned to them
 */
export async function updateTaskStatusAsMember(
  taskId: string,
  memberId: string,
  status: TaskStatus
): Promise<Task | null> {
  const repo = getTaskRepository();
  const task = await repo.findById(taskId);

  if (!task) {
    return null;
  }

  // Business rule: Member can only update status of tasks assigned to them
  if (task.assigneeUserId !== memberId) {
    throw new Error('Forbidden: You can only update status of tasks assigned to you');
  }

  const updated = await repo.update(taskId, { status });

  if (updated) {
    logger.info(`Task ${taskId} status updated to ${status} by member ${memberId}`);
    await createActivity(taskId, ActivityType.TASK_STATUS_CHANGED, `Status changed to ${status}`, memberId);
  }

  return updated;
}

/**
 * Complete a task (stop timer if active, then mark DONE)
 * RULE: Member can only complete assigned tasks
 */
export async function completeTask(taskId: string, memberId: string): Promise<{
  task: Task;
  stoppedTimeEntry: import('../../domain/entities/TimeEntry').TimeEntry | null;
}> {
  const repo = getTaskRepository();
  const task = await repo.findById(taskId);

  if (!task) {
    throw new Error('Task not found');
  }

  // RBAC check
  if (task.assigneeUserId !== memberId) {
    throw new Error('Forbidden: You can only complete tasks assigned to you');
  }

  // Check if there's an active time entry for this task
  const { getActiveTimeEntry, stopTimeEntry } = await import('./timeEntry.service');
  const activeEntry = await getActiveTimeEntry(memberId);
  
  let stoppedTimeEntry: import('../../domain/entities/TimeEntry').TimeEntry | null = null;
  
  // If active entry exists and it's for this task, stop it first
  if (activeEntry && activeEntry.taskId === taskId) {
    stoppedTimeEntry = await stopTimeEntry(memberId, activeEntry.id);
  }

  // Mark task as DONE
  const updated = await repo.update(taskId, { status: TaskStatus.DONE });

  if (!updated) {
    throw new Error('Failed to update task');
  }

  // Log activity
  await createActivity(taskId, ActivityType.TASK_STATUS_CHANGED, `Task completed`, memberId);

  return {
    task: updated,
    stoppedTimeEntry,
  };
}
