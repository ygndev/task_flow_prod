import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '../../../infrastructure';
import { Comment } from '../../../domain/entities/Comment';
import { ICommentRepository } from '../interfaces/ICommentRepository';

export class FirestoreCommentRepository implements ICommentRepository {
  private getCommentsCollection(taskId: string) {
    return `tasks/${taskId}/comments`;
  }

  async create(comment: Comment): Promise<Comment> {
    const db = getAdminFirestore();
    const now = new Date();
    const commentData = {
      taskId: comment.taskId,
      userId: comment.userId,
      text: comment.text,
      createdAt: Timestamp.fromDate(comment.createdAt || now),
      updatedAt: Timestamp.fromDate(comment.updatedAt || now),
    };

    await db
      .collection(this.getCommentsCollection(comment.taskId))
      .doc(comment.id)
      .set(commentData);

    return comment;
  }

  async findByTaskId(taskId: string): Promise<Comment[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(this.getCommentsCollection(taskId))
      .orderBy('createdAt', 'asc')
      .get();

    return snapshot.docs.map((doc) => this.mapDocumentToComment(doc.id, doc.data() ?? undefined));
  }

  async findById(id: string): Promise<Comment | null> {
    // Note: This requires knowing the taskId, so we'd need to refactor or use a different approach
    // For now, we'll search across all tasks (inefficient but works for MVP)
    const db = getAdminFirestore();
    const tasksSnapshot = await db.collection('tasks').get();

    for (const taskDoc of tasksSnapshot.docs) {
      const commentDoc = await db
        .collection(this.getCommentsCollection(taskDoc.id))
        .doc(id)
        .get();

      if (commentDoc.exists) {
        return this.mapDocumentToComment(commentDoc.id, commentDoc.data() ?? undefined);
      }
    }

    return null;
  }

  async delete(id: string): Promise<void> {
    // Similar to findById, we need to search across tasks
    const db = getAdminFirestore();
    const tasksSnapshot = await db.collection('tasks').get();

    for (const taskDoc of tasksSnapshot.docs) {
      const commentRef = db.collection(this.getCommentsCollection(taskDoc.id)).doc(id);
      const commentDoc = await commentRef.get();

      if (commentDoc.exists) {
        await commentRef.delete();
        return;
      }
    }
  }

  /**
   * Maps a Firestore document to Comment. Handles null, undefined, empty, or missing fields.
   */
  private mapDocumentToComment(id: string, data: FirebaseFirestore.DocumentData | undefined): Comment {
    const raw = data ?? {};
    const taskId = raw.taskId != null && raw.taskId !== '' ? String(raw.taskId) : '';
    const userId = raw.userId != null && raw.userId !== '' ? String(raw.userId) : '';
    const text = raw.text != null ? String(raw.text) : '';
    const createdAt = raw.createdAt?.toDate?.() ?? undefined;
    const updatedAt = raw.updatedAt?.toDate?.() ?? undefined;
    return new Comment(id, taskId, userId, text, createdAt, updatedAt);
  }
}
