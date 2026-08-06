import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

interface RedactedLine {
  text: string;
  redactedWidth: string; // e.g. "60%" — how much of the line stays covered at rest
}

const SAMPLE_REPORT: RedactedLine[] = [
  { text: "VULNERABILITY CLASS: Remote code execution via deserialization", redactedWidth: "72%" },
  { text: "CLAIM SPECIFICITY:   High — technical detail, reproducible trigger", redactedWidth: "58%" },
  { text: "REBUTTAL:            None submitted — 14-day window expired", redactedWidth: "80%" },
  { text: "SEVERITY (verdict):  CRITICAL — confidence 940bps", redactedWidth: "40%" },
];

export function RedactionHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  return (
    <section
      ref={containerRef}
      className="relative min-h-[100vh] w-full bg-paper overflow-hidden flex flex-col justify-center"
    >
      <div className="absolute inset-0 scanline-noise pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 w-full">
        <div className="mb-8 flex items-center gap-3">
          <span className="mono-tag text-xs uppercase tracking-widest text-ink border-b-2 border-seal pb-0.5">
            Case File
          </span>
          <span className="h-px flex-1 bg-graphite-line" />
          <span className="mono-tag text-xs text-graphite">#0417</span>
        </div>

        <h1 className="font-mono text-4xl md:text-6xl font-medium leading-[1.05] tracking-tight text-ink mb-10 max-w-3xl">
          No single party decides{" "}
          <span className="text-seal-deep">whether a claim holds up</span>.
        </h1>

        <div className="border-2 border-ink bg-paper shadow-[4px_4px_0_0_rgba(245,196,0,1)] rounded-sm">
          <div className="border-b-2 border-ink px-5 py-3 flex items-center justify-between bg-ink">
            <span className="mono-tag text-xs text-seal uppercase tracking-wider">
              Disclosure Report — Independent Review
            </span>
            <span className="mono-tag text-xs text-seal animate-blink">● live</span>
          </div>

          <div className="px-5 py-6 space-y-4">
            {SAMPLE_REPORT.map((line, i) => (
              <RedactionLine
                key={i}
                line={line}
                index={i}
                scrollYProgress={scrollYProgress}
                prefersReduced={!!prefersReduced}
              />
            ))}
          </div>
        </div>

        <p className="mono-tag text-xs text-graphite mt-6 max-w-md">
          Every disclosure is judged by independent validators — reporter's claim
          against project's rebuttal, no single party controls the verdict.
        </p>
      </div>
    </section>
  );
}

function RedactionLine({
  line,
  index,
  scrollYProgress,
  prefersReduced,
}: {
  line: RedactedLine;
  index: number;
  scrollYProgress: any;
  prefersReduced: boolean;
}) {
  // Each line lifts at a slightly staggered scroll offset so the reveal
  // reads as a sequence, not a single flat wipe.
  const start = 0.05 + index * 0.08;
  const end = start + 0.22;
  const scaleX = useTransform(scrollYProgress, [start, end], [1, 0]);
  // The final line (the verdict payoff) gets the yellow treatment on
  // reveal, so the climactic moment of the redaction-lift actually
  // reads as colored, not just another line of black text appearing.
  const isPayoffLine = index === 3;

  return (
    <div className="relative font-mono text-sm md:text-base leading-relaxed">
      <span className={`relative z-0 ${isPayoffLine ? "text-seal-deep font-semibold" : "text-ink"}`}>
        {line.text}
      </span>
      {!prefersReduced ? (
        <motion.span
          style={{ scaleX, width: line.redactedWidth }}
          className="redaction-bar absolute left-0 top-0 h-full z-10 border-r-2 border-seal"
          aria-hidden="true"
        />
      ) : (
        // Reduced-motion fallback: show the content plainly, no bar at all,
        // rather than leaving a permanently-stuck redaction in place.
        <span className="sr-only">(evidence line, revealed)</span>
      )}
    </div>
  );
}
