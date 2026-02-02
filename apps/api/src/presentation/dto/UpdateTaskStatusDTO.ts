import { BaseDTO } from './BaseDTO';
import { TaskStatus } from '../../domain/enums/TaskStatus';

export class UpdateTaskStatusDTO extends BaseDTO {
  readonly status: TaskStatus;

  constructor(data: { status: string }) {
    super();
    this.status = data.status as TaskStatus;
  }

  validate(): void {
    if (!this.status) {
      throw new Error('Status is required');
    }

    if (!Object.values(TaskStatus).includes(this.status)) {
      throw new Error(`Invalid status. Must be one of: ${Object.values(TaskStatus).join(', ')}`);
    }
  }
}
