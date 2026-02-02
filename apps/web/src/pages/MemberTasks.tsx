import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, doc, getDocs, limit, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { firestoreDb } from '../lib/firebase';
import { Alert } from '../components/Alert';
import { Card, CardHeader, CardTitle, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { TaskDetails } from '../components/TaskDetails';
import { StartWorkingModal } from '../components/StartWorkingModal';
import { formatTime, formatDuration, calculateElapsedSeconds } from '../utils/formatDate';

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

interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

interface TodaySummary {
  totalTodaySeconds: number;
  perTaskTodaySeconds: Record<string, number>;
  completedTasksTodayCount: number;
}

export default function MemberTasks() {
  const { user, role, incrementStreak } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showStartWorkingModal, setShowStartWorkingModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadAll();
    }
  }, [user]);

  // Live timer ticker
  useEffect(() => {
    if (!activeTimeEntry) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsedSeconds(activeTimeEntry.startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimeEntry]);

  // Update activeTask when activeTimeEntry or tasks change
  useEffect(() => {
    if (activeTimeEntry && tasks.length > 0) {
      const task = tasks.find((t) => t.id === activeTimeEntry.taskId);
      setActiveTask(task || null);
    } else {
      setActiveTask(null);
    }
  }, [activeTimeEntry, tasks]);

  const loadAll = async () => {
    await Promise.all([loadTasks(), loadActiveTimeEntry(), loadTodaySummary()]);
  };

  /**
   * Direct Firestore fetch: query tasks where assigneeUserId == uid.
   * Used to test if direct DB access works; same shape as API response.
   */
  const loadTasksFromFirestoreDirect = async (uid: string): Promise<Task[]> => {
    const q = query(
      collection(firestoreDb, 'tasks'),
      where('assigneeUserId', '==', uid)
    );
    const snapshot = await getDocs(q);
    const tasks: Task[] = snapshot.docs.map((doc) => {
      const d = doc.data();
      const toIso = (v: unknown) => (v && typeof (v as { toDate?: () => Date }).toDate === 'function' ? (v as { toDate: () => Date }).toDate().toISOString() : '');
      return {
        id: doc.id,
        title: (d?.title != null && d?.title !== '') ? String(d.title) : '',
        description: d?.description != null ? String(d.description) : '',
        status: (d?.status === 'TODO' || d?.status === 'IN_PROGRESS' || d?.status === 'DONE') ? d.status : 'TODO',
        assigneeUserId: d?.assigneeUserId != null && d?.assigneeUserId !== '' ? String(d.assigneeUserId) : null,
        createdByAdminId: d?.createdByAdminId != null && d?.createdByAdminId !== '' ? String(d.createdByAdminId) : '',
        priority: (d?.priority === 'LOW' || d?.priority === 'MEDIUM' || d?.priority === 'HIGH') ? d.priority : 'MEDIUM',
        dueDate: d?.dueDate?.toDate?.() ? d.dueDate.toDate().toISOString() : null,
        tags: Array.isArray(d?.tags) ? d.tags.map((t: unknown) => String(t)) : [],
        createdAt: toIso(d?.createdAt) || new Date().toISOString(),
        updatedAt: toIso(d?.updatedAt) || new Date().toISOString(),
      };
    });
    return tasks;
  };

  const loadTasks = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const tasksFromDirect = await loadTasksFromFirestoreDirect(user.uid);
      setTasks(tasksFromDirect);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setTasks([]);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Direct Firestore: active time entry for current user (userId, endTime == null, limit 1).
   */
  const loadActiveTimeEntryFromFirestoreDirect = async (uid: string): Promise<TimeEntry | null> => {
    const q = query(
      collection(firestoreDb, 'timeEntries'),
      where('userId', '==', uid),
      where('endTime', '==', null),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const d = doc.data();
    const toIso = (v: unknown) => (v && typeof (v as { toDate?: () => Date }).toDate === 'function' ? (v as { toDate: () => Date }).toDate().toISOString() : '');
    return {
      id: doc.id,
      taskId: d?.taskId != null ? String(d.taskId) : '',
      userId: d?.userId != null ? String(d.userId) : '',
      startTime: toIso(d?.startTime) || new Date().toISOString(),
      endTime: d?.endTime != null ? toIso(d.endTime) : null,
      durationSeconds: typeof d?.durationSeconds === 'number' ? d.durationSeconds : null,
      createdAt: toIso(d?.createdAt) || new Date().toISOString(),
      updatedAt: toIso(d?.updatedAt) || new Date().toISOString(),
    };
  };

  const loadActiveTimeEntry = async () => {
    if (!user) return;

    try {
      const entry = await loadActiveTimeEntryFromFirestoreDirect(user.uid);
      setActiveTimeEntry(entry);
      if (entry) {
        setElapsedSeconds(calculateElapsedSeconds(entry.startTime));
      } else {
        setElapsedSeconds(0);
      }
    } catch (err) {
      console.error('Failed to load active time entry:', err);
      setActiveTimeEntry(null);
      setElapsedSeconds(0);
    }
  };

  /**
   * Direct Firestore: today's time summary (completed entries in today's range) + tasks completed today.
   */
  const loadTodaySummaryFromFirestoreDirect = async (uid: string): Promise<TodaySummary> => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getTime());

    const fromTs = Timestamp.fromDate(todayStart);
    const toTs = Timestamp.fromDate(todayEnd);

    const entriesQuery = query(
      collection(firestoreDb, 'timeEntries'),
      where('userId', '==', uid),
      where('startTime', '>=', fromTs),
      where('startTime', '<=', toTs)
    );
    const entriesSnapshot = await getDocs(entriesQuery);
    const completedEntries = entriesSnapshot.docs
      .map((docSnap) => {
        const d = docSnap.data();
        const endTime = d?.endTime?.toDate?.();
        const durationSeconds = typeof d?.durationSeconds === 'number' ? d.durationSeconds : null;
        return { taskId: d?.taskId != null ? String(d.taskId) : '', durationSeconds, endTime };
      })
      .filter((e) => e.endTime != null && e.durationSeconds != null && e.durationSeconds > 0);

    let totalTodaySeconds = 0;
    const perTaskTodaySeconds: Record<string, number> = {};
    for (const e of completedEntries) {
      totalTodaySeconds += e.durationSeconds!;
      perTaskTodaySeconds[e.taskId] = (perTaskTodaySeconds[e.taskId] || 0) + e.durationSeconds!;
    }

    const tasksQuery = query(
      collection(firestoreDb, 'tasks'),
      where('assigneeUserId', '==', uid)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    const completedTasksToday = tasksSnapshot.docs.filter((docSnap) => {
      const d = docSnap.data();
      if (d?.status !== 'DONE') return false;
      const updatedAt = d?.updatedAt?.toDate?.();
      if (!updatedAt) return false;
      return updatedAt >= todayStart && updatedAt <= todayEnd;
    });

    return {
      totalTodaySeconds,
      perTaskTodaySeconds,
      completedTasksTodayCount: completedTasksToday.length,
    };
  };

  const loadTodaySummary = async () => {
    if (!user) return;

    try {
      const summary = await loadTodaySummaryFromFirestoreDirect(user.uid);
      setTodaySummary(summary);
    } catch (err) {
      console.error('Failed to load today summary:', err);
    }
  };

  const handleStartWorking = async (taskId: string | null, newTaskTitle?: string, newTaskDescription?: string) => {
    // Debug: Log user state
    console.log('🔍 handleStartWorking: User state check', {
      userExists: !!user,
      userId: user?.uid,
      userEmail: user?.email,
      taskId,
      newTaskTitle,
    });

    if (!user) {
      setError('User not authenticated. Please log in again.');
      console.error('❌ handleStartWorking: User is null');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setShowStartWorkingModal(false);

    try {
      let finalTaskId = taskId;

      // If creating new task, create it in Firestore directly (no API)
      if (!taskId && newTaskTitle) {
        const now = new Date();
        const taskData = {
          title: newTaskTitle.trim() || '',
          description: (newTaskDescription || 'Empty Task Description').trim() || '',
          status: 'TODO',
          assigneeUserId: user.uid,
          createdByAdminId: 'self',
          priority: 'MEDIUM',
          dueDate: null,
          tags: [],
          createdAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now),
        };
        const taskRef = await addDoc(collection(firestoreDb, 'tasks'), taskData);
        finalTaskId = taskRef.id;
        // Set task status to IN_PROGRESS
        await updateDoc(doc(firestoreDb, 'tasks', finalTaskId), {
          status: 'IN_PROGRESS',
          updatedAt: Timestamp.now(),
        });
      } else if (taskId) {
        // If selecting existing task, update status to IN_PROGRESS if TODO (direct Firestore)
        const task = tasks.find((t) => t.id === taskId);
        if (task && task.status === 'TODO') {
          await updateDoc(doc(firestoreDb, 'tasks', taskId), {
            status: 'IN_PROGRESS',
            updatedAt: Timestamp.now(),
          });
        }
      }

      // Start timer: direct Firestore (check no active entry, then add time entry)
      const activeCheck = await getDocs(
        query(
          collection(firestoreDb, 'timeEntries'),
          where('userId', '==', user.uid),
          where('endTime', '==', null),
          limit(1)
        )
      );
      if (!activeCheck.empty) {
        setError('You already have an active time entry. Stop it first.');
        return;
      }
      const now = new Date();
      await addDoc(collection(firestoreDb, 'timeEntries'), {
        taskId: finalTaskId,
        userId: user.uid,
        startTime: Timestamp.fromDate(now),
        endTime: null,
        durationSeconds: null,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

      setSuccess('Started working!');
      await Promise.all([loadActiveTimeEntry(), loadTasks()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start working');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimer = async (taskId: string) => {
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const activeCheck = await getDocs(
        query(
          collection(firestoreDb, 'timeEntries'),
          where('userId', '==', user.uid),
          where('endTime', '==', null),
          limit(1)
        )
      );
      if (!activeCheck.empty) {
        setError('You already have an active time entry. Stop it first.');
        return;
      }
      const now = new Date();
      await addDoc(collection(firestoreDb, 'timeEntries'), {
        taskId,
        userId: user.uid,
        startTime: Timestamp.fromDate(now),
        endTime: null,
        durationSeconds: null,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
      setSuccess('Timer started');
      await Promise.all([loadActiveTimeEntry(), loadTasks()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer');
    } finally {
      setLoading(false);
    }
  };

  const handleStopAndLog = async () => {
    if (!user || !activeTimeEntry) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date();
      const startDate = new Date(activeTimeEntry.startTime);
      const durationSeconds = Math.round((now.getTime() - startDate.getTime()) / 1000);
      await updateDoc(doc(firestoreDb, 'timeEntries', activeTimeEntry.id), {
        endTime: Timestamp.fromDate(now),
        durationSeconds,
        updatedAt: Timestamp.fromDate(now),
      });
      setSuccess(`Time logged: ${formatDuration(durationSeconds)}`);
      await Promise.all([loadActiveTimeEntry(), loadTasks(), loadTodaySummary()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user || !activeTask) return;

    if (!confirm(`Complete "${activeTask.title}"? This will stop the timer and mark the task as done.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date();
      if (activeTimeEntry && activeTimeEntry.taskId === activeTask.id) {
        const startDate = new Date(activeTimeEntry.startTime);
        const durationSeconds = Math.round((now.getTime() - startDate.getTime()) / 1000);
        await updateDoc(doc(firestoreDb, 'timeEntries', activeTimeEntry.id), {
          endTime: Timestamp.fromDate(now),
          durationSeconds,
          updatedAt: Timestamp.fromDate(now),
        });
      }
      await updateDoc(doc(firestoreDb, 'tasks', activeTask.id), {
        status: 'DONE',
        updatedAt: Timestamp.fromDate(now),
      });
      setSuccess('Task completed! 🎉');
      await incrementStreak();
      await Promise.all([loadActiveTimeEntry(), loadTasks(), loadTodaySummary()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!user) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (!confirm(`Complete "${task.title}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date();
      if (activeTimeEntry && activeTimeEntry.taskId === taskId) {
        const startDate = new Date(activeTimeEntry.startTime);
        const durationSeconds = Math.round((now.getTime() - startDate.getTime()) / 1000);
        await updateDoc(doc(firestoreDb, 'timeEntries', activeTimeEntry.id), {
          endTime: Timestamp.fromDate(now),
          durationSeconds,
          updatedAt: Timestamp.fromDate(now),
        });
      }
      await updateDoc(doc(firestoreDb, 'tasks', taskId), {
        status: 'DONE',
        updatedAt: Timestamp.fromDate(now),
      });
      setSuccess('Task completed! 🎉');
      await incrementStreak();
      await Promise.all([loadActiveTimeEntry(), loadTasks(), loadTodaySummary()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
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

  const getTaskTimeToday = (taskId: string): number => {
    return todaySummary?.perTaskTodaySeconds[taskId] || 0;
  };

  const formatTimeHHMMSS = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">My Tasks</h1>
        <p className="page-description">Track your work and complete tasks</p>
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

      {/* 1. Now Working - Sticky Top Card */}
      <Card className="mb-lg" style={{ position: 'sticky', top: 'var(--spacing-md)', zIndex: 10, backgroundColor: 'var(--color-surface)' }}>
        <CardHeader>
          <CardTitle>Now Working</CardTitle>
        </CardHeader>
        <CardBody>
          {activeTimeEntry && activeTask ? (
            <div>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-xs)' }}>
                  {activeTask.title}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-sm)' }}>
                  {activeTask.description || 'No description'}
                </p>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                  Started at {formatTime(activeTimeEntry.startTime)}
                </div>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: 'var(--spacing-lg)',
                backgroundColor: 'var(--color-primary-light)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)'
              }}>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                    Elapsed Time
                  </div>
                  <div style={{ 
                    fontSize: 'var(--font-size-3xl)', 
                    fontWeight: 'var(--font-weight-bold)', 
                    color: 'var(--color-primary)',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em'
                  }}>
                    {formatTimeHHMMSS(elapsedSeconds)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <Button
                  variant="primary"
                  onClick={handleStopAndLog}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  Stop & Log Time
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={loading}
                  style={{ 
                    flex: 1,
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  Mark Done
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              <div style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-md)' }}>⏸️</div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-xs)' }}>
                You're not tracking time
              </div>
              <div style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                Start a task to begin tracking
              </div>
              <Button
                variant="primary"
                onClick={() => setShowStartWorkingModal(true)}
                disabled={loading}
                style={{ minWidth: '200px' }}
              >
                ➜ Start working on a task
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 2. My Tasks - Clean List */}
      <Card className="mb-lg">
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardBody>
          {loading && tasks.length === 0 ? (
            <div className="loading">
              <span className="loading-spinner"></span>
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No tasks assigned</div>
              <div className="empty-state-text">
                You don't have any tasks assigned to you yet.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {tasks.map((task) => {
                const isActive = activeTimeEntry?.taskId === task.id;
                const timeToday = getTaskTimeToday(task.id);
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    style={{
                      padding: 'var(--spacing-md)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backgroundColor: isActive ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-md)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                          <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>
                            {task.title}
                          </h4>
                          <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
                        </div>
                        {task.description && (
                          <p style={{ 
                            fontSize: 'var(--font-size-sm)', 
                            color: 'var(--color-text-secondary)', 
                            margin: '0 0 var(--spacing-xs) 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {task.description}
                          </p>
                        )}
                        {timeToday > 0 && (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                            ⏱️ {formatDuration(timeToday)} today
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {task.status !== 'DONE' && !isActive && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleStartTimer(task.id)}
                            disabled={loading || activeTimeEntry !== null}
                          >
                            Start
                          </Button>
                        )}
                        {task.status !== 'DONE' && (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteTask(task.id)}
                            disabled={loading || isActive}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-secondary)'
                            }}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Tab below tasks: Reports / Dashboard for admins (role from users collection) */}
      {role === 'ADMIN' && (
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <Link to="/admin/reports" style={{ textDecoration: 'none' }}>
            <Button variant="primary" style={{ minWidth: '180px' }}>
              📊 Reports / Dashboard
            </Button>
          </Link>
        </div>
      )}

      {/* 3. Today Summary - Small Card */}
      {todaySummary && (
        <Card>
          <CardHeader>
            <CardTitle>Today Summary</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                  Time Tracked
                </div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                  {formatDuration(todaySummary.totalTodaySeconds)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                  Tasks Completed
                </div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                  {todaySummary.completedTasksTodayCount}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <StartWorkingModal
        isOpen={showStartWorkingModal}
        onClose={() => setShowStartWorkingModal(false)}
        onStart={handleStartWorking}
        availableTasks={tasks.filter((t) => t.status !== 'DONE')}
        loading={loading}
      />

      {selectedTask && (
        <TaskDetails
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            loadAll();
            setSelectedTask(null);
          }}
          isAdmin={false}
        />
      )}
    </AppLayout>
  );
}
