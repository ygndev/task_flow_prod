import { BaseEntity } from './BaseEntity';
import { TaskStatus } from '../enums/TaskStatus';
import { Priority } from '../enums/Priority';

export class Task extends BaseEntity {
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly assigneeUserId: string | null;
  readonly createdByAdminId: string;
  readonly priority: Priority;
  readonly dueDate: Date | null;
  readonly tags: string[];

  constructor(
    id: string,
    title: string,
    description: string,
    status: TaskStatus,
    createdByAdminId: string,
    assigneeUserId: string | null = null,
    priority: Priority = Priority.MEDIUM,
    dueDate: Date | null = null,
    tags: string[] = [],
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this.title = title;
    this.description = description;
    this.status = status;
    this.assigneeUserId = assigneeUserId;
    this.createdByAdminId = createdByAdminId;
    this.priority = priority;
    this.dueDate = dueDate;
    this.tags = tags;
  }
}
