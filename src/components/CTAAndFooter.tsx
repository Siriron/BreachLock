import { motion } from "framer-motion";

export function CTASection({ onFileClick }: { onFileClick: () => void }) {
  return (
    <section className="relative py-28 md:py-36 px-6 md:px-10 overflow-hidden border-t border-graphite-line">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(245,196,0,0.12), transparent 60%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative max-w-2xl mx-auto text-center"
      >
        <h2 className="font-mono text-3xl md:text-4xl text-ink leading-tight mb-6">
          Found something real?
          <br />
          Pin it. File it. Let the code speak.
        </h2>
        <button
          onClick={onFileClick}
          className="bg-ink text-seal font-mono text-sm uppercase tracking-widest px-8 py-4 rounded-sm hover:bg-seal-press transition-colors"
        >
          File a Disclosure
        </button>
      </motion.div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-graphite-line px-6 md:px-10 py-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="font-mono text-sm text-ink">BreachLock</span>
          <p className="text-xs text-graphite mt-1 max-w-sm">
            Commit-pinned bug bounty verdict arbitration on GenLayer.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 mono-tag text-xs text-graphite">
          <a href="/docs" className="hover:text-ink transition-colors">Docs</a>
          <a href="https://github.com/Siriron/breachlock" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
            GitHub
          </a>
          <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
            GenLayer Docs
          </a>
          <a href="https://testnet-faucet.genlayer.foundation" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
            Faucet
          </a>
        </nav>
      </div>
    </footer>
  );
}
