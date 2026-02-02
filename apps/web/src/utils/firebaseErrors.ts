import { FirebaseError } from 'firebase/app';

export function getFirebaseErrorMessage(error: unknown): string {
  let baseMessage = '';
  let apiKeyInfo = '';

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        baseMessage = 'This email is already registered. Please use a different email or try logging in.';
        break;
      case 'auth/invalid-email':
        baseMessage = 'Invalid email address. Please check your email and try again.';
        break;
      case 'auth/operation-not-allowed':
        baseMessage = 'This operation is not allowed. Please contact support.';
        break;
      case 'auth/weak-password':
        baseMessage = 'Password is too weak. Please use at least 6 characters.';
        break;
      case 'auth/user-disabled':
        baseMessage = 'This account has been disabled. Please contact support.';
        break;
      case 'auth/user-not-found':
        baseMessage = 'No account found with this email. Please check your email or register.';
        break;
      case 'auth/wrong-password':
        baseMessage = 'Incorrect password. Please try again.';
        break;
      case 'auth/invalid-credential':
        baseMessage = 'Invalid email or password. Please try again.';
        break;
      case 'auth/too-many-requests':
        baseMessage = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        baseMessage = 'Network error. Please check your connection and try again.';
        break;
      case 'auth/api-key-not-valid':
        baseMessage = 'Firebase API Key is not valid.';
        break;
      default:
        baseMessage = error.message || 'An error occurred. Please try again.';
    }
    
    // Extract API key info from error message if present
    if (error.message && error.message.includes('API Key Used:')) {
      const lines = error.message.split('\n');
      apiKeyInfo = lines.find(line => line.includes('API Key Used:')) || '';
    }
  } else if (error instanceof Error) {
    baseMessage = error.message;
    
    // Extract API key info from error message if present
    if (error.message && error.message.includes('API Key Used:')) {
      const lines = error.message.split('\n');
      apiKeyInfo = lines.find(line => line.includes('API Key Used:')) || '';
    }
  } else {
    baseMessage = 'An unexpected error occurred. Please try again.';
  }

  // Combine base message with API key info
  if (apiKeyInfo) {
    return `${baseMessage}\n\n🔑 ${apiKeyInfo}`;
  }

  return baseMessage;
}
