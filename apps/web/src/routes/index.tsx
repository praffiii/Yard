import {
  ArrowUpRight,
  CheckCircle,
  CircleNotch,
  Compass,
  List,
  MapPin,
  MapTrifold,
  SlidersHorizontal,
  UsersThree,
  WarningCircle,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Reveal } from '../components/motion/reveal.js';
import { ThemeSelector } from '../components/theme-selector.js';
import { Badge } from '../components/ui/badge.js';
import { Button, buttonVariants } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group.js';
import { createPublicApiClient } from '../api/client.js';
import { apiVersionQueryOptions } from '../features/api-status/queries.js';
import { cn } from '../lib/utils.js';

export type DiscoverySearch = Readonly<{
  category?: string;
  place?: string;
  sort: 'soonest' | 'distance';
  view: 'map' | 'list';
}>;

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

  const apiStatus = apiQuery.isPending ? 'pending' : apiQuery.isError ? 'error' : 'ready';
  const StatusIcon =
    apiStatus === 'pending' ? CircleNotch : apiStatus === 'error' ? WarningCircle : CheckCircle;
  const statusLabel =
    apiStatus === 'pending'
      ? 'Connecting to the Yard API...'
      : apiStatus === 'error'
        ? 'Yard API unavailable'
        : 'Yard API boundary ready';
  const statusVariant =
    apiStatus === 'pending' ? 'info' : apiStatus === 'error' ? 'destructive' : 'success';

  return (
    <div className="min-h-svh bg-background text-foreground transition-colors duration-standard">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <a className="flex shrink-0 items-center gap-2" href="/" aria-label="Yard home">
            <span
              aria-hidden="true"
              className="size-4 rounded-[0.25rem] bg-primary shadow-[0_0_0_4px_var(--secondary)]"
            />
            <span className="font-display text-lg font-bold tracking-[-0.04em]">YARD</span>
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            <a
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-muted"
              href="#discover"
            >
              Discover
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeSelector />
            <Button
              aria-label="Host an activity session (coming soon)"
              className="inline-flex"
              disabled
              size="sm"
              title="Hosting is coming soon"
              variant="secondary"
            >
              <UsersThree aria-hidden="true" size={17} weight="regular" />
              <span className="hidden sm:inline">Host a session</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <Reveal>
          <section
            aria-labelledby="page-title"
            className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end"
          >
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                <Compass aria-hidden="true" size={16} weight="bold" />
                Local, low-pressure plans
              </p>
              <h1
                className="max-w-3xl font-display text-display font-bold text-balance text-foreground sm:text-[3.75rem]"
                id="page-title"
              >
                Find your people and make plans.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Discover small activity sessions near you, join at your own pace, and build trust by
                showing up.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <a className={buttonVariants({ size: 'default' })} href="#discover">
                  Explore nearby
                  <ArrowUpRight aria-hidden="true" size={18} weight="bold" />
                </a>
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <span aria-hidden="true" className="size-2 rounded-full bg-success-foreground" />
                  Start with a place, not a profile.
                </p>
              </div>
            </div>

            <aside
              aria-label="Yard API status"
              aria-live="polite"
              className={cn(
                'rounded-card border p-4 shadow-card transition-colors duration-standard',
                apiStatus === 'error'
                  ? 'border-error-foreground/40 bg-error'
                  : 'border-border bg-card',
              )}
              data-state={apiStatus}
              role="status"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Service status
                </span>
                <Badge variant={statusVariant}>{apiStatus}</Badge>
              </div>
              <div className="mt-5 flex items-start gap-3">
                <span className="mt-0.5 rounded-pill bg-muted p-2 text-foreground">
                  <StatusIcon
                    aria-hidden="true"
                    className={apiStatus === 'pending' ? 'animate-spin' : undefined}
                    size={20}
                    weight="regular"
                  />
                </span>
                <div>
                  <p className="font-medium text-card-foreground">{statusLabel}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    The shell keeps its layout while optional API data loads or recovers.
                  </p>
                </div>
              </div>
            </aside>
          </section>
        </Reveal>

        <Reveal className="mt-10 sm:mt-14" delay={0.05}>
          <section
            aria-labelledby="discovery-title"
            className="overflow-hidden rounded-card border border-border bg-card shadow-card"
            id="discover"
          >
            <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                  Discovery state
                </p>
                <h2
                  className="mt-2 font-display text-title font-semibold text-card-foreground"
                  id="discovery-title"
                >
                  Explore at your pace.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Choose a place and a view. These controls are ready for discovery data without
                  moving shareable state into a client store.
                </p>
              </div>

              <ToggleGroup
                aria-label="Discovery view"
                className="self-start rounded-md border border-border bg-muted p-1"
                onValueChange={(values) => {
                  const value = values[0];
                  if (value === 'map' || value === 'list') {
                    updateSearch({ view: value });
                  }
                }}
                value={[search.view]}
              >
                <ToggleGroupItem aria-label="Map view" value="map">
                  <MapTrifold aria-hidden="true" size={17} weight="regular" />
                  <span className="sr-only sm:not-sr-only">Map</span>
                </ToggleGroupItem>
                <ToggleGroupItem aria-label="List view" value="list">
                  <List aria-hidden="true" size={17} weight="regular" />
                  <span className="sr-only sm:not-sr-only">List</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <form className="space-y-2" onSubmit={handlePlaceSubmit}>
                <label className="block text-sm font-medium text-card-foreground" htmlFor="place">
                  Discovery location
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    aria-describedby="place-help"
                    id="place"
                    name="place"
                    onChange={(event) => setPlaceDraft(event.target.value)}
                    placeholder="Search a city or area"
                    type="search"
                    value={placeDraft}
                  />
                  <Button className="sm:w-auto" type="submit">
                    Apply
                  </Button>
                </div>
                <p className="text-xs leading-5 text-muted-foreground" id="place-help">
                  Your selection changes the map area, not your account location.
                </p>
              </form>

              <div className="grid gap-4 sm:grid-cols-3 lg:gap-3">
                <label className="space-y-2 text-sm font-medium text-card-foreground">
                  <span className="block">Category</span>
                  <select
                    className="h-control w-full rounded-md border border-input bg-card px-3 text-sm text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-fast ease-standard focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    onChange={(event) =>
                      updateSearch({ category: event.target.value || undefined })
                    }
                    value={search.category ?? ''}
                  >
                    <option value="">All activities</option>
                    <option value="sports">Sports</option>
                    <option value="study">Study</option>
                    <option value="walks">Walks</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-card-foreground">
                  <span className="block">Sort by</span>
                  <select
                    className="h-control w-full rounded-md border border-input bg-card px-3 text-sm text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-fast ease-standard focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    onChange={(event) =>
                      updateSearch({
                        sort: event.target.value === 'distance' ? 'distance' : 'soonest',
                      })
                    }
                    value={search.sort}
                  >
                    <option value="soonest">Soonest</option>
                    <option value="distance">Nearest</option>
                  </select>
                </label>
                <div className="space-y-2 text-sm font-medium text-card-foreground">
                  <span className="block">Interaction</span>
                  <div className="flex h-control items-center gap-2 rounded-md border border-dashed border-border bg-muted px-3 text-xs text-muted-foreground">
                    <SlidersHorizontal aria-hidden="true" size={16} />
                    URL-shareable
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border bg-muted/50 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="inline-flex items-center gap-2 font-medium text-card-foreground">
                <MapPin aria-hidden="true" className="text-primary" size={17} weight="fill" />
                Browsing {search.place ?? 'everywhere'}
              </p>
              <p className="text-muted-foreground">
                {search.category ?? 'All categories'} ·{' '}
                {search.sort === 'distance' ? 'Nearest first' : 'Soonest first'} · {search.view}{' '}
                view
              </p>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-6" delay={0.1}>
          <section
            aria-labelledby="trust-title"
            className="grid gap-4 rounded-card border border-border bg-muted/50 p-5 sm:grid-cols-[minmax(0,1fr)_repeat(2,minmax(0,0.75fr))] sm:p-6"
          >
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                A calmer way to meet
              </p>
              <h2
                className="mt-2 font-display text-section font-semibold text-foreground"
                id="trust-title"
              >
                Make plans that feel doable.
              </h2>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <p className="text-sm font-semibold text-card-foreground">Small by design</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Useful groups, not crowded feeds.
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <p className="text-sm font-semibold text-card-foreground">Trust through attendance</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Showing up matters more than likes.
              </p>
            </div>
          </section>
        </Reveal>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
        Yard is a lightweight layer for finding and joining real-world activity sessions.
      </footer>
    </div>
  );
}
