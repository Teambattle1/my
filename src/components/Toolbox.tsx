import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TOOLBOX_MODULES, fetchToolboxSites, getCachedToolboxSites } from '@/lib/supabase';

interface ToolboxProps {
  /** MY åbnes in-app (job-listen). De øvrige moduler er eksterne links. */
  onOpenMy: () => void;
}

const ORANGE = '#ea580c';

/**
 * Nogle landing_sites-ikoner er inline-SVG data-URLs med det non-standard
 * ";utf8,"-præfiks og ukodet markup (fx LEARN), som kan vises ødelagt i
 * Safari/Firefox <img>. Normalisér dem til en korrekt procent-kodet data-URL.
 * PNG/base64 og almindelige URLs sendes uændret igennem.
 */
function normalizeIcon(icon: string): string {
  if (!icon.startsWith('data:image/svg+xml')) return icon;
  const comma = icon.indexOf(',');
  if (comma === -1) return icon;
  let body = icon.slice(comma + 1);
  if (!body.trimStart().startsWith('<')) return icon; // allerede procent-kodet
  try { body = decodeURIComponent(body); } catch { /* behold rå markup */ }
  return 'data:image/svg+xml,' + encodeURIComponent(body);
}

/** Byg key→icon-map ud fra et sæt sites (kun rækker der faktisk har et ikon). */
function iconMap(sites: { key: string; icon: string | null }[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of sites) if (s.icon) map[s.key] = normalizeIcon(s.icon);
  return map;
}

/**
 * Værktøjskassen — landing efter login. Viser et fast grid af TeamBattle-moduler
 * (MY, WORK, MUSIC, MEDIA, VENUE, GAMES). Ikoner hentes fra den delte
 * `landing_sites`-tabel; falder tilbage til monogram hvis et ikon mangler.
 * Mobile-first: 2 kolonner på telefon, flere på bredere skærme.
 */
export default function Toolbox({ onOpenMy }: ToolboxProps) {
  const { session, signOut } = useAuth();
  const [icons, setIcons] = useState<Record<string, string>>(() => iconMap(getCachedToolboxSites()));

  useEffect(() => {
    (async () => {
      const sites = await fetchToolboxSites();
      const map = iconMap(sites);
      if (Object.keys(map).length > 0) setIcons(map);
    })();
  }, []);

  const openModule = (key: string, url: string) => {
    if (key === 'my') onOpenMy();
    else window.location.href = url;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <style>{`
        .tb-tile { transition: border-color 0.15s ease, transform 0.12s ease; }
        .tb-tile:hover { border-color: ${ORANGE}; }
        .tb-tile:active { transform: scale(0.97); }
      `}</style>

      {/* Header — matcher job-listens top bar */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '0.18em',
            color: ORANGE,
            textTransform: 'uppercase',
          }}>
            MY EVENTDAY
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {session?.name || ''}
          </div>
        </div>

        <button
          onClick={signOut}
          aria-label="Log ud"
          title="Log ud"
          style={{
            width: 38,
            height: 38,
            padding: 0,
            background: 'transparent',
            border: '1px solid #334155',
            borderRadius: 10,
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Modul-grid */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 16px 40px' }}>
        <div style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.2em',
          color: '#94a3b8',
          textTransform: 'uppercase',
          textAlign: 'center',
          marginBottom: 18,
        }}>
          Værktøjskasse
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 14,
        }}>
          {TOOLBOX_MODULES.map(m => (
            <ModuleTile
              key={m.key}
              name={m.name}
              icon={icons[m.key]}
              onClick={() => openModule(m.key, m.url)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleTile({ name, icon, onClick }: { name: string; icon?: string; onClick: () => void }) {
  return (
    <button
      className="tb-tile"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 16,
        padding: '24px 12px',
        minHeight: 150,
        cursor: 'pointer',
      }}
    >
      {icon ? (
        <img
          src={icon}
          alt=""
          width={72}
          height={72}
          style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#d4640a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: 24,
          fontWeight: 900,
          letterSpacing: '0.02em',
        }}>
          {name.slice(0, 2)}
        </div>
      )}
      <span style={{
        fontSize: 14,
        fontWeight: 800,
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {name}
      </span>
    </button>
  );
}
