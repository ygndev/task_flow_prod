import { randomUUID } from 'crypto';
import { Comment } from '../../domain/entities/Comment';
import { ActivityType } from '../../domain/entities/Activity';
import { ICommentRepository } from '../../data/repositories/interfaces/ICommentRepository';
import { FirestoreCommentRepository } from '../../data/repositories/implementations/FirestoreCommentRepository';
import { ITaskRepository } from '../../data/repositories/interfaces/ITaskRepository';
import { FirestoreTaskRepository } from '../../data/repositories/implementations/FirestoreTaskRepository';
import { Role } from '../../domain/enums/Role';
import { logger } from '../../infrastructure/logger';
import { createActivity } from './activity.service';

// Singleton repository instances
let commentRepository: ICommentRepository | null = null;
let taskRepository: ITaskRepository | null = null;

function getCommentRepository(): ICommentRepository {
  if (!commentRepository) {
    commentRepository = new FirestoreCommentRepository();
  }
  return commentRepository;
}

function getTaskRepository(): ITaskRepository {
  if (!taskRepository) {
    taskRepository = new FirestoreTaskRepository();
  }
  return taskRepository;
}

// Export for testing
export function setCommentRepository(repo: ICommentRepository | null): void {
  commentRepository = repo;
}

export function setTaskRepositoryForComment(repo: ITaskRepository | null): void {
  taskRepository = repo;
}

/**
 * Create a comment on a task
 * RBAC: ADMIN can comment on any task, MEMBER can only comment on assigned tasks
 */
export async function createComment(
  taskId: string,
  userId: string,
  userRole: Role,
  text: string
): Promise<Comment> {
  const taskRepo = getTaskRepository();
  const commentRepo = getCommentRepository();

  // Check task exists
  const task = await taskRepo.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  // RBAC check
  if (userRole !== Role.ADMIN && task.assigneeUserId !== userId) {
    throw new Error('Forbidden: You can only comment on tasks assigned to you');
  }

  const comment = new Comment(randomUUID(), taskId, userId, text);
  const created = await commentRepo.create(comment);

  // Log activity
  await createActivity(taskId, ActivityType.COMMENT_ADDED, `Added a comment`, userId);

  logger.info(`Comment created: ${created.id} on task ${taskId} by user ${userId}`);
  return created;
}

/**
 * List comments for a task
 * RBAC: ADMIN can view comments on any task, MEMBER can only view comments on assigned tasks
 */
export async function listComments(taskId: string, userId: string, userRole: Role): Promise<Comment[]> {
  const taskRepo = getTaskRepository();
  const commentRepo = getCommentRepository();

  // Check task exists
  const task = await taskRepo.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  // RBAC check
  if (userRole !== Role.ADMIN && task.assigneeUserId !== userId) {
    throw new Error('Forbidden: You can only view comments on tasks assigned to you');
  }

  return commentRepo.findByTaskId(taskId);
}
