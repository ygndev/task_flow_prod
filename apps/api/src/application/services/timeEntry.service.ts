import { randomUUID } from 'crypto';
import { TimeEntry } from '../../domain/entities/TimeEntry';
import { ActivityType } from '../../domain/entities/Activity';
import { ITimeEntryRepository } from '../../data/repositories/interfaces/ITimeEntryRepository';
import { FirestoreTimeEntryRepository } from '../../data/repositories/implementations/FirestoreTimeEntryRepository';
import { ITaskRepository } from '../../data/repositories/interfaces/ITaskRepository';
import { FirestoreTaskRepository } from '../../data/repositories/implementations/FirestoreTaskRepository';
import { computeDurationSeconds } from '../../domain/validators/timeEntryValidators';
import { logger } from '../../infrastructure/logger';
import { createActivity } from './activity.service';

/**
 * Time Entry Service
 * Handles time tracking business logic with RBAC rules:
 * - MEMBER can start timer only for assigned tasks
 * - Only ONE active time entry per user at a time
 * - Stop can only stop user's own active entry
 * - durationSeconds computed on stop (server-side)
 */

// Singleton repository instances
let timeEntryRepository: ITimeEntryRepository | null = null;
let taskRepository: ITaskRepository | null = null;

function getTimeEntryRepository(): ITimeEntryRepository {
  if (!timeEntryRepository) {
    timeEntryRepository = new FirestoreTimeEntryRepository();
  }
  return timeEntryRepository;
}

function getTaskRepository(): ITaskRepository {
  if (!taskRepository) {
    taskRepository = new FirestoreTaskRepository();
  }
  return taskRepository;
}

// Export for testing - allows injection of mock repositories
export function setTimeEntryRepository(repo: ITimeEntryRepository | null): void {
  timeEntryRepository = repo;
}

export function setTaskRepositoryForTimeEntry(repo: ITaskRepository | null): void {
  taskRepository = repo;
}

/**
 * Start a time entry for a task
 * RULE: Member can only start timer for assigned tasks
 * RULE: Only ONE active time entry per user at a time
 */
export async function startTimeEntry(
  userId: string,
  taskId: string
): Promise<TimeEntry> {
  const timeEntryRepo = getTimeEntryRepository();
  const taskRepo = getTaskRepository();

  // Check if task exists and is assigned to user
  const task = await taskRepo.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  if (task.assigneeUserId !== userId) {
    throw new Error('Forbidden: You can only start timer for tasks assigned to you');
  }

  // Check if user already has an active time entry
  const activeEntry = await timeEntryRepo.findActiveByUser(userId);
  if (activeEntry) {
    throw new Error('You already have an active time entry. Please stop it first.');
  }

  // Create new time entry
  const now = new Date();
  const timeEntry = new TimeEntry(randomUUID(), taskId, userId, now, null, null);

  const created = await timeEntryRepo.create(timeEntry);
  logger.info(`Time entry started: ${created.id} for task ${taskId} by user ${userId}`);
  
  // Log activity
  await createActivity(taskId, ActivityType.TIMER_STARTED, `Started timer`, userId);
  
  return created;
}

/**
 * Stop an active time entry
 * RULE: Stop can only stop user's own active entry
 * RULE: durationSeconds computed on stop (server-side)
 */
export async function stopTimeEntry(
  userId: string,
  timeEntryId: string
): Promise<TimeEntry | null> {
  const timeEntryRepo = getTimeEntryRepository();

  // Find the time entry
  const timeEntry = await timeEntryRepo.findById(timeEntryId);
  if (!timeEntry) {
    return null;
  }

  // Check if it belongs to the user
  if (timeEntry.userId !== userId) {
    throw new Error('Forbidden: You can only stop your own time entries');
  }

  // Check if it's already stopped
  if (timeEntry.endTime !== null) {
    throw new Error('Time entry is already stopped');
  }

  // Compute duration and stop
  const now = new Date();
  const durationSeconds = computeDurationSeconds(timeEntry.startTime, now);

  const updated = await timeEntryRepo.update(timeEntryId, {
    endTime: now,
    durationSeconds,
  });

  if (updated) {
    logger.info(
      `Time entry stopped: ${timeEntryId} by user ${userId}, duration: ${durationSeconds}s`
    );
    
    // Log activity
    await createActivity(
      timeEntry.taskId,
      ActivityType.TIMER_STOPPED,
      `Stopped timer (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`,
      userId
    );
  }

  return updated;
}

/**
 * Get active time entry for a user
 */
export async function getActiveTimeEntry(userId: string): Promise<TimeEntry | null> {
  const timeEntryRepo = getTimeEntryRepository();
  return timeEntryRepo.findActiveByUser(userId);
}

/**
 * Get today's time tracking summary for a user
 */
export async function getTodaySummary(userId: string): Promise<{
  totalTodaySeconds: number;
  perTaskTodaySeconds: Record<string, number>;
  completedTasksTodayCount: number;
}> {
  const timeEntryRepo = getTimeEntryRepository();
  const taskRepo = getTaskRepository();

  // Get today's date range (start of day to now)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = now;

  // Get all completed time entries for today
  const todayEntries = await timeEntryRepo.listCompletedInRange(todayStart, todayEnd);
  
  // Filter to only this user's entries
  const userEntries = todayEntries.filter((entry) => entry.userId === userId);

  // Calculate totals
  let totalTodaySeconds = 0;
  const perTaskTodaySeconds: Record<string, number> = {};

  for (const entry of userEntries) {
    if (entry.durationSeconds !== null && entry.durationSeconds > 0) {
      totalTodaySeconds += entry.durationSeconds;
      perTaskTodaySeconds[entry.taskId] = (perTaskTodaySeconds[entry.taskId] || 0) + entry.durationSeconds;
    }
  }

  // Count tasks completed today (status changed to DONE today)
  // We'll check all assigned tasks and see which ones are DONE
  const assignedTasks = await taskRepo.listByAssignee(userId);
  const completedTasksToday = assignedTasks.filter((task) => {
    if (task.status !== 'DONE') return false;
    // Check if updated today (rough check - if updatedAt is today)
    const updatedAt = task.updatedAt || task.createdAt;
    if (!updatedAt) return false;
    const updatedDate = new Date(updatedAt);
    return updatedDate >= todayStart && updatedDate <= todayEnd;
  });

  return {
    totalTodaySeconds,
    perTaskTodaySeconds,
    completedTasksTodayCount: completedTasksToday.length,
  };
}
