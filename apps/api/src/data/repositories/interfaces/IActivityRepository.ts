import { Activity } from '../../../domain/entities/Activity';

export interface IActivityRepository {
  create(activity: Activity): Promise<Activity>;
  findByTaskId(taskId: string): Promise<Activity[]>;
}
