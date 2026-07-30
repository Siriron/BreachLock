import { useGenLayer } from "@/lib/useGenLayer";
import { type NetworkKey } from "@/config/chains";

function truncate(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function Navbar({
  network,
  onNetworkChange,
}: {
  network: NetworkKey;
  onNetworkChange: (n: NetworkKey) => void;
}) {
  const { account, connect, connecting } = useGenLayer(network);

  return (
    <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-sm border-b-2 border-ink">
      <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <BreachLockMark />
          <span className="font-mono text-sm tracking-wide text-ink">
            Breach<span className="text-seal-deep">Lock</span>
          </span>
        </a>

        <div className="flex items-center gap-3">
          {/* Network toggle: UI state only. The wallet's actual chain
              switch happens via ensureChain() at write time, never here
              — see project knowledge section 7's note on avoiding an
              unwanted wallet popup on a glance-only toggle click. */}
          <div className="hidden sm:flex items-center border border-graphite-line rounded-sm overflow-hidden">
            {(["studionet", "bradbury"] as NetworkKey[]).map((n) => (
              <button
                key={n}
                onClick={() => onNetworkChange(n)}
                className={`mono-tag text-xs px-3 py-1.5 uppercase tracking-wide transition-colors ${
                  network === n ? "bg-ink text-seal" : "text-graphite hover:text-ink"
                }`}
              >
                {n === "studionet" ? "StudioNet" : "Bradbury"}
              </button>
            ))}
          </div>

          <button
            onClick={connect}
            className="mono-tag text-xs px-4 py-2 border border-ink rounded-sm text-ink hover:bg-ink hover:text-seal transition-colors"
          >
            {account ? truncate(account) : connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      </div>
    </header>
  );
}

function BreachLockMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="20" height="20" rx="2" stroke="#0A0A0A" strokeWidth="1.4" />
      <path d="M6 11h4l-1.5 4L16 8h-4l1.5-4L6 11z" fill="#F5C400" stroke="#0A0A0A" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
}
