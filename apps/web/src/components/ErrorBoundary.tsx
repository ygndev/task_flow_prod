import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isFirebaseError = 
        this.state.error?.message?.includes('Firebase') ||
        this.state.error?.message?.includes('apiKey') ||
        this.state.error?.message?.includes('authDomain');

      return (
        <div className="error-boundary" style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '2rem',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '600px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}>
            <h1 style={{ color: '#c33', marginBottom: '1rem' }}>⚠️ Application Error</h1>
            {isFirebaseError ? (
              <>
                <p style={{ color: '#666', marginBottom: '1rem' }}>
                  Firebase configuration is missing or invalid.
                </p>
                <div style={{
                  background: '#f5f5f5',
                  padding: '1rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                }}>
                  <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Please create <code>apps/web/.env</code> with:</p>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id`}
                  </pre>
                </div>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  After creating the .env file, restart the development server.
                </p>
              </>
            ) : (
              <>
                <p style={{ color: '#666', marginBottom: '1rem' }}>
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  Reload Page
                </button>
              </>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

