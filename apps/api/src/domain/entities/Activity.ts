import { BaseEntity } from './BaseEntity';

export enum ActivityType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_PRIORITY_CHANGED = 'TASK_PRIORITY_CHANGED',
  TASK_DUE_DATE_CHANGED = 'TASK_DUE_DATE_CHANGED',
  TASK_TAGS_CHANGED = 'TASK_TAGS_CHANGED',
  TIMER_STARTED = 'TIMER_STARTED',
  TIMER_STOPPED = 'TIMER_STOPPED',
  COMMENT_ADDED = 'COMMENT_ADDED',
}

export class Activity extends BaseEntity {
  readonly taskId: string;
  readonly type: ActivityType;
  readonly message: string;
  readonly actorUserId: string;

  constructor(
    id: string,
    taskId: string,
    type: ActivityType,
    message: string,
    actorUserId: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this.taskId = taskId;
    this.type = type;
    this.message = message;
    this.actorUserId = actorUserId;
  }
}
