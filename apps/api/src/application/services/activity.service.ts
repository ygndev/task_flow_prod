import { randomUUID } from 'crypto';
import { Activity, ActivityType } from '../../domain/entities/Activity';
import { IActivityRepository } from '../../data/repositories/interfaces/IActivityRepository';
import { FirestoreActivityRepository } from '../../data/repositories/implementations/FirestoreActivityRepository';
import { ITaskRepository } from '../../data/repositories/interfaces/ITaskRepository';
import { FirestoreTaskRepository } from '../../data/repositories/implementations/FirestoreTaskRepository';
import { Role } from '../../domain/enums/Role';
import { logger } from '../../infrastructure/logger';

// Singleton repository instances
let activityRepository: IActivityRepository | null = null;
let taskRepository: ITaskRepository | null = null;

function getActivityRepository(): IActivityRepository {
  if (!activityRepository) {
    activityRepository = new FirestoreActivityRepository();
  }
  return activityRepository;
}

function getTaskRepository(): ITaskRepository {
  if (!taskRepository) {
    taskRepository = new FirestoreTaskRepository();
  }
  return taskRepository;
}

// Export for testing
export function setActivityRepository(repo: IActivityRepository | null): void {
  activityRepository = repo;
}

export function setTaskRepositoryForActivity(repo: ITaskRepository | null): void {
  taskRepository = repo;
}

/**
 * Create an activity entry
 */
export async function createActivity(
  taskId: string,
  type: ActivityType,
  message: string,
  actorUserId: string
): Promise<Activity> {
  const activityRepo = getActivityRepository();
  const activity = new Activity(randomUUID(), taskId, type, message, actorUserId);
  const created = await activityRepo.create(activity);
  logger.debug(`Activity created: ${created.id} on task ${taskId}`);
  return created;
}

/**
 * List activities for a task
 * RBAC: ADMIN can view activities on any task, MEMBER can only view activities on assigned tasks
 */
export async function listActivities(taskId: string, userId: string, userRole: Role): Promise<Activity[]> {
  const taskRepo = getTaskRepository();
  const activityRepo = getActivityRepository();

  // Check task exists
  const task = await taskRepo.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  // RBAC check
  if (userRole !== Role.ADMIN && task.assigneeUserId !== userId) {
    throw new Error('Forbidden: You can only view activities on tasks assigned to you');
  }

  return activityRepo.findByTaskId(taskId);
}
