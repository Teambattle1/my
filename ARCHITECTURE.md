# MY EVENTDAY — Arkitektur & Dataflow

## Overblik

```
TaskmasterWizard (OCC)     →  task_jobs tabel  →  my.eventday.dk (TIMELINE)
  opretter opgave               Supabase DB         viser data til crew
                                    ↑
Taskmaster (OCC)           →  redigerer data
  /taskmaster?edit=<jobId>
```

**my.eventday.dk er READ-ONLY** — den ændrer aldrig data. Alt redigering sker i OCC.

---

## Hvor rettes timeline-data?

### 1. Wizard opretter (`/taskmaster/wizard`)
TaskmasterWizard.tsx i OCC opretter en ny opgave med alle felter.

### 2. Taskmaster redigerer (`/taskmaster?edit=<jobId>`)
Taskmaster.tsx i OCC er den primære editor efter oprettelse. Auto-save hvert 1.2 sekund.

### 3. my.eventday.dk viser (`my.eventday.dk`)
Crew logger ind, ser deres tildelte opgaver, og får en detaljeret rapport/timeline.

---

## Felter der styrer crew-timeline

| Felt i Taskmaster (OCC)        | DB-kolonne              | Hvad crew ser i my.eventday.dk        |
|-------------------------------|-------------------------|---------------------------------------|
| GAMESTART (tid)                | `event_date`            | Session start tidspunkt               |
| Opgavetid (minutter)           | `duration_minutes`      | Sessiontid (× antal sessions)         |
| Slutdato/-tid                  | `event_end`             | Session slut tidspunkt                |
| Get-in lager (tid)             | `get_in_time_storage`   | Get-in lager tidspunkt                |
| Get-in lokation (tid)          | `get_in_time_location`  | Get-in lokation tidspunkt             |
| Bil tankes ✓                   | `bil_tankes`            | "Tank bil 10 min" step i timeline     |
| Bil oplades ✓                  | `bil_oplades`           | "Oplad bil 30 min" step i timeline    |
| Aktiviteter (valg)             | `activities[]`          | Per-aktivitet pak/opsæt/nedpak/udpak  |
| Aktivitet sessions             | `activity_sessions{}`   | "×3 sessions" i timeline              |
| Bil + Trailer (valg)           | `job_vehicle_assignments` | Transport-sektion                   |
| Crew (tildelinger)             | `job_crew_assignments`  | Crew-panel med roller                 |
| Pakkeliste                     | `job_packing_items`     | Pakkeliste-sektion                    |
| Alle noter                     | `notes`, `crew_note`, `transport_note`, `timing_note`, `aktiviteter_note`, `gear_note` | Noter-sektion |
| Kunde-info                     | `client_name`, `client_contact_*` | Kunde-sektion               |
| Lokation                       | `location_name`, `location_address` | Lokation + kørselstid       |

---

## Aktivitetstider (pak/opsæt/nedpak/udpak)

Disse tider er **defaults per aktivitet**, IKKE per opgave.
De kommer fra `activities`-tabellen i Supabase:

| Kolonne              | Beskrivelse                        | Eksempel TeamSegway |
|---------------------|------------------------------------|---------------------|
| `pack_time_minutes`  | Pakning på lager                   | 15 min              |
| `setup_time_minutes` | Opsætning på lokation              | 20 min              |
| `unpack_time_minutes`| Udpakning tilbage på lager         | 10 min              |
| `default_duration`   | Standard varighed pr. session      | 100 min             |
| `default_rounds`     | Standard antal runder              | 3                   |

**Nedpakning = setup_time_minutes** (teardown ≈ setup)

Hvis du vil ændre at fx TeamSegway tager 20 min at pakke i stedet for 15,
skal det ændres i `activities`-tabellen — ikke per opgave.

---

## Kørselstid (OSRM routing)

my.eventday.dk beregner kørselstid automatisk via OSRM:
- Crew's hub bestemmes af `employees.location` ("Øst" → Frederikssund, "Vest" → Fredericia)
- Adressen fra `task_jobs.location_address` geocodes via Nominatim
- OSRM beregner km + minutter fra begge lagre
- Crew's hub fremhæves med ✦

---

## Supabase projekt

- **URL:** `https://ilbjytyukicbssqftmma.supabase.co`
- **Delt med:** OCC (CrewControlCenter)
- **Auth:** Supabase email/password auth

---

## Teknisk stack

- **Framework:** Vite + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + inline styles
- **Deploy:** Netlify (my.eventday.dk)
- **Repo:** https://github.com/Teambattle1/my
