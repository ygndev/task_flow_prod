import { BaseDTO } from './BaseDTO';

export class StopTimeEntryDTO extends BaseDTO {
  readonly timeEntryId: string;

  constructor(data: { timeEntryId: string }) {
    super();
    this.timeEntryId = data.timeEntryId;
  }

  validate(): void {
    if (!this.timeEntryId || this.timeEntryId.trim().length === 0) {
      throw new Error('Time entry ID is required');
    }
  }
}
