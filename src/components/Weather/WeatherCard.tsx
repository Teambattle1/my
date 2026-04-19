import { Droplets, Thermometer, MapPin } from 'lucide-react';
import type { CurrentWeather } from './hooks/useWeather';
import { getWeatherInfo } from './utils/weatherCodes';

interface Props {
  current: CurrentWeather;
  locationLabel: string;
}

export default function WeatherCard({ current, locationLabel }: Props) {
  const info = getWeatherInfo(current.weatherCode, current.isDay);
  const Icon = info.icon;

  // Palette: day = sky gradient, night = indigo/slate
  const bg = current.isDay
    ? 'linear-gradient(135deg, rgba(186,230,253,0.85) 0%, rgba(125,211,252,0.85) 60%, rgba(56,189,248,0.85) 100%)'
    : 'linear-gradient(135deg, rgba(30,41,59,0.92) 0%, rgba(49,46,129,0.92) 60%, rgba(15,23,42,0.92) 100%)';
  const textColor = current.isDay ? '#0c4a6e' : '#e2e8f0';
  const softText  = current.isDay ? '#075985' : '#94a3b8';
  const iconColor = current.isDay ? '#f59e0b' : '#fbbf24';

  return (
    <div style={{
      position: 'relative',
      padding: '20px 22px',
      borderRadius: 24,
      background: bg,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${current.isDay ? 'rgba(255,255,255,0.6)' : 'rgba(148,163,184,0.3)'}`,
      boxShadow: '0 10px 30px rgba(15,23,42,0.15)',
      color: textColor,
      overflow: 'hidden',
    }}>
      {/* Location */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: softText, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
        <MapPin size={12} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{locationLabel}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Temperature */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 60, fontWeight: 200, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(current.temperature)}
            </span>
            <span style={{ fontSize: 28, fontWeight: 300 }}>°</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{info.label}</div>
          <div style={{ fontSize: 13, color: softText, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Thermometer size={12} /> Føles som {Math.round(current.apparent)}°
          </div>
        </div>

        {/* Weather icon */}
        <div style={{ flexShrink: 0, padding: 8 }}>
          <Icon size={72} color={iconColor} strokeWidth={1.5} />
        </div>
      </div>

      {/* Info chips */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <Chip icon={<Droplets size={13} />} label="Fugtighed" value={`${Math.round(current.humidity)}%`} dark={!current.isDay} />
        <Chip icon={<span style={{ fontSize: 12 }}>☔</span>} label="Nedbør nu" value={`${current.precipitation.toFixed(1)} mm`} dark={!current.isDay} />
      </div>
    </div>
  );
}

function Chip({ icon, label, value, dark }: { icon: React.ReactNode; label: string; value: string; dark: boolean }) {
  return (
    <div style={{
      background: dark ? 'rgba(148,163,184,0.15)' : 'rgba(255,255,255,0.55)',
      border: `1px solid ${dark ? 'rgba(148,163,184,0.25)' : 'rgba(255,255,255,0.8)'}`,
      borderRadius: 12,
      padding: '6px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
    }}>
      <span style={{ display: 'flex' }}>{icon}</span>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
