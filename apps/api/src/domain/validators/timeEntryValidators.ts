export function ensureStartBeforeEnd(start: Date, end: Date): void {
  if (start >= end) {
    throw new Error('Start time must be before end time');
  }
}

export function computeDurationSeconds(start: Date, end: Date): number {
  ensureStartBeforeEnd(start, end);
  const milliseconds = end.getTime() - start.getTime();
  return Math.floor(milliseconds / 1000);
}

export function ensureNotNegativeDuration(seconds: number): void {
  if (seconds < 0) {
    throw new Error('Duration cannot be negative');
  }
}
