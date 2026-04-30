import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Loader2, MapPin, Clock, Truck, Package, AlertTriangle, Users as UsersIcon, Phone, Mail, ChevronDown, ChevronUp, CloudSun, ClipboardCheck, Building2, ExternalLink, Plus, Globe } from 'lucide-react';
import { fetchJobById, fetchJobCrew, fetchJobVehicles, fetchJobPackingItems, fetchJobGear, fetchActivityInfo, fetchMyRoleOnJob, findVenueForJob, fetchJobEvaluation, fetchJobActionCardBlocks, derivePersonalTimeline } from '@/lib/supabase';
import type { VenueInfo, EvaluationField } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { buildTimeline, calculateRoute, WAREHOUSES } from '@/lib/timelineBuilder';
import { fmtDate, fmtShortDate, getTaskRegion } from '@/lib/helpers';
import { useJobRoute } from '@/hooks/useJobRoute';
import TimelineBar from './TimelineBar';
import CrewPanel from './CrewPanel';
import WeatherDashboard from './Weather/WeatherDashboard';
import CheckEmbed from './CheckEmbed';
import type { TaskJob, CrewAssignment, VehicleAssignment, JobPackingItem, GearAssignment, ActivityInfo, RouteInfo, JobActionCardBlock } from '@/types';

/* ═══════════════════════════════════════════════
   CSS — mobile-first + print A4
   ═══════════════════════════════════════════════ */
const STYLES = `
/* Mobile-first base */
.rapport-mobile { padding: 0 0 80px; }
.rapport-mobile .section { margin: 0 12px 12px; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
.rapport-mobile .section-head { padding: 10px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; cursor: pointer; display: flex; align-items: center; justify-content: space-between; }
.rapport-mobile .section-body { padding: 12px 14px; background: #fff; }
.rapport-mobile .row { display: flex; gap: 6px; margin-bottom: 4px; font-size: 14px; line-height: 1.5; align-items: baseline; }
.rapport-mobile .row-label { color: #6b7280; flex-shrink: 0; width: 100px; font-size: 13px; }
.rapport-mobile .row-value { color: #1f2937; font-weight: 500; }
.rapport-mobile .row-value.bold { font-weight: 700; color: #111827; }
.rapport-mobile .row-value.empty { color: #d1d5db; font-weight: 400; }
.rapport-mobile .sub-row { font-size: 12px; font-style: italic; padding-left: 106px; margin-bottom: 3px; }
.rapport-mobile .note-row { font-size: 13px; line-height: 1.5; margin-bottom: 6px; }
.rapport-mobile .note-label { font-weight: 700; color: #374151; text-transform: uppercase; font-size: 11px; }

/* Print: render A4, hide mobile chrome */
@media print {
  html, body { background: #fff !important; color: #000 !important; margin: 0; padding: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print { display: none !important; }
  .rapport-mobile { display: none !important; }
  .rapport-print { display: block !important; }
  .rapport-print .paper {
    padding: 8mm 10mm !important; margin: 0 !important;
    width: 100% !important; min-height: auto !important;
    max-width: none !important; box-shadow: none !important;
  }
  @page { margin: 6mm 8mm; size: A4 portrait; }
}
/* Screen: hide print version */
@media screen { .rapport-print { display: none !important; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

/* ═══════════════════════════════════════════════
   Small reusable bits
   ═══════════════════════════════════════════════ */

const SEC_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  orange: { bg: '#fff7ed', border: '#fdba74', text: '#c2410c' },
  green:  { bg: '#ecfdf5', border: '#6ee7b7', text: '#047857' },
  blue:   { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
  red:    { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
};

function MobileSection({ title, color, children, defaultOpen = true }: { title: string; color: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const c = SEC_COLORS[color] || SEC_COLORS.orange;
  return (
    <div className="section" style={{ borderColor: c.border }}>
      <div className="section-head" style={{ background: c.bg, color: c.text }} onClick={() => setOpen(!open)}>
        <span>{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

function MRow({ label, value, bold, icon }: { label: string; value?: string | number | null; bold?: boolean; icon?: React.ReactNode }) {
  const display = (value === null || value === undefined || value === '') ? '—' : value;
  const isEmpty = display === '—';
  return (
    <div className="row">
      {icon && <span style={{ color: '#94a3b8', display: 'flex', flexShrink: 0, marginRight: -2 }}>{icon}</span>}
      <span className="row-label">{label}:</span>
      <span className={`row-value${bold ? ' bold' : ''}${isEmpty ? ' empty' : ''}`}>{display}</span>
    </div>
  );
}

function MSubRow({ text, color }: { text: string; color: string }) {
  return <div className="sub-row" style={{ color }}>↳ {text}</div>;
}

function MNoteRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <div className="note-row"><span className="note-label">{label}: </span><span>{value}</span></div>;
}

/* ═══════════════════════════════════════════════
   Evaluation row — read-only display of a FLOW template + its response value
   ═══════════════════════════════════════════════ */

function EvaluationRow({ field }: { field: EvaluationField }) {
  const empty = field.value === null || field.value === '';

  const renderValue = () => {
    if (empty) return <span style={{ color: '#cbd5e1' }}>Ikke besvaret</span>;

    if (field.field_type === 'boolean') {
      const yes = field.value === 'true';
      return (
        <span style={{
          fontWeight: 800,
          color: yes ? '#b91c1c' : '#047857',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {yes ? 'Ja' : 'Nej'}
        </span>
      );
    }

    if (field.field_type === 'rating') {
      const max = (field.field_options as { max?: number } | null)?.max ?? 5;
      const n = Math.max(0, Math.min(max, Number(field.value) || 0));
      return (
        <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
          {Array.from({ length: max }).map((_, i) => (
            <span key={i} style={{ fontSize: 16, color: i < n ? '#f59e0b' : '#e5e7eb' }}>★</span>
          ))}
          <span style={{ marginLeft: 6, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {n}/{max}
          </span>
        </span>
      );
    }

    if (field.field_type === 'number') {
      return (
        <span style={{ fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
          {field.value}
        </span>
      );
    }

    // text / select / default
    return <span style={{ color: '#111827' }}>{field.value}</span>;
  };

  return (
    <div style={{
      padding: '8px 0',
      borderBottom: '1px solid #fee2e2',
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 800,
        color: '#991b1b',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: 3,
      }}>
        {field.title}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.5 }}>
        {renderValue()}
      </div>
      {field.description && !empty && (
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' }}>
          {field.description}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Venue info panel — reads from `locations` (VENUE db)
   ═══════════════════════════════════════════════ */

const VENUE_BASE_URL = 'https://venue.eventday.dk';

function VenueInfoPanel({
  venue,
  venueLoading,
  fallbackName,
  fallbackAddress,
}: {
  venue: VenueInfo | null;
  venueLoading: boolean;
  fallbackName: string | null;
  fallbackAddress: string | null;
}) {
  if (venueLoading) {
    return (
      <div className="no-print" style={{
        marginTop: 10, padding: '10px 14px', borderRadius: 12,
        border: '1px dashed #cbd5e1', background: '#f8fafc',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b',
      }}>
        <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Slår venue op…
      </div>
    );
  }

  if (!venue) {
    // Not found → OPRET VENUE link
    const params = new URLSearchParams();
    params.set('new', '1');
    if (fallbackName) params.set('name', fallbackName);
    if (fallbackAddress) params.set('address', fallbackAddress);
    const createUrl = `${VENUE_BASE_URL}/i?${params.toString()}`;
    return (
      <a
        className="no-print"
        href={createUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          marginTop: 10,
          width: '100%',
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px dashed #fdba74',
          background: '#fff7ed',
          color: '#c2410c',
          fontSize: 13,
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          boxSizing: 'border-box',
        }}
      >
        <Plus size={16} /> Opret venue
      </a>
    );
  }

  // Found → info card + ÅBN VENUE deep link
  const venueUrl = `${VENUE_BASE_URL}/i/${venue.id}`;
  return (
    <div className="no-print" style={{
      marginTop: 10,
      borderRadius: 14,
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      background: '#fff',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        background: 'linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%)',
        borderBottom: '1px solid #e2e8f0',
      }}>
        {venue.logo_url ? (
          <img
            src={venue.logo_url}
            alt=""
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', background: '#fff', border: '1px solid #e2e8f0', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#e0f2fe',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Building2 size={18} color="#0369a1" />
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#0369a1', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            VENUE{venue.venue_code ? ` · ${venue.venue_code}` : ''}
          </div>
          <div style={{
            fontSize: 14, fontWeight: 800, color: '#0f172a',
            textTransform: 'uppercase', letterSpacing: '0.03em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {venue.name}
          </div>
        </div>
      </div>

      {/* Body: notes + contact */}
      <div style={{ padding: '10px 12px', fontSize: 13, color: '#1f2937' }}>
        {venue.venue_note && (
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 6 }}>Venue-note:</span>
            {venue.venue_note}
          </div>
        )}
        {venue.adgang_note && (
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 6 }}>Adgang:</span>
            {venue.adgang_note}
          </div>
        )}
        {venue.notes && !venue.venue_note && (
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 6 }}>Note:</span>
            {venue.notes}
          </div>
        )}
        {(venue.phone || venue.teknisk_service_phone || venue.website) && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6, fontSize: 12 }}>
            {venue.phone && (
              <a href={`tel:${venue.phone}`} style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Phone size={11} /> {venue.phone}
              </a>
            )}
            {venue.teknisk_service_phone && (
              <a href={`tel:${venue.teknisk_service_phone}`} style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Phone size={11} /> Teknisk: {venue.teknisk_service_phone}
              </a>
            )}
            {venue.website && (
              <a href={venue.website} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Globe size={11} /> Website
              </a>
            )}
          </div>
        )}
      </div>

      {/* CTA: ÅBN VENUE */}
      <a
        href={venueUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '11px 14px',
          background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <ExternalLink size={14} /> Åbn venue
      </a>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Print version (A4) — compact inline styles
   ═══════════════════════════════════════════════ */

function PrintSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const c = SEC_COLORS[color] || SEC_COLORS.orange;
  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ background: c.bg, padding: '3px 8px', borderBottom: `1px solid ${c.border}` }}>
        <span style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: c.text }}>{title}</span>
      </div>
      <div style={{ padding: '6px 8px', background: '#fff' }}>{children}</div>
    </div>
  );
}

function PRow({ label, value, bold }: { label: string; value?: string | number | null; bold?: boolean }) {
  const display = (value === null || value === undefined || value === '') ? '—' : value;
  const isEmpty = display === '—';
  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '2px', fontSize: '9pt', lineHeight: 1.4 }}>
      <span style={{ color: '#6b7280', flexShrink: 0, width: '85px' }}>{label}:</span>
      <span style={{ color: isEmpty ? '#9ca3af' : (bold ? '#111827' : '#1f2937'), fontWeight: bold ? 600 : 400 }}>{display}</span>
    </div>
  );
}

function PSubRow({ text, color }: { text: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '2px', fontSize: '8pt', lineHeight: 1.4 }}>
      <span style={{ color: 'transparent', flexShrink: 0, width: '85px' }}> </span>
      <span style={{ color, fontStyle: 'italic' }}>↳ {text}</span>
    </div>
  );
}

function PNoteRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: '4px', fontSize: '9pt', lineHeight: 1.4 }}>
      <span style={{ fontSize: '8pt', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>{label}: </span>
      <span style={{ color: '#1f2937' }}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ActionCard helpers (WORK integration)
   ═══════════════════════════════════════════════ */

const MEET_POINT_LABEL: Record<string, { label: string; badge: string }> = {
  lager: { label: 'Kører fra lager', badge: 'LAGER' },
  location: { label: 'Møder på location', badge: 'LOCATION' },
  other: { label: 'Aftalt mødested', badge: 'ANDET' },
};

function fmtDateTime(ts: string | null | undefined): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('da-DK', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function MeetPointCard({
  crew,
  personal,
  job,
  isLead,
}: {
  crew: CrewAssignment;
  personal: { get_in: string | null; get_out: string | null; point: string } | null;
  job: TaskJob;
  isLead: boolean;
}) {
  const mp = MEET_POINT_LABEL[crew.meet_point] ?? MEET_POINT_LABEL.lager;
  const point = personal?.point ?? crew.meet_point;

  return (
    <div>
      <div
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          background: point === 'location' ? '#fb923c' : point === 'other' ? '#fcd34d' : '#e5e7eb',
          color: '#111',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          borderRadius: 999,
          marginBottom: 8,
        }}
      >
        {mp.badge}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 6 }}>
        {mp.label}
        {isLead && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: '#fff',
              background: '#ea580c',
              padding: '2px 8px',
              borderRadius: 999,
            }}
          >
            LEAD
          </span>
        )}
      </div>
      {crew.meet_point_note && (
        <div
          style={{
            fontSize: 13,
            color: '#374151',
            background: '#fff7ed',
            border: '1px solid #fdba74',
            borderRadius: 8,
            padding: '8px 10px',
            marginBottom: 10,
            whiteSpace: 'pre-wrap',
          }}
        >
          {crew.meet_point_note}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Get-in
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111', fontFamily: 'monospace' }}>
            {fmtDateTime(personal?.get_in)}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {point === 'location'
              ? job.location_name ?? 'På location'
              : point === 'other'
                ? crew.meet_point_note ?? 'Aftalt sted'
                : job.get_in_location ?? 'Lager'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Get-out
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111', fontFamily: 'monospace' }}>
            {fmtDateTime(personal?.get_out)}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {point === 'location' ? 'Retur direkte' : 'Nedpak / retur til lager'}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBlocksList({ blocks }: { blocks: JobActionCardBlock[] }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {blocks.map((b, i) => {
        const title = b.override_title ?? b.library_block?.title ?? '(uden titel)';
        const body = b.override_body ?? b.library_block?.body ?? '';
        const kind = b.library_block?.kind ?? 'free';
        return (
          <div
            key={b.id}
            style={{
              border: '1.5px solid #ea580c',
              borderRadius: 10,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <div
              style={{
                background: '#ea580c',
                color: '#fff',
                padding: '6px 12px',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ opacity: 0.85 }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{kind}</span>
              {b.library_block?.activity_id && (
                <span style={{ marginLeft: 'auto', opacity: 0.85 }}>
                  {b.library_block.activity_id}
                </span>
              )}
            </div>
            <div style={{ padding: '10px 12px 4px', fontSize: 15, fontWeight: 700, color: '#111' }}>
              {title}
            </div>
            {body && (
              <div
                style={{
                  padding: '0 12px 12px',
                  fontSize: 13,
                  color: '#374151',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                }}
              >
                {body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LeadCrewOverview({
  crew,
  actionCardBlocks,
  job,
  currentEmployeeId,
}: {
  crew: CrewAssignment[];
  actionCardBlocks: JobActionCardBlock[];
  job: TaskJob;
  currentEmployeeId: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const others = crew.filter(c => c.employee_id !== currentEmployeeId);
  if (others.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: '1px dashed #fdba74',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, color: '#c2410c', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
        Lead-overblik — crew's ActionCards
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {others.map(c => {
          const crewBlocks = actionCardBlocks
            .filter(b => b.job_crew_assignment_id === c.id)
            .sort((a, b) => a.sort_order - b.sort_order);
          const personal = derivePersonalTimeline(c, job);
          const mp = MEET_POINT_LABEL[c.meet_point] ?? MEET_POINT_LABEL.lager;
          const isOpen = expandedId === c.id;
          return (
            <div
              key={c.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                background: '#fff',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setExpandedId(isOpen ? null : c.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  background: isOpen ? '#fff7ed' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                    {c.employee_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    {c.role} · {mp.label} · Get-in {fmtDateTime(personal.get_in)}
                    {crewBlocks.length > 0 && ` · ${crewBlocks.length} blok${crewBlocks.length === 1 ? '' : 'ke'}`}
                  </div>
                </div>
                {isOpen ? <ChevronUp size={16} color="#c2410c" /> : <ChevronDown size={16} color="#6b7280" />}
              </button>
              {isOpen && (
                <div style={{ padding: '10px 12px 12px', borderTop: '1px solid #f3f4f6' }}>
                  {c.meet_point_note && (
                    <div style={{ fontSize: 12, color: '#374151', marginBottom: 8, fontStyle: 'italic' }}>
                      ↳ {c.meet_point_note}
                    </div>
                  )}
                  {crewBlocks.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Ingen blokke tildelt.</div>
                  ) : (
                    <ActionBlocksList blocks={crewBlocks} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════ */

interface JobTimelineProps { jobId: string; onBack: () => void; }

export default function JobTimeline({ jobId, onBack }: JobTimelineProps) {
  const { employeeId, employeeLocation } = useAuth();
  const [route, setRoute] = useJobRoute();
  const [job, setJob] = useState<TaskJob | null>(null);
  const [crew, setCrew] = useState<CrewAssignment[]>([]);
  const [vehicles, setVehicles] = useState<VehicleAssignment[]>([]);
  const [packingItems, setPackingItems] = useState<JobPackingItem[]>([]);
  const [gear, setGear] = useState<GearAssignment[]>([]);
  const [activityInfos, setActivityInfos] = useState<ActivityInfo[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [venue, setVenue] = useState<VenueInfo | null>(null);
  const [venueLoading, setVenueLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationField[]>([]);
  const [actionCardBlocks, setActionCardBlocks] = useState<JobActionCardBlock[]>([]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const [j, cr, vh, pk, gr, blocks] = await Promise.all([
          fetchJobById(jobId), fetchJobCrew(jobId), fetchJobVehicles(jobId),
          fetchJobPackingItems(jobId), fetchJobGear(jobId),
          fetchJobActionCardBlocks(jobId),
        ]);
        setJob(j); setCrew(cr); setVehicles(vh); setPackingItems(pk); setGear(gr);
        setActionCardBlocks(blocks);
        if (j?.activities?.length) { setActivityInfos(await fetchActivityInfo(j.activities)); }
        if (employeeId) { setMyRole(await fetchMyRoleOnJob(jobId, employeeId)); }
      } catch (e) { console.error('Load error:', e); }
      finally { setLoading(false); }
    })();
  }, [jobId, employeeId]);

  useEffect(() => {
    if (!job) return;
    const addr = (job.location_address || job.location_name || '').trim();
    if (addr.length < 4) return;
    calculateRoute(addr).then(r => setRouteInfo(r));
  }, [job]);

  useEffect(() => {
    if (!job) return;
    setVenueLoading(true);
    findVenueForJob({
      name: job.location_name,
      address: job.location_address,
      city: job.location_city,
    })
      .then(v => setVenue(v))
      .finally(() => setVenueLoading(false));
  }, [job?.location_name, job?.location_address, job?.location_city]);

  useEffect(() => {
    if (!job) return;
    const activityIds = Array.isArray(job.activities) ? job.activities : [];
    fetchJobEvaluation(jobId, activityIds).then(setEvaluation);
  }, [jobId, job?.activities]);

  if (loading || !job) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <Loader2 size={32} color="#ea580c" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: 12, color: '#94a3b8' }}>Indlæser opgave...</span>
      </div>
    );
  }

  /* ── Derived data ── */
  const opgaveId = job.opgave_id ? `#${String(job.opgave_id).padStart(4, '0')}` : null;
  const region = getTaskRegion(job.location_address) ?? getTaskRegion(job.location_city);
  const effectiveRegion = employeeLocation ? (employeeLocation === 'Øst' ? 'øst' : 'vest') as 'øst' | 'vest' : region;
  const timeline = buildTimeline(job, activityInfos, routeInfo, effectiveRegion);
  const myCrew = employeeId ? crew.find(c => c.employee_id === employeeId) ?? null : null;
  const isLead = (myCrew?.is_lead ?? false) || myRole === 'lead' || myRole === 'teamlead';
  const myBlocks = myCrew
    ? actionCardBlocks
        .filter(b => b.job_crew_assignment_id === myCrew.id)
        .sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const myPersonal = myCrew ? derivePersonalTimeline(myCrew, job) : null;
  const warehouseLabel = effectiveRegion === 'øst' ? WAREHOUSES.sjaelland.label : WAREHOUSES.jylland.label;
  const driveRoute = routeInfo ? (effectiveRegion === 'øst' ? routeInfo.sjaelland : routeInfo.jylland) : null;
  const primaryVehicle = vehicles[0];
  const actIdToInfo: Record<string, ActivityInfo> = {};
  activityInfos.forEach(a => { actIdToInfo[a.id] = a; });
  const activityIds: string[] = Array.isArray(job.activities) ? job.activities : [];
  const actSessions: Record<string, string> = job.activity_sessions && typeof job.activity_sessions === 'object' ? job.activity_sessions : {};
  const durPerSession = Number(job.duration_minutes) || 0;
  const showPayment = job.customer_type === 'privat' || job.customer_type === 'polterabend';

  const tableItems = [
    { label: 'Skæreborde 80', value: job.bord_skaere_80 },
    { label: 'Foldeborde 180', value: job.bord_folde_180 },
    { label: 'Foldeborde 240', value: job.bord_folde_240 },
    { label: 'Høje caféborde', value: job.hoeje_cafeborde },
    { label: 'Dug 180', value: job.dug_180 },
    { label: 'Dug 240', value: job.dug_240 },
    { label: 'Dug rund 80', value: job.dug_rund_80 },
  ].filter(t => t.value && Number(t.value) > 0);

  const noteFields = [
    { label: 'Generelt', value: job.notes },
    { label: 'Opgave', value: job.task_notes },
    { label: 'Timing', value: job.timing_note },
    { label: 'Crew', value: job.crew_note },
    { label: 'Aktiviteter', value: job.aktiviteter_note },
    { label: 'Gear', value: job.gear_note },
    { label: 'Transport', value: job.transport_note },
    { label: 'Betaling', value: job.ub_note },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ══════════════════════════════════════════
          MOBILE VIEW (screen only)
          ══════════════════════════════════════════ */}
      <div className="rapport-mobile" style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Arial, Helvetica, sans-serif' }}>

        {/* Sticky header */}
        <div className="no-print" style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: '#0f172a', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button onClick={onBack} style={{ padding: 8, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {job.client_name || 'Opgave'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>@ {job.location_name || '—'}</div>
          </div>
          {opgaveId && <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{opgaveId}</span>}
          <button onClick={() => window.print()} style={{
            padding: '8px 14px', borderRadius: 8, background: '#ea580c', border: 'none',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          }}>
            <Printer size={14} /> PDF
          </button>
        </div>

        {/* Hero card */}
        <div style={{
          margin: '12px 12px 16px', padding: '20px 16px', borderRadius: 16,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: '#ea580c', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                {fmtDate(job.event_date)}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{job.client_name}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
                <MapPin size={12} style={{ display: 'inline', verticalAlign: -1 }} /> {job.location_name} — {job.location_address}
              </div>
            </div>
            {job.guests_count && (
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#ea580c' }}>{job.guests_count}</div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>gæster</div>
              </div>
            )}
          </div>

          {/* Activity pills */}
          {activityIds.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {activityIds.map(id => {
                const info = actIdToInfo[id];
                const name = info?.name || id;
                const sessions = Number(actSessions[id]) || 1;
                return (
                  <span key={id} style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: 'rgba(234,88,12,0.15)', color: '#fb923c', border: '1px solid rgba(234,88,12,0.3)',
                  }}>
                    {name}{sessions > 1 ? ` ×${sessions}` : ''}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* ── DAGSOVERBLIK ── */}
        <div style={{ margin: '0 12px 12px' }}>
          <TimelineBar items={timeline.items} activitySummaries={timeline.activitySummaries} />
        </div>

        {/* Summary strip */}
        {(timeline.getinLagerTime || timeline.dagSlutTime) && (
          <div style={{
            margin: '0 12px 16px', padding: '10px 14px', borderRadius: 10,
            background: '#fff', border: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-around', textAlign: 'center',
          }}>
            {timeline.getinLagerTime && (
              <div>
                <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Start</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#111', fontFamily: 'monospace' }}>{timeline.getinLagerTime}</div>
              </div>
            )}
            {timeline.gamestartTime && (
              <div>
                <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Session</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#ea580c', fontFamily: 'monospace' }}>{timeline.gamestartTime}</div>
              </div>
            )}
            {timeline.dagSlutTime && (
              <div>
                <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Slut est.</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#111', fontFamily: 'monospace' }}>{timeline.dagSlutTime}</div>
              </div>
            )}
          </div>
        )}

        {/* ── DIT MØDESTED ── */}
        {myCrew && (
          <MobileSection
            title={isLead ? 'Dit mødested (LEAD)' : 'Dit mødested'}
            color="orange"
            defaultOpen={true}
          >
            <MeetPointCard crew={myCrew} personal={myPersonal} job={job} isLead={isLead} />
          </MobileSection>
        )}

        {/* ── DINE OPGAVER (ActionCard blokke) ── */}
        {myBlocks.length > 0 && (
          <MobileSection title={`Dine opgaver (${myBlocks.length})`} color="orange" defaultOpen={true}>
            <ActionBlocksList blocks={myBlocks} />
          </MobileSection>
        )}

        {/* ── TID & DATO ── */}
        <MobileSection title="Tid & Dato" color="orange" defaultOpen={true}>
          <MRow label="Dato" value={fmtDate(job.event_date)} bold />
          <div style={{ height: 6 }} />
          <MRow label="Get-in lager" value={timeline.getinLagerTime} icon={<Clock size={14} />} bold />
          {timeline.transitMinutes !== null && timeline.transitMinutes > 0 && (
            <MSubRow text={`Kørsel + pak: ${timeline.transitMinutes} min`} color="#a16207" />
          )}
          <MRow label="Get-in lok." value={timeline.getinLocTime} icon={<Clock size={14} />} bold />
          {timeline.setupMinutes !== null && timeline.setupMinutes > 0 && (
            <MSubRow text={`Opsætning: ${timeline.setupMinutes} min`} color="#1d4ed8" />
          )}
          <div style={{ height: 4, borderTop: '1px solid #f3f4f6', marginTop: 4 }} />
          <MRow label="Session start" value={timeline.gamestartTime} icon={<Clock size={14} />} bold />
          <MRow label="Varighed" value={timeline.dur > 0 ? (timeline.maxSessions > 1 ? `${durPerSession} min × ${timeline.maxSessions} = ${timeline.dur} min` : `${timeline.dur} min`) : null} />
          <MRow label="Session slut" value={timeline.endTime !== '—' ? timeline.endTime : null} icon={<Clock size={14} />} bold />
          {job.post_session_destination && (
            <MRow label="Efter session" value={job.post_session_destination} />
          )}
          <div style={{ height: 4, borderTop: '1px solid #f3f4f6', marginTop: 4 }} />
          {timeline.teardownTimeSum > 0 && <MSubRow text={`Nedpakning: ${timeline.teardownTimeSum} min`} color="#1d4ed8" />}
          {driveRoute && <MSubRow text={`Retur kørsel: ${driveRoute.min} min (${driveRoute.km} km)`} color="#a16207" />}
          {timeline.unpackTimeSum > 0 && <MSubRow text={`Udpak lager: ${timeline.unpackTimeSum} min`} color="#1d4ed8" />}
          {timeline.dagSlutTime && <MRow label="Opgave slut" value={timeline.dagSlutTime} icon={<Clock size={14} />} bold />}
        </MobileSection>

        {/* ── KUNDE ── */}
        <MobileSection title="Kunde" color="orange" defaultOpen={false}>
          <MRow label="Kunde" value={job.client_name} bold />
          <MRow label="Type" value={job.customer_type?.toUpperCase()} />
          <MRow label="Kontakt" value={job.client_contact_name} />
          {job.client_contact_phone && (
            <div className="row">
              <span className="row-label">Tlf:</span>
              <a href={`tel:${job.client_contact_phone}`} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                <Phone size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
                {job.client_contact_phone}
              </a>
            </div>
          )}
          {job.client_contact_email && (
            <div className="row">
              <span className="row-label">Email:</span>
              <a href={`mailto:${job.client_contact_email}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                <Mail size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
                {job.client_contact_email}
              </a>
            </div>
          )}
          <MRow label="Bureau" value={job.agency} />
          <MRow label="Kundenr." value={job.customer_number} />
          <MRow label="Sprog" value={job.language} />
        </MobileSection>

        {/* ── 5 HURTIGE OM TEAMEVENTET ── */}
        {(job.winner_ceremony != null || job.winner_ceremony_note || job.teamsize_note) && (
          <MobileSection title="5 hurtige om teameventet" color="orange" defaultOpen={true}>
            {job.winner_ceremony != null && (
              <div className="row">
                <span className="row-label">Kåring af vinder:</span>
                <span
                  className="row-value bold"
                  style={{
                    color: job.winner_ceremony ? '#047857' : '#991b1b',
                    background: job.winner_ceremony ? '#ecfdf5' : '#fef2f2',
                    padding: '2px 10px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {job.winner_ceremony ? 'Ja' : 'Nej'}
                </span>
              </div>
            )}
            {job.winner_ceremony_note && (
              <div className="note-row">
                <div className="note-label">Vinder-note</div>
                <div>{job.winner_ceremony_note}</div>
              </div>
            )}
            {job.teamsize_note && (
              <div className="note-row" style={{ marginTop: 8 }}>
                <div className="note-label">Teamstørrelse og hvorfor</div>
                <div>{job.teamsize_note}</div>
              </div>
            )}
          </MobileSection>
        )}

        {/* ── LOKATION ── */}
        <MobileSection title="Lokation" color="green" defaultOpen={true}>
          <MRow label="Sted" value={job.location_name} bold icon={<MapPin size={14} />} />
          <MRow label="Adresse" value={job.location_address} />
          {job.post_session_destination && (
            <MRow label="Efter session" value={job.post_session_destination} />
          )}
          {(job.location_city || job.location_address) && (
            <button
              className="no-print"
              onClick={() => setWeatherOpen(true)}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid #bae6fd',
                background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
                color: '#0369a1',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              <CloudSun size={16} />
              Vis aktuelt vejr{job.location_city ? ` i ${job.location_city}` : ''}
            </button>
          )}

          {/* ── VENUE-info + link ── */}
          <VenueInfoPanel
            venue={venue}
            venueLoading={venueLoading}
            fallbackName={job.location_name}
            fallbackAddress={job.location_address}
          />
          {routeInfo && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Kørsel fra lager</div>
              {routeInfo.jylland && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: effectiveRegion === 'vest' ? '#111' : '#9ca3af' }}>Fredericia</span>
                  <span style={{ fontWeight: effectiveRegion === 'vest' ? 700 : 400, color: effectiveRegion === 'vest' ? '#111' : '#9ca3af' }}>
                    {routeInfo.jylland.min} min ({routeInfo.jylland.km} km)
                    {effectiveRegion === 'vest' && ' ✦'}
                  </span>
                </div>
              )}
              {routeInfo.sjaelland && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: effectiveRegion === 'øst' ? '#111' : '#9ca3af' }}>Frederikssund</span>
                  <span style={{ fontWeight: effectiveRegion === 'øst' ? 700 : 400, color: effectiveRegion === 'øst' ? '#111' : '#9ca3af' }}>
                    {routeInfo.sjaelland.min} min ({routeInfo.sjaelland.km} km)
                    {effectiveRegion === 'øst' && ' ✦'}
                  </span>
                </div>
              )}
            </div>
          )}
        </MobileSection>

        {/* ── AKTIVITETER ── */}
        <MobileSection title="Aktiviteter" color="orange" defaultOpen={true}>
          {activityIds.map(id => {
            const info = actIdToInfo[id];
            const name = info?.name || id;
            const sessions = Number(actSessions[id]) || 1;
            return (
              <div key={id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                  {name}
                  {sessions > 1 && <span style={{ color: '#ea580c', marginLeft: 8 }}>×{sessions}</span>}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {info?.default_duration && <span>Varighed: <strong style={{ color: '#111' }}>{info.default_duration} min</strong></span>}
                  {info?.default_rounds && info.default_rounds > 1 && <span>Runder: <strong style={{ color: '#111' }}>{info.default_rounds}</strong></span>}
                </div>
              </div>
            );
          })}
          {activityIds.length === 0 && <span style={{ color: '#9ca3af', fontSize: 13 }}>Ingen aktiviteter</span>}
          {timeline.dur > 0 && <MRow label="Total" value={`${timeline.dur} min`} bold />}
        </MobileSection>

        {/* ── PAKKELISTE ── */}
        <MobileSection title="Pakkeliste" color="green" defaultOpen={true}>
          <button
            className="no-print"
            onClick={() => setRoute({ check: 'packing' })}
            style={{
              width: '100%',
              padding: '12px 14px',
              marginBottom: packingItems.length > 0 ? 12 : 0,
              borderRadius: 12,
              border: '1px solid #6ee7b7',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
              color: '#047857',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              letterSpacing: '0.02em',
            }}
          >
            <ClipboardCheck size={16} />
            Åbn pakkeliste i CHECK
          </button>
          {packingItems.length > 0 && (
            <div style={{ paddingTop: 4, borderTop: '1px dashed #d1fae5' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8, marginBottom: 6 }}>
                Preview fra opgaven
              </div>
              {packingItems.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: 8, fontSize: 14, marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 16, color: item.checked ? '#22c55e' : '#d1d5db' }}>{item.checked ? '✓' : '☐'}</span>
                  <span style={{ color: '#374151' }}>
                    {item.quantity > 1 ? `${item.quantity}${item.unit ? ` ${item.unit}` : '×'} ` : ''}{item.item_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </MobileSection>

        {/* ── CREW ── */}
        <MobileSection title="Crew" color="blue" defaultOpen={true}>
          <CrewPanel crew={crew} currentEmployeeId={employeeId} isLead={isLead} />
          {isLead && crew.length > 1 && (
            <LeadCrewOverview
              crew={crew}
              actionCardBlocks={actionCardBlocks}
              job={job}
              currentEmployeeId={employeeId}
            />
          )}
          {isLead && (
            <a
              className="no-print"
              href={`https://work.eventday.dk/job/${jobId}/actioncards`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '11px 14px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
            >
              <Printer size={16} /> Print alle ActionCards
            </a>
          )}
        </MobileSection>

        {/* ── TRANSPORT ── */}
        <MobileSection title="Transport" color="blue" defaultOpen={true}>
          <MRow label="Lager" value={warehouseLabel} bold icon={<Truck size={14} />} />
          {primaryVehicle && (
            <>
              <MRow label="Bil" value={primaryVehicle.car_name} icon={<Truck size={14} />} />
              {primaryVehicle.car_team_id && <MRow label="Team nr." value={`Hold ${primaryVehicle.car_team_id}`} bold />}
              {primaryVehicle.trailer_name && <MRow label="Trailer" value={primaryVehicle.trailer_name} />}
            </>
          )}
          {job.bil_tankes && <div style={{ fontSize: 13, color: '#b45309', fontWeight: 600, marginTop: 4 }}>Bil skal tankes</div>}
          {job.bil_oplades && <div style={{ fontSize: 13, color: '#b45309', fontWeight: 600 }}>Bil skal oplades</div>}
          {driveRoute && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Kørsel (én vej)</span>
                <span style={{ fontWeight: 700 }}>{driveRoute.km} km / {driveRoute.min} min</span>
              </div>
            </div>
          )}
        </MobileSection>

        {/* ── BORDE ── */}
        {tableItems.length > 0 && (
          <MobileSection title="Borde & Dug" color="green" defaultOpen={false}>
            {tableItems.map((t, i) => <MRow key={i} label={t.label} value={`${t.value} stk`} />)}
          </MobileSection>
        )}

        {/* ── BETALING ── */}
        {showPayment && (
          <MobileSection title="Betaling" color="orange" defaultOpen={false}>
            <MRow label="Metode" value={job.payment_method?.toUpperCase()} />
            <MRow label="Beløb" value={job.payment_amount ? `${job.payment_amount} kr` : null} />
            <MRow label="Kortgebyr" value={job.payment_card_fee ? `${job.payment_card_fee} kr` : null} />
            <MRow label="Kontakt" value={job.payment_contact} />
          </MobileSection>
        )}

        {/* ── NOTER ── */}
        {noteFields.some(n => n.value) && (
          <MobileSection title="Noter" color="blue" defaultOpen={false}>
            {noteFields.filter(n => n.value).map(n => <MNoteRow key={n.label} label={n.label} value={n.value} />)}
          </MobileSection>
        )}

        {/* ── EVALUERING (FLOW-felter for dette job) ── */}
        {evaluation.length > 0 && (
          <MobileSection title="Evaluering" color="red" defaultOpen={!!job.skal_evalueres}>
            {job.skal_evalueres && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', marginBottom: 10,
                borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5',
              }}>
                <AlertTriangle size={16} color="#dc2626" />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Husk evaluering
                </span>
              </div>
            )}
            {evaluation.map(f => <EvaluationRow key={f.id} field={f} />)}
          </MobileSection>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', padding: '20px 0 40px' }}>
          MY EVENTDAY — {fmtShortDate(job.event_date)}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PRINT VERSION (A4 — hidden on screen)
          ══════════════════════════════════════════ */}
      <div className="rapport-print">
        <div className="paper" style={{
          background: '#fff', color: '#111827', width: '210mm', minHeight: '297mm',
          padding: '10mm 12mm', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10pt', lineHeight: 1.4,
        }}>
          {/* Print header */}
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
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14pt', color: '#111' }}>{opgaveId || '—'}</span>
              <div style={{ fontSize: '8pt', color: '#6b7280' }}>{fmtShortDate(job.event_date)}</div>
            </div>
          </div>

          {/* Print 2-col grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <PrintSection title="Kunde" color="orange">
              <PRow label="Kunde" value={job.client_name} bold />
              <PRow label="Type" value={job.customer_type?.toUpperCase()} />
              <PRow label="Kontakt" value={job.client_contact_name} />
              <PRow label="Tlf" value={job.client_contact_phone} />
              <PRow label="Email" value={job.client_contact_email} />
              <PRow label="Bureau" value={job.agency} />
              <PRow label="Kundenr." value={job.customer_number} />
              <PRow label="Sprog" value={job.language} />
            </PrintSection>

            <PrintSection title="Tid & Dato" color="orange">
              <PRow label="Dato" value={fmtDate(job.event_date)} bold />
              <PRow label="Get-in lager" value={timeline.getinLagerTime} />
              {timeline.transitMinutes !== null && timeline.transitMinutes > 0 && <PSubRow text={`Kørsel + pak: ${timeline.transitMinutes} min`} color="#a16207" />}
              <PRow label="Get-in lok." value={timeline.getinLocTime} />
              {timeline.setupMinutes !== null && timeline.setupMinutes > 0 && <PSubRow text={`Opsætning: ${timeline.setupMinutes} min`} color="#1d4ed8" />}
              <PRow label="Session start" value={timeline.gamestartTime} bold />
              <PRow label="Varighed" value={timeline.dur > 0 ? (timeline.maxSessions > 1 ? `${durPerSession} min × ${timeline.maxSessions} = ${timeline.dur} min` : `${timeline.dur} min`) : null} />
              <PRow label="Session slut" value={timeline.endTime !== '—' ? timeline.endTime : null} />
              {timeline.teardownTimeSum > 0 && <PSubRow text={`Nedpakning: ${timeline.teardownTimeSum} min`} color="#1d4ed8" />}
              {driveRoute && <PSubRow text={`Retur kørsel: ${driveRoute.min} min (${driveRoute.km} km)`} color="#a16207" />}
              {timeline.unpackTimeSum > 0 && <PSubRow text={`Udpak lager: ${timeline.unpackTimeSum} min`} color="#1d4ed8" />}
              {timeline.dagSlutTime && <PRow label="Opgave slut" value={timeline.dagSlutTime} bold />}
            </PrintSection>

            <PrintSection title="Lokation" color="green">
              <PRow label="Sted" value={job.location_name} bold />
              <PRow label="Adresse" value={job.location_address} />
              {routeInfo && (
                <div style={{ marginTop: '4px', borderTop: '1px solid #e5e7eb', paddingTop: '4px' }}>
                  <div style={{ fontSize: '7pt', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>Kørsel fra lager</div>
                  {routeInfo.jylland && (
                    <div style={{ display: 'flex', gap: '4px', fontSize: '8pt', marginBottom: '1px' }}>
                      <span style={{ color: '#6b7280', width: '85px', flexShrink: 0 }}>Fredericia:</span>
                      <span style={{ color: effectiveRegion === 'vest' ? '#111' : '#9ca3af', fontWeight: effectiveRegion === 'vest' ? 600 : 400 }}>{routeInfo.jylland.min} min ({routeInfo.jylland.km} km)</span>
                      {effectiveRegion === 'vest' && <span style={{ fontSize: '7pt', color: '#ea580c', fontWeight: 700 }}>✦</span>}
                    </div>
                  )}
                  {routeInfo.sjaelland && (
                    <div style={{ display: 'flex', gap: '4px', fontSize: '8pt' }}>
                      <span style={{ color: '#6b7280', width: '85px', flexShrink: 0 }}>Frederikssund:</span>
                      <span style={{ color: effectiveRegion === 'øst' ? '#111' : '#9ca3af', fontWeight: effectiveRegion === 'øst' ? 600 : 400 }}>{routeInfo.sjaelland.min} min ({routeInfo.sjaelland.km} km)</span>
                      {effectiveRegion === 'øst' && <span style={{ fontSize: '7pt', color: '#ea580c', fontWeight: 700 }}>✦</span>}
                    </div>
                  )}
                </div>
              )}
            </PrintSection>

            <PrintSection title="Aktiviteter" color="orange">
              {activityIds.map(id => {
                const info = actIdToInfo[id]; const sessions = Number(actSessions[id]) || 1;
                return (
                  <div key={id} style={{ marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ fontSize: '10pt', fontWeight: 600 }}>{info?.name || id}{sessions > 1 && <span style={{ color: '#ea580c', marginLeft: 6, fontSize: '9pt' }}>×{sessions}</span>}</div>
                    <div style={{ fontSize: '8pt', color: '#6b7280' }}>
                      {info?.default_duration && <span>Varighed: <strong>{info.default_duration} min</strong></span>}
                      {info?.default_rounds && info.default_rounds > 1 && <span style={{ marginLeft: 12 }}>Runder: <strong>{info.default_rounds}</strong></span>}
                    </div>
                  </div>
                );
              })}
              <PRow label="Total" value={timeline.dur > 0 ? `${timeline.dur} min` : null} />
            </PrintSection>

            <PrintSection title="Crew" color="blue">
              <CrewPanel crew={crew} currentEmployeeId={employeeId} isLead={isLead} />
            </PrintSection>

            <PrintSection title="Transport" color="blue">
              <PRow label="Lager" value={warehouseLabel} bold />
              {primaryVehicle && (<><PRow label="Bil" value={primaryVehicle.car_name} />{primaryVehicle.trailer_name && <PRow label="Trailer" value={primaryVehicle.trailer_name} />}</>)}
              {job.bil_tankes && <div style={{ fontSize: '8pt', color: '#b45309', fontWeight: 600 }}>Bil skal tankes</div>}
              {job.bil_oplades && <div style={{ fontSize: '8pt', color: '#b45309', fontWeight: 600 }}>Bil skal oplades</div>}
            </PrintSection>

            {(job.winner_ceremony != null || job.winner_ceremony_note || job.teamsize_note) && (
              <PrintSection title="5 hurtige om teameventet" color="orange">
                {job.winner_ceremony != null && (
                  <PRow label="Vinder" value={job.winner_ceremony ? 'Ja, kåres' : 'Nej'} bold />
                )}
                {job.winner_ceremony_note && (
                  <div style={{ fontSize: '8pt', marginTop: 2 }}>
                    <strong style={{ color: '#6b7280' }}>Vinder-note:</strong> {job.winner_ceremony_note}
                  </div>
                )}
                {job.teamsize_note && (
                  <div style={{ fontSize: '8pt', marginTop: 4 }}>
                    <strong style={{ color: '#6b7280' }}>Teamstørrelse:</strong> {job.teamsize_note}
                  </div>
                )}
              </PrintSection>
            )}
          </div>

          {/* Print timeline */}
          <div style={{ marginTop: '10px' }}><TimelineBar items={timeline.items} activitySummaries={timeline.activitySummaries} /></div>

          {/* Print packing */}
          {packingItems.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <PrintSection title="Pakkeliste" color="green">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 16px' }}>
                  {packingItems.map(item => (
                    <div key={item.id} style={{ fontSize: '8pt', color: '#374151', display: 'flex', gap: 4 }}>
                      <span style={{ color: '#9ca3af' }}>☐</span>
                      <span>{item.quantity > 1 ? `${item.quantity}${item.unit ? ` ${item.unit}` : '×'} ` : ''}{item.item_name}</span>
                    </div>
                  ))}
                </div>
              </PrintSection>
            </div>
          )}

          {/* Print notes */}
          {noteFields.some(n => n.value) && (
            <div style={{ marginTop: 8 }}>
              <PrintSection title="Noter" color="blue">
                {noteFields.filter(n => n.value).map(n => <PNoteRow key={n.label} label={n.label} value={n.value} />)}
              </PrintSection>
            </div>
          )}

          {/* Print footer */}
          <div style={{ marginTop: '20px', paddingTop: '6px', borderTop: '1px solid #d1d5db', fontSize: '7pt', color: '#9ca3af', textAlign: 'center' }}>
            Udskrevet {new Date().toLocaleDateString('da-DK', { day: '2-digit', month: 'long', year: 'numeric' })} — EVENTDAY / TEAMBATTLE
          </div>
        </div>
      </div>

      {/* Weather modal */}
      {weatherOpen && (
        <WeatherDashboard
          city={job.location_city || job.location_name || 'Lokation'}
          address={job.location_address}
          onClose={() => setWeatherOpen(false)}
        />
      )}

      {/* CHECK-embed (pakkeliste) */}
      {route.check === 'packing' && (
        <CheckEmbed
          opgaveId={job.opgave_id}
          onClose={() => setRoute({ check: null })}
        />
      )}
    </>
  );
}
