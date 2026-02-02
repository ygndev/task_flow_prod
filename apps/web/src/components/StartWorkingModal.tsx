import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from './Card';
import { Button } from './Button';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

interface StartWorkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (taskId: string | null, newTaskTitle?: string, newTaskDescription?: string) => void;
  availableTasks: Task[];
  loading: boolean;
}

export function StartWorkingModal({
  isOpen,
  onClose,
  onStart,
  availableTasks,
  loading,
}: StartWorkingModalProps) {
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  if (!isOpen) return null;

  const handleStart = () => {
    if (isCreatingNew) {
      if (!newTaskTitle.trim()) {
        return;
      }
      onStart(null, newTaskTitle.trim(), newTaskDescription.trim() || undefined);
    } else {
      if (!selectedTaskId) {
        return;
      }
      onStart(selectedTaskId);
    }
    // Reset form
    setSelectedTaskId('');
    setIsCreatingNew(false);
    setNewTaskTitle('');
    setNewTaskDescription('');
  };

  const handleCancel = () => {
    setSelectedTaskId('');
    setIsCreatingNew(false);
    setNewTaskTitle('');
    setNewTaskDescription('');
    onClose();
  };

  const canStart = isCreatingNew
    ? newTaskTitle.trim().length > 0
    : selectedTaskId.length > 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-md)',
      }}
      onClick={handleCancel}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%' }}>
        <Card style={{ width: '100%' }}>
        <CardHeader>
          <CardTitle>Start Working</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {!isCreatingNew ? (
              <>
                <div>
                  <label className="form-label">Select an existing task</label>
                  <select
                    className="select"
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Choose a task...</option>
                    {availableTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title} {task.status === 'TODO' ? '(TODO)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                  or
                </div>
                <Button
                  onClick={() => setIsCreatingNew(true)}
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Create a new task
                </Button>
              </>
            ) : (
              <>
                <div>
                  <label className="form-label">Task Title *</label>
                  <input
                    type="text"
                    className="input"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="What are you working on?"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label">Description (optional)</label>
                  <textarea
                    className="input"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="Add details..."
                    rows={3}
                    disabled={loading}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
                <Button
                  onClick={() => setIsCreatingNew(false)}
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-sm)',
                    padding: 'var(--spacing-xs)',
                  }}
                >
                  ← Back to select task
                </Button>
              </>
            )}

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
              <Button
                variant="primary"
                onClick={handleStart}
                disabled={loading || !canStart}
                style={{ flex: 1 }}
              >
                {loading ? 'Starting...' : 'Start Working'}
              </Button>
              <Button
                onClick={handleCancel}
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
      </div>
    </div>
  );
}
