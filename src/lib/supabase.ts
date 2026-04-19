import { createClient } from '@supabase/supabase-js';
import type { TaskJob, CrewAssignment, VehicleAssignment, JobPackingItem, GearAssignment, ActivityInfo } from '@/types';

const supabaseUrl = 'https://ilbjytyukicbssqftmma.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmp5dHl1a2ljYnNzcWZ0bW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjEsImV4cCI6MjA3MDQwNjQ2MX0.I_PWByMPcOYhWgeq9MxXgOo-NCZYfEuzYmo35XnBFAY';

// Auth via ef-verify-code (4-digit code) — we manage our own session in AuthContext,
// so disable Supabase's built-in session persistence to avoid stale state.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TASK_JOB_SELECT = 'id, short_code, client_name, client_contact_name, client_contact_phone, client_contact_email, client_logo_url, client_website, agency, customer_number, customer_type, language, kun_tilbud, privat, event_date, event_end, event_time, duration_minutes, activities, activity_counts, activity_sessions, location_name, location_address, location_city, guests_count, instructors_count, assistants_count, get_in_location, get_in_time_storage, get_in_time_location, get_back_location, vehicle_id, trailer_id, lane_setup, lane_teardown, notes, task_notes, timing_note, crew_note, aktiviteter_note, gear_note, transport_note, bil_tankes, bil_oplades, bord_skaere_80, bord_folde_180, bord_folde_240, hoeje_cafeborde, dug_180, dug_240, dug_rund_80, opgave_id, opgave_status, status, skal_evalueres, evaluation_score, evaluation_notes, payment_method, payment_amount, payment_card_fee, payment_contact, faktura_sendt, mobilepay, mobilepay_amount, mobilepay_received, mobilepay_note, kontant_amount, kontant_received, kontant_note, ub_note, kunde_kontaktet, kunde_kontaktet_dato, kunde_kontaktet_note, location_kontaktet, location_kontaktet_dato, hotel_kontaktet, hotel_kontaktet_dato, hotel_kontaktet_note, firma_info, sms_sendt';

// ── My Jobs ──

const CACHE_KEY = 'my_eventday_jobs';

/** Get cached jobs from localStorage (instant load) */
export function getCachedJobs(): TaskJob[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TaskJob[];
  } catch {
    return [];
  }
}

/** Fetch all assigned jobs for a given employee, cache locally */
export async function fetchMyJobs(employeeId: string): Promise<TaskJob[]> {
  try {
    const { data: assignments, error: assignError } = await supabase
      .from('job_crew_assignments')
      .select('job_id')
      .eq('employee_id', employeeId);

    if (assignError || !assignments || assignments.length === 0) return [];

    const jobIds = assignments.map(a => a.job_id);

    // Fetch ALL jobs — no time limit
    const { data: jobs, error: jobsError } = await supabase
      .from('task_jobs')
      .select(TASK_JOB_SELECT)
      .in('id', jobIds)
      .order('event_date', { ascending: true });

    if (jobsError || !jobs) return getCachedJobs();

    // Cache to localStorage
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(jobs)); } catch {}
    return jobs as TaskJob[];
  } catch {
    return getCachedJobs();
  }
}

// ── Job Details ──

export async function fetchJobById(jobId: string): Promise<TaskJob | null> {
  try {
    const { data, error } = await supabase
      .from('task_jobs')
      .select(TASK_JOB_SELECT)
      .eq('id', jobId)
      .single();
    if (error || !data) return null;
    return data as TaskJob;
  } catch {
    return null;
  }
}

// ── Crew Assignments ──

export async function fetchJobCrew(jobId: string): Promise<CrewAssignment[]> {
  try {
    const { data, error } = await supabase
      .from('job_crew_assignments')
      .select('role, employee_id')
      .eq('job_id', jobId);

    if (error || !data || data.length === 0) return [];

    const employeeIds = data.map(d => d.employee_id);
    const { data: employees } = await supabase
      .from('employees')
      .select('id, navn, telefon, email')
      .in('id', employeeIds);

    const empMap: Record<string, { navn: string; telefon: string | null; email: string | null }> = {};
    (employees || []).forEach((e: any) => {
      empMap[e.id] = { navn: e.navn || e.id, telefon: e.telefon || null, email: e.email || null };
    });

    return data.map(d => ({
      employee_id: d.employee_id,
      employee_name: empMap[d.employee_id]?.navn || d.employee_id,
      employee_phone: empMap[d.employee_id]?.telefon || null,
      employee_email: empMap[d.employee_id]?.email || null,
      role: d.role || 'instrukt\u00f8r',
    }));
  } catch {
    return [];
  }
}

// ── Vehicle Assignments ──

export async function fetchJobVehicles(jobId: string): Promise<VehicleAssignment[]> {
  try {
    const { data, error } = await supabase
      .from('job_vehicle_assignments')
      .select('vehicle_id, trailer_id')
      .eq('job_id', jobId);

    if (error || !data || data.length === 0) return [];

    const vehicleIds = data.map(d => d.vehicle_id).filter(Boolean);
    const trailerIds = data.map(d => d.trailer_id).filter(Boolean);

    const [carsRes, trailersRes] = await Promise.all([
      vehicleIds.length > 0
        ? supabase.from('cars').select('id, registreringsnr, model, team_id').in('id', vehicleIds)
        : { data: [] },
      trailerIds.length > 0
        ? supabase.from('trailers').select('id, registreringsnr, brand, model, nickname, team_id').in('id', trailerIds)
        : { data: [] },
    ]);

    const carMap: Record<string, { reg: string; model: string; team_id: number | null }> = {};
    ((carsRes.data as any[]) || []).forEach(c => {
      carMap[c.id] = { reg: c.registreringsnr || '', model: c.model || '', team_id: c.team_id };
    });

    const trailerMap: Record<string, { reg: string; name: string; team_id: number | null }> = {};
    ((trailersRes.data as any[]) || []).forEach(t => {
      trailerMap[t.id] = {
        reg: t.registreringsnr || '',
        name: t.nickname || `${t.brand || ''} ${t.model || ''}`.trim(),
        team_id: t.team_id,
      };
    });

    return data.map(d => ({
      vehicle_id: d.vehicle_id,
      trailer_id: d.trailer_id,
      car_name: d.vehicle_id ? `${carMap[d.vehicle_id]?.reg || ''}${carMap[d.vehicle_id]?.model ? ` (${carMap[d.vehicle_id].model})` : ''}` : null,
      car_reg: d.vehicle_id ? carMap[d.vehicle_id]?.reg || null : null,
      car_team_id: d.vehicle_id ? carMap[d.vehicle_id]?.team_id || null : null,
      trailer_name: d.trailer_id ? trailerMap[d.trailer_id]?.name || trailerMap[d.trailer_id]?.reg || null : null,
      trailer_reg: d.trailer_id ? trailerMap[d.trailer_id]?.reg || null : null,
      trailer_team_id: d.trailer_id ? trailerMap[d.trailer_id]?.team_id || null : null,
    }));
  } catch {
    return [];
  }
}

// ── Packing Items ──

export async function fetchJobPackingItems(jobId: string): Promise<JobPackingItem[]> {
  try {
    const { data, error } = await supabase
      .from('job_packing_items')
      .select('*')
      .eq('job_id', jobId);
    if (error || !data) return [];
    return data as JobPackingItem[];
  } catch {
    return [];
  }
}

// ── Gear Assignments ──

export async function fetchJobGear(jobId: string): Promise<GearAssignment[]> {
  try {
    const { data, error } = await supabase
      .from('job_gear_assignments')
      .select('*')
      .eq('job_id', jobId);
    if (error || !data) return [];
    return data as GearAssignment[];
  } catch {
    return [];
  }
}

// ── Activity Info ──

export async function fetchActivityInfo(activityIds: string[]): Promise<ActivityInfo[]> {
  if (!activityIds.length) return [];
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('id, name, pack_time_minutes, setup_time_minutes, unpack_time_minutes, default_duration, default_rounds')
      .in('id', activityIds);
    if (error || !data) return [];
    return data as ActivityInfo[];
  } catch {
    return [];
  }
}

// ── Find employee ID for current user ──

export async function findEmployeeByEmail(email: string): Promise<{ id: string; location: 'Øst' | 'Vest' | null } | null> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, location')
      .ilike('email', email)
      .single();
    if (error || !data) return null;
    return { id: data.id, location: data.location || null };
  } catch {
    return null;
  }
}

// ── Evaluation (FLOW) ──

export interface EvaluationTemplate {
  id: string;
  title: string;
  description: string | null;
  field_type: 'boolean' | 'text' | 'number' | 'rating' | 'select' | string;
  field_options: unknown;
  is_global: boolean;
  sort_order: number;
}

export interface EvaluationField extends EvaluationTemplate {
  value: string | null;   // latest response value (any employee); null if unanswered
  employee_id: string | null;
  updated_at: string | null;
}

/**
 * Pull evaluation templates + merged response values for a job.
 * Returns globals first, then activity-specific templates.
 */
export async function fetchJobEvaluation(
  jobId: string,
  activityIds: string[] = [],
): Promise<EvaluationField[]> {
  try {
    // 1. Global templates
    const { data: globals, error: gErr } = await supabase
      .from('evaluation_templates')
      .select('id, title, description, field_type, field_options, is_global, sort_order')
      .eq('is_global', true)
      .order('sort_order', { ascending: true });
    if (gErr) throw gErr;

    // 2. Activity-specific templates
    let activitySpecific: EvaluationTemplate[] = [];
    if (activityIds.length > 0) {
      const { data: links } = await supabase
        .from('evaluation_template_activities')
        .select('template_id')
        .in('activity_id', activityIds);
      const templateIds = [...new Set((links || []).map(l => l.template_id))];
      if (templateIds.length > 0) {
        const { data: tmpl } = await supabase
          .from('evaluation_templates')
          .select('id, title, description, field_type, field_options, is_global, sort_order')
          .in('id', templateIds)
          .order('sort_order', { ascending: true });
        activitySpecific = (tmpl || []) as EvaluationTemplate[];
      }
    }

    // 3. Responses for this job (any employee — MY just displays)
    const { data: responses } = await supabase
      .from('evaluation_responses')
      .select('template_id, value, employee_id, updated_at')
      .eq('job_id', jobId);

    const respByTemplate: Record<string, { value: string; employee_id: string | null; updated_at: string | null }> = {};
    (responses || []).forEach(r => {
      // Prefer the most recently updated answer per template
      const prev = respByTemplate[r.template_id];
      if (!prev || (r.updated_at && r.updated_at > (prev.updated_at || ''))) {
        respByTemplate[r.template_id] = {
          value: r.value || '',
          employee_id: r.employee_id,
          updated_at: r.updated_at,
        };
      }
    });

    const merge = (t: EvaluationTemplate): EvaluationField => ({
      ...t,
      value: respByTemplate[t.id]?.value ?? null,
      employee_id: respByTemplate[t.id]?.employee_id ?? null,
      updated_at: respByTemplate[t.id]?.updated_at ?? null,
    });

    return [
      ...((globals || []) as EvaluationTemplate[]).map(merge),
      ...activitySpecific.map(merge),
    ];
  } catch {
    return [];
  }
}

// ── Venue (locations) ──

export interface VenueInfo {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  notes: string | null;
  venue_note: string | null;
  adgang_note: string | null;
  venue_code: string | null;
  venue_access_code: string | null;
  teknisk_service_name: string | null;
  teknisk_service_phone: string | null;
  contacts: unknown;
  last_visited_note: string | null;
}

const VENUE_SELECT = 'id, name, address, city, postal_code, phone, website, logo_url, notes, venue_note, adgang_note, venue_code, venue_access_code, teknisk_service_name, teknisk_service_phone, contacts, last_visited_note';

/**
 * Find a venue in the shared `locations` table that matches the job's location.
 * Tries exact name match first, then substring match on name or address.
 * Returns null when nothing found — caller renders "OPRET VENUE" instead.
 */
export async function findVenueForJob(params: {
  name?: string | null;
  address?: string | null;
  city?: string | null;
}): Promise<VenueInfo | null> {
  const { name, address, city } = params;
  const trimmedName = (name || '').trim();
  const trimmedAddr = (address || '').trim();
  try {
    // 1. Exact name match (case-insensitive)
    if (trimmedName) {
      const { data } = await supabase
        .from('locations')
        .select(VENUE_SELECT)
        .ilike('name', trimmedName)
        .eq('hidden', false)
        .limit(1);
      if (data && data.length > 0) return data[0] as VenueInfo;
    }

    // 2. Name substring match
    if (trimmedName.length >= 3) {
      const { data } = await supabase
        .from('locations')
        .select(VENUE_SELECT)
        .ilike('name', `%${trimmedName}%`)
        .eq('hidden', false)
        .limit(1);
      if (data && data.length > 0) return data[0] as VenueInfo;
    }

    // 3. Address substring match — catches cases where job uses a different venue name
    if (trimmedAddr.length >= 5) {
      const { data } = await supabase
        .from('locations')
        .select(VENUE_SELECT)
        .ilike('address', `%${trimmedAddr.split(',')[0]}%`)
        .eq('hidden', false)
        .limit(1);
      if (data && data.length > 0) return data[0] as VenueInfo;
    }

    // 4. Fallback: city match (rare — last resort)
    if (city) {
      const { data } = await supabase
        .from('locations')
        .select(VENUE_SELECT)
        .ilike('city', city)
        .eq('hidden', false)
        .limit(1);
      if (data && data.length > 0) return data[0] as VenueInfo;
    }

    return null;
  } catch {
    return null;
  }
}

/** Look up an employee by navn — used after ef-verify-code returns the user's name. */
export async function findEmployeeByName(navn: string): Promise<{ id: string; location: 'Øst' | 'Vest' | null } | null> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, location')
      .eq('navn', navn)
      .maybeSingle();
    if (error || !data) return null;
    return { id: data.id, location: (data.location as 'Øst' | 'Vest' | null) || null };
  } catch {
    return null;
  }
}

// ── Find user's role on a specific job ──

export async function fetchMyRoleOnJob(jobId: string, employeeId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('job_crew_assignments')
      .select('role')
      .eq('job_id', jobId)
      .eq('employee_id', employeeId)
      .single();
    if (error || !data) return null;
    return data.role || 'instrukt\u00f8r';
  } catch {
    return null;
  }
}
