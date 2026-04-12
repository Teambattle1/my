/** Canonical activity slug -> display name mapping */
export const ACTIVITY_NAMES: Record<string, string> = {
  A1: 'TeamChallenge',
  A2: 'TeamLazer',
  A3: 'TeamRobin',
  A4: 'TeamBox',
  A5: 'TeamConnect',
  A6: 'TeamPlay',
  A8: 'TeamSegway',
  A9: 'TeamControl',
  A10: 'TeamConstruct',
  A12: 'TeamRace',
  teamlazer: 'TeamLazer (Gev\u00e6r)',
  teamtaste: 'TeamTaste',
  teamaction: 'TeamAction',
};

export const ACTIVITY_COLORS: Record<string, string> = {
  'TeamChallenge': '#ec4899',
  'TeamLazer': '#3b82f6',
  'TeamRobin': '#86efac',
  'TeamBox': '#9ca3af',
  'TeamConnect': '#a855f7',
  'TeamPlay': '#f97316',
  'TeamTaste': '#eab308',
  'TeamSegway': '#ef4444',
  'TeamControl': '#64748b',
  'TeamConstruct': '#facc15',
  'TeamAction': '#67e8f9',
  'TeamRace': '#f97316',
};

export function getActivityName(slug: string): string {
  return ACTIVITY_NAMES[slug] || slug;
}
