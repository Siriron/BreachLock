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

  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [commitHash, setCommitHash] = useState("");
  const [filePath, setFilePath] = useState("");
  const [report, setReport] = useState("");
  const [severity, setSeverity] = useState<(typeof SEVERITY_OPTIONS)[number]>("high");
  const [stakeGen, setStakeGen] = useState("1");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNote, setPendingNote] = useState(false);

  const canSubmit =
    repoOwner.trim() && repoName.trim() && commitHash.trim() && filePath.trim() && report.trim().length >= 10;

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
      // exactly: (repo_owner, repo_name, commit_hash, file_path,
      // vulnerability_report, claimed_severity). Confirmed against
      // contracts/breachlock.py before writing this call site.
      const { txHash, timedOut } = await writeContractMethod(
        "file_bounty",
        [repoOwner.trim(), repoName.trim(), commitHash.trim(), filePath.trim(), report.trim(), severity],
        stakeGen
      );

      // NOTE: we deliberately do NOT attempt to parse a bounty_id out of
      // the write receipt here. The exact shape of a write's JSON return
      // value on the transaction receipt is not confirmed anywhere in
      // project knowledge, and guessing at a field name (e.g.
      // `receipt.data`) is exactly the class of unverified-assumption
      // bug that caused a confirmed live failure on a prior contract in
      // this project (see section 7's .send()/genlayer-js/utils notes).
      // Until the real field is confirmed, success is surfaced via the
      // tx hash + explorer link only — never a guessed parse.
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
          Pin your report to an exact commit and file. BreachLock fetches the source
          itself — you never submit a fetch URL.
        </p>
      </div>

      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Repo owner" value={repoOwner} onChange={setRepoOwner} placeholder="acme-corp" />
        <Field label="Repo name" value={repoName} onChange={setRepoName} placeholder="payments-api" />
        <Field
          label="Commit hash"
          value={commitHash}
          onChange={setCommitHash}
          placeholder="a3f9c21e..."
          mono
        />
        <Field
          label="File path"
          value={filePath}
          onChange={setFilePath}
          placeholder="src/lib/session/deserialize.py"
          mono
        />
      </div>

      <div className="px-6 py-5">
        <label className="block font-mono text-xs uppercase tracking-wider text-graphite mb-2">
          Vulnerability report
        </label>
        <textarea
          value={report}
          onChange={(e) => setReport(e.target.value)}
          rows={5}
          placeholder="Describe the vulnerability, the trigger path, and expected impact..."
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
            this can take several minutes — consensus is judging real evidence
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block font-mono text-xs uppercase tracking-wider text-graphite mb-2">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-graphite-line rounded-sm px-3 py-2 text-sm text-ink focus:border-seal-deep outline-none ${
          mono ? "mono-tag" : ""
        }`}
      />
    </div>
  );
}
