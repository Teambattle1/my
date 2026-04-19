import { useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useGeocode } from './hooks/useGeocode';
import { useWeather } from './hooks/useWeather';
import WeatherCard from './WeatherCard';
import HourlyForecast from './HourlyForecast';
import WindCompass from './WindCompass';
import RainRadarMap from './RainRadarMap';

interface Props {
  city: string;
  address?: string | null;
  onClose: () => void;
}

export default function WeatherDashboard({ city, address, onClose }: Props) {
  const query = address || city;
  const { point, loading: geoLoading, error: geoError } = useGeocode(query);
  const { data, loading: wxLoading, error: wxError } = useWeather(point?.lat ?? null, point?.lon ?? null);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const loading = geoLoading || wxLoading;
  const err = wxError || geoError;
  const locationLabel = city || 'Ukendt lokation';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        animation: 'wx-fade 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes wx-fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <div
        style={{
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          background: '#f1f5f9',
          padding: '16px 14px 40px',
          fontFamily: 'Arial, Helvetica, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        {/* Sticky header */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '-16px -14px 14px',
          padding: '14px 16px',
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 10,
              color: '#ea580c',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
            }}>
              Vejrudsigt
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 900,
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {locationLabel}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid #334155',
              background: '#1e293b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginLeft: 10,
            }}
            aria-label="Luk"
            title="Tilbage"
          >
            <X size={18} color="#ffffff" />
          </button>
        </div>

        {/* Loading */}
        {loading && !data && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            padding: '48px 20px', color: '#64748b',
          }}>
            <Loader2 size={28} color="#0ea5e9" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Henter vejrdata fra DMI...</span>
          </div>
        )}

        {/* Error */}
        {err && !data && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: 16, borderRadius: 14,
            background: '#fef2f2', border: '1px solid #fca5a5',
            color: '#991b1b', fontSize: 13, margin: '12px 4px',
          }}>
            <AlertTriangle size={18} /> {err}
          </div>
        )}

        {/* Weather content */}
        {data && point && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <WeatherCard current={data.current} locationLabel={locationLabel} />
            <HourlyForecast hourly={data.hourly} />

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 12,
            }}>
              <WindCompass
                speedMps={data.current.windSpeed}
                gustsMps={data.current.windGusts}
                directionDeg={data.current.windDirection}
              />
              <RainRadarMap lat={point.lat} lon={point.lon} />
            </div>

            <div style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', padding: '4px 0 0' }}>
              Data: Open-Meteo (DMI HARMONIE AROME 2 km) · Radar: RainViewer
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
