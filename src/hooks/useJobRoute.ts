import { useQueryStates, parseAsString, parseAsStringEnum } from 'nuqs';

/**
 * URL-state for MY's navigation.
 *
 * - `job`     → Supabase `task_jobs.id` for den aktuelt viste opgave (null = jobs-liste)
 * - `check`   → åbner CHECK-embed. "packing" = pakkelister for opgaven
 *
 * NUQS pusher state til browserens history, så `back`-knappen lukker embed/
 * navigerer tilbage til jobs-listen i stedet for at forlade my.eventday.dk.
 */
export type CheckView = 'packing';

const CHECK_VIEWS: CheckView[] = ['packing'];

export function useJobRoute() {
  return useQueryStates(
    {
      job: parseAsString,
      check: parseAsStringEnum<CheckView>(CHECK_VIEWS),
    },
    {
      history: 'push',
      clearOnDefault: true,
    },
  );
}
