import { Comment } from '../../../domain/entities/Comment';

export interface ICommentRepository {
  create(comment: Comment): Promise<Comment>;
  findByTaskId(taskId: string): Promise<Comment[]>;
  findById(id: string): Promise<Comment | null>;
  delete(id: string): Promise<void>;
}
