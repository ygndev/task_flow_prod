import { BaseDTO } from './BaseDTO';
import { Priority } from '../../domain/enums/Priority';

export class CreateTaskDTO extends BaseDTO {
  readonly title: string;
  readonly description: string;
  readonly assigneeUserId?: string | null;
  readonly priority?: Priority;
  readonly dueDate?: string | null;
  readonly tags?: string[];

  constructor(data: {
    title: string;
    description: string;
    assigneeUserId?: string | null;
    priority?: Priority;
    dueDate?: string | null;
    tags?: string[];
  }) {
    super();
    this.title = data.title;
    this.description = data.description;
    this.assigneeUserId = data.assigneeUserId ?? null;
    this.priority = data.priority;
    this.dueDate = data.dueDate;
    this.tags = data.tags;
  }

  validate(): void {
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Title is required');
    }

    if (!this.description || this.description.trim().length === 0) {
      throw new Error('Description is required');
    }

    if (this.title.length > 200) {
      throw new Error('Title must be 200 characters or less');
    }

    if (this.description.length > 2000) {
      throw new Error('Description must be 2000 characters or less');
    }
  }
}
