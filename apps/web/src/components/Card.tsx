import { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}

export function Card({ children, className = '', padding = 'lg', style }: CardProps) {
  const paddingClass = padding === 'sm' ? 'p-sm' : padding === 'md' ? 'p-md' : '';
  
  return (
    <div className={`card ${paddingClass} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`card-header ${className}`.trim()}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h2 className={`card-title ${className}`.trim()}>
      {children}
    </h2>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={`card-body ${className}`.trim()}>
      {children}
    </div>
  );
}
