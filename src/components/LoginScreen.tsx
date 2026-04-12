import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await signIn(email, password);
    if (!result.success) {
      setError(result.error || 'Login fejlede');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        padding: '40px 32px',
        background: '#1e293b',
        borderRadius: '16px',
        border: '1px solid #334155',
        boxShadow: '0 25px 50px rgba(0,0,0,.4)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontSize: '28px',
            fontWeight: 900,
            letterSpacing: '0.2em',
            color: '#ea580c',
          }}>
            EVENTDAY
          </div>
          <div style={{
            fontSize: '13px',
            color: '#94a3b8',
            marginTop: '4px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Min Opgave
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Adgangskode
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#7f1d1d',
              border: '1px solid #991b1b',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#ea580c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: isLoading ? 'wait' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {isLoading ? 'Logger ind...' : 'Log ind'}
          </button>
        </form>
      </div>
    </div>
  );
}
