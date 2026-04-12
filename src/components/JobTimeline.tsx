import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Loader2, MapPin, Users as UsersIcon, Clock, Truck, Package, AlertTriangle } from 'lucide-react';
import { fetchJobById, fetchJobCrew, fetchJobVehicles, fetchJobPackingItems, fetchJobGear, fetchActivityInfo, fetchMyRoleOnJob } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { buildTimeline, calculateRoute, WAREHOUSES } from '@/lib/timelineBuilder';
import { fmtDate, fmtShortDate, fmtTime, getTaskRegion } from '@/lib/helpers';
import TimelineBar from './TimelineBar';
import CrewPanel from './CrewPanel';
import type { TaskJob, CrewAssignment, VehicleAssignment, JobPackingItem, GearAssignment, ActivityInfo, RouteInfo } from '@/types';

const PRINT_CSS = `
@media print {
  html, body { background: #fff !important; color: #000 !important; margin: 0; padding: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print { display: none !important; }
  .rapport-paper { padding: 8mm 10mm !important; margin: 0 !important; width: 100% !important; min-height: auto !important; max-width: none !important; box-shadow: none !important; }
  @page { margin: 6mm 8mm; size: A4 portrait; }
}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

interface JobTimelineProps {
  jobId: string;
  onBack: () => void;
}

function Section({ title, color, children }: { title: string; color: 'green' | 'orange' | 'blue'; children: React.ReactNode }) {
  const colors = {
    green:  { bg: '#ecfdf5', border: '#6ee7b7', text: '#047857' },
    orange: { bg: '#fff7ed', border: '#fdba74', text: '#c2410c' },
    blue:   { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
  };
  const c = colors[color];
  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ background: c.bg, padding: '4px 10px', borderBottom: `1px solid ${c.border}` }}>
        <span style={{ fontSize: '8pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: c.text }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '8px 10px', background: '#fff' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, bold, icon }: { label: string; value?: string | number | null; bold?: boolean; icon?: React.ReactNode }) {
  const display = (value === null || value === undefined || value === '') ? '—' : value;
  const isEmpty = display === '—';
  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '2px', fontSize: '9pt', lineHeight: 1.4, alignItems: 'center' }}>
      {icon && <span style={{ flexShrink: 0, color: '#94a3b8', display: 'flex' }}>{icon}</span>}
      <span style={{ color: '#6b7280', flexShrink: 0, width: icon ? '75px' : '85px' }}>{label}:</span>
      <span style={{ color: isEmpty ? '#9ca3af' : (bold ? '#111827' : '#1f2937'), fontWeight: bold ? 600 : 400 }}>{display}</span>
    </div>
  );
}

function SubRow({ text, color }: { text: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '2px', fontSize: '8pt', lineHeight: 1.4 }}>
      <span style={{ color: 'transparent', flexShrink: 0, width: '85px' }}> </span>
      <span style={{ color, fontStyle: 'italic' }}>↳ {text}</span>
    </div>
  );
}

function NoteRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: '4px', fontSize: '9pt', lineHeight: 1.4 }}>
      <span style={{ fontSize: '8pt', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>{label}: </span>
      <span style={{ color: '#1f2937' }}>{value}</span>
    </div>
  );
}

export default function JobTimeline({ jobId, onBack }: JobTimelineProps) {
  const { employeeId, employeeLocation } = useAuth();
  const [job, setJob] = useState<TaskJob | null>(null);
  const [crew, setCrew] = useState<CrewAssignment[]>([]);
  const [vehicles, setVehicles] = useState<VehicleAssignment[]>([]);
  const [packingItems, setPackingItems] = useState<JobPackingItem[]>([]);
  const [gear, setGear] = useState<GearAssignment[]>([]);
  const [activityInfos, setActivityInfos] = useState<ActivityInfo[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const [j, cr, vh, pk, gr] = await Promise.all([
          fetchJobById(jobId),
          fetchJobCrew(jobId),
          fetchJobVehicles(jobId),
          fetchJobPackingItems(jobId),
          fetchJobGear(jobId),
        ]);
        setJob(j);
        setCrew(cr);
        setVehicles(vh);
        setPackingItems(pk);
        setGear(gr);

        if (j?.activities?.length) {
          const infos = await fetchActivityInfo(j.activities);
          setActivityInfos(infos);
        }

        if (employeeId) {
          const role = await fetchMyRoleOnJob(jobId, employeeId);
          setMyRole(role);
        }
      } catch (e) {
        console.error('JobTimeline load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, employeeId]);

  useEffect(() => {
    if (!job) return;
    const addr = (job.location_address || job.location_name || '').trim();
    if (addr.length < 4) return;
    calculateRoute(addr).then(r => setRouteInfo(r));
  }, [job]);

  if (loading || !job) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <Loader2 size={32} color="#ea580c" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: 12, color: '#94a3b8' }}>Indlæser opgave...</span>
      </div>
    );
  }

  // Derived
  const opgaveId = job.opgave_id ? `#${String(job.opgave_id).padStart(4, '0')}` : '—';
  const region = getTaskRegion(job.location_address) ?? getTaskRegion(job.location_city);
  // Use employee's own location if available, otherwise fall back to task region
  const effectiveRegion = employeeLocation
    ? (employeeLocation === 'Øst' ? 'øst' : 'vest') as 'øst' | 'vest'
    : region;
  const timeline = buildTimeline(job, activityInfos, routeInfo, effectiveRegion);
  const isLead = myRole === 'lead' || myRole === 'teamlead';
  const warehouseLabel = effectiveRegion === 'øst' ? WAREHOUSES.sjaelland.label : WAREHOUSES.jylland.label;
  const route = routeInfo ? (effectiveRegion === 'øst' ? routeInfo.sjaelland : routeInfo.jylland) : null;

  const primaryVehicle = vehicles[0];
  const actIdToInfo: Record<string, ActivityInfo> = {};
  activityInfos.forEach(a => { actIdToInfo[a.id] = a; });
  const activityIds: string[] = Array.isArray(job.activities) ? job.activities : [];
  const actCounts: Record<string, string> = job.activity_counts && typeof job.activity_counts === 'object' ? job.activity_counts : {};
  const actSessions: Record<string, string> = job.activity_sessions && typeof job.activity_sessions === 'object' ? job.activity_sessions : {};

  const showPayment = job.customer_type === 'privat' || job.customer_type === 'polterabend';

  const tableItems = [
    { label: 'Skæreborde 80cm', value: job.bord_skaere_80 },
    { label: 'Foldeborde 180cm', value: job.bord_folde_180 },
    { label: 'Foldeborde 240cm', value: job.bord_folde_240 },
    { label: 'Høje caféborde', value: job.hoeje_cafeborde },
    { label: 'Dug 180cm', value: job.dug_180 },
    { label: 'Dug 240cm', value: job.dug_240 },
    { label: 'Dug rund 80cm', value: job.dug_rund_80 },
  ].filter(t => t.value && Number(t.value) > 0);

  const noteFields = [
    { label: 'Generelt', value: job.notes },
    { label: 'Opgavenote', value: job.task_notes },
    { label: 'Timing', value: job.timing_note },
    { label: 'Crew', value: job.crew_note },
    { label: 'Aktiviteter', value: job.aktiviteter_note },
    { label: 'Gear', value: job.gear_note },
    { label: 'Transport', value: job.transport_note },
    { label: 'Betaling', value: job.ub_note },
  ];

  const durPerSession = Number(job.duration_minutes) || 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Toolbar */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: '#0f172a', borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
      }}>
        <button onClick={onBack} style={{
          padding: 8, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', cursor: 'pointer', display: 'flex',
        }}>
          <ArrowLeft size={18} color="#fff" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', flex: 1 }}>
          {job.client_name || 'Opgave'} @ {job.location_name || '—'}
        </span>
        <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{opgaveId}</span>
        <button onClick={() => window.print()} style={{
          padding: '8px 16px', borderRadius: 8, background: '#ea580c', border: 'none',
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Printer size={15} /> Udskriv
        </button>
      </div>

      {/* Paper */}
      <div className="no-print" style={{ minHeight: '100vh', background: '#0f172a', paddingTop: 56 }} />
      <div style={{
        position: 'absolute', top: 72, left: 0, right: 0, display: 'flex', justifyContent: 'center', paddingBottom: 40,
      }} className="no-print-wrapper">
        <div
          className="rapport-paper"
          style={{
            background: '#ffffff',
            color: '#111827',
            width: '210mm',
            minHeight: '297mm',
            padding: '10mm 12mm',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,.5)',
            margin: '0 auto',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10pt',
            lineHeight: 1.4,
          }}
        >

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #111', paddingBottom: '6px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {job.client_logo_url && (
                <img src={job.client_logo_url} alt="" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 4 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <span style={{ fontSize: '16pt', fontWeight: 900, letterSpacing: '0.2em', color: '#ea580c' }}>EVENTDAY</span>
            </div>
            <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
              <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b7280' }}>
                {(job.client_name || 'KUNDE').toUpperCase()}
              </div>
              <div style={{ fontSize: '8pt', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ea580c' }}>
                @ {(job.location_name || 'LOKATION').toUpperCase()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14pt', color: '#111' }}>{opgaveId}</span>
              <div style={{ fontSize: '8pt', color: '#6b7280' }}>{fmtShortDate(job.event_date)}</div>
            </div>
          </div>

          {/* ── 2-column grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

            {/* KUNDE */}
            <Section title="Kunde" color="orange">
              <Row label="Kunde" value={job.client_name} bold />
              <Row label="Type" value={job.customer_type?.toUpperCase()} />
              <Row label="Kontakt" value={job.client_contact_name} />
              <Row label="Tlf" value={job.client_contact_phone} />
              <Row label="Email" value={job.client_contact_email} />
              <Row label="Bureau" value={job.agency} />
              <Row label="Kundenr." value={job.customer_number} />
              <Row label="Sprog" value={job.language} />
            </Section>

            {/* TID & DATO */}
            <Section title="Tid & Dato" color="orange">
              <Row label="Dato" value={fmtDate(job.event_date)} bold />
              <div style={{ height: '4px' }} />
              <Row label="Get-in lager" value={timeline.getinLagerTime} icon={<Clock size={10} />} />
              {timeline.transitMinutes !== null && timeline.transitMinutes > 0 && (
                <SubRow text={`Kørsel + pak: ${timeline.transitMinutes} min`} color="#a16207" />
              )}
              <Row label="Get-in lok." value={timeline.getinLocTime} icon={<Clock size={10} />} />
              {timeline.setupMinutes !== null && timeline.setupMinutes > 0 && (
                <SubRow text={`Opsætning: ${timeline.setupMinutes} min`} color="#1d4ed8" />
              )}
              <Row label="Session start" value={timeline.gamestartTime} bold icon={<Clock size={10} />} />
              <Row label="Varighed" value={timeline.dur > 0 ? (timeline.maxSessions > 1 ? `${durPerSession} min × ${timeline.maxSessions} = ${timeline.dur} min` : `${timeline.dur} min`) : null} />
              <Row label="Session slut" value={timeline.endTime !== '—' ? timeline.endTime : null} icon={<Clock size={10} />} />
              {timeline.teardownTimeSum > 0 && (
                <SubRow text={`Nedpakning: ${timeline.teardownTimeSum} min`} color="#1d4ed8" />
              )}
              {route && (
                <SubRow text={`Retur kørsel: ${route.min} min (${route.km} km)`} color="#a16207" />
              )}
              {timeline.unpackTimeSum > 0 && (
                <SubRow text={`Udpak lager: ${timeline.unpackTimeSum} min`} color="#1d4ed8" />
              )}
              {timeline.dagSlutTime && <Row label="Opgave slut" value={timeline.dagSlutTime} bold icon={<Clock size={10} />} />}
            </Section>

            {/* LOKATION */}
            <Section title="Lokation" color="green">
              <Row label="Sted" value={job.location_name} bold icon={<MapPin size={10} />} />
              <Row label="Adresse" value={job.location_address} />
              {routeInfo && (
                <div style={{ marginTop: '4px', borderTop: '1px solid #e5e7eb', paddingTop: '4px' }}>
                  <div style={{ fontSize: '7pt', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>Kørsel fra lager</div>
                  {routeInfo.jylland && (
                    <div style={{ display: 'flex', gap: '4px', fontSize: '8pt', lineHeight: 1.4, marginBottom: '1px' }}>
                      <span style={{ color: '#6b7280', width: '85px', flexShrink: 0 }}>Fredericia:</span>
                      <span style={{ color: effectiveRegion === 'vest' ? '#111827' : '#9ca3af', fontWeight: effectiveRegion === 'vest' ? 600 : 400 }}>
                        {routeInfo.jylland.min} min ({routeInfo.jylland.km} km)
                      </span>
                      {effectiveRegion === 'vest' && <span style={{ fontSize: '7pt', color: '#ea580c', fontWeight: 700 }}>✦</span>}
                    </div>
                  )}
                  {routeInfo.sjaelland && (
                    <div style={{ display: 'flex', gap: '4px', fontSize: '8pt', lineHeight: 1.4 }}>
                      <span style={{ color: '#6b7280', width: '85px', flexShrink: 0 }}>Frederikssund:</span>
                      <span style={{ color: effectiveRegion === 'øst' ? '#111827' : '#9ca3af', fontWeight: effectiveRegion === 'øst' ? 600 : 400 }}>
                        {routeInfo.sjaelland.min} min ({routeInfo.sjaelland.km} km)
                      </span>
                      {effectiveRegion === 'øst' && <span style={{ fontSize: '7pt', color: '#ea580c', fontWeight: 700 }}>✦</span>}
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* AKTIVITETER */}
            <Section title="Aktiviteter" color="orange">
              {activityIds.length > 0 ? (
                <div>
                  {activityIds.map(id => {
                    const info = actIdToInfo[id];
                    const name = info?.name || id;
                    const sessions = Number(actSessions[id]) || 1;
                    const defaultDur = info?.default_duration || null;
                    const defaultRounds = info?.default_rounds || null;

                    return (
                      <div key={id} style={{ marginBottom: '6px', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '10pt', fontWeight: 600, color: '#111827' }}>
                          {name}
                          {sessions > 1 && (
                            <span style={{ marginLeft: '8px', fontSize: '9pt', fontWeight: 700, color: '#ea580c' }}>×{sessions} sessions</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '8pt', color: '#6b7280', marginTop: '1px' }}>
                          {defaultDur && (
                            <span>Varighed pr. session: <strong style={{ color: '#1f2937' }}>{defaultDur} min</strong></span>
                          )}
                          {defaultRounds !== null && defaultRounds > 1 && (
                            <span>Runder: <strong style={{ color: '#1f2937' }}>{defaultRounds}</strong></span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span style={{ color: '#9ca3af', fontSize: '9pt' }}>Ingen aktiviteter valgt</span>
              )}
              <Row label="Total varighed" value={timeline.dur > 0 ? `${timeline.dur} min` : null} />
            </Section>

            {/* CREW */}
            <Section title="Crew" color="blue">
              <CrewPanel crew={crew} currentEmployeeId={employeeId} isLead={isLead} />
            </Section>

            {/* TRANSPORT */}
            <Section title="Transport" color="blue">
              <Row label="Lager" value={warehouseLabel} bold icon={<Truck size={10} />} />
              {primaryVehicle && (
                <>
                  <Row label="Bil" value={primaryVehicle.car_name} icon={<Truck size={10} />} />
                  {primaryVehicle.car_team_id && <Row label="Team nr." value={`Hold ${primaryVehicle.car_team_id}`} bold />}
                  {primaryVehicle.trailer_name && <Row label="Trailer" value={primaryVehicle.trailer_name} />}
                  {primaryVehicle.trailer_team_id && <Row label="Team nr." value={`Hold ${primaryVehicle.trailer_team_id}`} bold />}
                </>
              )}
              {job.bil_tankes && <div style={{ fontSize: '8pt', color: '#b45309', fontWeight: 600, marginTop: 2 }}>Bil skal tankes</div>}
              {job.bil_oplades && <div style={{ fontSize: '8pt', color: '#b45309', fontWeight: 600 }}>Bil skal oplades</div>}
              {route && (
                <div style={{ marginTop: '4px', borderTop: '1px solid #e5e7eb', paddingTop: '4px' }}>
                  <Row label="Kørsel" value={`${route.km} km / ${route.min} min`} icon={<Truck size={10} />} />
                  <Row label="Retur" value={`${route.km} km / ${route.min} min`} icon={<Truck size={10} />} />
                </div>
              )}
            </Section>

            {/* BORDE & DUG */}
            {tableItems.length > 0 && (
              <Section title="Borde & Dug" color="green">
                {tableItems.map((t, i) => (
                  <Row key={i} label={t.label} value={`${t.value} stk`} />
                ))}
              </Section>
            )}

            {/* BETALING — kun privat/polterabend */}
            {showPayment && (
              <Section title="Betaling" color="orange">
                <Row label="Metode" value={job.payment_method?.toUpperCase()} />
                <Row label="Beløb" value={job.payment_amount ? `${job.payment_amount} kr` : null} />
                <Row label="Kortgebyr" value={job.payment_card_fee ? `${job.payment_card_fee} kr` : null} />
                <Row label="Kontakt" value={job.payment_contact} />
                {job.mobilepay && <Row label="MobilePay" value={job.mobilepay_amount ? `${job.mobilepay_amount} kr` : 'Ja'} />}
                {job.kontant_amount && <Row label="Kontant" value={`${job.kontant_amount} kr`} />}
                {job.faktura_sendt && <div style={{ fontSize: '8pt', color: '#15803d', fontWeight: 600 }}>Faktura sendt</div>}
              </Section>
            )}
          </div>

          <div style={{ height: '10px' }} />

          {/* ── DAGSOVERBLIK TIMELINE ── */}
          <TimelineBar items={timeline.items} activitySummaries={timeline.activitySummaries} />

          {/* Category summary */}
          {timeline.items.length > 1 && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '8pt', flexWrap: 'wrap', alignItems: 'center' }}>
              {(timeline.packTimeSum + timeline.setupTimeSum + timeline.teardownTimeSum + timeline.unpackTimeSum > 0) && (
                <span style={{ color: '#1d4ed8' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', marginRight: '3px', verticalAlign: 'middle' }} />
                  Pak/ops: <strong>{timeline.packTimeSum + timeline.setupTimeSum + timeline.teardownTimeSum + timeline.unpackTimeSum} min</strong>
                </span>
              )}
              {timeline.routeMinutes !== null && timeline.routeMinutes > 0 && (
                <span style={{ color: '#a16207' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#eab308', marginRight: '3px', verticalAlign: 'middle' }} />
                  Kørsel: <strong>~{timeline.routeMinutes * 2} min</strong>
                </span>
              )}
              {timeline.dur > 0 && (
                <span style={{ color: '#b91c1c' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', marginRight: '3px', verticalAlign: 'middle' }} />
                  Opgave: <strong>{timeline.dur} min</strong>
                </span>
              )}
              {timeline.getinLagerTime && (
                <span style={{ color: '#6b7280' }}>
                  Start: <strong style={{ color: '#111827' }}>{timeline.getinLagerTime}</strong>
                </span>
              )}
              {(timeline.dagSlutTime || timeline.endTime !== '—') && (
                <span style={{ color: '#6b7280' }}>
                  Slut: <strong style={{ color: '#ea580c' }}>{timeline.dagSlutTime || timeline.endTime}</strong>
                </span>
              )}
            </div>
          )}

          {/* Packing items */}
          {packingItems.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <Section title="Pakkeliste" color="green">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 16px' }}>
                  {packingItems.map(item => (
                    <div key={item.id} style={{ fontSize: '8pt', color: '#374151', display: 'flex', gap: 4 }}>
                      <span style={{ color: '#9ca3af' }}>☐</span>
                      <span>{item.quantity > 1 ? `${item.quantity}${item.unit ? ` ${item.unit}` : '×'} ` : ''}{item.item_name}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* NOTER */}
          {noteFields.some(n => n.value) && (
            <div style={{ marginTop: '10px' }}>
              <Section title="Noter" color="blue">
                {noteFields.filter(n => n.value).map(n => (
                  <NoteRow key={n.label} label={n.label} value={n.value} />
                ))}
              </Section>
            </div>
          )}

          {/* Evaluering */}
          {job.skal_evalueres && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: '9pt', fontWeight: 700, color: '#ea580c' }}>
              <AlertTriangle size={14} /> Husk evaluering!
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '20px', paddingTop: '6px', borderTop: '1px solid #d1d5db', fontSize: '7pt', color: '#9ca3af', textAlign: 'center' }}>
            Udskrevet {new Date().toLocaleDateString('da-DK', { day: '2-digit', month: 'long', year: 'numeric' })}
            {' — '}EVENTDAY / TEAMBATTLE
          </div>
        </div>
      </div>
    </>
  );
}
