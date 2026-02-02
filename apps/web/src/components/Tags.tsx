interface TagsProps {
  tags: string[];
  className?: string;
}

export function Tags({ tags, className = '' }: TagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className={`tags ${className}`.trim()} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="badge"
          style={{
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            fontSize: 'var(--font-size-xs)',
            padding: 'var(--spacing-xs) var(--spacing-sm)',
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
