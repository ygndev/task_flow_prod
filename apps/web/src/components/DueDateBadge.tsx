import { formatDate } from '../utils/formatDate';

interface DueDateBadgeProps {
  dueDate: string | null;
}

export function DueDateBadge({ dueDate }: DueDateBadgeProps) {
  if (!dueDate) {
    return <span className="text-tertiary text-sm">No due date</span>;
  }

  const due = new Date(dueDate);
  const now = new Date();
  const isOverdue = due < now && due.toDateString() !== now.toDateString();

  return (
    <span
      className="text-sm"
      style={{
        color: isOverdue ? 'var(--color-error)' : 'var(--color-text-secondary)',
        fontWeight: isOverdue ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
      }}
    >
      {isOverdue && '⚠️ '}
      {formatDate(dueDate)}
    </span>
  );
}
