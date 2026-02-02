import { Task } from '../../../domain/entities/Task';
import { TaskStatus } from '../../../domain/enums/TaskStatus';
import { Priority } from '../../../domain/enums/Priority';

export interface ITaskRepository {
  create(task: Task): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  update(id: string, patch: Partial<Task>): Promise<Task | null>;
  listAll(): Promise<Task[]>;
  listByAssignee(userId: string): Promise<Task[]>;
  searchAndFilter(filters: {
    status?: TaskStatus;
    priority?: Priority;
    assigneeUserId?: string;
    tag?: string;
    searchQuery?: string;
    sortBy?: 'dueDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Task[]>;
}
