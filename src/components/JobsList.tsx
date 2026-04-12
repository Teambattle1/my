import { useEffect, useState } from 'react';
import { Calendar, MapPin, Users, Clock, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { fetchMyJobs, fetchActivityInfo } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { fmtDate, getRelativeDay, getDanishWeekday } from '@/lib/helpers';
import { ACTIVITY_COLORS } from '@/lib/activityNames';
import type { TaskJob, ActivityInfo } from '@/types';

interface JobsListProps {
  onJobSelected: (jobId: string) => void;
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
  const { profile, signOut } = useAuth();
  const [jobs, setJobs] = useState<TaskJob[]>([]);
  const [activityMap, setActivityMap] = useState<Record<string, ActivityInfo>>({});
  const [loading, setLoading] = useState(true);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      if (!profile?.email) return;
      setLoading(true);
      const data = await fetchMyJobs(profile.email);
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
    };
    load();
  }, [profile?.email]);

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
        padding: '20px 24px',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.15em', color: '#ea580c' }}>EVENTDAY</span>
          <span style={{ fontSize: 13, color: '#64748b', marginLeft: 12 }}>{profile?.name || profile?.email}</span>
        </div>
        <button
          onClick={signOut}
          style={{
            padding: '6px 16px',
            background: 'transparent',
            border: '1px solid #475569',
            borderRadius: 6,
            color: '#94a3b8',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Log ud
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
                  {isCollapsed ? <ChevronRight size={16} color="#64748b" /> : <ChevronDown size={16} color="#ea580c" />}
                  <span style={{
                    fontSize: 14, fontWeight: 800, textTransform: 'capitalize',
                    color: isCollapsed ? '#64748b' : '#ea580c',
                    letterSpacing: '0.05em',
                  }}>
                    {monthGroup.month}
                  </span>
                  <span style={{ fontSize: 11, color: '#475569' }}>({jobCount} opgave{jobCount !== 1 ? 'r' : ''})</span>
                </div>

                {!isCollapsed && monthGroup.weeks.map(weekGroup => (
                  <div key={weekGroup.week} style={{ marginBottom: 16 }}>
                    {/* Week header */}
                    <div style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.15em', color: '#475569',
                      marginBottom: 8, paddingLeft: 4,
                    }}>
                      Uge {weekGroup.week}
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
                            <Calendar size={11} color={isToday ? '#ea580c' : '#64748b'} />
                            <span style={{
                              fontSize: 12, fontWeight: isToday ? 700 : 500,
                              color: isToday ? '#ea580c' : (isPast ? '#475569' : '#94a3b8'),
                              textTransform: 'capitalize',
                            }}>
                              {relDay && <span style={{ fontWeight: 700 }}>{relDay} — </span>}
                              {weekday} {fmtDate(dateGroup.dateKey)}
                            </span>
                          </div>

                          {/* Job cards for this date */}
                          {dateGroup.jobs.map(job => (
                            <JobCard
                              key={job.id}
                              job={job}
                              activityMap={activityMap}
                              onSelect={onJobSelected}
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
    </div>
  );
}

function JobCard({ job, activityMap, onSelect, dimmed, isToday }: {
  job: TaskJob;
  activityMap: Record<string, ActivityInfo>;
  onSelect: (id: string) => void;
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
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
              {job.client_name || 'Uden navn'}
            </span>
          </div>

          {/* Location */}
          {job.location_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <ChevronRight size={18} color="#475569" />
          {job.opgave_id && (
            <span style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace' }}>
              #{String(job.opgave_id).padStart(4, '0')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
