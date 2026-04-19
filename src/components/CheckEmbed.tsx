import { X, ExternalLink, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const CHECK_BASE_URL = 'https://check.eventday.dk';

interface CheckEmbedProps {
  opgaveId: number | string | null | undefined;
  onClose: () => void;
}

/**
 * Fullscreen overlay der indlejrer check.eventday.dk i en iframe.
 *
 * `opgaveId` padding til 4 cifre matcher CHECK's `/job/:code`-route
 * (se CHECK/src/pages/JobCodeEntry.tsx).
 */
export default function CheckEmbed({ opgaveId, onClose }: CheckEmbedProps) {
  const [loading, setLoading] = useState(true);

  const code = opgaveId != null ? String(opgaveId).padStart(4, '0') : null;
  const src = code ? `${CHECK_BASE_URL}/job/${code}` : `${CHECK_BASE_URL}/job`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 14px',
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Luk pakkeliste"
          style={{
            padding: 8,
            borderRadius: 8,
            background: '#1e293b',
            border: '1px solid #334155',
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <X size={18} color="#fff" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.15em',
              color: '#ea580c',
              textTransform: 'uppercase',
            }}
          >
            Pakkeliste
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#64748b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            check.eventday.dk {code ? `· opgave #${code}` : ''}
          </div>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid #334155',
            color: '#94a3b8',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <ExternalLink size={12} /> Åbn
        </a>
      </div>

      {/* Iframe container */}
      <div style={{ flex: 1, position: 'relative', background: '#0f172a' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Loader2
              size={28}
              color="#ea580c"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <span style={{ marginLeft: 10, color: '#94a3b8', fontSize: 13 }}>
              Indlæser check.eventday.dk…
            </span>
          </div>
        )}
        <iframe
          src={src}
          title="Pakkeliste (CHECK)"
          onLoad={() => setLoading(false)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#0f172a',
          }}
          allow="clipboard-read; clipboard-write; camera"
        />
      </div>
    </div>
  );
}
