import { useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { firestoreDb } from '../lib/firebase';
import { Alert } from '../components/Alert';
import { Card, CardHeader, CardTitle, CardBody } from '../components/Card';
import { Button } from '../components/Button';

interface TimeTotalByUser {
  userId: string;
  totalDurationSeconds: number;
}

interface TimeReportResult {
  from: string;
  to: string;
  totals: TimeTotalByUser[];
}

// Format dates as YYYY-MM-DD for input[type="date"]
const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Get default date range (current month)
const getDefaultDateRange = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    from: formatDateForInput(firstDayOfMonth),
    to: formatDateForInput(lastDayOfMonth),
  };
};

export default function AdminReports() {
  const { user } = useAuth();
  const defaultRange = getDefaultDateRange();
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [report, setReport] = useState<TimeReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRunReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fromDate || !toDate) {
      setError('Please select both From and To dates');
      return;
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (from > to) {
      setError('Invalid date range: From must be before or equal to To');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setReport(null);

    try {
      const fromTs = Timestamp.fromDate(from);
      const toTs = Timestamp.fromDate(to);
      const q = query(
        collection(firestoreDb, 'timeEntries'),
        where('startTime', '>=', fromTs),
        where('startTime', '<=', toTs)
      );
      const snapshot = await getDocs(q);
      const userTotals = new Map<string, number>();

      snapshot.docs.forEach((docSnap) => {
        const d = docSnap.data();
        const endTime = d?.endTime;
        const durationSeconds = typeof d?.durationSeconds === 'number' ? d.durationSeconds : null;
        const userId = d?.userId != null ? String(d.userId) : '';
        if (endTime != null && durationSeconds != null && durationSeconds > 0 && userId) {
          userTotals.set(userId, (userTotals.get(userId) || 0) + durationSeconds);
        }
      });

      const totals: TimeTotalByUser[] = Array.from(userTotals.entries())
        .map(([userId, totalDurationSeconds]) => ({ userId, totalDurationSeconds }))
        .sort((a, b) => a.userId.localeCompare(b.userId));

      setReport({
        from: fromDate,
        to: toDate,
        totals,
      });
      setSuccess('Report generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (seconds: number): string => {
    return (seconds / 3600).toFixed(2);
  };

  const totalTrackedTime = report?.totals.reduce((sum, total) => sum + total.totalDurationSeconds, 0) || 0;

  return (
    <AppLayout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-description">View time tracking reports for your team</p>
        </div>
        <Link to="/admin/tasks">
          <Button variant="primary" style={{ whiteSpace: 'nowrap' }}>
            📋 Back to Tasks
          </Button>
        </Link>
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

      <Card className="mb-lg">
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleRunReport}>
            <div className="inline-actions" style={{ gap: 'var(--spacing-md)' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">From</label>
                <input
                  type="date"
                  className="input"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">To</label>
                <input
                  type="date"
                  className="input"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || !fromDate || !toDate}
                >
                  {loading ? 'Loading...' : 'Run Report'}
                </Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>

      {loading && (
        <Card>
          <CardBody>
            <div className="loading">
              <span className="loading-spinner"></span>
              Loading report...
            </div>
          </CardBody>
        </Card>
      )}

      {report && !loading && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle>
                Report Results ({report.from} to {report.to})
              </CardTitle>
              {totalTrackedTime > 0 && (
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  <strong>Total tracked time:</strong> {formatHours(totalTrackedTime)} hours
                </div>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {report.totals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-title">No completed time entries in this range</div>
                <div className="empty-state-text">
                  There are no completed time entries for the selected date range.
                </div>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Total Duration (seconds)</th>
                      <th>Total Duration (hours)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.totals.map((total) => (
                      <tr key={total.userId}>
                        <td>
                          <strong>{total.userId}</strong>
                        </td>
                        <td className="text-secondary">{total.totalDurationSeconds.toLocaleString()}</td>
                        <td className="text-secondary">
                          <strong>{formatHours(total.totalDurationSeconds)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </AppLayout>
  );
}
