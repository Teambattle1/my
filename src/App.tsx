import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import JobsList from '@/components/JobsList';
import JobTimeline from '@/components/JobTimeline';
import { useJobRoute } from '@/hooks/useJobRoute';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [route, setRoute] = useJobRoute();

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

  if (route.job) {
    return (
      <JobTimeline
        jobId={route.job}
        onBack={() => setRoute({ job: null, check: null })}
      />
    );
  }

  return <JobsList onJobSelected={(id) => setRoute({ job: id })} />;
}
