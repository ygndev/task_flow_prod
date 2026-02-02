import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '../../../infrastructure';
import { TimeEntry } from '../../../domain/entities/TimeEntry';
import { ITimeEntryRepository } from '../interfaces/ITimeEntryRepository';

export class FirestoreTimeEntryRepository implements ITimeEntryRepository {
  private readonly collection = 'timeEntries';

  async create(timeEntry: TimeEntry): Promise<TimeEntry> {
    const db = getAdminFirestore();
    const now = new Date();
    const timeEntryData = {
      taskId: timeEntry.taskId,
      userId: timeEntry.userId,
      startTime: Timestamp.fromDate(timeEntry.startTime),
      endTime: timeEntry.endTime ? Timestamp.fromDate(timeEntry.endTime) : null,
      durationSeconds: timeEntry.durationSeconds,
      createdAt: Timestamp.fromDate(timeEntry.createdAt || now),
      updatedAt: Timestamp.fromDate(timeEntry.updatedAt || now),
    };

    await db.collection(this.collection).doc(timeEntry.id).set(timeEntryData);

    return timeEntry;
  }

  async findById(id: string): Promise<TimeEntry | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(this.collection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.mapDocumentToTimeEntry(doc.id, doc.data() ?? undefined);
  }

  async update(id: string, patch: Partial<TimeEntry>): Promise<TimeEntry | null> {
    const db = getAdminFirestore();
    const timeEntryRef = db.collection(this.collection).doc(id);
    const timeEntryDoc = await timeEntryRef.get();

    if (!timeEntryDoc.exists) {
      return null;
    }

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.fromDate(new Date()),
    };

    if (patch.startTime !== undefined) updateData.startTime = Timestamp.fromDate(patch.startTime);
    if (patch.endTime !== undefined)
      updateData.endTime = patch.endTime ? Timestamp.fromDate(patch.endTime) : null;
    if (patch.durationSeconds !== undefined) updateData.durationSeconds = patch.durationSeconds;

    await timeEntryRef.update(updateData);

    const updatedDoc = await timeEntryRef.get();
    return this.mapDocumentToTimeEntry(updatedDoc.id, updatedDoc.data()!);
  }

  async findActiveByUser(userId: string): Promise<TimeEntry | null> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('userId', '==', userId)
      .where('endTime', '==', null)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.mapDocumentToTimeEntry(doc.id, doc.data() ?? undefined);
  }

  async findByTaskAndUser(taskId: string, userId: string): Promise<TimeEntry[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('taskId', '==', taskId)
      .where('userId', '==', userId)
      .get();

    return snapshot.docs.map((doc) => this.mapDocumentToTimeEntry(doc.id, doc.data() ?? undefined));
  }

  async listCompletedInRange(from: Date, to: Date): Promise<TimeEntry[]> {
    const db = getAdminFirestore();
    const fromTimestamp = Timestamp.fromDate(from);
    const toTimestamp = Timestamp.fromDate(to);

    // Query entries where startTime is within range
    // Note: Firestore doesn't support != with range queries without composite index
    // So we filter for completed entries (endTime != null) in memory
    const snapshot = await db
      .collection(this.collection)
      .where('startTime', '>=', fromTimestamp)
      .where('startTime', '<=', toTimestamp)
      .get();

    // Filter to only completed entries (endTime != null) and map to TimeEntry
    return snapshot.docs
      .map((doc) => this.mapDocumentToTimeEntry(doc.id, doc.data() ?? undefined))
      .filter((entry) => entry.endTime !== null);
  }

  /**
   * Maps a Firestore document to TimeEntry. Handles null, undefined, empty, or missing fields.
   */
  private mapDocumentToTimeEntry(
    id: string,
    data: FirebaseFirestore.DocumentData | undefined
  ): TimeEntry {
    const raw = data ?? {};
    const taskId = raw.taskId != null && raw.taskId !== '' ? String(raw.taskId) : '';
    const userId = raw.userId != null && raw.userId !== '' ? String(raw.userId) : '';
    const startTime = raw.startTime?.toDate?.();
    const startTimeDate = startTime instanceof Date && !isNaN(startTime.getTime()) ? startTime : new Date(0);
    const endTime = raw.endTime?.toDate?.() ?? null;
    const durationSeconds =
      typeof raw.durationSeconds === 'number' && !isNaN(raw.durationSeconds) ? raw.durationSeconds : null;
    const createdAt = raw.createdAt?.toDate?.() ?? undefined;
    const updatedAt = raw.updatedAt?.toDate?.() ?? undefined;
    return new TimeEntry(
      id,
      taskId,
      userId,
      startTimeDate,
      endTime,
      durationSeconds,
      createdAt,
      updatedAt
    );
  }
}
