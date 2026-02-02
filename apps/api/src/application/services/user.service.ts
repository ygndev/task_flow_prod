import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore, getAdminAuth } from '../../infrastructure';
import { User } from '../../domain/entities/User';
import { Role } from '../../domain/enums/Role';
import { logger } from '../../infrastructure/logger';

/**
 * User Service
 * Handles user-related business logic including:
 * - Ensuring user documents exist in Firestore
 * - Managing role assignments (Firestore + custom claims)
 * - Role synchronization between Firestore and Firebase Auth
 */

/**
 * Ensures a user document exists in Firestore.
 * Creates the document with default role 'MEMBER' if it doesn't exist.
 * This is called on first authentication.
 *
 * @param uid - User ID from Firebase Auth
 * @param email - User's email
 * @param displayName - User's display name
 * @returns The user document (created or existing)
 */
export async function ensureUserDocument(
  uid: string,
  email: string | undefined,
  displayName: string | undefined
): Promise<User> {
  const adminFirestore = getAdminFirestore();
  const userRef = adminFirestore.collection('users').doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    // User document already exists, return it (handle null/empty/missing fields)
    const data = userDoc.data() ?? {};
    const email = data.email != null ? String(data.email) : '';
    const displayName = data.displayName != null ? String(data.displayName) : '';
    const roleVal = data.role;
    const role = roleVal === Role.ADMIN || roleVal === Role.MEMBER ? roleVal : Role.MEMBER;
    const createdAt = data.createdAt?.toDate?.() ?? undefined;
    const updatedAt = data.updatedAt?.toDate?.() ?? undefined;
    const streakCount = typeof data.streakCount === 'number' ? data.streakCount : undefined;
    return new User(uid, email, displayName, role, createdAt, updatedAt, streakCount);
  }

  // Create new user document with default role 'MEMBER'
  const now = new Date();
  const newUser = {
    email: email || '',
    displayName: displayName || '',
    role: Role.MEMBER,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };

  await userRef.set(newUser);
  logger.info(`Created user document for uid: ${uid}`);

  return new User(uid, newUser.email, newUser.displayName, newUser.role, now, now);
}

/**
 * Gets user document from Firestore.
 *
 * @param uid - User ID
 * @returns User entity or null if not found
 */
export async function getUserByUid(uid: string): Promise<User | null> {
  const adminFirestore = getAdminFirestore();
  const userDoc = await adminFirestore.collection('users').doc(uid).get();

  if (!userDoc.exists) {
    return null;
  }

  const data = userDoc.data() ?? {};
  const email = data.email != null ? String(data.email) : '';
  const displayName = data.displayName != null ? String(data.displayName) : '';
  const roleVal = data.role;
  const role = roleVal === Role.ADMIN || roleVal === Role.MEMBER ? roleVal : Role.MEMBER;
  const createdAt = data.createdAt?.toDate?.() ?? undefined;
  const updatedAt = data.updatedAt?.toDate?.() ?? undefined;
  const streakCount = typeof data.streakCount === 'number' ? data.streakCount : undefined;
  return new User(uid, email, displayName, role, createdAt, updatedAt, streakCount);
}

/**
 * Updates user role in both Firestore (source of truth) and Firebase custom claims.
 * This ensures role is available in both places:
 * - Firestore: Permanent storage, source of truth
 * - Custom Claims: Fast access in ID tokens, no Firestore read needed
 *
 * Role Sync Strategy:
 * 1. Firestore is the source of truth - all role changes are written here first
 * 2. Custom claims are updated to match Firestore for fast access
 * 3. Auth middleware checks custom claims first, falls back to Firestore if missing
 * 4. Custom claims are cached in ID tokens (1 hour default), so changes may take time to propagate
 *
 * @param uid - User ID
 * @param role - New role (ADMIN or MEMBER)
 * @throws Error if role is invalid or user doesn't exist
 */
export async function updateUserRole(uid: string, role: Role): Promise<void> {
  // Validate role
  if (role !== Role.ADMIN && role !== Role.MEMBER) {
    throw new Error(`Invalid role: ${role}. Must be 'ADMIN' or 'MEMBER'`);
  }

  // Check if user document exists
  const adminFirestore = getAdminFirestore();
  const userRef = adminFirestore.collection('users').doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error(`User document not found for uid: ${uid}`);
  }

  // Update Firestore (source of truth)
  await userRef.update({
    role,
    updatedAt: Timestamp.fromDate(new Date()),
  });

  logger.info(`Updated user role in Firestore for uid: ${uid}, role: ${role}`);

  // Update Firebase custom claims for fast access
  try {
    const adminAuth = getAdminAuth();
    await adminAuth.setCustomUserClaims(uid, { role });
    logger.info(`Updated custom claims for uid: ${uid}, role: ${role}`);
  } catch (error) {
    // Log error but don't fail - Firestore update succeeded
    logger.error(`Failed to update custom claims for uid: ${uid}`, error);
    // Note: User will need to refresh their token to get updated claims
  }
}

/**
 * Increments the user's streak count in Firestore (users/{uid}.streakCount).
 * Uses atomic FieldValue.increment(1). If the field is missing, Firestore sets it then increments (result 1).
 *
 * @param uid - User ID
 * @returns The new streak count after increment
 */
export async function incrementUserStreak(uid: string): Promise<number> {
  const adminFirestore = getAdminFirestore();
  const userRef = adminFirestore.collection('users').doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error(`User document not found for uid: ${uid}`);
  }

  await userRef.update({
    streakCount: FieldValue.increment(1),
    updatedAt: Timestamp.fromDate(new Date()),
  });

  const updated = await userRef.get();
  const nextCount = typeof updated.data()?.streakCount === 'number' ? updated.data()!.streakCount : 1;
  logger.info(`Incremented streak for uid: ${uid}, new count: ${nextCount}`);
  return nextCount;
}
