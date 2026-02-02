import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

/**
 * Legacy Member page - redirects to /member/tasks
 * Kept for backward compatibility
 */
export default function Member() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (role === 'ADMIN') {
        navigate('/admin/tasks', { replace: true });
      } else {
        navigate('/member/tasks', { replace: true });
      }
    }
  }, [role, loading, navigate]);

  return (
    <div className="loading-container">
      <p>Redirecting...</p>
    </div>
  );
}
