import type { TimelineItem, TLColor } from '@/types';

const TL_STYLES: Record<TLColor, { bg: string; border: string; labelColor: string; timeColor: string }> = {
  highlight: { bg: '#fef2f2', border: '#fca5a5', labelColor: '#b91c1c', timeColor: '#991b1b' },
  green:     { bg: '#ecfdf5', border: '#6ee7b7', labelColor: '#047857', timeColor: '#065f46' },
  blue:      { bg: '#eff6ff', border: '#93c5fd', labelColor: '#1d4ed8', timeColor: '#1e3a8a' },
  yellow:    { bg: '#fefce8', border: '#fde047', labelColor: '#a16207', timeColor: '#854d0e' },
  purple:    { bg: '#faf5ff', border: '#c4b5fd', labelColor: '#7c3aed', timeColor: '#5b21b6' },
  default:   { bg: '#f9fafb', border: '#d1d5db', labelColor: '#6b7280', timeColor: '#374151' },
};

function TimelineItemEl({ label, time, color }: TimelineItem) {
  const s = TL_STYLES[color];
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '3px 8px', borderRadius: '4px', flexShrink: 0,
      background: s.bg, border: `1.5px solid ${s.border}`,
    }}>
      <span style={{ fontSize: '6.5pt', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, color: s.labelColor, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{ fontSize: '10pt', fontFamily: 'monospace', fontWeight: 700, color: s.timeColor }}>
        {time}
      </span>
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ width: '14px', height: '2px', background: '#d1d5db', flexShrink: 0, position: 'relative' }}>
      <div style={{
        position: 'absolute', right: '-3px', top: '-3px',
        width: 0, height: 0,
        borderTop: '4px solid transparent', borderBottom: '4px solid transparent',
        borderLeft: '5px solid #d1d5db',
      }} />
    </div>
  );
}

interface ActivitySummary {
  name: string;
  duration: number | null;
  sessions: number;
  rounds: number | null;
}

interface TimelineBarProps {
  items: TimelineItem[];
  activitySummaries?: ActivitySummary[];
}

export default function TimelineBar({ items, activitySummaries }: TimelineBarProps) {
  if (items.length === 0) return null;

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ background: '#fef2f2', padding: '3px 8px', borderBottom: '1px solid #fca5a5' }}>
        <span style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#991b1b' }}>Dagsoverblik</span>
      </div>
      <div style={{ padding: '8px 10px', background: '#fff' }}>
        {/* Timeline flow */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          overflowX: 'auto',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TimelineItemEl {...item} />
              {i < items.length - 1 && <Arrow />}
            </div>
          ))}
        </div>

        {/* Activity summaries */}
        {activitySummaries && activitySummaries.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {activitySummaries.map((act, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '2px 8px', borderRadius: '10px',
                background: '#fff7ed', border: '1px solid #fdba74',
                fontSize: '8pt', color: '#9a3412',
              }}>
                <span style={{ fontWeight: 700 }}>{act.name}</span>
                {act.duration && <span style={{ color: '#c2410c' }}>{act.duration} min</span>}
                {act.sessions > 1 && <span style={{ color: '#6b7280' }}>×{act.sessions}</span>}
                {act.rounds !== null && act.rounds > 1 && (
                  <span style={{ color: '#6b7280' }}>({act.rounds} runder)</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
