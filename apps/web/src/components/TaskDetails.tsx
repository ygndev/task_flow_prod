import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { Card, CardHeader, CardTitle, CardBody } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { PriorityBadge } from './PriorityBadge';
import { DueDateBadge } from './DueDateBadge';
import { Tags } from './Tags';
import { formatDate, formatDateTime } from '../utils/formatDate';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assigneeUserId: string | null;
  createdByAdminId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: string;
  taskId: string;
  userId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: string;
  taskId: string;
  type: string;
  message: string;
  actorUserId: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskDetailsProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: () => void;
  isAdmin: boolean;
}

export function TaskDetails({ task, onClose, onUpdate }: TaskDetailsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      loadComments();
      loadActivities();
    }
  }, [task]);

  const loadComments = async () => {
    if (!task || !user) return;
    try {
      const response = await apiFetch(`/api/tasks/${task.id}/comments`, { method: 'GET', user });
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const loadActivities = async () => {
    if (!task || !user) return;
    try {
      const response = await apiFetch(`/api/tasks/${task.id}/activity`, { method: 'GET', user });
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
    }
  };

  const handleAddComment = async () => {
    if (!task || !user || !newComment.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        user,
        body: JSON.stringify({ text: newComment.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        setError(`Failed to add comment: ${errorData.error || response.statusText}`);
        return;
      }

      setNewComment('');
      await loadComments();
      await loadActivities();
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  const getStatusBadgeVariant = (status: string): 'todo' | 'in-progress' | 'done' => {
    switch (status) {
      case 'TODO':
        return 'todo';
      case 'IN_PROGRESS':
        return 'in-progress';
      case 'DONE':
        return 'done';
      default:
        return 'todo';
    }
  };

  return (
    <div
      className="task-details-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        className="task-details-drawer"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '500px',
          maxWidth: '90vw',
          height: '100vh',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-lg)',
          overflowY: 'auto',
          padding: 'var(--spacing-xl)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>Task Details</h2>
          <Button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 'var(--font-size-xl)' }}>
            ×
          </Button>
        </div>

        <Card className="mb-lg">
          <CardBody>
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-sm)' }}>{task.title}</h3>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
                <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
                <PriorityBadge priority={task.priority} />
                <DueDateBadge dueDate={task.dueDate} />
              </div>
              <Tags tags={task.tags} />
            </div>
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <strong>Description:</strong>
              <p style={{ marginTop: 'var(--spacing-xs)', color: 'var(--color-text-secondary)' }}>{task.description}</p>
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              <div>Assignee: {task.assigneeUserId || 'Unassigned'}</div>
              <div>Created: {formatDate(task.createdAt)}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="mb-lg">
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardBody>
            {error && <div style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-sm)' }}>{error}</div>}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <textarea
                className="input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                disabled={loading}
              />
              <Button variant="primary" size="sm" onClick={handleAddComment} disabled={loading || !newComment.trim()} style={{ marginTop: 'var(--spacing-sm)' }}>
                Add Comment
              </Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {comments.map((comment) => (
                <div key={comment.id} style={{ padding: 'var(--spacing-sm)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                    {comment.userId} • {formatDateTime(comment.createdAt)}
                  </div>
                  <div>{comment.text}</div>
                </div>
              ))}
              {comments.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: 'var(--spacing-lg)' }}>
                  No comments yet
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {activities.map((activity) => (
                <div key={activity.id} style={{ fontSize: 'var(--font-size-sm)' }}>
                  <div style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                    {formatDateTime(activity.createdAt)}
                  </div>
                  <div>
                    <strong>{activity.actorUserId}</strong> {activity.message}
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: 'var(--spacing-lg)' }}>
                  No activity yet
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
