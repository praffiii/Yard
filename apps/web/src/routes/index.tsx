import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useApiClient } from '../api/use-client.js';

type ApiStatus = 'checking' | 'ready' | 'unavailable';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const apiClient = useApiClient();
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    let disposed = false;

    void apiClient.v1.$get().then(
      (response) => {
        if (!disposed) {
          setApiStatus(response.ok ? 'ready' : 'unavailable');
        }
      },
      () => {
        if (!disposed) {
          setApiStatus('unavailable');
        }
      },
    );

    return () => {
      disposed = true;
    };
  }, [apiClient]);

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Yard</p>
        <h1 id="page-title">Find your people and make plans.</h1>
        <p className="lede">
          A calm starting point for discovering activities and communities nearby.
        </p>
        <div className="status-card" role="status">
          <span className="status-dot" aria-hidden="true" />
          <span>
            {apiStatus === 'checking'
              ? 'Connecting to the Yard API...'
              : apiStatus === 'ready'
                ? 'Yard API boundary ready'
                : 'Yard API unavailable'}
          </span>
        </div>
      </section>
    </main>
  );
}
