import { useEffect, useState } from 'react';
import { Calendar, MapPin, Users, Clock, Loader2, ChevronRight, ChevronDown, LogOut } from 'lucide-react';
import { fetchMyJobs, fetchActivityInfo, getCachedJobs } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { fmtDate, getRelativeDay, getDanishWeekday } from '@/lib/helpers';
import { ACTIVITY_COLORS } from '@/lib/activityNames';
import WeatherChip from './Weather/WeatherChip';
import WeatherDashboard from './Weather/WeatherDashboard';
import type { TaskJob, ActivityInfo } from '@/types';

interface WeatherTarget {
  city: string;
  address: string | null;
}

interface JobsListProps {
  onJobSelected: (jobId: string) => void;
}

/** Live 24-hour clock — ticks every second. */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 2,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontVariantNumeric: 'tabular-nums',
      color: '#ffffff',
    }}>
      <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.02em' }}>{hh}</span>
      <span style={{ fontSize: 24, fontWeight: 800 }}>:</span>
      <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.02em' }}>{mm}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginLeft: 2 }}>:{ss}</span>
    </div>
  );
}

/** Get ISO week number */
function getWeekNumber(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Group jobs by month → week → date */
function groupJobs(jobs: TaskJob[]): { month: string; weeks: { week: number; dates: { dateKey: string; date: Date; jobs: TaskJob[] }[] }[] }[] {
  const monthMap = new Map<string, Map<number, Map<string, TaskJob[]>>>();

  for (const job of jobs) {
    if (!job.event_date) continue;
    const d = new Date(job.event_date);
    const monthKey = d.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' });
    const week = getWeekNumber(d);
    const dateKey = d.toISOString().split('T')[0];

    if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Map());
    const weekMap = monthMap.get(monthKey)!;
    if (!weekMap.has(week)) weekMap.set(week, new Map());
    const dateMap = weekMap.get(week)!;
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
    dateMap.get(dateKey)!.push(job);
  }

  return [...monthMap.entries()].map(([month, weekMap]) => ({
    month,
    weeks: [...weekMap.entries()].map(([week, dateMap]) => ({
      week,
      dates: [...dateMap.entries()].map(([dateKey, jobs]) => ({
        dateKey,
        date: new Date(dateKey),
        jobs,
      })),
    })),
  }));
}

export default function JobsList({ onJobSelected }: JobsListProps) {
  const { session, employeeId, signOut } = useAuth();
  const [jobs, setJobs] = useState<TaskJob[]>([]);
  const [activityMap, setActivityMap] = useState<Record<string, ActivityInfo>>({});
  const [loading, setLoading] = useState(true);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [weatherTarget, setWeatherTarget] = useState<WeatherTarget | null>(null);

  useEffect(() => {
    if (!employeeId) return;

    // 1. Show cache instantly
    const cached = getCachedJobs();
    if (cached.length > 0) {
      setJobs(cached);
      setLoading(false);
    }

    // 2. Fetch fresh data in background
    (async () => {
      const data = await fetchMyJobs(employeeId);
      setJobs(data);

      const allIds = new Set<string>();
      data.forEach(j => j.activities?.forEach(id => allIds.add(id)));
      if (allIds.size > 0) {
        const infos = await fetchActivityInfo([...allIds]);
        const map: Record<string, ActivityInfo> = {};
        infos.forEach(a => { map[a.id] = a; });
        setActivityMap(map);
      }
      setLoading(false);
    })();
  }, [employeeId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <Loader2 size={32} color="#ea580c" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: 12, color: '#94a3b8', fontSize: 15 }}>Henter opgaver...</span>
      </div>
    );
  }

  const grouped = groupJobs(jobs);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = today.toISOString().split('T')[0];

  const toggleMonth = (month: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        {/* Left: logo + user */}
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '0.18em',
            color: '#ea580c',
            textTransform: 'uppercase',
          }}>
            MY EVENTDAY
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {session?.name || ''}
          </div>
        </div>

        {/* Center: live 24h clock */}
        <LiveClock />

        {/* Right: log out icon */}
        <button
          onClick={signOut}
          aria-label="Log ud"
          title="Log ud"
          style={{
            width: 38,
            height: 38,
            padding: 0,
            background: 'transparent',
            border: '1px solid #334155',
            borderRadius: 10,
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
        {jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <Calendar size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ fontSize: 16 }}>Ingen opgaver fundet</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Du har ingen tildelte opgaver</p>
          </div>
        ) : (
          grouped.map(monthGroup => {
            const isCollapsed = collapsedMonths.has(monthGroup.month);
            const jobCount = monthGroup.weeks.reduce((s, w) => s + w.dates.reduce((s2, d) => s2 + d.jobs.length, 0), 0);

            return (
              <div key={monthGroup.month} style={{ marginBottom: 24 }}>
                {/* Month header */}
                <div
                  onClick={() => toggleMonth(monthGroup.month)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 4px', cursor: 'pointer',
                    borderBottom: '1px solid #334155', marginBottom: 12,
                  }}
                >
                  {isCollapsed ? <ChevronRight size={16} color="#ffffff" /> : <ChevronDown size={16} color="#ea580c" />}
                  <span style={{
                    fontSize: 14, fontWeight: 900, textTransform: 'uppercase',
                    color: isCollapsed ? '#ffffff' : '#ea580c',
                    letterSpacing: '0.12em',
                  }}>
                    {monthGroup.month}
                  </span>
                  <span style={{ fontSize: 11, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                    ({jobCount} {jobCount === 1 ? 'OPGAVE' : 'OPGAVER'})
                  </span>
                </div>

                {!isCollapsed && monthGroup.weeks.map(weekGroup => (
                  <div key={weekGroup.week} style={{ marginBottom: 16 }}>
                    {/* Week header */}
                    <div style={{
                      fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '0.18em', color: '#ffffff',
                      marginBottom: 8, paddingLeft: 4, opacity: 0.85,
                    }}>
                      UGE {weekGroup.week}
                    </div>

                    {weekGroup.dates.map(dateGroup => {
                      const isToday = dateGroup.dateKey === todayKey;
                      const isPast = dateGroup.date < today;
                      const relDay = getRelativeDay(dateGroup.dateKey);
                      const weekday = getDanishWeekday(dateGroup.dateKey);

                      return (
                        <div key={dateGroup.dateKey} style={{ marginBottom: 12 }}>
                          {/* Date header */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            marginBottom: 6, paddingLeft: 4,
                          }}>
                            <Calendar size={11} color={isToday ? '#ea580c' : '#ffffff'} />
                            <span style={{
                              fontSize: 12, fontWeight: isToday ? 900 : 700,
                              color: isToday ? '#ea580c' : (isPast ? '#64748b' : '#ffffff'),
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                            }}>
                              {relDay && <span style={{ fontWeight: 900 }}>{relDay.toUpperCase()} — </span>}
                              {weekday.toUpperCase()} {fmtDate(dateGroup.dateKey).toUpperCase()}
                            </span>
                          </div>

                          {/* Job cards for this date */}
                          {dateGroup.jobs.map(job => (
                            <JobCard
                              key={job.id}
                              job={job}
                              activityMap={activityMap}
                              onSelect={onJobSelected}
                              onOpenWeather={setWeatherTarget}
                              dimmed={isPast}
                              isToday={isToday}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Fullscreen weather overlay triggered from any JobCard */}
      {weatherTarget && (
        <WeatherDashboard
          city={weatherTarget.city}
          address={weatherTarget.address}
          onClose={() => setWeatherTarget(null)}
        />
      )}
    </div>
  );
}

function JobCard({ job, activityMap, onSelect, onOpenWeather, dimmed, isToday }: {
  job: TaskJob;
  activityMap: Record<string, ActivityInfo>;
  onSelect: (id: string) => void;
  onOpenWeather: (target: WeatherTarget) => void;
  dimmed?: boolean;
  isToday?: boolean;
}) {
  const actNames = (job.activities || []).map(id => activityMap[id]?.name || id);

  const time = job.event_date
    ? new Date(job.event_date).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')
    : null;

  return (
    <div
      onClick={() => onSelect(job.id)}
      style={{
        background: isToday ? '#1e293b' : '#1e293b',
        border: `1px solid ${isToday ? '#ea580c44' : '#334155'}`,
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 6,
        cursor: 'pointer',
        opacity: dimmed ? 0.55 : 1,
        transition: 'border-color 0.15s',
        borderLeft: isToday ? '3px solid #ea580c' : undefined,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#ea580c')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = isToday ? '#ea580c44' : '#334155')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          {/* Time + Client */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {time && time !== '00.00' && (
              <span style={{
                fontSize: 13, fontWeight: 700, color: '#ea580c',
                fontFamily: 'monospace',
              }}>
                {time}
              </span>
            )}
            <span style={{
              fontSize: 15,
              fontWeight: 900,
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {(job.client_name || 'Uden navn').toUpperCase()}
            </span>
          </div>

          {/* Location */}
          {job.location_name && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              color: '#e2e8f0',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}>
              <MapPin size={11} />
              {job.location_name}
            </div>
          )}

          {/* Activity pills */}
          {actNames.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {actNames.map((name, i) => (
                <span key={i} style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: (ACTIVITY_COLORS[name] || '#475569') + '22',
                  color: ACTIVITY_COLORS[name] || '#94a3b8',
                  border: `1px solid ${(ACTIVITY_COLORS[name] || '#475569')}44`,
                }}>
                  {name}
                </span>
              ))}
              {job.guests_count && (
                <span style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Users size={10} /> {job.guests_count}
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {(job.location_city || job.location_address) && (
            <WeatherChip
              city={job.location_city || job.location_name || 'Lokation'}
              address={job.location_address}
              onClick={() => onOpenWeather({
                city: job.location_city || job.location_name || 'Lokation',
                address: job.location_address,
              })}
            />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {job.opgave_id && (
              <span style={{ fontSize: 9, color: '#cbd5e1', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.04em' }}>
                #{String(job.opgave_id).padStart(4, '0')}
              </span>
            )}
            <ChevronRight size={18} color="#64748b" />
          </div>
        </div>
      </div>
    </div>
  );
}
