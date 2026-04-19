import { useEffect, useRef, useState } from 'react';

export interface RadarFrame {
  time: number;             // unix seconds
  path: string;             // tile path to insert in tile URL
  kind: 'past' | 'nowcast'; // past = real, nowcast = forecast
}

interface RainViewerResponse {
  host: string;
  radar: {
    past: { time: number; path: string }[];
    nowcast: { time: number; path: string }[];
  };
}

export function buildTileUrl(host: string, path: string, z: number, x: number, y: number) {
  // color scheme 2 (universal blue), smooth 1, snow 1
  return `${host}/v2/radar${path}/256/${z}/${x}/${y}/2/1_1.png`;
}

/** Fetches RainViewer frame index and animates the current frame every 500ms. */
export function useRainRadar() {
  const [host, setHost] = useState<string>('https://tilecache.rainviewer.com');
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(r => r.json() as Promise<RainViewerResponse>)
      .then(json => {
        if (cancelled) return;
        setHost(json.host);
        // Last ~10 past frames + all nowcast
        const past = json.radar.past.slice(-10).map<RadarFrame>(f => ({ ...f, kind: 'past' }));
        const nowcast = json.radar.nowcast.map<RadarFrame>(f => ({ ...f, kind: 'nowcast' }));
        const all = [...past, ...nowcast];
        setFrames(all);
        // Start at last past frame ("now")
        setCurrentIndex(Math.max(0, past.length - 1));
      })
      .catch(() => { if (!cancelled) setError('Regnradar kunne ikke hentes'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!playing || frames.length === 0) {
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = window.setInterval(() => {
      setCurrentIndex(i => (i + 1) % frames.length);
    }, 500);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [playing, frames.length]);

  const currentFrame = frames[currentIndex] ?? null;
  const togglePlaying = () => setPlaying(p => !p);

  return { host, frames, currentFrame, currentIndex, playing, togglePlaying, setCurrentIndex, error };
}
