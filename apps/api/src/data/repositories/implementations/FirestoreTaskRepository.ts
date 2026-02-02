import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '../../../infrastructure';
import { Task } from '../../../domain/entities/Task';
import { TaskStatus } from '../../../domain/enums/TaskStatus';
import { Priority } from '../../../domain/enums/Priority';
import { ITaskRepository } from '../interfaces/ITaskRepository';

export class FirestoreTaskRepository implements ITaskRepository {
  private readonly collection = 'tasks';

  async create(task: Task): Promise<Task> {
    const db = getAdminFirestore();
    const now = new Date();
    const taskData = {
      title: task.title,
      description: task.description,
      status: task.status,
      assigneeUserId: task.assigneeUserId,
      createdByAdminId: task.createdByAdminId,
      priority: task.priority,
      dueDate: task.dueDate ? Timestamp.fromDate(task.dueDate) : null,
      tags: task.tags || [],
      createdAt: Timestamp.fromDate(task.createdAt || now),
      updatedAt: Timestamp.fromDate(task.updatedAt || now),
    };

    await db.collection(this.collection).doc(task.id).set(taskData);

    return task;
  }

  async findById(id: string): Promise<Task | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(this.collection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.mapDocumentToTask(doc.id, doc.data());
  }

  async update(id: string, patch: Partial<Task>): Promise<Task | null> {
    const db = getAdminFirestore();
    const taskRef = db.collection(this.collection).doc(id);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return null;
    }

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.fromDate(new Date()),
    };

    if (patch.title !== undefined) updateData.title = patch.title;
    if (patch.description !== undefined) updateData.description = patch.description;
    if (patch.status !== undefined) updateData.status = patch.status;
    if (patch.assigneeUserId !== undefined) updateData.assigneeUserId = patch.assigneeUserId;
    if (patch.priority !== undefined) updateData.priority = patch.priority;
    if (patch.dueDate !== undefined) {
      updateData.dueDate = patch.dueDate ? Timestamp.fromDate(patch.dueDate) : null;
    }
    if (patch.tags !== undefined) updateData.tags = patch.tags || [];

    await taskRef.update(updateData);

    const updatedDoc = await taskRef.get();
    return this.mapDocumentToTask(updatedDoc.id, updatedDoc.data()!);
  }

  async listAll(): Promise<Task[]> {
    const db = getAdminFirestore();
    const snapshot = await db.collection(this.collection).get();

    return snapshot.docs.map((doc) => this.mapDocumentToTask(doc.id, doc.data() ?? undefined));
  }

  /**
   * List tasks where assigneeUserId equals the given user id.
   * Firestore field must be exactly "assigneeUserId" (not e.g. asigneeUserId).
   */
  async listByAssignee(userId: string): Promise<Task[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('assigneeUserId', '==', userId)
      .get();

    return snapshot.docs.map((doc) => this.mapDocumentToTask(doc.id, doc.data() ?? undefined));
  }

  async searchAndFilter(filters: {
    status?: TaskStatus;
    priority?: Priority;
    assigneeUserId?: string;
    tag?: string;
    searchQuery?: string;
    sortBy?: 'dueDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Task[]> {
    const db = getAdminFirestore();
    let query: FirebaseFirestore.Query = db.collection(this.collection);

    // Apply filters
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.priority) {
      query = query.where('priority', '==', filters.priority);
    }
    if (filters.assigneeUserId) {
      query = query.where('assigneeUserId', '==', filters.assigneeUserId);
    }
    if (filters.tag) {
      query = query.where('tags', 'array-contains', filters.tag);
    }

    // Get all results (Firestore doesn't support text search natively)
    const snapshot = await query.get();
    let tasks = snapshot.docs.map((doc) => this.mapDocumentToTask(doc.id, doc.data() ?? undefined));

    // Client-side search filtering
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      tasks = tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description.toLowerCase().includes(searchLower)
      );
    }

    // Client-side sorting
    if (filters.sortBy) {
      tasks.sort((a, b) => {
        let aValue: Date | number;
        let bValue: Date | number;

        if (filters.sortBy === 'dueDate') {
          aValue = a.dueDate?.getTime() || 0;
          bValue = b.dueDate?.getTime() || 0;
        } else {
          aValue = a.createdAt?.getTime() || 0;
          bValue = b.createdAt?.getTime() || 0;
        }

        if (filters.sortOrder === 'desc') {
          return bValue - aValue;
        }
        return aValue - bValue;
      });
    }

    return tasks;
  }

  /**
   * Maps a Firestore document to Task. Handles null, undefined, empty, or missing fields
   * so documents with partial or legacy schema still load safely.
   */
  private mapDocumentToTask(id: string, data: FirebaseFirestore.DocumentData | undefined): Task {
    const raw = data ?? {};
    const title = raw.title != null && raw.title !== '' ? String(raw.title) : '';
    const description = raw.description != null ? String(raw.description) : '';
    const statusVal = raw.status;
    const status =
      statusVal === TaskStatus.TODO || statusVal === TaskStatus.IN_PROGRESS || statusVal === TaskStatus.DONE
        ? statusVal
        : TaskStatus.TODO;
    const createdByAdminId = raw.createdByAdminId != null && raw.createdByAdminId !== '' ? String(raw.createdByAdminId) : '';
    const assigneeRaw = raw.assigneeUserId;
    const assigneeUserId =
      assigneeRaw != null && assigneeRaw !== '' ? String(assigneeRaw) : null;
    const priorityVal = raw.priority;
    const priority =
      priorityVal === Priority.LOW || priorityVal === Priority.MEDIUM || priorityVal === Priority.HIGH
        ? priorityVal
        : Priority.MEDIUM;
    const dueDate = raw.dueDate?.toDate?.() ?? null;
    const tags = Array.isArray(raw.tags) ? raw.tags.map((t: unknown) => String(t)) : [];
    const createdAt = raw.createdAt?.toDate?.() ?? undefined;
    const updatedAt = raw.updatedAt?.toDate?.() ?? undefined;
    return new Task(
      id,
      title,
      description,
      status,
      createdByAdminId,
      assigneeUserId,
      priority,
      dueDate,
      tags,
      createdAt,
      updatedAt
    );
  }
}
