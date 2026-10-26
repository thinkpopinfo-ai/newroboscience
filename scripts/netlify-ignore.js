#!/usr/bin/env node
/* Netlify "ignore" command. The site is published on GitHub Pages now, so Netlify only needs to build
   its small redirect + forms site (scripts/netlify-redirect.js) when that changes, which saves the
   Free plan's monthly credits. A commit message containing "[netlify]" forces a Netlify build.
   Netlify convention: exit 0 = skip this build, exit 1 = build. Any error here exits 1 (build). */
const { execSync } = require("child_process");
try {
  const msg = execSync("git log -1 --format=%B", { encoding: "utf8" });
  if (msg.includes("[netlify]")) { console.log("Building: commit asks for [netlify]"); process.exit(1); }
  console.log("Skipping: the site is published on GitHub Pages; Netlify only builds on [netlify] commits");
  process.exit(0);
} catch (e) { console.log(`Building: ignore check failed (${e.message})`); process.exit(1); }
