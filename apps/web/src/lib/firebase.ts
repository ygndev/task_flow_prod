import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Hardcoded Firebase config as fallback (from your .env file)
// These will be used if environment variables are not loaded
const HARDCODED_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA6i7uRMOFOusUxoQoEhw5p_joM41WntYQ', // Changed RMOF0 to RMOFO (letter O, not zero)
  authDomain: 'taskflow-ozan.firebaseapp.com',
  projectId: 'taskflow-ozan',
  storageBucket: 'taskflow-ozan.firebasestorage.app',
  messagingSenderId: '571387614538',
  appId: '1:571387614538:web:d6aaae63bb24a9e5b9ddb3',
};

// Use environment variables if available, otherwise fall back to hardcoded values
// Always use hardcoded values - ignore environment variables
const firebaseConfig = {
  apiKey: HARDCODED_FIREBASE_CONFIG.apiKey,
  authDomain: HARDCODED_FIREBASE_CONFIG.authDomain,
  projectId: HARDCODED_FIREBASE_CONFIG.projectId,
  storageBucket: HARDCODED_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: HARDCODED_FIREBASE_CONFIG.messagingSenderId,
  appId: HARDCODED_FIREBASE_CONFIG.appId,
};

// Debug: Log config with FULL API key for debugging
const usingEnv = !!import.meta.env.VITE_FIREBASE_API_KEY;
console.log('🔧 Firebase Config Check (FULL API KEY):', {
  fullApiKey: firebaseConfig.apiKey, // Full API key for debugging
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...${firebaseConfig.apiKey.substring(firebaseConfig.apiKey.length - 4)}` : 'MISSING',
  authDomain: firebaseConfig.authDomain || 'MISSING',
  projectId: firebaseConfig.projectId || 'MISSING',
  hasApiKey: !!firebaseConfig.apiKey,
  apiKeyLength: firebaseConfig.apiKey?.length || 0,
  apiKeyFirst10: firebaseConfig.apiKey?.substring(0, 10) || 'N/A',
  apiKeyLast4: firebaseConfig.apiKey?.substring(firebaseConfig.apiKey.length - 4) || 'N/A',
  source: usingEnv ? 'ENVIRONMENT VARIABLES' : 'HARDCODED FALLBACK',
});
// Log raw env values to verify they're being loaded
console.log('🔍 Raw env check:', {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? `${import.meta.env.VITE_FIREBASE_API_KEY.substring(0, 10)}...${import.meta.env.VITE_FIREBASE_API_KEY.substring(import.meta.env.VITE_FIREBASE_API_KEY.length - 4)}` : 'UNDEFINED (using hardcoded)',
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'UNDEFINED (using hardcoded)',
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'UNDEFINED (using hardcoded)',
  allViteKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')),
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
});

// Validate Firebase config - throw error immediately if invalid
const isFirebaseConfigValid = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== '' &&
  firebaseConfig.authDomain && 
  firebaseConfig.authDomain !== '' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== '';

if (!isFirebaseConfigValid) {
  const errorMessage = `Firebase configuration is missing or invalid. Please create apps/web/.env with the following variables:
  
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

After creating the .env file, restart the development server.`;

  // Log to console for debugging
  console.error('❌', errorMessage);
  console.error('Current env values:', {
    apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-4) : 'MISSING',
    authDomain: firebaseConfig.authDomain || 'MISSING',
    projectId: firebaseConfig.projectId || 'MISSING',
  });
  
  // Create a custom error that will be caught by error boundary
  const error = new Error(errorMessage);
  error.name = 'FirebaseConfigError';
  throw error;
}

// Initialize Firebase app only if config is valid
let firebaseApp: FirebaseApp;
let auth: Auth;
let firestoreDb: Firestore;

try {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  firestoreDb = getFirestore(firebaseApp);
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
  // Re-throw to let error boundary handle it
  throw new Error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// Export function to get the current API key for debugging
export function getFirebaseApiKey(): string {
  return firebaseConfig.apiKey;
}

// Export Firebase app instance, auth, and Firestore (for direct DB access)
export { firebaseApp };
export { auth };
export { firestoreDb };
