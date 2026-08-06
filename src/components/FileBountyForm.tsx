import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGenLayer } from "@/lib/useGenLayer";
import { type NetworkKey } from "@/config/chains";

interface FileBountyFormProps {
  network: NetworkKey;
  onFiled?: (explorerTxHash: string) => void;
}

const SEVERITY_OPTIONS = ["critical", "high", "medium", "low"] as const;

export function FileBountyForm({ network, onFiled }: FileBountyFormProps) {
  const { account, connect, connecting, writeContractMethod } = useGenLayer(network);

  const [claim, setClaim] = useState("");
  const [severity, setSeverity] = useState<(typeof SEVERITY_OPTIONS)[number]>("high");
  const [stakeGen, setStakeGen] = useState("1");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNote, setPendingNote] = useState(false);

  const canSubmit = claim.trim().length >= 10;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) {
      await connect();
      return;
    }
    setSubmitting(true);
    setError(null);
    setPendingNote(true);
    try {
      // Argument order MUST match the contract's file_bounty signature
      // exactly: (disputed_claim, claimed_severity). Confirmed against
      // contracts/breachlock.py before writing this call site. Simpler
      // than the earlier fetch-based version — see contract's own
      // module docstring for why the evidence-fetch fields were
      // removed (SystemError:6: forbidden against every external
      // domain tried, documented in full in docs/testing.md).
      const { txHash, timedOut } = await writeContractMethod(
        "file_bounty",
        [claim.trim(), severity],
        stakeGen
      );

      // Deliberately do NOT attempt to parse a bounty_id out of the
      // write receipt here — the exact shape of a write's JSON return
      // value on the transaction receipt is not confirmed anywhere in
      // project knowledge, and guessing at a field name is exactly the
      // class of unverified-assumption bug that caused a confirmed
      // live failure elsewhere in this project. Success is surfaced
      // via the tx hash + explorer link only.
      if (timedOut) {
        setError(
          `Still waiting on consensus — this can take several minutes for a judged write. Track it directly: tx ${txHash}`
        );
      } else {
        onFiled?.(txHash);
      }
    } catch (err: any) {
      setError(err?.message || "Filing failed. Check the console for details.");
    } finally {
      setSubmitting(false);
      setPendingNote(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-2 border-ink rounded-sm bg-paper divide-y divide-graphite-line"
    >
      <div className="px-6 py-4">
        <h3 className="font-mono text-sm uppercase tracking-widest text-graphite mb-1">
          File a Disclosure
        </h3>
        <p className="text-sm text-ink/70">
          Describe the vulnerability in detail — the more specific and technically
          concrete your claim, the stronger it stands up to independent judgment.
        </p>
      </div>

      <div className="px-6 py-5">
        <label className="block font-mono text-xs uppercase tracking-wider text-graphite mb-2">
          Disputed claim
        </label>
        <textarea
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          rows={6}
          placeholder="Describe the vulnerability: what's affected, how it can be triggered, and the expected impact. Be specific — vague claims judge worse than detailed ones."
          className="w-full border border-graphite-line rounded-sm px-3 py-2 text-sm text-ink focus:border-seal-deep outline-none resize-y"
        />
      </div>

      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-graphite mb-2">
            Claimed severity
          </label>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSeverity(opt)}
                className={`mono-tag text-xs px-3 py-1.5 rounded-sm border uppercase tracking-wider transition-colors ${
                  severity === opt
                    ? "bg-ink text-seal border-ink"
                    : "bg-paper text-ink border-graphite-line hover:border-ink"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-graphite mb-2">
            Stake (GEN)
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={stakeGen}
            onChange={(e) => setStakeGen(e.target.value)}
            className="w-full border border-graphite-line rounded-sm px-3 py-2 text-sm text-ink focus:border-seal-deep outline-none mono-tag"
          />
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 py-3 bg-seal/10 border-t border-seal-deep/30"
          >
            <p className="text-sm text-ink">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-6 py-5 flex items-center justify-between gap-4">
        {pendingNote && (
          <p className="text-xs text-graphite mono-tag">
            this can take several minutes — consensus is judging your claim
          </p>
        )}
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="ml-auto bg-ink text-seal font-mono text-sm uppercase tracking-widest px-6 py-3 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-seal-press transition-colors"
        >
          {!account ? (connecting ? "Connecting…" : "Connect Wallet") : submitting ? "Filing…" : "File Disclosure"}
        </button>
      </div>
    </form>
  );
}
