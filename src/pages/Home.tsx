import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { RedactionHero } from "@/components/RedactionHero";
import { FeaturesSection } from "@/components/FeaturesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { StatsSection } from "@/components/StatsSection";
import { CTASection, Footer } from "@/components/CTAAndFooter";
import { FileBountyForm } from "@/components/FileBountyForm";
import { BountyList } from "@/components/BountyList";
import { BountyDetail } from "@/components/BountyDetail";
import { type NetworkKey } from "@/config/chains";

type View = "landing" | "file" | "browse" | { detail: number };

export function Home() {
  const [network, setNetwork] = useState<NetworkKey>("studionet");
  const [view, setView] = useState<View>("landing");
  const [filedNotice, setFiledNotice] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navbar network={network} onNetworkChange={setNetwork} />

      <AnimatePresence mode="wait">
        {view === "landing" && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <RedactionHero />
            <FeaturesSection />
            <HowItWorksSection />
            <StatsSection network={network} />
            <div className="max-w-5xl mx-auto px-6 md:px-10 flex flex-wrap gap-4 justify-center pb-4">
              <button
                onClick={() => setView("file")}
                className="mono-tag text-xs uppercase tracking-wider px-5 py-2.5 bg-ink text-seal rounded-sm hover:bg-seal-press transition-colors"
              >
                File a Disclosure
              </button>
              <button
                onClick={() => setView("browse")}
                className="mono-tag text-xs uppercase tracking-wider px-5 py-2.5 border-2 border-ink rounded-sm text-ink hover:bg-ink hover:text-seal transition-colors"
              >
                Browse Disclosures
              </button>
            </div>
            <CTASection onFileClick={() => setView("file")} />
          </motion.div>
        )}

        {view === "file" && (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl mx-auto px-6 md:px-10 py-16"
          >
            <BackButton onClick={() => setView("landing")} />
            {filedNotice ? (
              <div className="border border-seal-deep bg-seal/10 rounded-sm p-6 text-center">
                <p className="font-mono text-sm text-ink mb-3">Disclosure filed.</p>
                <p className="text-sm text-ink/70 mb-4">
                  Consensus can take several minutes for a judged write.
                </p>
                <a
                  href={filedNotice}
                  target="_blank"
                  rel="noreferrer"
                  className="mono-tag text-xs text-seal-deep underline"
                >
                  Track transaction →
                </a>
              </div>
            ) : (
              <FileBountyForm
                network={network}
                onFiled={(txHash) => {
                  const explorerBase =
                    network === "studionet"
                      ? "https://explorer-studio.genlayer.com"
                      : "https://explorer-bradbury.genlayer.com";
                  setFiledNotice(`${explorerBase}/tx/${txHash}`);
                }}
              />
            )}
          </motion.div>
        )}

        {view === "browse" && (
          <motion.div
            key="browse"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-3xl mx-auto px-6 md:px-10 py-16"
          >
            <BackButton onClick={() => setView("landing")} />
            <h2 className="font-mono text-2xl text-ink mb-8">Disclosures</h2>
            <BountyList network={network} onSelect={(id) => setView({ detail: id })} />
          </motion.div>
        )}

        {typeof view === "object" && "detail" in view && (
          <motion.div
            key={`detail-${view.detail}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-3xl mx-auto px-6 md:px-10 py-16"
          >
            <BackButton onClick={() => setView("browse")} />
            <BountyDetail bountyId={view.detail} network={network} />
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mono-tag text-xs text-graphite hover:text-ink transition-colors mb-8 flex items-center gap-1.5"
    >
      ← back
    </button>
  );
}
