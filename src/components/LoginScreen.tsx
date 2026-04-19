import { useEffect, useRef, useState } from 'react';
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

export default function LoginScreen() {
  const { loginWithCode } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Lockout countdown
  useEffect(() => {
    if (!lockedUntil) return;
    const id = window.setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockCountdown(0);
        setAttempts(0);
        setError(null);
        window.clearInterval(id);
      } else {
        setLockCountdown(remaining);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  const isLocked = !!(lockedUntil && Date.now() < lockedUntil);

  async function submit(codeToCheck: string) {
    if (loading || isLocked) return;
    setLoading(true);
    setError(null);

    const result = await loginWithCode(codeToCheck);
    if (!result.success) {
      setError(result.error || 'Ukendt kode');
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_SECONDS * 1000);
        setLockCountdown(LOCKOUT_SECONDS);
      }
      setCode('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
    // On success: AuthContext flips isAuthenticated → App.tsx renders JobsList
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(val);
    setError(null);
    if (val.length === CODE_LENGTH) submit(val);
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes wx-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#1e293b',
        borderRadius: 16,
        border: '1px solid #334155',
        boxShadow: '0 25px 50px rgba(0,0,0,.4)',
        overflow: 'hidden',
        animation: 'wx-fade-in 0.35s ease',
      }}>
        {/* Orange header */}
        <div style={{
          background: '#ea580c',
          padding: '28px 32px 22px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: '0.22em',
            color: '#fff',
          }}>
            MY EVENTDAY
          </div>
          <div style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.75)',
            marginTop: 4,
            letterSpacing: '0.05em',
          }}>
            Log ind med din kode
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '32px 28px 28px' }}>
          <label
            htmlFor="access-code"
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: '#94a3b8',
              marginBottom: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Din adgangskode
          </label>

          <div style={{ position: 'relative', marginBottom: 14 }}>
            <input
              id="access-code"
              ref={inputRef}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={CODE_LENGTH}
              value={code}
              onChange={handleChange}
              disabled={loading || isLocked}
              placeholder="_ _ _ _"
              aria-label="4-tegns adgangskode"
              style={{
                width: '100%',
                padding: '18px 14px',
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: '0.4em',
                textAlign: 'center',
                textTransform: 'uppercase',
                background: '#0f172a',
                border: `2px solid ${error ? '#dc2626' : '#475569'}`,
                borderRadius: 12,
                color: '#f1f5f9',
                outline: 'none',
                caretColor: '#ea580c',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                opacity: loading || isLocked ? 0.5 : 1,
              }}
              onFocus={e => { if (!error) e.currentTarget.style.borderColor = '#ea580c'; }}
              onBlur={e => { if (!error) e.currentTarget.style.borderColor = '#475569'; }}
            />
            {loading && (
              <div style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#ea580c',
              }}>
                <Loader2 size={22} style={{ animation: 'spin 0.75s linear infinite' }} />
              </div>
            )}
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 12px',
              background: '#7f1d1d',
              border: '1px solid #991b1b',
              borderRadius: 8,
              color: '#fca5a5',
              fontSize: 13,
              marginBottom: 14,
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{isLocked ? `Låst i ${lockCountdown}s — for mange forsøg` : error}</span>
            </div>
          )}

          <button
            type="button"
            disabled={code.length !== CODE_LENGTH || loading || isLocked}
            onClick={() => submit(code)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '13px 20px',
              background: '#ea580c',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.02em',
              cursor: code.length !== CODE_LENGTH || loading || isLocked ? 'not-allowed' : 'pointer',
              opacity: code.length !== CODE_LENGTH || loading || isLocked ? 0.5 : 1,
              transition: 'background 0.15s, opacity 0.15s',
            }}
          >
            <ArrowRight size={16} />
            Fortsæt
          </button>

          <div style={{
            textAlign: 'center',
            marginTop: 18,
            fontSize: 12,
            color: '#64748b',
          }}>
            Problemer? Kontakt{' '}
            <a href="tel:+4540274027" style={{ color: '#94a3b8', textDecoration: 'underline' }}>
              40 27 40 27
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
