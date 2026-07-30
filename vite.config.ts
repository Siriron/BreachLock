import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// resolve.alias is required here separately from tsconfig.json's
// "paths" mapping. tsc reads tsconfig.json's paths for type-checking
// (which is why `tsc` passed clean with zero errors on the @/ imports),
// but Vite's actual bundler (Rollup) has its own independent module
// resolution and does not read tsconfig.json's paths automatically —
// it needs this alias explicitly, or every "@/..." import fails at
// build time with "Rollup failed to resolve import" even though
// type-checking saw no problem at all. This was missing entirely on
// the first build attempt; all 27 "@/" import statements across 10
// files depend on this one alias being wired up correctly here.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
});
