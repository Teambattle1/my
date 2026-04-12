import { createClient } from '@supabase/supabase-js';
import type { TaskJob, CrewAssignment, VehicleAssignment, JobPackingItem, GearAssignment, ActivityInfo, OCCUser } from '@/types';

const supabaseUrl = 'https://ilbjytyukicbssqftmma.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmp5dHl1a2ljYnNzcWZ0bW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjEsImV4cCI6MjA3MDQwNjQ2MX0.I_PWByMPcOYhWgeq9MxXgOo-NCZYfEuzYmo35XnBFAY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TASK_JOB_SELECT = 'id, short_code, client_name, client_contact_name, client_contact_phone, client_contact_email, client_logo_url, client_website, agency, customer_number, customer_type, language, kun_tilbud, privat, event_date, event_end, event_time, duration_minutes, activities, activity_counts, activity_sessions, location_name, location_address, location_city, guests_count, instructors_count, assistants_count, get_in_location, get_in_time_storage, get_in_time_location, get_back_location, vehicle_id, trailer_id, lane_setup, lane_teardown, notes, task_notes, timing_note, crew_note, aktiviteter_note, gear_note, transport_note, bil_tankes, bil_oplades, bord_skaere_80, bord_folde_180, bord_folde_240, hoeje_cafeborde, dug_180, dug_240, dug_rund_80, opgave_id, opgave_status, status, skal_evalueres, evaluation_score, evaluation_notes, payment_method, payment_amount, payment_card_fee, payment_contact, faktura_sendt, mobilepay, mobilepay_amount, mobilepay_received, mobilepay_note, kontant_amount, kontant_received, kontant_note, ub_note, kunde_kontaktet, kunde_kontaktet_dato, kunde_kontaktet_note, location_kontaktet, location_kontaktet_dato, hotel_kontaktet, hotel_kontaktet_dato, hotel_kontaktet_note, firma_info, sms_sendt';

// ── User Profile ──

export async function getUserProfile(userId: string): Promise<OCCUser | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, name, created_at, last_login')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data as OCCUser;
  } catch {
    return null;
  }
}

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

/** Fetch all assigned jobs (no time limit), cache locally */
export async function fetchMyJobs(userEmail: string): Promise<TaskJob[]> {
  try {
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('id')
      .ilike('email', userEmail)
      .single();

    if (empError || !emp) return getCachedJobs();

    const { data: assignments, error: assignError } = await supabase
      .from('job_crew_assignments')
      .select('job_id')
      .eq('employee_id', emp.id);

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
