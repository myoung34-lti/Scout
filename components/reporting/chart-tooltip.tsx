// Recharts renders its tooltip with hardcoded inline styles — a white card
// with a pale label — so it ignores the theme completely and is unreadable
// on a dark ground. These props push it onto the same tokens as everything
// else. Shared so the trend chart and the report builder can't drift apart.
export const CHART_TOOLTIP_PROPS = {
  contentStyle: {
    background: 'var(--popover)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--elevation-md)',
    color: 'var(--popover-foreground)',
    fontSize: '12px',
    padding: '8px 10px',
  },
  // The label is the muted line; series values keep their own series colour,
  // which Recharts sets per item.
  labelStyle: {
    color: 'var(--muted-foreground)',
    fontWeight: 600,
    marginBottom: '4px',
  },
  itemStyle: { padding: '1px 0' },
  cursor: { stroke: 'var(--border-strong)', strokeWidth: 1 },
} as const
