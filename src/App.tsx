import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import JobsList from '@/components/JobsList';
import JobTimeline from '@/components/JobTimeline';
import { Loader2 } from 'lucide-react';

type View = { page: 'jobs' } | { page: 'timeline'; jobId: string };

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [view, setView] = useState<View>({ page: 'jobs' });

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}>
        <Loader2 size={32} color="#ea580c" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (view.page === 'timeline') {
    return <JobTimeline jobId={view.jobId} onBack={() => setView({ page: 'jobs' })} />;
  }

  return <JobsList onJobSelected={(id) => setView({ page: 'timeline', jobId: id })} />;
}
