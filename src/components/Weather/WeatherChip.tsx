import { useEffect, useState } from 'react';
import { Loader2, CloudSun } from 'lucide-react';
import { geocodeAddress } from './hooks/useGeocode';
import { getWeatherInfo } from './utils/weatherCodes';

interface Props {
  city: string;
  address?: string | null;
  onClick: () => void;
}

interface QuickWeather {
  temp: number;
  weatherCode: number;
  isDay: boolean;
}

const CACHE_PREFIX = 'wx_chip_';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

function readCache(key: string): QuickWeather | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, t } = JSON.parse(raw);
    if (Date.now() - t > CACHE_TTL_MS) return null;
    return data as QuickWeather;
  } catch { return null; }
}

function writeCache(key: string, data: QuickWeather) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, t: Date.now() })); } catch {}
}

/**
 * Compact live weather preview shown inside a JobCard.
 * Fetches current weather for the job's city (cached 15 min across cards).
 * Clicking triggers parent to open the fullscreen WeatherDashboard.
 */
export default function WeatherChip({ city, address, onClick }: Props) {
  const cacheKey = (address || city).toLowerCase().trim();
  const [data, setData] = useState<QuickWeather | null>(() => readCache(cacheKey));
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (data) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const point = await geocodeAddress(address || city);
      if (!point || cancelled) { setLoading(false); return; }
      try {
        const url = `https://api.open-meteo.com/v1/forecast`
          + `?latitude=${point.lat.toFixed(4)}&longitude=${point.lon.toFixed(4)}`
          + `&current=temperature_2m,weather_code,is_day`
          + `&timezone=Europe/Copenhagen`
          + `&models=dmi_seamless`;
        const res = await fetch(url);
        const json = await res.json();
        if (cancelled) return;
        if (json?.current) {
          const q: QuickWeather = {
            temp: json.current.temperature_2m,
            weatherCode: json.current.weather_code,
            isDay: json.current.is_day === 1,
          };
          setData(q);
          writeCache(cacheKey, q);
        }
      } catch { /* swallow — keep loading state off */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [cacheKey, address, city, data]);

  const info = data ? getWeatherInfo(data.weatherCode, data.isDay) : null;
  const Icon = info?.icon;

  const bg = data?.isDay === false
    ? 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(49,46,129,0.95) 100%)'
    : 'linear-gradient(135deg, rgba(125,211,252,0.92) 0%, rgba(56,189,248,0.92) 100%)';
  const textColor = data?.isDay === false ? '#f1f5f9' : '#0c4a6e';
  const iconColor = data?.isDay === false ? '#fbbf24' : '#f59e0b';

  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick(); }}
      aria-label={`Vis vejr for ${city}`}
      title="Vis aktuelt vejr — klik for fullscreen"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px 5px 6px',
        borderRadius: 10,
        background: data ? bg : 'rgba(148,163,184,0.15)',
        border: `1px solid ${data?.isDay === false ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.55)'}`,
        cursor: 'pointer',
        flexShrink: 0,
        minWidth: 0,
        boxShadow: data ? '0 2px 8px rgba(15,23,42,0.25)' : 'none',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {loading && !data ? (
        <>
          <Loader2 size={14} color="#94a3b8" style={{ animation: 'spin 0.75s linear infinite' }} />
          <span style={{
            fontSize: 10,
            color: '#cbd5e1',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            Vejr…
          </span>
        </>
      ) : !data ? (
        <>
          <CloudSun size={14} color="#cbd5e1" />
          <span style={{
            fontSize: 10,
            color: '#cbd5e1',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            Vis vejr
          </span>
        </>
      ) : (
        <>
          {Icon && <Icon size={20} color={iconColor} strokeWidth={1.8} />}
          <span style={{
            fontSize: 14,
            fontWeight: 900,
            color: textColor,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}>
            {Math.round(data.temp)}°
          </span>
        </>
      )}
    </button>
  );
}
