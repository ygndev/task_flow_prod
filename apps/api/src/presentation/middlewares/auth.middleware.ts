import { Request, Response, NextFunction } from 'express';
import { getAdminAuth } from '../../infrastructure/index.js';
import { ensureUserDocument } from '../../application/services/user.service.js';
import { Role } from '../../domain/enums/Role.js';
import { logger } from '../../infrastructure/logger.js';

/**
 * Authentication Middleware
 * 
 * Role Resolution Strategy:
 * 1. First checks decodedToken.role (from Firebase custom claims) - fastest, no Firestore read
 * 2. Falls back to Firestore users/{uid}.role if custom claim is missing
 * 3. Ensures user document exists in Firestore (creates with default role 'MEMBER' if first time)
 * 
 * Custom Claims vs Firestore:
 * - Custom claims are cached in ID tokens (1 hour default), fast but may be stale
 * - Firestore is source of truth, always up-to-date but requires a read
 * - This approach balances performance (custom claims) with accuracy (Firestore fallback)
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    // Debug: Log whether Authorization header exists
    logger.debug('Auth header check', {
      hasHeader: !!authHeader,
      headerLength: authHeader?.length || 0,
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      res.status(401).json({ error: 'Unauthorized: Missing token' });
      return;
    }

    // Debug: Log token length before verification
    logger.debug('Token verification attempt', {
      tokenLength: idToken.length,
    });

    // Verify the Firebase ID token
    let adminAuth;
    try {
      adminAuth = getAdminAuth();
    } catch (adminError) {
      logger.error('Failed to get Firebase Admin Auth', adminError);
      res.status(500).json({ error: 'Server configuration error: Firebase Admin not initialized' });
      return;
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, true); // Check revoked tokens
    } catch (verifyError: unknown) {
      // Log verification failure details (but not the token itself)
      const error = verifyError as { message?: string; code?: string };
      logger.error('Token verify failed', {
        message: error?.message,
        code: error?.code,
        tokenLength: idToken.length,
        tokenPreview: idToken ? `${idToken.substring(0, 20)}...${idToken.substring(idToken.length - 10)}` : 'MISSING',
        errorName: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Provide more specific error message
      if (error?.code === 'auth/id-token-expired') {
        logger.error('Token expired - user needs to refresh');
      } else if (error?.code === 'auth/argument-error') {
        logger.error('Invalid token format');
      } else if (error?.code === 'auth/invalid-id-token') {
        logger.error('Token is invalid - may be from different project');
      }
      
      throw verifyError;
    }

    // Debug: Log successful verification details
    logger.debug('Token verified successfully', {
      uid: decodedToken.uid,
      issuer: decodedToken.iss,
      audience: decodedToken.aud,
      email: decodedToken.email,
      projectId: (decodedToken as any).project_id || 'unknown',
    });

    // Verify project ID matches (security check)
    const tokenProjectId = (decodedToken as any).project_id;
    if (tokenProjectId && tokenProjectId !== 'taskflow-ozan') {
      logger.warn('Token project ID mismatch', {
        tokenProjectId,
        expectedProjectId: 'taskflow-ozan',
        uid: decodedToken.uid,
      });
      // Don't reject - just log warning, in case of multi-project setup
    }

    const uid = decodedToken.uid;

    // Ensure user document exists in Firestore (creates if first time)
    const user = await ensureUserDocument(
      uid,
      decodedToken.email,
      decodedToken.name || decodedToken.email?.split('@')[0] || 'User'
    );

    // Resolve role: custom claim (fast) or Firestore (source of truth)
    let role: Role | undefined = decodedToken.role as Role | undefined;

    // If custom claim doesn't exist or is invalid, use Firestore role
    if (!role || (role !== Role.ADMIN && role !== Role.MEMBER)) {
      role = user.role;
      logger.debug(`Role not in custom claims for uid: ${uid}, using Firestore role: ${role}`);
    }

    // Attach decoded token, resolved role, and streakCount to request
    req.user = {
      ...decodedToken,
      uid,
      email: decodedToken.email,
      role,
      streakCount: user.streakCount,
    };

    next();
  } catch (error) {
    // Error logging is handled in the try block for verification errors
    // This catch handles any other unexpected errors
    if (error && typeof error === 'object' && 'code' in error) {
      // Already logged in the try block
    } else {
      logger.error('Authentication error', error);
    }
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}
