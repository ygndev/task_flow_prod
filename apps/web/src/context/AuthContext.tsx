import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestoreDb, getFirebaseApiKey } from '../lib/firebase';

type Role = 'ADMIN' | 'MEMBER' | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
  streakCount: number | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: Role) => void;
  incrementStreak: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [streakCount, setStreakCount] = useState<number | null>(null);

  // Fetch user role: try API first, fallback to Firestore users/{uid}.role (so admin check works without API)
  const fetchUserRole = async (firebaseUser: User) => {
    const uid = firebaseUser.uid;
    const fallbackRoleFromFirestore = async () => {
      try {
        const userDoc = await getDoc(doc(firestoreDb, 'users', uid));
        const data = userDoc.data();
        const r = data?.role;
        const sc = data?.streakCount;
        setRole(r === 'ADMIN' ? 'ADMIN' : 'MEMBER');
        setStreakCount(typeof sc === 'number' ? sc : null);
      } catch (e) {
        console.error('Failed to fetch role from Firestore:', e);
        setRole('MEMBER');
        setStreakCount(null);
      }
    };
    try {
      const token = await firebaseUser.getIdToken(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:4000');
      const response = await fetch(`${apiBaseUrl}/api/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRole(data.role === 'ADMIN' ? 'ADMIN' : 'MEMBER');
        setStreakCount(typeof data.streakCount === 'number' ? data.streakCount : null);
      } else {
        await fallbackRoleFromFirestore();
      }
    } catch (error) {
      console.error('Failed to fetch user role from API:', error);
      await fallbackRoleFromFirestore();
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserRole(firebaseUser);
      } else {
        setRole(null);
        setStreakCount(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    // Get the API key being used
    const apiKey = getFirebaseApiKey();
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      // Create a custom error with API key information
      const apiKeyInfo = `API Key Used: ${apiKey} (Length: ${apiKey?.length || 0})`;
      const originalMessage = error instanceof Error ? error.message : String(error);
      const enhancedError = new Error(`${originalMessage}\n\n${apiKeyInfo}`);
      
      // Preserve the original error properties
      if (error instanceof Error) {
        Object.setPrototypeOf(enhancedError, Object.getPrototypeOf(error));
        if ('code' in error) {
          (enhancedError as any).code = (error as any).code;
        }
      }
      
      throw enhancedError;
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<void> => {
    // Get the API key being used
    const apiKey = getFirebaseApiKey();
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
    } catch (error) {
      // Create a custom error with API key information
      const apiKeyInfo = `API Key Used: ${apiKey} (Length: ${apiKey?.length || 0})`;
      const originalMessage = error instanceof Error ? error.message : String(error);
      const enhancedError = new Error(`${originalMessage}\n\n${apiKeyInfo}`);
      
      // Preserve the original error properties
      if (error instanceof Error) {
        Object.setPrototypeOf(enhancedError, Object.getPrototypeOf(error));
        if ('code' in error) {
          (enhancedError as any).code = (error as any).code;
        }
      }
      
      throw enhancedError;
    }
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  const incrementStreak = async (): Promise<void> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:4000');
      const response = await fetch(`${apiBaseUrl}/api/streak`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (typeof data.streakCount === 'number') setStreakCount(data.streakCount);
      }
    } catch (e) {
      console.error('Failed to increment streak', e);
    }
  };

  const value: AuthContextType = {
    user,
    role,
    loading,
    login,
    register,
    logout,
    setRole,
    streakCount,
    incrementStreak,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
