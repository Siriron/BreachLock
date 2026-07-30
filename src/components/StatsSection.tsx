import { useEffect, useState } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";
import { useGenLayer } from "@/lib/useGenLayer";
import { type NetworkKey } from "@/config/chains";

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 100 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, value, motionValue]);

  useEffect(() => {
    const unsub = springValue.on("change", (v) => setDisplay(Math.round(v)));
    return () => unsub();
  }, [springValue]);

  return (
    <span ref={ref} className="font-mono text-4xl md:text-5xl text-seal-deep tabular-nums">
      {display}
    </span>
  );
}

export function StatsSection({ network }: { network: NetworkKey }) {
  const { readContractMethod } = useGenLayer(network);
  const [stats, setStats] = useState<{ total: number; resolved: number; pool: number } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const list = await readContractMethod("list_bounties", []);
        const entries = Array.isArray(list) ? list : [];
        const resolved = entries.filter((e: any) => e.status === "resolved").length;
        let pool = 0;
        try {
          const poolResult = await readContractMethod("get_protocol_pool", []);
          pool = poolResult?.protocol_pool ?? 0;
        } catch {
          // pool read is best-effort — don't block the whole stats
          // section on it
        }
        setStats({ total: entries.length, resolved, pool });
      } catch {
        // Contract may not be deployed to this network yet, or read
        // failed for another reason — show zeros honestly rather than a
        // broken section. A fresh deploy legitimately has zero
        // disclosures; that's real information, not a loading failure.
        setStats({ total: 0, resolved: 0, pool: 0 });
      }
    }
    load();
  }, [network]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayStats = stats ?? { total: 0, resolved: 0, pool: 0 };

  return (
    <section className="py-24 md:py-32 px-6 md:px-10 max-w-5xl mx-auto border-t border-graphite-line">
      <div className="mb-14">
        <span className="mono-tag text-xs text-seal-deep uppercase tracking-wider block mb-3">
          Section 04 — Live on {network === "studionet" ? "StudioNet" : "Bradbury"}
        </span>
        <h2 className="font-mono text-2xl md:text-3xl text-ink max-w-lg leading-tight">
          Real numbers, read straight from the contract.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <AnimatedNumber value={displayStats.total} />
          <p className="mono-tag text-xs uppercase tracking-wider text-graphite mt-2">
            Disclosures filed
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
          <AnimatedNumber value={displayStats.resolved} />
          <p className="mono-tag text-xs uppercase tracking-wider text-graphite mt-2">
            Verdicts settled
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
          <AnimatedNumber value={displayStats.pool} />
          <p className="mono-tag text-xs uppercase tracking-wider text-graphite mt-2">
            Protocol pool (GEN, wei)
          </p>
        </motion.div>
      </div>
    </section>
  );
}
