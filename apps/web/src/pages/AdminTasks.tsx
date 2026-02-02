import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, doc, getDocs, Timestamp, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { firestoreDb } from '../lib/firebase';
import { Alert } from '../components/Alert';
import { Card, CardHeader, CardTitle, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { PriorityBadge } from '../components/PriorityBadge';
import { DueDateBadge } from '../components/DueDateBadge';
import { Tags } from '../components/Tags';
import { TaskFilters } from '../components/TaskFilters';
import { TaskDetails } from '../components/TaskDetails';
import { formatDate } from '../utils/formatDate';

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

export default function AdminTasks() {
  const { user, role } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assigneeInputs, setAssigneeInputs] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (user && role === 'ADMIN') {
      loadTasks();
    }
  }, [user, role]);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  const applyFilters = () => {
    let filtered = [...tasks];

    if (filters.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }
    if (filters.priority) {
      filtered = filtered.filter((t) => t.priority === filters.priority);
    }
    if (filters.tag) {
      filtered = filtered.filter((t) => t.tags.includes(filters.tag));
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) => t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)
      );
    }

    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aValue: number;
        let bValue: number;

        if (filters.sortBy === 'dueDate') {
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        } else {
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
        }

        return filters.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      });
    }

    setFilteredTasks(filtered);
  };

  const mapDocToTask = (id: string, d: Record<string, unknown>): Task => {
    const toIso = (v: unknown) =>
      v && typeof (v as { toDate?: () => Date }).toDate === 'function'
        ? (v as { toDate: () => Date }).toDate().toISOString()
        : '';
    return {
      id,
      title: (d?.title != null && d?.title !== '') ? String(d.title) : '',
      description: d?.description != null ? String(d.description) : '',
      status: (d?.status === 'TODO' || d?.status === 'IN_PROGRESS' || d?.status === 'DONE') ? d.status as Task['status'] : 'TODO',
      assigneeUserId: d?.assigneeUserId != null && d?.assigneeUserId !== '' ? String(d.assigneeUserId) : null,
      createdByAdminId: d?.createdByAdminId != null && d?.createdByAdminId !== '' ? String(d.createdByAdminId) : '',
      priority: (d?.priority === 'LOW' || d?.priority === 'MEDIUM' || d?.priority === 'HIGH') ? d.priority as Task['priority'] : 'MEDIUM',
      dueDate: d?.dueDate && typeof (d.dueDate as { toDate?: () => Date }).toDate === 'function' ? (d.dueDate as { toDate: () => Date }).toDate().toISOString() : null,
      tags: Array.isArray(d?.tags) ? (d.tags as unknown[]).map((t) => String(t)) : [],
      createdAt: toIso(d?.createdAt) || new Date().toISOString(),
      updatedAt: toIso(d?.updatedAt) || new Date().toISOString(),
    };
  };

  const loadTasks = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const snapshot = await getDocs(collection(firestoreDb, 'tasks'));
      const taskList: Task[] = snapshot.docs.map((docSnap) =>
        mapDocToTask(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      setTasks(taskList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('User not authenticated. Please log in again.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const tagArray = tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
      const assignee = assigneeUserId.trim() || null;
      const now = new Date();

      const taskData = {
        title: title.trim() || '',
        description: description.trim() || '',
        status: 'TODO',
        assigneeUserId: assignee,
        createdByAdminId: user.uid,
        priority: priority,
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        tags: tagArray,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      };

      const ref = await addDoc(collection(firestoreDb, 'tasks'), taskData);

      const newTask: Task = {
        id: ref.id,
        title: taskData.title,
        description: taskData.description,
        status: 'TODO',
        assigneeUserId: assignee,
        createdByAdminId: user.uid,
        priority: taskData.priority,
        dueDate: dueDate || null,
        tags: tagArray,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      setTasks((prev) => [...prev, newTask]);
      setTitle('');
      setDescription('');
      setAssigneeUserId('');
      setPriority('MEDIUM');
      setDueDate('');
      setTags('');
      setShowCreateForm(false);
      setSuccess('Task created successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async (taskId: string) => {
    if (!user) return;

    const newAssignee = assigneeInputs[taskId]?.trim() || null;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateDoc(doc(firestoreDb, 'tasks', taskId), {
        assigneeUserId: newAssignee,
        updatedAt: Timestamp.now(),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, assigneeUserId: newAssignee } : t))
      );
      setAssigneeInputs((prev) => ({ ...prev, [taskId]: '' }));
      setSuccess(newAssignee ? 'Task assigned successfully' : 'Task unassigned successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign task');
    } finally {
      setLoading(false);
    }
  };

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

  const allTags = Array.from(new Set(tasks.flatMap((t) => t.tags)));

  return (
    <AppLayout>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="page-description">Create and manage tasks for your team</p>
          </div>
          <Link
            to="/admin/reports"
            style={{ display: 'inline-block', textDecoration: 'none' }}
            aria-label="Go to Reports dashboard"
          >
            <Button variant="primary" style={{ whiteSpace: 'nowrap', minWidth: '160px' }}>
              📊 Reports / Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          onDismiss={() => setError(null)}
          autoDismiss={5000}
        />
      )}

      {success && (
        <Alert
          type="success"
          message={success}
          onDismiss={() => setSuccess(null)}
          autoDismiss={3000}
        />
      )}

      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Link to="/admin/reports" style={{ textDecoration: 'none' }}>
          <Button variant="primary" style={{ minWidth: '180px' }}>
            📊 View Reports / Dashboard
          </Button>
        </Link>
      </div>

      <TaskFilters onFilterChange={handleFilterChange} availableTags={allTags} />

      <Card className="mb-lg">
        <CardHeader>
          <CardTitle>Create Task</CardTitle>
        </CardHeader>
        <CardBody>
          {!showCreateForm ? (
            <Button variant="primary" onClick={() => setShowCreateForm(true)}>
              + Create New Task
            </Button>
          ) : (
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  disabled={loading}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} disabled={loading}>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  type="text"
                  className="input"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="bug, feature, urgent"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Assignee User ID (optional)</label>
                <input
                  type="text"
                  className="input"
                  value={assigneeUserId}
                  onChange={(e) => setAssigneeUserId(e.target.value)}
                  placeholder="Enter user UID"
                  disabled={loading}
                />
                <div className="form-helper">Leave empty to create unassigned task</div>
              </div>
              <div className="inline-actions">
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Task'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setTitle('');
                    setDescription('');
                    setAssigneeUserId('');
                    setPriority('MEDIUM');
                    setDueDate('');
                    setTags('');
                  }}
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Tasks ({filteredTasks.length})</CardTitle>
        </CardHeader>
        <CardBody>
          {loading && !showCreateForm ? (
            <div className="loading">
              <span className="loading-spinner"></span>
              Loading tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No tasks found</div>
              <div className="empty-state-text">
                {tasks.length === 0 ? 'Create your first task to get started.' : 'No tasks match your filters.'}
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Tags</th>
                    <th>Assignee</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTask(task)}>
                      <td>
                        <strong>{task.title}</strong>
                        <div className="text-xs text-tertiary mt-xs">{task.description}</div>
                      </td>
                      <td>
                        <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
                      </td>
                      <td>
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td>
                        <DueDateBadge dueDate={task.dueDate} />
                      </td>
                      <td>
                        <Tags tags={task.tags} />
                      </td>
                      <td className="text-secondary text-sm">
                        {task.assigneeUserId || <span className="text-tertiary">Unassigned</span>}
                      </td>
                      <td className="text-secondary text-sm">{formatDate(task.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="inline-actions">
                          <input
                            type="text"
                            className="input input-sm inline-input"
                            placeholder="User UID"
                            value={assigneeInputs[task.id] || ''}
                            onChange={(e) =>
                              setAssigneeInputs((prev) => ({ ...prev, [task.id]: e.target.value }))
                            }
                            disabled={loading}
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAssignTask(task.id)}
                            disabled={loading}
                          >
                            Assign
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {selectedTask && (
        <TaskDetails
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            loadTasks();
            setSelectedTask(null);
          }}
          isAdmin={true}
        />
      )}
    </AppLayout>
  );
}
