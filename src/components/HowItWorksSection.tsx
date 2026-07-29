import { motion } from "framer-motion";

const STEPS = [
  {
    n: "01",
    title: "File",
    body: "Reporter stakes GEN and discloses a vulnerability against a repo, commit, and file path.",
  },
  {
    n: "02",
    title: "Respond",
    body: "Project has 14 days to counter-stake and rebut, optionally citing a patch at its own pinned commit.",
  },
  {
    n: "03",
    title: "Resolve",
    body: "The contract fetches the actual source at the reporter's cited commit and judges severity — with or without a rebuttal.",
  },
  {
    n: "04",
    title: "Settle",
    body: "Stakes move automatically per the verdict. No admin, no appeal to a human — the judgment is the settlement.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-10 max-w-5xl mx-auto">
      <div className="mb-14">
        <span className="mono-tag text-xs text-graphite uppercase tracking-wider block mb-3">
          Section 03 — Lifecycle
        </span>
        <h2 className="font-mono text-2xl md:text-3xl text-ink max-w-lg leading-tight">
          Four steps. No case sits open forever.
        </h2>
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-graphite-line hidden md:block" />
        <div className="space-y-10 md:space-y-14">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative flex gap-6 items-start pl-0 md:pl-0"
            >
              <div className="relative z-10 shrink-0 w-8 h-8 rounded-full bg-paper border-2 border-ink flex items-center justify-center">
                <span className="mono-tag text-[10px] text-ink">{step.n}</span>
              </div>
              <div className="pt-0.5">
                <h3 className="font-mono text-lg text-ink mb-1">{step.title}</h3>
                <p className="text-sm text-ink/70 leading-relaxed max-w-md">{step.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
