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
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(15,23,42,0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'wx-fade 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes wx-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wx-slide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#f1f5f9',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderRadius: 24,
          margin: '0 8px 8px',
          padding: '16px 14px 24px',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
          animation: 'wx-slide 0.25s ease-out',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 4px' }}>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Vejrudsigt
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              {locationLabel}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Luk"
          >
            <X size={18} color="#0f172a" />
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
