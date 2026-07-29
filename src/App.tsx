import { useEffect } from "react";
import Lenis from "lenis";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Home } from "@/pages/Home";

export default function App() {
  useEffect(() => {
    // Respect reduced-motion preference — don't force smooth scroll on
    // users who've asked their system not to animate.
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return (
    <ErrorBoundary>
      <Home />
    </ErrorBoundary>
  );
}
