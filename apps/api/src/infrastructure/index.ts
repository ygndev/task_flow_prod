import { initializeFirebaseAdmin, getAdminAuth, getAdminFirestore } from './firebaseAdmin';
import { logger } from './logger';
import { config } from './config';

export function initializeInfrastructure(): void {
  logger.info('Initializing infrastructure...');

  // Initialize Firebase Admin
  initializeFirebaseAdmin();

  // Validate configuration
  config.validate();

  logger.info('Infrastructure initialized successfully');
}

// Re-export Firebase Admin getters
export { getAdminAuth, getAdminFirestore };
