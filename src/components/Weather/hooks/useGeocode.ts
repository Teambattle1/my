import { useEffect, useState } from 'react';

export interface GeoPoint {
  lat: number;
  lon: number;
  displayName?: string;
}

const CACHE_PREFIX = 'geo_cache_';
const COPENHAGEN: GeoPoint = { lat: 55.6761, lon: 12.5683, displayName: 'København (fallback)' };

function readCache(key: string): GeoPoint | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as GeoPoint) : null;
  } catch { return null; }
}

function writeCache(key: string, point: GeoPoint) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(point)); } catch {}
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const q = address.trim();
  if (q.length < 3) return null;

  const cached = readCache(q.toLowerCase());
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Denmark')}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'da' } }
    );
    const data = await res.json();
    if (!data.length) return null;
    const point: GeoPoint = {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
    writeCache(q.toLowerCase(), point);
    return point;
  } catch {
    return null;
  }
}

export function useGeocode(address: string | null | undefined) {
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) { setPoint(COPENHAGEN); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    geocodeAddress(address)
      .then(p => {
        if (cancelled) return;
        if (p) setPoint(p);
        else { setPoint(COPENHAGEN); setError('Kunne ikke finde adressen — bruger København'); }
      })
      .catch(() => { if (!cancelled) { setPoint(COPENHAGEN); setError('Geocode fejlede — bruger København'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [address]);

  return { point, loading, error };
}
