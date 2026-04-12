export type UserRole = 'INSTRUCTOR' | 'GAMEMASTER' | 'ADMIN';

export interface OCCUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  created_at: string;
  last_login?: string;
}

export interface TaskJob {
  id: string;
  short_code: string | null;
  client_name: string | null;
  client_contact_name: string | null;
  client_contact_phone: string | null;
  client_contact_email: string | null;
  client_logo_url: string | null;
  client_website: string | null;
  agency: string | null;
  customer_number: string | null;
  customer_type: string | null;
  language: string | null;
  kun_tilbud: boolean | null;
  privat: boolean | null;
  event_date: string | null;
  event_end: string | null;
  event_time: string | null;
  duration_minutes: number | null;
  activities: string[] | null;
  activity_counts: Record<string, string> | null;
  activity_sessions: Record<string, string> | null;
  location_name: string | null;
  location_address: string | null;
  location_city: string | null;
  guests_count: number | null;
  instructors_count: number | null;
  assistants_count: number | null;
  get_in_location: string | null;
  get_in_time_storage: string | null;
  get_in_time_location: string | null;
  get_back_location: string | null;
  vehicle_id: string | null;
  trailer_id: string | null;
  lane_setup: string | null;
  lane_teardown: string | null;
  notes: string | null;
  task_notes: string | null;
  timing_note: string | null;
  crew_note: string | null;
  aktiviteter_note: string | null;
  gear_note: string | null;
  transport_note: string | null;
  location_note: string | null;
  payment_note: string | null;
  bil_tankes: boolean | null;
  bil_oplades: boolean | null;
  bord_skaere_80: number | null;
  bord_folde_180: number | null;
  bord_folde_240: number | null;
  hoeje_cafeborde: number | null;
  dug_180: number | null;
  dug_240: number | null;
  dug_rund_80: number | null;
  opgave_id: number | null;
  opgave_status: string | null;
  status: string | null;
  skal_evalueres: boolean | null;
  evaluation_score: number | null;
  evaluation_notes: string | null;
  payment_method: string | null;
  payment_amount: string | null;
  payment_card_fee: string | null;
  payment_contact: string | null;
  faktura_sendt: boolean | null;
  mobilepay: boolean | null;
  mobilepay_amount: string | null;
  mobilepay_received: string | null;
  mobilepay_note: string | null;
  kontant_amount: string | null;
  kontant_received: string | null;
  kontant_note: string | null;
  ub_note: string | null;
  kunde_kontaktet: boolean | null;
  kunde_kontaktet_dato: string | null;
  kunde_kontaktet_note: string | null;
  location_kontaktet: boolean | null;
  location_kontaktet_dato: string | null;
  hotel_kontaktet: string | null;
  hotel_kontaktet_dato: string | null;
  hotel_kontaktet_note: string | null;
  firma_info: string | null;
  sms_sendt: string | null;
}

export interface CrewAssignment {
  employee_id: string;
  employee_name: string;
  employee_phone: string | null;
  employee_email: string | null;
  role: string;
}

export interface VehicleAssignment {
  vehicle_id: string | null;
  trailer_id: string | null;
  car_name: string | null;
  car_reg: string | null;
  car_team_id: number | null;
  trailer_name: string | null;
  trailer_reg: string | null;
  trailer_team_id: number | null;
}

export interface JobPackingItem {
  id: string;
  job_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  activity_id: string | null;
}

export interface GearAssignment {
  id: string;
  job_id: string;
  gear_box_id: string | null;
  gear_id: string | null;
  quantity: number;
  notes: string | null;
}

export interface ActivityInfo {
  id: string;
  name: string;
  pack_time_minutes: number | null;
  setup_time_minutes: number | null;
  unpack_time_minutes: number | null;
  default_duration: number | null;
  default_rounds: number | null;
}

export type TLColor = 'highlight' | 'blue' | 'green' | 'yellow' | 'purple' | 'default';

export interface TimelineItem {
  label: string;
  time: string;
  color: TLColor;
}

export interface RouteInfo {
  jylland?: { km: number; min: number };
  sjaelland?: { km: number; min: number };
}
