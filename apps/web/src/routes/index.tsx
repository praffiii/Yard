import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPublicApiClient } from '../api/client.js';
import { apiVersionQueryOptions } from '../features/api-status/queries.js';

export type DiscoverySearch = {
  readonly category?: string;
  readonly place?: string;
  readonly sort: 'soonest' | 'distance';
  readonly view: 'map' | 'list';
};

/** Keeps shareable discovery controls in the URL instead of a client store. */
export function parseDiscoverySearch(search: Record<string, unknown>): DiscoverySearch {
  const category = readSearchString(search.category);
  const place = readSearchString(search.place);

  return {
    category,
    place,
    sort: search.sort === 'distance' ? 'distance' : 'soonest',
    view: search.view === 'list' ? 'list' : 'map',
  };
}

function readSearchString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

export const Route = createFileRoute('/')({
  validateSearch: parseDiscoverySearch,
  loader: ({ context }) => {
    // Successful probes hydrate or stream; a failed optional probe intentionally leaves the
    // server and initial client render in the same loading state before the client shows failure.
    void context.queryClient.prefetchQuery(apiVersionQueryOptions(createPublicApiClient()));
  },
  component: HomePage,
});

function HomePage() {
  const apiClient = useMemo(() => createPublicApiClient(), []);
  const apiQuery = useQuery(apiVersionQueryOptions(apiClient));
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [placeDraft, setPlaceDraft] = useState(search.place ?? '');

  useEffect(() => {
    setPlaceDraft(search.place ?? '');
  }, [search.place]);

  const updateSearch = (updates: Partial<DiscoverySearch>) => {
    void navigate({
      search: (current) => ({ ...current, ...updates }),
    });
  };

  const handlePlaceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateSearch({ place: placeDraft.trim() || undefined });
  };

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
        <div
          className="status-card"
          data-state={apiQuery.isError ? 'error' : apiQuery.isPending ? 'pending' : 'ready'}
          role="status"
        >
          <span className="status-dot" aria-hidden="true" />
          <span>{apiStatus}</span>
        </div>

        <section className="discovery-card" aria-labelledby="discovery-title">
          <div>
            <p className="eyebrow">Discovery state</p>
            <h2 id="discovery-title">Explore at your pace.</h2>
            <p className="discovery-copy">
              Place, filters, sorting, and view are shareable URL state. These controls do not fetch
              discovery data yet; map rendering stays a separate concern.
            </p>
          </div>

          <form className="place-form" onSubmit={handlePlaceSubmit}>
            <label htmlFor="place">Place selection</label>
            <div className="place-input-row">
              <input
                id="place"
                name="place"
                onChange={(event) => setPlaceDraft(event.target.value)}
                placeholder="Search a place"
                value={placeDraft}
              />
              <button type="submit">Apply</button>
            </div>
          </form>

          <div className="discovery-options">
            <label>
              Category filter
              <select
                onChange={(event) => updateSearch({ category: event.target.value || undefined })}
                value={search.category ?? ''}
              >
                <option value="">All activities</option>
                <option value="sports">Sports</option>
                <option value="study">Study</option>
                <option value="walks">Walks</option>
              </select>
            </label>
            <label>
              Sort
              <select
                onChange={(event) =>
                  updateSearch({ sort: event.target.value === 'distance' ? 'distance' : 'soonest' })
                }
                value={search.sort}
              >
                <option value="soonest">Soonest</option>
                <option value="distance">Nearest</option>
              </select>
            </label>
            <label>
              View
              <select
                onChange={(event) =>
                  updateSearch({ view: event.target.value === 'list' ? 'list' : 'map' })
                }
                value={search.view}
              >
                <option value="map">Map</option>
                <option value="list">List</option>
              </select>
            </label>
          </div>

          <p className="search-summary">
            Browsing {search.place ?? 'everywhere'} · {search.category ?? 'all categories'} ·{' '}
            {search.sort === 'distance' ? 'nearest first' : 'soonest first'} · {search.view} view
          </p>
        </section>
      </section>
    </main>
  );
}
