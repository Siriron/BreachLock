export function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mono-tag text-xs uppercase tracking-widest text-graphite mb-3">
          Case File
        </div>
        <div className="font-mono text-7xl text-ink mb-2">404</div>
        <p className="text-sm text-ink/70 mb-8">
          This record doesn't exist, or the evidence trail ends here.
        </p>
        <a
          href="/"
          className="mono-tag text-xs uppercase tracking-wider px-5 py-2.5 border border-ink rounded-sm text-ink hover:bg-ink hover:text-seal transition-colors inline-block"
        >
          Back to BreachLock
        </a>
      </div>
    </div>
  );
}
