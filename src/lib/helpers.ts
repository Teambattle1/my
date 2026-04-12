/** Format date as "02. marts 2026" */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('da-DK', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return '—'; }
}

/** Format time as "14.30" (Danish dot convention) */
export function fmtTime(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const t = new Date(d).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
    const dotted = t.replace(':', '.');
    return dotted === '00.00' ? '—' : dotted;
  } catch { return '—'; }
}

/** Format short date as "02/03/26" */
export function fmtShortDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return '—'; }
}

/** Extract HH.MM from a timestamp or return null */
export function extractHHMM(d: string | null | undefined): string | null {
  if (!d) return null;
  try {
    const t = new Date(d).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
    const dotted = t.replace(':', '.');
    return dotted === '00.00' ? null : dotted;
  } catch { return null; }
}

/** Convert HH:MM or HH.MM string to total minutes from midnight */
export function hhmmToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const cleaned = t.replace('.', ':');
  const m = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Convert total minutes to HH.MM string (Danish convention) */
export function minutesToHHMM(mins: number): string {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
  const m = ((mins % 1440) + 1440) % 1440 % 60;
  return `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
}

/** Extract postal code from address string */
export function extractPostalCode(text: string): number | null {
  const m = text.match(/\b(\d{4})\b/);
  return m ? Number(m[1]) : null;
}

/** Determine region (warehouse) from address */
export function getTaskRegion(cityOrAddress: string | null | undefined): 'øst' | 'vest' | null {
  if (!cityOrAddress) return null;
  const postal = extractPostalCode(cityOrAddress);
  if (postal === null) return null;
  return postal < 5000 ? 'øst' : 'vest';
}

/** Get relative day label */
export function getRelativeDay(dateStr: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const diff = (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff === 0) return 'I dag';
  if (diff === 1) return 'I morgen';
  if (diff === -1) return 'I g\u00e5r';
  return null;
}

/** Weekday name in Danish */
export function getDanishWeekday(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('da-DK', { weekday: 'long' });
}
