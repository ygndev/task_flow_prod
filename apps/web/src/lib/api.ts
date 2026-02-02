import { User } from 'firebase/auth';

// In development, use relative URLs to leverage Vite proxy
// In production, use the full API URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:4000');

interface ApiFetchOptions extends RequestInit {
  user: User | null;
}

/**
 * API client helper that automatically adds Authorization header with Firebase token
 */
export async function apiFetch(
  path: string,
  options: ApiFetchOptions
): Promise<Response> {
  const { user, ...fetchOptions } = options;

  if (!user) {
    console.error('❌ apiFetch: User is null or undefined');
    throw new Error('User must be provided for API calls');
  }

  // Debug: Log user info
  console.log('🔍 apiFetch: Getting token for user', {
    userId: user.uid,
    email: user.email,
    path: path,
  });

  try {
    // Get fresh token (force refresh)
    const token = await user.getIdToken(true);
    
    // Debug: Log token info (without exposing full token)
    console.log('🔑 apiFetch: Token obtained', {
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : 'MISSING',
      userId: user.uid,
    });

    // Merge headers
    const headers = new Headers(fetchOptions.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    // Debug: Log request details
    console.log('📤 apiFetch: Making request', {
      url: `${API_BASE_URL}${path}`,
      method: fetchOptions.method || 'GET',
      hasAuthHeader: headers.has('Authorization'),
    });

    // Make request
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
    });

    // Debug: Log response
    console.log('📥 apiFetch: Response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    // If unauthorized, log more details
    if (response.status === 401) {
      const errorText = await response.text().catch(() => 'Could not read error');
      console.error('❌ apiFetch: Unauthorized response', {
        status: response.status,
        error: errorText,
        path: path,
        userId: user.uid,
      });
    }

    return response;
  } catch (error) {
    console.error('❌ apiFetch: Error getting token or making request', {
      error: error instanceof Error ? error.message : String(error),
      userId: user.uid,
      path: path,
    });
    throw error;
  }
}
