import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { AuthProvider } from '@/contexts/AuthContext';
import App from '@/App';
import Intro from '@/components/Intro';
import './app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NuqsAdapter>
      <AuthProvider>
        <Intro />
        <App />
      </AuthProvider>
    </NuqsAdapter>
  </StrictMode>
);
