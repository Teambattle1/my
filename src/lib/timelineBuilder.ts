import type { TaskJob, ActivityInfo, TimelineItem, RouteInfo } from '@/types';
import { extractHHMM, hhmmToMinutes, minutesToHHMM } from './helpers';

export const WAREHOUSES = {
  jylland: { label: 'Jylland (Fredericia)', lon: 9.7528, lat: 55.5678 },
  sjaelland: { label: 'Sjælland (Frederikssund)', lon: 12.0687, lat: 55.8375 },
};

export interface TimelineData {
  items: TimelineItem[];
  getinLagerTime: string | null;
  getinLocTime: string | null;
  gamestartTime: string | null;
  endTime: string;
  endTimeMins: number | null;
  transitMinutes: number | null;
  routeMinutes: number | null;
  routeKm: number | null;
  setupMinutes: number | null;
  packTimeSum: number;
  setupTimeSum: number;
  unpackTimeSum: number;
  teardownTimeSum: number;
  dagSlutTime: string | null;
  dur: number;
  maxSessions: number;
  activitySummaries: { name: string; duration: number | null; sessions: number; rounds: number | null }[];
}

export function buildTimeline(
  job: TaskJob,
  activityInfos: ActivityInfo[],
  routeInfo?: RouteInfo | null,
  region?: 'øst' | 'vest' | null,
): TimelineData {
  const activityIds: string[] = Array.isArray(job.activities) ? job.activities : [];
  const actSessions: Record<string, string> = job.activity_sessions && typeof job.activity_sessions === 'object' ? job.activity_sessions : {};

  const maxSessions = activityIds.reduce((mx, id) => {
    const s = Number(actSessions[id]) || 1;
    return Math.max(mx, s);
  }, 1);

  const getinLagerTime = extractHHMM(job.get_in_time_storage);
  const getinLocTime = extractHHMM(job.get_in_time_location);
  const gamestartTime = extractHHMM(job.event_date);
  const durPerSession = Number(job.duration_minutes) || 0;
  const dur = durPerSession * maxSessions;

  // End time
  let endTime = '—';
  let endTimeMins: number | null = null;
  if (job.event_end) {
    endTime = extractHHMM(job.event_end) || '—';
    endTimeMins = hhmmToMinutes(endTime);
  } else if (gamestartTime && dur > 0) {
    const gsMins = hhmmToMinutes(gamestartTime);
    if (gsMins !== null) {
      endTimeMins = gsMins + dur;
      endTime = minutesToHHMM(endTimeMins);
    }
  }

  const getinLagerMins = hhmmToMinutes(getinLagerTime);
  const getinLocMins = hhmmToMinutes(getinLocTime);
  const gamestartMins = hhmmToMinutes(gamestartTime);

  const transitMinutes = (getinLagerMins !== null && getinLocMins !== null && getinLocMins > getinLagerMins)
    ? getinLocMins - getinLagerMins
    : null;

  const setupMinutes = (getinLocMins !== null && gamestartMins !== null && gamestartMins > getinLocMins)
    ? gamestartMins - getinLocMins
    : null;

  // Route from crew's hub (OSRM actual data)
  const hubRoute = routeInfo
    ? (region === 'øst' ? routeInfo.sjaelland : routeInfo.jylland)
    : null;
  const routeMinutes = hubRoute?.min ?? null;
  const routeKm = hubRoute?.km ?? null;

  // Per-activity logistics — build individual step lists
  const selectedActInfos = activityIds
    .map(id => activityInfos.find(a => a.id === id))
    .filter(Boolean) as ActivityInfo[];

  const multipleActivities = selectedActInfos.length > 1;

  // Per-activity pack/setup/teardown/unpack
  const packSteps = selectedActInfos
    .filter(a => (a.pack_time_minutes || 0) > 0)
    .map(a => ({ name: a.name, min: a.pack_time_minutes! }));
  const setupSteps = selectedActInfos
    .filter(a => (a.setup_time_minutes || 0) > 0)
    .map(a => ({ name: a.name, min: a.setup_time_minutes! }));
  const teardownSteps = selectedActInfos
    .filter(a => (a.setup_time_minutes || 0) > 0) // teardown ≈ setup
    .map(a => ({ name: a.name, min: a.setup_time_minutes! }));
  const unpackSteps = selectedActInfos
    .filter(a => (a.unpack_time_minutes || 0) > 0)
    .map(a => ({ name: a.name, min: a.unpack_time_minutes! }));

  const packTimeSum = packSteps.reduce((s, a) => s + a.min, 0);
  const setupTimeSum = setupSteps.reduce((s, a) => s + a.min, 0);
  const teardownTimeSum = teardownSteps.reduce((s, a) => s + a.min, 0);
  const unpackTimeSum = unpackSteps.reduce((s, a) => s + a.min, 0);

  // Activity summaries for display
  const activitySummaries = activityIds.map(id => {
    const info = activityInfos.find(a => a.id === id);
    const sessions = Number(actSessions[id]) || 1;
    return {
      name: info?.name || id,
      duration: info?.default_duration || null,
      sessions,
      rounds: info?.default_rounds || null,
    };
  });

  // ═══════════════════════════════════════
  // Build timeline items — per-activity
  // ═══════════════════════════════════════
  const items: TimelineItem[] = [];

  // ── FØR: Get-in lager ──
  if (getinLagerTime) {
    items.push({ label: 'Get-in lager', time: getinLagerTime, color: 'green' });
  }

  // ── FØR: Per-activity pakning på lager ──
  if (multipleActivities) {
    for (const step of packSteps) {
      items.push({ label: `Pak ${step.name}`, time: `${step.min} min`, color: 'blue' });
    }
  } else if (packTimeSum > 0) {
    items.push({ label: 'Pak lager', time: `${packTimeSum} min`, color: 'blue' });
  }

  // ── FØR: Kørsel til lokation ──
  const driveMinEstimate = routeMinutes
    ?? (transitMinutes !== null && transitMinutes > 0 ? Math.max(0, transitMinutes - packTimeSum) : null);
  if (driveMinEstimate !== null && driveMinEstimate > 0) {
    const driveLabel = routeKm ? `Kørsel (${routeKm} km)` : 'Kørsel';
    items.push({ label: driveLabel, time: `${driveMinEstimate} min`, color: 'yellow' });
  }

  // ── FØR: Get-in lokation ──
  if (getinLocTime) {
    items.push({ label: 'Get-in lokation', time: getinLocTime, color: 'green' });
  }

  // ── FØR: Per-activity opsætning på lokation ──
  if (multipleActivities) {
    for (const step of setupSteps) {
      items.push({ label: `Opsæt ${step.name}`, time: `${step.min} min`, color: 'blue' });
    }
  } else if (setupTimeSum > 0) {
    items.push({ label: 'Opsætning', time: `${setupTimeSum} min`, color: 'blue' });
  }

  // ── UNDER: Session ──
  if (gamestartTime) {
    items.push({ label: 'Session start', time: gamestartTime, color: 'highlight' });
  }
  if (dur > 0) {
    items.push({ label: maxSessions > 1 ? `Sessiontid ×${maxSessions}` : 'Sessiontid', time: `${dur} min`, color: 'highlight' });
  }
  if (endTime && endTime !== '—') {
    items.push({ label: 'Session slut', time: endTime, color: 'highlight' });
  }

  // ── EFTER: Per-activity nedpakning på lokation ──
  if (multipleActivities) {
    for (const step of teardownSteps) {
      items.push({ label: `Nedpak ${step.name}`, time: `${step.min} min`, color: 'blue' });
    }
  } else if (teardownTimeSum > 0) {
    items.push({ label: 'Nedpakning', time: `${teardownTimeSum} min`, color: 'blue' });
  }

  // ── EFTER: Tank / Oplad bil ──
  if (job.bil_tankes || job.bil_oplades) {
    const bilLabel = [job.bil_tankes ? 'Tank bil' : '', job.bil_oplades ? 'Oplad bil' : ''].filter(Boolean).join(' + ');
    const bilMin = (job.bil_tankes ? 10 : 0) + (job.bil_oplades ? 30 : 0);
    items.push({ label: bilLabel, time: `${bilMin} min`, color: 'purple' });
  }

  // ── EFTER: Retur kørsel ──
  if (driveMinEstimate !== null && driveMinEstimate > 0) {
    const returLabel = routeKm ? `Retur (${routeKm} km)` : 'Retur kørsel';
    items.push({ label: returLabel, time: `${driveMinEstimate} min`, color: 'yellow' });
  }

  // ── EFTER: Per-activity udpakning på lager ──
  if (multipleActivities) {
    for (const step of unpackSteps) {
      items.push({ label: `Udpak ${step.name}`, time: `${step.min} min`, color: 'blue' });
    }
  } else if (unpackTimeSum > 0) {
    items.push({ label: 'Udpak lager', time: `${unpackTimeSum} min`, color: 'blue' });
  }

  // ── Dag slut estimat ──
  const driveForCalc = driveMinEstimate ?? 0;
  const postEventMins = teardownTimeSum
    + driveForCalc
    + unpackTimeSum
    + ((job.bil_tankes ? 10 : 0) + (job.bil_oplades ? 30 : 0));
  const dagSlutMins = (endTimeMins !== null && postEventMins > 0) ? endTimeMins + postEventMins : null;
  const dagSlutTime = dagSlutMins !== null ? minutesToHHMM(dagSlutMins) : null;
  if (dagSlutTime) {
    items.push({ label: 'Opgave slut', time: dagSlutTime, color: 'green' });
  }

  return {
    items,
    getinLagerTime,
    getinLocTime,
    gamestartTime,
    endTime,
    endTimeMins,
    transitMinutes,
    routeMinutes,
    routeKm,
    setupMinutes,
    packTimeSum,
    setupTimeSum,
    unpackTimeSum,
    teardownTimeSum,
    dagSlutTime,
    dur,
    maxSessions,
    activitySummaries,
  };
}

/** Calculate OSRM route from both warehouses to a destination address */
export async function calculateRoute(address: string): Promise<RouteInfo | null> {
  const q = address.trim();
  if (!q || q.length < 4) return null;

  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Denmark')}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'da' } }
    );
    const geoData = await geoRes.json();
    if (!geoData.length) return null;

    const destLon = parseFloat(geoData[0].lon);
    const destLat = parseFloat(geoData[0].lat);

    const calcRoute = async (wh: { lon: number; lat: number }) => {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${wh.lon},${wh.lat};${destLon},${destLat}?overview=false`);
      const data = await res.json();
      if (data.routes?.[0]) return { km: Math.round(data.routes[0].distance / 1000), min: Math.round(data.routes[0].duration / 60) };
      return undefined;
    };

    const [jyl, sjl] = await Promise.all([calcRoute(WAREHOUSES.jylland), calcRoute(WAREHOUSES.sjaelland)]);
    return { jylland: jyl, sjaelland: sjl };
  } catch {
    return null;
  }
}
