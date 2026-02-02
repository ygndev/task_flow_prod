import { useEffect, useState } from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onDismiss?: () => void;
  autoDismiss?: number; // milliseconds
}

export function Alert({ type, message, onDismiss, autoDismiss }: AlertProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss && autoDismiss > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onDismiss]);

  if (!visible) return null;

  return (
    <div className={`alert alert-${type}`}>
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message}</span>
      {onDismiss && (
        <button
          onClick={() => {
            setVisible(false);
            onDismiss();
          }}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2rem',
            opacity: 0.6,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
