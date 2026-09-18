import type { Outcome } from '@/lib/schema';

/** The outcome stated large — docs/03-APPFLOW.md §5, item 2. */
export function OutcomeFigure({ outcome }: { outcome: Outcome }) {
  return (
    <p className="figure-outcome" style={{ paddingTop: '44px' }}>
      <b>{outcome.value}</b>
      <span
        style={{
          display: 'block',
          marginTop: '10px',
          fontSize: 'var(--text-body)',
          color: 'var(--color-muted)',
        }}
      >
        {outcome.label}
      </span>
    </p>
  );
}
