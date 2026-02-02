import { BaseEntity } from './BaseEntity';

export class Comment extends BaseEntity {
  readonly taskId: string;
  readonly userId: string;
  readonly text: string;

  constructor(
    id: string,
    taskId: string,
    userId: string,
    text: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this.taskId = taskId;
    this.userId = userId;
    this.text = text;
  }
}
