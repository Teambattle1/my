import { windColorByStrength, windDirectionLabel } from './utils/weatherCodes';

interface Props {
  speedMps: number;
  gustsMps: number;
  directionDeg: number;
}

export default function WindCompass({ speedMps, gustsMps, directionDeg }: Props) {
  const color = windColorByStrength(speedMps);
  const dirLabel = windDirectionLabel(directionDeg);

  // SVG coordinate system: 0° = up (N), clockwise — matches meteorological "from" direction
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r  = 64;

  const cardinals = [
    { label: 'N', angle: 0 },
    { label: 'Ø', angle: 90 },
    { label: 'S', angle: 180 },
    { label: 'V', angle: 270 },
  ];

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: 20,
      padding: '14px 12px',
      boxShadow: '0 4px 12px rgba(15,23,42,0.05)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', alignSelf: 'flex-start', marginBottom: 6 }}>
        Vind
      </div>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r + 8} fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r} fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />

        {/* Tick marks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i * 15) * Math.PI / 180;
          const inner = i % 6 === 0 ? r - 8 : r - 4;
          const x1 = cx + Math.sin(a) * r;
          const y1 = cy - Math.cos(a) * r;
          const x2 = cx + Math.sin(a) * inner;
          const y2 = cy - Math.cos(a) * inner;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth={i % 6 === 0 ? 1.5 : 0.8} />;
        })}

        {/* Cardinal labels */}
        {cardinals.map(c => {
          const a = c.angle * Math.PI / 180;
          const dx = cx + Math.sin(a) * (r - 18);
          const dy = cy - Math.cos(a) * (r - 18);
          return (
            <text
              key={c.label}
              x={dx}
              y={dy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fontWeight="700"
              fill={c.label === 'N' ? '#ef4444' : '#64748b'}
            >
              {c.label}
            </text>
          );
        })}

        {/* Arrow — points in direction the wind is going TO (opposite of "from") */}
        <g transform={`rotate(${directionDeg + 180}, ${cx}, ${cy})`}>
          <line x1={cx} y1={cy + 30} x2={cx} y2={cy - 44} stroke={color} strokeWidth="4" strokeLinecap="round" />
          <polygon points={`${cx - 8},${cy - 36} ${cx + 8},${cy - 36} ${cx},${cy - 52}`} fill={color} />
          <circle cx={cx} cy={cy + 30} r="4" fill={color} />
        </g>

        {/* Center circle */}
        <circle cx={cx} cy={cy} r="26" fill="#fff" stroke={color} strokeWidth="2" />
        <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="800" fill="#0f172a" fontFamily="monospace">
          {speedMps.toFixed(1)}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#64748b" fontWeight="600">
          m/s
        </text>
      </svg>

      <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 12, color: '#475569' }}>
        <div>
          <span style={{ color: '#94a3b8' }}>Retning</span>{' '}
          <strong style={{ color: '#0f172a' }}>{dirLabel}</strong>
        </div>
        {gustsMps > 0 && (
          <div>
            <span style={{ color: '#94a3b8' }}>Vindstød</span>{' '}
            <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{gustsMps.toFixed(1)} m/s</strong>
          </div>
        )}
      </div>
    </div>
  );
}
