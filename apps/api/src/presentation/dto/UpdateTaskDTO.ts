import { BaseDTO } from './BaseDTO';
import { TaskStatus } from '../../domain/enums/TaskStatus';
import { Priority } from '../../domain/enums/Priority';

export class UpdateTaskDTO extends BaseDTO {
  readonly title?: string;
  readonly description?: string;
  readonly status?: TaskStatus;
  readonly assigneeUserId?: string | null;
  readonly priority?: Priority;
  readonly dueDate?: string | null;
  readonly tags?: string[];

  constructor(data: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    assigneeUserId?: string | null;
    priority?: Priority;
    dueDate?: string | null;
    tags?: string[];
  }) {
    super();
    this.title = data.title;
    this.description = data.description;
    this.status = data.status;
    this.assigneeUserId = data.assigneeUserId;
    this.priority = data.priority;
    this.dueDate = data.dueDate;
    this.tags = data.tags;
  }

  validate(): void {
    if (this.title !== undefined) {
      if (this.title.trim().length === 0) {
        throw new Error('Title cannot be empty');
      }
      if (this.title.length > 200) {
        throw new Error('Title must be 200 characters or less');
      }
    }

    if (this.description !== undefined) {
      if (this.description.trim().length === 0) {
        throw new Error('Description cannot be empty');
      }
      if (this.description.length > 2000) {
        throw new Error('Description must be 2000 characters or less');
      }
    }

    if (this.status !== undefined) {
      if (!Object.values(TaskStatus).includes(this.status)) {
        throw new Error(`Invalid status. Must be one of: ${Object.values(TaskStatus).join(', ')}`);
      }
    }

    if (this.priority !== undefined) {
      if (!Object.values(Priority).includes(this.priority)) {
        throw new Error(`Invalid priority. Must be one of: ${Object.values(Priority).join(', ')}`);
      }
    }

    if (this.tags !== undefined) {
      if (!Array.isArray(this.tags)) {
        throw new Error('Tags must be an array');
      }
      if (this.tags.some((tag) => typeof tag !== 'string' || tag.trim().length === 0)) {
        throw new Error('All tags must be non-empty strings');
      }
    }
  }
}
