import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore'; // Firestore only — no Realtime Database
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger';

// Compute __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let initialized = false;

export function initializeFirebaseAdmin(): void {
  if (initialized) {
    return;
  }

  const apps = getApps();
  if (apps.length === 0) {
    // Debug: Log environment variables before choosing credentials
    logger.info('Env check', {
      FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? null,
      NODE_ENV: process.env.NODE_ENV ?? null,
    });

    // Determine service account path: env var or default fallback
    let jsonPath: string | null = null;
    const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    
    if (envPath) {
      jsonPath = path.resolve(__dirname, '../../', envPath);
    } else {
      // Fallback to default path: apps/api/serviceAccountKey.json
      const defaultPath = path.resolve(__dirname, '../../', 'serviceAccountKey.json');
      if (existsSync(defaultPath)) {
        jsonPath = defaultPath;
        logger.info(`Using default service account path: ${jsonPath}`);
      }
    }

    if (jsonPath) {
      try {
        if (!existsSync(jsonPath)) {
          throw new Error(`Service account file not found: ${jsonPath}`);
        }
        const serviceAccount = JSON.parse(readFileSync(jsonPath, 'utf8'));
        initializeApp({ credential: cert(serviceAccount) });
        logger.info(`Firebase Admin initialized with service account: ${jsonPath}`);
      } catch (error) {
        logger.error(`Failed to load service account from ${jsonPath}`, error);
        throw error;
      }
    } else {
      initializeApp({ credential: applicationDefault() });
      logger.info('Firebase Admin initialized with application default credentials');
    }
  }

  initialized = true;
  logger.info('Firebase Admin initialized successfully');
}

export function getAdminAuth() {
  if (!initialized) {
    throw new Error('Firebase Admin not initialized. Call initializeFirebaseAdmin() first.');
  }
  return getAuth();
}

/**
 * Returns Firestore (Cloud Firestore) instance. This app uses Firestore only;
 * Firebase Realtime Database is not used.
 */
export function getAdminFirestore() {
  if (!initialized) {
    throw new Error('Firebase Admin not initialized. Call initializeFirebaseAdmin() first.');
  }
  return getFirestore();
}
