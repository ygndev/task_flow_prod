import { ReactNode, CSSProperties } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'todo' | 'in-progress' | 'done' | 'default';
  className?: string;
  style?: CSSProperties;
}

export function Badge({ children, variant = 'default', className = '', style }: BadgeProps) {
  const variantClass = variant !== 'default' ? `badge-${variant}` : '';
  
  return (
    <span className={`badge ${variantClass} ${className}`.trim()} style={style}>
      {children}
    </span>
  );
}
