import { motion } from "framer-motion";
import { FileCode2, GitCommitHorizontal, ShieldAlert, Clock3 } from "lucide-react";

const FEATURES = [
  {
    icon: GitCommitHorizontal,
    title: "Evidence you can't relocate",
    body: "The disputed source is fetched from a pinned commit hash, constructed by the contract itself — never a URL either party submits.",
    span: "md:col-span-2",
  },
  {
    icon: ShieldAlert,
    title: "Fail closed, not open",
    body: "If the cited source can't be reached, that's a verdict, not a stall.",
    span: "",
  },
  {
    icon: Clock3,
    title: "14-day response window",
    body: "Silence doesn't block resolution — it just means the report is judged on the code alone.",
    span: "",
  },
  {
    icon: FileCode2,
    title: "Independent re-derivation",
    body: "Every validator re-runs the judgment itself and compares the actual result — not just checking that a leader said something.",
    span: "md:col-span-2",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-10 max-w-5xl mx-auto">
      <div className="mb-14 flex items-end justify-between flex-wrap gap-4">
        <h2 className="font-mono text-2xl md:text-3xl text-ink max-w-lg leading-tight">
          Built so the evidence can't be picked by whoever's telling the story.
        </h2>
        <span className="mono-tag text-xs text-graphite uppercase tracking-wider">
          Section 02 — Mechanism
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            className={`border border-graphite-line rounded-sm p-6 bg-paper hover:border-ink transition-colors ${f.span}`}
          >
            <f.icon className="w-5 h-5 text-seal-deep mb-4" strokeWidth={1.5} />
            <h3 className="font-mono text-sm uppercase tracking-wide text-ink mb-2">{f.title}</h3>
            <p className="text-sm text-ink/70 leading-relaxed">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
