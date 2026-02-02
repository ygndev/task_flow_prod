import { DecodedIdToken } from 'firebase-admin/auth';

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken & {
        uid: string;
        email?: string;
        role?: string;
        streakCount?: number;
      };
    }
  }
}

export {};
