import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGenLayer } from "@/lib/useGenLayer";
import { type NetworkKey } from "@/config/chains";

interface BountyListEntry {
  bounty_id: number;
  reporter: string;
  project_owner: string;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  filed: "text-graphite",
  rebutted: "text-ink",
  response_expired: "text-ink",
  resolved: "text-seal-deep",
  closed: "text-graphite",
};

// Must exactly match the contract's unset-project_owner construction:
// Address("0x" + "0" * 40) in breachlock.py — "0x" + 40 zero chars, 42
// total. Verified by direct character count against the contract source
// rather than assumed; an earlier draft of this constant was 6 zeros
// short and would have silently never matched, always showing a
// meaningless "vs 0x0000…" on every bounty regardless of whether a
// project had actually engaged.
const ZERO_ADDR = "0x" + "0".repeat(40);

function truncate(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function BountyList({
  network,
  onSelect,
}: {
  network: NetworkKey;
  onSelect: (bountyId: number) => void;
}) {
  const { readContractMethod } = useGenLayer(network);
  const [entries, setEntries] = useState<BountyListEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const result = await readContractMethod("list_bounties", []);
      setEntries(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load bounties.");
      setEntries([]);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network]);

  if (entries === null) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 border border-graphite-line rounded-sm animate-pulse bg-graphite-line/20" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-graphite-line rounded-sm p-6 text-center text-graphite text-sm">
        {error}
        <button onClick={refresh} className="block mx-auto mt-3 mono-tag text-xs underline text-seal-deep">
          Retry
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="border border-dashed border-graphite-line rounded-sm p-10 text-center">
        <p className="mono-tag text-xs uppercase tracking-wider text-graphite mb-1">No disclosures yet</p>
        <p className="text-sm text-ink/60">Be the first to file one against this network.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-ink rounded-sm divide-y divide-graphite-line overflow-hidden">
      {entries.map((entry, i) => (
        <motion.button
          key={entry.bounty_id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.03 }}
          onClick={() => onSelect(entry.bounty_id)}
          className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-seal/5 transition-colors"
        >
          <div className="flex items-center gap-4 min-w-0">
            <span className="mono-tag text-xs text-graphite shrink-0">#{entry.bounty_id}</span>
            <span className="mono-tag text-xs text-ink truncate">
              reporter {truncate(entry.reporter)}
            </span>
            {entry.project_owner && entry.project_owner.toLowerCase() !== ZERO_ADDR && (
              <span className="mono-tag text-xs text-graphite truncate hidden sm:inline">
                vs {truncate(entry.project_owner)}
              </span>
            )}
          </div>
          <span className={`mono-tag text-xs uppercase tracking-wider shrink-0 ${STATUS_STYLES[entry.status] ?? ""}`}>
            {entry.status.replace("_", " ")}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
