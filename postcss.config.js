// This file was MISSING entirely, which is the actual root cause of
// every color fix in this project appearing to have no visible effect
// no matter how many times component-level Tailwind classes were
// edited. Tailwind CSS v3 works AS a PostCSS plugin — without this
// config registering it, Vite's CSS pipeline has no instruction to run
// Tailwind's compiler on src/index.css at all. The @tailwind directives
// at the top of that file were never actually being processed into real
// utility CSS, meaning every custom color class (bg-seal, text-ink,
// border-seal, etc.) was an unstyled, unrecognized class name in the
// shipped bundle — while base HTML/default-Tailwind styling could still
// partially render, producing exactly the "structure is right but
// there's no color anywhere" symptom that was reported.
//
// package.json pins "tailwindcss": "^3.4.4" — under standard semver
// caret-range rules this can only resolve to a 3.x version, never 4.x,
// so the v3-style plugin-object syntax below is correct. (Tailwind v4
// uses a different `@tailwindcss/postcss` package and syntax — using
// that here would be wrong for this project's pinned version.)
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
