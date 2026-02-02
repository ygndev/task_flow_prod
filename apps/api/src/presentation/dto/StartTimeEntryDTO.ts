import { BaseDTO } from './BaseDTO';

export class StartTimeEntryDTO extends BaseDTO {
  readonly taskId: string;

  constructor(data: { taskId: string }) {
    super();
    this.taskId = data.taskId;
  }

  validate(): void {
    if (!this.taskId || this.taskId.trim().length === 0) {
      throw new Error('Task ID is required');
    }
  }
}
