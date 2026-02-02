import { BaseEntity } from './BaseEntity';

export class TimeEntry extends BaseEntity {
  readonly taskId: string;
  readonly userId: string;
  readonly startTime: Date;
  readonly endTime: Date | null;
  readonly durationSeconds: number | null;

  constructor(
    id: string,
    taskId: string,
    userId: string,
    startTime: Date,
    endTime: Date | null = null,
    durationSeconds: number | null = null,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this.taskId = taskId;
    this.userId = userId;
    this.startTime = startTime;
    this.endTime = endTime;
    this.durationSeconds = durationSeconds;
  }
}
