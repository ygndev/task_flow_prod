import admin from 'firebase-admin';
import { logger } from './logger';

let firebaseAdminInitialized = false;

export function initializeFirebaseAdmin(): void {
  if (firebaseAdminInitialized) {
    logger.warn('Firebase Admin already initialized');
    return;
  }

  try {
    // Initialize Firebase Admin SDK
    // For production, use service account key from environment
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // For development, you can use application default credentials
      admin.initializeApp();
    }

    firebaseAdminInitialized = true;
    logger.info('Firebase Admin initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin', error);
    throw error;
  }
}

export function getFirebaseAdmin(): admin.app.App {
  if (!firebaseAdminInitialized) {
    throw new Error('Firebase Admin not initialized. Call initializeFirebaseAdmin() first.');
  }
  return admin.app();
}
