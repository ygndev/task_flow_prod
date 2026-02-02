import { Badge } from './Badge';

interface PriorityBadgeProps {
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const variantMap = {
    LOW: 'default',
    MEDIUM: 'default',
    HIGH: 'default',
  } as const;

  const colorMap = {
    LOW: { style: { backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' } },
    MEDIUM: { style: { backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' } },
    HIGH: { style: { backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)' } },
  };

  return (
    <Badge variant={variantMap[priority]} className="" style={colorMap[priority].style}>
      {priority}
    </Badge>
  );
}
