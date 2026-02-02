import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '../../../infrastructure';
import { Activity, ActivityType } from '../../../domain/entities/Activity';
import { IActivityRepository } from '../interfaces/IActivityRepository';

const ACTIVITY_TYPES = Object.values(ActivityType) as string[];

export class FirestoreActivityRepository implements IActivityRepository {
  private getActivityCollection(taskId: string) {
    return `tasks/${taskId}/activity`;
  }

  async create(activity: Activity): Promise<Activity> {
    const db = getAdminFirestore();
    const now = new Date();
    const activityData = {
      taskId: activity.taskId,
      type: activity.type,
      message: activity.message,
      actorUserId: activity.actorUserId,
      createdAt: Timestamp.fromDate(activity.createdAt || now),
      updatedAt: Timestamp.fromDate(activity.updatedAt || now),
    };

    await db
      .collection(this.getActivityCollection(activity.taskId))
      .doc(activity.id)
      .set(activityData);

    return activity;
  }

  async findByTaskId(taskId: string): Promise<Activity[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(this.getActivityCollection(taskId))
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => this.mapDocumentToActivity(doc.id, doc.data() ?? undefined));
  }

  /**
   * Maps a Firestore document to Activity. Handles null, undefined, empty, or missing fields.
   */
  private mapDocumentToActivity(id: string, data: FirebaseFirestore.DocumentData | undefined): Activity {
    const raw = data ?? {};
    const taskId = raw.taskId != null && raw.taskId !== '' ? String(raw.taskId) : '';
    const typeVal = raw.type;
    const type = ACTIVITY_TYPES.includes(typeVal) ? typeVal : ActivityType.TASK_STATUS_CHANGED;
    const message = raw.message != null ? String(raw.message) : '';
    const actorUserId = raw.actorUserId != null && raw.actorUserId !== '' ? String(raw.actorUserId) : '';
    const createdAt = raw.createdAt?.toDate?.() ?? undefined;
    const updatedAt = raw.updatedAt?.toDate?.() ?? undefined;
    return new Activity(id, taskId, type, message, actorUserId, createdAt, updatedAt);
  }
}
