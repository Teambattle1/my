import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, Pause } from 'lucide-react';
import { useRainRadar, buildTileUrl } from './hooks/useRainRadar';

interface Props {
  lat: number;
  lon: number;
}

function fmtFrameTime(unix: number): string {
  try {
    return new Date(unix * 1000).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
  } catch { return ''; }
}

export default function RainRadarMap({ lat, lon }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const { host, frames, currentFrame, currentIndex, playing, togglePlaying, setCurrentIndex, error } = useRainRadar();

  // Init Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [lat, lon],
      zoom: 8,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CartoDB &copy; RainViewer',
      maxZoom: 19,
    }).addTo(map);

    // Marker for location
    L.marker([lat, lon]).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter if lat/lon changes
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView([lat, lon], 8);
  }, [lat, lon]);

  // Swap radar tile layer when current frame changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentFrame) return;

    const url = buildTileUrl(host, currentFrame.path, 0, 0, 0)
      .replace('/0/0/0/', '/{z}/{x}/{y}/');

    const layer = L.tileLayer(url, {
      opacity: 0.65,
      zIndex: 10,
      tileSize: 256,
    }).addTo(map);

    // Remove old layer after new one loaded (avoid flicker)
    if (radarLayerRef.current) {
      const old = radarLayerRef.current;
      window.setTimeout(() => map.removeLayer(old), 150);
    }
    radarLayerRef.current = layer;
  }, [host, currentFrame]);

  const pastCount = frames.filter(f => f.kind === 'past').length;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: 20,
      padding: '14px',
      boxShadow: '0 4px 12px rgba(15,23,42,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>
          Regnradar {currentFrame && (
            <span style={{
              marginLeft: 8,
              padding: '2px 6px',
              borderRadius: 6,
              fontSize: 10,
              background: currentFrame.kind === 'past' ? '#dbeafe' : '#fef3c7',
              color: currentFrame.kind === 'past' ? '#1d4ed8' : '#a16207',
              fontWeight: 700,
            }}>
              {currentFrame.kind === 'past' ? 'Real' : 'Prognose'} · {fmtFrameTime(currentFrame.time)}
            </span>
          )}
        </div>
        <button
          onClick={togglePlaying}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={playing ? 'Pause animation' : 'Afspil animation'}
        >
          {playing ? <Pause size={14} color="#0f172a" /> : <Play size={14} color="#0f172a" />}
        </button>
      </div>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 260,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      />

      {/* Frame scrubber */}
      {frames.length > 0 && (
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={currentIndex}
          onChange={e => setCurrentIndex(Number(e.target.value))}
          style={{
            width: '100%',
            marginTop: 10,
            accentColor: currentFrame?.kind === 'nowcast' ? '#f59e0b' : '#0ea5e9',
          }}
        />
      )}
      {frames.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
          <span>−{pastCount - 1} fr.</span>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>Nu</span>
          <span>+{frames.length - pastCount} fr.</span>
        </div>
      )}

      {error && <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>{error}</div>}
    </div>
  );
}
