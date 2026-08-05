import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useApiClient } from '../api/use-client.js';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const apiClient = useApiClient();
  const apiQuery = useQuery({
    queryKey: ['api', 'version'],
    queryFn: async () => {
      const response = await apiClient.v1.$get();

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      return response.json();
    },
    enabled: typeof window !== 'undefined',
    retry: false,
  });
  const apiStatus = apiQuery.isPending
    ? 'Connecting to the Yard API...'
    : apiQuery.isSuccess
      ? 'Yard API boundary ready'
      : 'Yard API unavailable';

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
          <span>{apiStatus}</span>
        </div>
      </section>
    </main>
  );
}
