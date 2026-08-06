import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGenLayer } from "@/lib/useGenLayer";
import { type NetworkKey, CHAIN_CONFIGS } from "@/config/chains";
import { SeverityTag } from "@/components/SeverityTag";

interface BountyDetailProps {
  bountyId: number;
  network: NetworkKey;
}

interface BountyData {
  bounty_id: number;
  reporter: string;
  project_owner: string;
  reporter_stake: number;
  project_stake: number;
  disputed_claim: string;
  claimed_severity: string;
  project_rebuttal: string;
  status: string;
  verdict_severity: string;
  confidence_bps: number;
  reasoning_summary: string;
  filed_at: string;
  response_deadline: string;
  resolved_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  filed: "Awaiting Response",
  rebutted: "Response Filed — Ready to Resolve",
  response_expired: "Response Window Closed — Ready to Resolve",
  resolved: "Resolved",
  closed: "Closed",
};

export function BountyDetail({ bountyId, network }: BountyDetailProps) {
  const { readContractMethod, writeContractMethod, account, connect } = useGenLayer(network);
  const [data, setData] = useState<BountyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<"rebut" | "resolve" | null>(null);

  const [rebuttalText, setRebuttalText] = useState("");
  const [projectStake, setProjectStake] = useState("1");

  async function refresh() {
    setLoading(true);
    try {
      const result = await readContractMethod("get_bounty", [bountyId]);
      setData(result);
    } catch (err) {
      console.error("Failed to load bounty", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bountyId, network]);

  async function handleRebut() {
    if (!account) {
      await connect();
      return;
    }
    setActionPending("rebut");
    setActionError(null);
    try {
      // Argument order matches contract's rebut(bounty_id,
      // project_rebuttal) exactly.
      const { timedOut } = await writeContractMethod(
        "rebut",
        [bountyId, rebuttalText.trim()],
        projectStake
      );
      if (!timedOut) await refresh();
    } catch (err: any) {
      setActionError(err?.message || "Rebuttal failed.");
    } finally {
      setActionPending(null);
    }
  }

  async function handleResolve() {
    if (!account) {
      await connect();
      return;
    }
    setActionPending("resolve");
    setActionError(null);
    try {
      const { timedOut } = await writeContractMethod("resolve_dispute", [bountyId], 0);
      if (!timedOut) await refresh();
      else
        setActionError(
          "Consensus is still running — this is normal for a judged verdict and can take several minutes. Refresh shortly."
        );
    } catch (err: any) {
      setActionError(err?.message || "Resolution failed.");
    } finally {
      setActionPending(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="border border-graphite-line rounded-sm p-8 animate-pulse">
        <div className="h-4 bg-graphite-line rounded w-1/3 mb-4" />
        <div className="h-3 bg-graphite-line rounded w-2/3 mb-2" />
        <div className="h-3 bg-graphite-line rounded w-1/2" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="border border-graphite-line rounded-sm p-8 text-center text-graphite">
        Bounty not found.
      </div>
    );
  }

  const explorerUrl = CHAIN_CONFIGS[network].blockExplorerUrls[0];
  const canRebut = data.status === "filed";
  const canResolve = data.status === "filed" || data.status === "rebutted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-ink rounded-sm bg-paper divide-y divide-graphite-line"
    >
      <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="mono-tag text-xs text-graphite">#{data.bounty_id}</span>
          <span className="mono-tag text-xs uppercase tracking-wider text-ink">
            {STATUS_LABELS[data.status] ?? data.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data.status === "resolved" ? (
            <SeverityTag severity={data.verdict_severity} />
          ) : (
            <SeverityTag severity={data.claimed_severity} size="sm" />
          )}
        </div>
      </div>

      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <InfoRow label="Filed at" value={data.filed_at} mono />
        <InfoRow label="Response deadline" value={data.response_deadline} mono />
        {data.resolved_at && <InfoRow label="Resolved at" value={data.resolved_at} mono />}
      </div>

      <div className="px-6 py-5">
        <h4 className="font-mono text-xs uppercase tracking-wider text-graphite mb-2">
          Disputed claim
        </h4>
        <p className="text-sm text-ink whitespace-pre-wrap">{data.disputed_claim}</p>
      </div>

      {data.project_rebuttal && (
        <div className="px-6 py-5">
          <h4 className="font-mono text-xs uppercase tracking-wider text-graphite mb-2">
            Project rebuttal
          </h4>
          <p className="text-sm text-ink whitespace-pre-wrap">{data.project_rebuttal}</p>
        </div>
      )}

      {data.status === "resolved" && (
        <div className="px-6 py-5 bg-seal/5">
          <h4 className="font-mono text-xs uppercase tracking-wider text-graphite mb-2">
            Verdict reasoning ({data.confidence_bps}bps confidence)
          </h4>
          <p className="text-sm text-ink whitespace-pre-wrap">{data.reasoning_summary}</p>
        </div>
      )}

      {actionError && (
        <div className="px-6 py-3 bg-seal/10">
          <p className="text-sm text-ink">{actionError}</p>
        </div>
      )}

      {(canRebut || canResolve) && (
        <div className="px-6 py-5 space-y-4">
          {canRebut && (
            <div className="space-y-3">
              <textarea
                value={rebuttalText}
                onChange={(e) => setRebuttalText(e.target.value)}
                rows={3}
                placeholder="Rebuttal — explain why this report doesn't hold..."
                className="w-full border border-graphite-line rounded-sm px-3 py-2 text-sm text-ink focus:border-seal-deep outline-none resize-y"
              />
              <div className="flex flex-wrap gap-3 items-center">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={projectStake}
                  onChange={(e) => setProjectStake(e.target.value)}
                  className="border border-graphite-line rounded-sm px-3 py-2 text-sm mono-tag w-28"
                />
                <button
                  onClick={handleRebut}
                  disabled={actionPending === "rebut"}
                  className="bg-paper border border-ink text-ink font-mono text-xs uppercase tracking-widest px-5 py-2.5 rounded-sm hover:bg-ink hover:text-seal transition-colors disabled:opacity-40"
                >
                  {actionPending === "rebut" ? "Submitting…" : "Submit Rebuttal"}
                </button>
              </div>
            </div>
          )}

          {canResolve && (
            <button
              onClick={handleResolve}
              disabled={actionPending === "resolve"}
              className="bg-ink text-seal font-mono text-xs uppercase tracking-widest px-5 py-2.5 rounded-sm hover:bg-seal-press transition-colors disabled:opacity-40"
            >
              {actionPending === "resolve" ? "Resolving…" : "Resolve Dispute"}
            </button>
          )}
        </div>
      )}

      <div className="px-6 py-3">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mono-tag text-xs text-graphite hover:text-seal-deep underline"
        >
          View on explorer →
        </a>
      </div>
    </motion.div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-graphite mb-0.5">
        {label}
      </div>
      <div className={`text-sm text-ink break-all ${mono ? "mono-tag" : ""}`}>{value}</div>
    </div>
  );
}
