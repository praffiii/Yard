import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
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
          <span>Workspace shell ready</span>
        </div>
      </section>
    </main>
  );
}
