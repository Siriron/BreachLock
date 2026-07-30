/// <reference types="vite/client" />

// This file's presence is what gives TypeScript the ImportMeta.env
// typing used in src/config/chains.ts (import.meta.env.VITE_...).
// Missing on first build attempt — Vercel's tsc run failed with
// "Property 'env' does not exist on type 'ImportMeta'" because nothing
// in the project referenced vite/client's ambient types anywhere.
// Standard Vite scaffolding always includes this file at src root;
// it was omitted here since the project was hand-assembled rather than
// generated via `npm create vite@latest`, and nothing in the local
// syntax-only checks (esbuild, no real tsc run, since npm install
// wasn't possible without network access) could have caught a missing
// ambient-type reference — that class of error only surfaces in a real
// tsc typecheck against actual installed dependencies, which is exactly
// what this Vercel build is now doing for the first time.

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS_STUDIONET: string;
  readonly VITE_CONTRACT_ADDRESS_BRADBURY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
