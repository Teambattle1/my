import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import Toolbox from '@/components/Toolbox';
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

  // Deep-link til en konkret opgave virker uanset hvilket modul man kom fra
  if (route.job) {
    return (
      <JobTimeline
        jobId={route.job}
        onBack={() => setRoute({ job: null, check: null })}
      />
    );
  }

  // MY-modulet: den klassiske job-liste
  if (route.app === 'my') {
    return (
      <JobsList
        onJobSelected={(id) => setRoute({ job: id })}
        onBackToToolbox={() => setRoute({ app: null })}
      />
    );
  }

  // Standard landing efter login: værktøjskassen med alle moduler
  return <Toolbox onOpenMy={() => setRoute({ app: 'my' })} />;
}
