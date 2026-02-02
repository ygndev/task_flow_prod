import { useState } from 'react';
import { Button } from './Button';
import { Card, CardHeader, CardTitle, CardBody } from './Card';

interface TaskFiltersProps {
  onFilterChange: (filters: {
    status?: string;
    priority?: string;
    tag?: string;
    searchQuery?: string;
    sortBy?: 'dueDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }) => void;
  availableTags?: string[];
}

export function TaskFilters({ onFilterChange, availableTags = [] }: TaskFiltersProps) {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [tag, setTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleApply = () => {
    onFilterChange({
      status: status || undefined,
      priority: priority || undefined,
      tag: tag || undefined,
      searchQuery: searchQuery || undefined,
      sortBy,
      sortOrder,
    });
  };

  const handleClear = () => {
    setStatus('');
    setPriority('');
    setTag('');
    setSearchQuery('');
    setSortBy('createdAt');
    setSortOrder('desc');
    onFilterChange({});
  };

  return (
    <Card className="mb-lg">
      <CardHeader>
        <CardTitle>Filters & Search</CardTitle>
      </CardHeader>
      <CardBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div>
            <label className="form-label">Search</label>
            <input
              type="text"
              className="input"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
              <label className="form-label">Status</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">All</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>
          </div>
          {availableTags.length > 0 && (
            <div>
              <label className="form-label">Tag</label>
              <select className="select" value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">All</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
              <label className="form-label">Sort By</label>
              <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'createdAt')}>
                <option value="createdAt">Created Date</option>
                <option value="dueDate">Due Date</option>
              </select>
            </div>
            <div>
              <label className="form-label">Order</label>
              <select className="select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Button variant="primary" onClick={handleApply}>
              Apply Filters
            </Button>
            <Button onClick={handleClear}>Clear</Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
