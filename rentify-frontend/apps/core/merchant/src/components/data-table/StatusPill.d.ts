import type { ReactNode } from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Dot + label status badge (StatusPill.jsx). */
export function StatusPill(props: { tone?: StatusTone; children?: ReactNode; className?: string }): JSX.Element;
export default StatusPill;
