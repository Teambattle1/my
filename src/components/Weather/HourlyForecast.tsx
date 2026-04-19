import type { HourPoint } from './hooks/useWeather';
import { getWeatherInfo } from './utils/weatherCodes';

interface Props {
  hourly: HourPoint[];
}

function fmtHour(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
  } catch { return '—'; }
}

export default function HourlyForecast({ hourly }: Props) {
  if (!hourly.length) return null;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: 20,
      padding: '12px 4px 12px 12px',
      boxShadow: '0 4px 12px rgba(15,23,42,0.05)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', paddingLeft: 4, marginBottom: 8 }}>
        Næste 6 timer
      </div>
      <div style={{
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        paddingBottom: 4,
        paddingRight: 12,
        scrollbarWidth: 'thin',
      }}>
        {hourly.map((h, i) => {
          const info = getWeatherInfo(h.weatherCode, true);
          const Icon = info.icon;
          const rainPct = Math.round(h.precipitationProbability || 0);
          return (
            <div key={i} style={{
              flexShrink: 0,
              minWidth: 72,
              textAlign: 'center',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '10px 6px',
            }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {fmtHour(h.time)}
              </div>
              <div style={{ margin: '6px 0', display: 'flex', justifyContent: 'center' }}>
                <Icon size={26} color="#0ea5e9" strokeWidth={1.8} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(h.temperature)}°
              </div>
              <div style={{
                fontSize: 10,
                marginTop: 4,
                color: rainPct >= 40 ? '#2563eb' : '#94a3b8',
                fontWeight: rainPct >= 40 ? 700 : 500,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {rainPct > 0 ? `${rainPct}%` : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
